import SwiftUI
import SwiftData

enum SRSQueries {
    /// Thẻ đến hạn tại `now`. Lọc bằng predicate trong SQLite (bản cũ tải TẤT CẢ thẻ rồi lọc trong RAM).
    /// Gồm cả thẻ "mastered": bản cũ loại chúng vĩnh viễn (`!$0.mastered`), nên thẻ đã thuộc không bao
    /// giờ được ôn lại. SM-2 vẫn cần ôn thẻ thuộc, chỉ là cách nhau rất xa (interval ≥ 21 ngày).
    static func due(at now: Date) -> Predicate<SRSCard> {
        #Predicate<SRSCard> { $0.nextReviewAt <= now }
    }
}

@Observable
@MainActor
final class SRSViewModel {
    var sessionTotal: Int = 0
    var sessionCorrect: Int = 0
    var showAnswer: Bool = false

    func rate(
        _ quality: Int,
        card: SRSCard,
        modelContext: ModelContext,
        engine: SyncEngine,
        network: NetworkMonitor,
        auth: AuthState,
        now: Date = .now
    ) {
        sessionTotal += 1
        if quality >= 3 { sessionCorrect += 1 }

        let result = SRSAlgorithm.calculateNextReview(
            easeFactor: card.easeFactor,
            interval: card.interval,
            repetitions: card.repetitions,
            quality: quality,
            now: now
        )
        card.easeFactor   = result.easeFactor
        card.interval     = result.interval
        card.repetitions  = result.repetitions
        card.nextReviewAt = result.nextReviewAt
        card.mastered     = result.mastered

        // Lưu máy trước; gửi lên server là việc của SyncEngine (gộp lần chấm, chống gửi trùng)
        engine.enqueue(card: card, in: modelContext, now: now)
        let online = network.isOnline, loggedIn = auth.isLoggedIn
        Task {
            await engine.flush(in: modelContext, isOnline: online, isLoggedIn: loggedIn)
            DueCardsReporter.shared.report(from: modelContext)
        }
        showAnswer = false
    }

    func reset() {
        sessionTotal = 0
        sessionCorrect = 0
        showAnswer = false
    }
}
