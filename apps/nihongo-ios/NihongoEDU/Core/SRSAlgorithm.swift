import Foundation

enum SRSAlgorithm {
    struct ReviewResult {
        let easeFactor: Double
        let interval: Int
        let repetitions: Int
        let nextReviewAt: Date
        let mastered: Bool
    }

    /// SM-2. quality: 1=Lại, 2=Khó, 3=Ổn, 4=Dễ.
    /// Hàm thuần: `now` và `calendar` truyền vào để test chính xác tuyệt đối
    /// (bản cũ đọc thẳng `.now`, test không kiểm tra được ngày ôn kế tiếp).
    static func calculateNextReview(
        easeFactor: Double,
        interval: Int,
        repetitions: Int,
        quality: Int,
        now: Date,
        calendar: Calendar = .current
    ) -> ReviewResult {
        var ef = easeFactor
        var ivl = interval
        var reps = repetitions

        if quality < 3 {
            reps = 0
            ivl = 1
        } else {
            switch reps {
            case 0:  ivl = 1
            case 1:  ivl = 6
            default: ivl = max(1, Int((Double(ivl) * ef).rounded()))
            }
            reps += 1
        }

        ef = max(1.3, ef + 0.1 - Double(5 - quality) * (0.08 + Double(5 - quality) * 0.02))

        // Cộng "ngày lịch" (không cộng cứng 86 400 giây): đúng cả ngày đổi giờ mùa hè
        let nextReview = calendar.date(byAdding: .day, value: max(1, ivl), to: now) ?? now
        let mastered = reps >= 5 && ivl >= 21

        return ReviewResult(
            easeFactor: ef,
            interval: ivl,
            repetitions: reps,
            nextReviewAt: nextReview,
            mastered: mastered
        )
    }
}
