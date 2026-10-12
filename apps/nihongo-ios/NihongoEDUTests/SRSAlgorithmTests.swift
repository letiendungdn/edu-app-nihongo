import XCTest
@testable import NihongoEDU

final class SRSAlgorithmTests: XCTestCase {
    private var utc: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()

    private func review(ef: Double = 2.5, interval: Int = 0, reps: Int = 0, q: Int) -> SRSAlgorithm.ReviewResult {
        SRSAlgorithm.calculateNextReview(easeFactor: ef, interval: interval, repetitions: reps, quality: q, now: fixedNow, calendar: utc)
    }

    func testQualityBelowThreeResets() {
        let r = review(interval: 15, reps: 4, q: 2)
        XCTAssertEqual(r.repetitions, 0)
        XCTAssertEqual(r.interval, 1)
        XCTAssertFalse(r.mastered)
    }

    func testFirstSuccessIntervalOne() {
        XCTAssertEqual(review(q: 4).interval, 1)
    }

    func testSecondSuccessIntervalSix() {
        let r = review(interval: 1, reps: 1, q: 4)
        XCTAssertEqual(r.repetitions, 2)
        XCTAssertEqual(r.interval, 6)
    }

    func testLaterSuccessMultipliesByEase() {
        let r = review(interval: 6, reps: 2, q: 4)
        XCTAssertEqual(r.repetitions, 3)
        XCTAssertEqual(r.interval, 15)
    }

    func testEaseFactorFloor() {
        XCTAssertEqual(review(ef: 1.3, interval: 1, q: 1).easeFactor, 1.3, accuracy: 0.0001)
    }

    func testMasteredThreshold() {
        let r = review(interval: 21, reps: 4, q: 4)
        XCTAssertEqual(r.repetitions, 5)
        XCTAssertTrue(r.mastered)
    }

    /// Bản cũ đọc thẳng `.now`: không khẳng định được ngày ôn kế tiếp. Giờ chính xác tuyệt đối.
    func testNextReviewIsExactlyIntervalDaysLater() {
        XCTAssertEqual(review(interval: 1, reps: 1, q: 4).nextReviewAt, fixedNow.addingTimeInterval(6 * 86_400))
    }

    /// Cộng "ngày lịch": ngày đổi giờ mùa hè ở Berlin chỉ có 23 giờ, vẫn ôn đúng giờ địa phương hôm sau.
    func testDaylightSavingUsesCalendarDays() {
        var berlin = Calendar(identifier: .gregorian)
        berlin.timeZone = TimeZone(identifier: "Europe/Berlin")!
        let before = berlin.date(from: DateComponents(year: 2026, month: 3, day: 28, hour: 9))!
        let r = SRSAlgorithm.calculateNextReview(easeFactor: 2.5, interval: 0, repetitions: 0, quality: 4, now: before, calendar: berlin)
        XCTAssertEqual(berlin.component(.hour, from: r.nextReviewAt), 9)
        XCTAssertEqual(r.nextReviewAt.timeIntervalSince(before), 23 * 3600)
    }
}
