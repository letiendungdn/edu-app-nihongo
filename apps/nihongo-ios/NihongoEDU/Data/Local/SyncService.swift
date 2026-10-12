import Foundation
import SwiftData

/// Một lần chấm thẻ gửi lên `POST /api/progress/review`. Khớp `ReviewItemDto` của backend:
/// `mastered` là bắt buộc. Bản cũ dựng payload bằng `[String: Any]` và quên field này, nên
/// server trả 400 "items.0.mastered must be a boolean value" cho MỌI lần sync từ iOS.
/// Dùng `Codable` thì thiếu field là lỗi biên dịch, không phải lỗi chạy.
struct ReviewSyncItem: Codable, Equatable {
    let kana: String
    let kanji: String?
    let meaning: String
    let lessonNumber: Int
    let wrongCount: Int
    let reviewStreak: Int
    let mastered: Bool
    let lastReviewedAt: String
}

protocol ReviewUploading {
    func upload(_ items: [ReviewSyncItem]) async throws
}

struct ProgressReviewUploader: ReviewUploading {
    var client: APIClient = .shared
    func upload(_ items: [ReviewSyncItem]) async throws {
        guard !items.isEmpty else { return }
        let req = try client.request("progress/review", method: "POST", body: ["items": items])
        _ = try await client.send(req)
    }
}

/// Hàng đợi sync phía client (outbox). Toàn bộ trên MainActor vì SwiftData `ModelContext` của UI
/// không thread-safe. `@Observable` để inject qua `.environment(engine)`.
@Observable
@MainActor
final class SyncEngine {
    static let operation = "UPDATE_SRS"
    @ObservationIgnored private let uploader: ReviewUploading
    @ObservationIgnored private var isFlushing = false
    @ObservationIgnored private var flushRequested = false

    private static let iso: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    init(uploader: ReviewUploading = ProgressReviewUploader()) {
        self.uploader = uploader
    }

    /// Lưu lần chấm vào hàng đợi. Một thẻ chỉ giữ lần chấm MỚI NHẤT: chấm 3 lần offline thì gửi 1 item.
    func enqueue(card: SRSCard, in context: ModelContext, now: Date) {
        guard let vocab = card.vocabulary else { return }
        card.syncStatus = "pending"
        card.updatedAt = now

        let item = ReviewSyncItem(
            kana: vocab.kana,
            kanji: vocab.kanji,
            meaning: vocab.meaning,
            lessonNumber: vocab.lessonNumber,
            wrongCount: card.repetitions == 0 ? 1 : 0,
            reviewStreak: card.repetitions,
            mastered: card.mastered,
            lastReviewedAt: Self.iso.string(from: now)
        )
        let entityId = vocab.id
        let op = Self.operation
        let old = FetchDescriptor<SyncQueueItem>(predicate: #Predicate { $0.operation == op && $0.entityId == entityId })
        for existing in (try? context.fetch(old)) ?? [] { context.delete(existing) }

        let payload = (try? JSONEncoder().encode(item)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        context.insert(SyncQueueItem(operation: op, entityId: entityId, payload: payload))
        try? context.save()
    }

    /// Gửi hàng đợi. Gọi chồng nhau (chấm thẻ liên tục, mạng vừa có lại) thì chỉ một lượt chạy;
    /// lượt đang chạy sẽ chạy thêm vòng nữa để gửi cả item mới vào trong lúc chờ mạng.
    @discardableResult
    func flush(in context: ModelContext, isOnline: Bool, isLoggedIn: Bool) async -> Bool {
        guard isOnline, isLoggedIn else { return false }
        if isFlushing {
            flushRequested = true
            return false
        }
        isFlushing = true
        defer { isFlushing = false }

        var ok = true
        var rounds = 0
        repeat {
            flushRequested = false
            ok = await flushOnce(in: context)
            rounds += 1
        } while ok && flushRequested && rounds < 5
        return ok
    }

    private func flushOnce(in context: ModelContext) async -> Bool {
        let op = Self.operation
        let descriptor = FetchDescriptor<SyncQueueItem>(
            predicate: #Predicate { $0.operation == op },
            sortBy: [SortDescriptor(\.createdAt)]
        )
        guard let pending = try? context.fetch(descriptor), !pending.isEmpty else { return true }

        var items: [ReviewSyncItem] = []
        var sent: [SyncQueueItem] = []
        for row in pending {
            guard let item = try? JSONDecoder().decode(ReviewSyncItem.self, from: Data(row.payload.utf8)) else {
                context.delete(row) // payload hỏng: bỏ, đừng để nó chặn cả hàng đợi mãi mãi
                continue
            }
            items.append(item)
            sent.append(row)
        }
        let sentIds = Set(sent.map(\.entityId))

        do {
            try await uploader.upload(items)
        } catch {
            try? context.save()
            return false // giữ nguyên hàng đợi, lần sau gửi lại
        }

        // Chỉ xóa đúng những dòng đã gửi. Dòng thêm vào trong lúc chờ mạng vẫn còn cho vòng sau.
        for row in sent { context.delete(row) }
        try? context.save()

        // Chỉ đánh dấu synced thẻ đã gửi VÀ không còn lần chấm mới hơn trong hàng đợi.
        let stillQueued = Set(((try? context.fetch(descriptor)) ?? []).map(\.entityId))
        let cards = (try? context.fetch(FetchDescriptor<SRSCard>(predicate: #Predicate { $0.syncStatus == "pending" }))) ?? []
        for card in cards {
            guard let id = card.vocabulary?.id, sentIds.contains(id), !stillQueued.contains(id) else { continue }
            card.syncStatus = "synced"
        }
        try? context.save()
        return true
    }
}
