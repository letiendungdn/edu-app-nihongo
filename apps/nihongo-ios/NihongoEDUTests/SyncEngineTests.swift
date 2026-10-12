import SwiftData
import XCTest
@testable import NihongoEDU

private final class FakeUploader: ReviewUploading {
    var batches: [[ReviewSyncItem]] = []
    var error: Error?
    var delay: Duration = .zero
    func upload(_ items: [ReviewSyncItem]) async throws {
        if delay > .zero { try await Task.sleep(for: delay) }
        if let error { throw error }
        batches.append(items)
    }
}

@MainActor
final class SyncEngineTests: XCTestCase {
    private var container: ModelContainer!
    private var context: ModelContext { container.mainContext }
    private var uploader: FakeUploader!
    private var engine: SyncEngine!

    override func setUp() async throws {
        container = try makeMemoryContainer()
        uploader = FakeUploader()
        engine = SyncEngine(uploader: uploader)
    }

    private func queue() -> [SyncQueueItem] { (try? context.fetch(FetchDescriptor<SyncQueueItem>())) ?? [] }

    /// Bản cũ không gửi `mastered`: backend trả 400 cho MỌI lần sync (đã thử bằng curl).
    func testPayloadContainsEveryFieldBackendRequires() throws {
        let card = seedCard(context, id: 1, nextReviewAt: fixedNow)
        engine.enqueue(card: card, in: context, now: fixedNow)

        let json = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(queue()[0].payload.utf8)) as? [String: Any])
        for field in ["kana", "meaning", "lessonNumber", "wrongCount", "reviewStreak", "mastered", "lastReviewedAt"] {
            XCTAssertNotNil(json[field], "thiếu \(field)")
        }
    }

    func testReviewingSameCardTwiceKeepsOneQueueItem() async {
        let card = seedCard(context, id: 1, nextReviewAt: fixedNow)
        engine.enqueue(card: card, in: context, now: fixedNow)
        card.mastered = true
        engine.enqueue(card: card, in: context, now: fixedNow.addingTimeInterval(60))

        XCTAssertEqual(queue().count, 1)
        await engine.flush(in: context, isOnline: true, isLoggedIn: true)
        XCTAssertEqual(uploader.batches.single?.first?.mastered, true) // gửi lần chấm mới nhất
    }

    func testServerErrorKeepsQueueThenRetrySucceeds() async {
        let card = seedCard(context, id: 1, nextReviewAt: fixedNow)
        engine.enqueue(card: card, in: context, now: fixedNow)

        uploader.error = APIError.badStatus(503)
        let failed = await engine.flush(in: context, isOnline: true, isLoggedIn: true)
        XCTAssertFalse(failed)
        XCTAssertEqual(queue().count, 1)
        XCTAssertEqual(card.syncStatus, "pending")

        uploader.error = nil
        let ok = await engine.flush(in: context, isOnline: true, isLoggedIn: true)
        XCTAssertTrue(ok)
        XCTAssertTrue(queue().isEmpty)
        XCTAssertEqual(card.syncStatus, "synced")
    }

    /// Chấm thẻ liên tục + mạng vừa có lại → nhiều lượt flush chồng nhau. Chỉ một lượt gửi.
    func testConcurrentFlushesSendOnce() async {
        let card = seedCard(context, id: 1, nextReviewAt: fixedNow)
        engine.enqueue(card: card, in: context, now: fixedNow)
        uploader.delay = .milliseconds(200)

        async let a = engine.flush(in: context, isOnline: true, isLoggedIn: true)
        async let b = engine.flush(in: context, isOnline: true, isLoggedIn: true)
        _ = await (a, b)

        XCTAssertEqual(uploader.batches.count, 1)
    }

    /// Bản cũ xóa CẢ hàng đợi sau khi gửi, kể cả dòng thêm vào trong lúc đang chờ mạng.
    func testItemAddedDuringUploadIsSentInNextRound() async {
        let first = seedCard(context, id: 1, nextReviewAt: fixedNow)
        let second = seedCard(context, id: 3, nextReviewAt: fixedNow)
        engine.enqueue(card: first, in: context, now: fixedNow)
        uploader.delay = .milliseconds(200)

        let flush = Task { await engine.flush(in: context, isOnline: true, isLoggedIn: true) }
        try? await Task.sleep(for: .milliseconds(50))
        engine.enqueue(card: second, in: context, now: fixedNow) // thêm trong lúc lượt 1 đang gửi
        _ = await engine.flush(in: context, isOnline: true, isLoggedIn: true) // đánh dấu cần chạy thêm vòng
        _ = await flush.value

        XCTAssertEqual(uploader.batches.flatMap { $0 }.map(\.kana).sorted(), ["かな1", "かな3"])
        XCTAssertTrue(queue().isEmpty)
    }

    func testCorruptPayloadIsDroppedNotBlockingQueue() async {
        context.insert(SyncQueueItem(operation: SyncEngine.operation, entityId: 99, payload: "not json"))
        let card = seedCard(context, id: 1, nextReviewAt: fixedNow)
        engine.enqueue(card: card, in: context, now: fixedNow)

        await engine.flush(in: context, isOnline: true, isLoggedIn: true)

        XCTAssertEqual(uploader.batches.single?.count, 1)
        XCTAssertTrue(queue().isEmpty)
    }

    func testOfflineOrLoggedOutDoesNothing() async {
        let card = seedCard(context, id: 1, nextReviewAt: fixedNow)
        engine.enqueue(card: card, in: context, now: fixedNow)
        await engine.flush(in: context, isOnline: false, isLoggedIn: true)
        await engine.flush(in: context, isOnline: true, isLoggedIn: false)
        XCTAssertTrue(uploader.batches.isEmpty)
        XCTAssertEqual(queue().count, 1)
    }
}

extension Array {
    var single: Element? { count == 1 ? self[0] : nil }
}
