import XCTest

/// Chạy app thật trong simulator, điều khiển như người dùng (giống Compose UI test + Espresso bên Android).
final class NihongoEDUUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
    }

    func testHomeListsNewFeatures() {
        app.launch()
        for title in ["Tiến độ học", "Bài học", "Đọc hiểu", "Thi thử JLPT", "Luyện kana", "Chat cộng đồng"] {
            let card = app.staticTexts[title]
            if !card.waitForExistence(timeout: 2) { app.swipeUp() }
            XCTAssertTrue(card.waitForExistence(timeout: 5), "thiếu thẻ \(title)")
        }
    }

    /// Widget và thông báo nhắc ôn mở app bằng nihongo://srs: phải vào thẳng màn SRS.
    func testDeepLinkOpensReviewScreen() {
        app.launch()
        app.open(URL(string: "nihongo://srs")!)
        XCTAssertTrue(app.navigationBars["Ôn tập SRS"].waitForExistence(timeout: 5))
    }

    /// Luồng hoàn toàn offline: không phụ thuộc backend, chạy được trong CI.
    func testKanaQuizCountsAnswer() {
        app.launch()
        let kana = app.staticTexts["Luyện kana"]
        while !kana.isHittable { app.swipeUp() }
        kana.tap()

        XCTAssertTrue(app.staticTexts["kanaChar"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Đúng 0/0"].exists)
        app.buttons.matching(NSPredicate(format: "label MATCHES %@", "^[a-z]+$")).firstMatch.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "^Đúng [01]/1$")).firstMatch.waitForExistence(timeout: 2))
        XCTAssertTrue(app.buttons["Câu tiếp"].exists)
    }

    /// Đo cold start 5 lần (thay cho Macrobenchmark bên Android). Simulator nhiễu: so sánh tương đối.
    func testLaunchPerformance() {
        measure(metrics: [XCTApplicationLaunchMetric()], options: {
            let o = XCTMeasureOptions()
            o.iterationCount = 5
            return o
        }()) {
            app.launch()
        }
    }
}
