import XCTest

/// Chạy app thật trong simulator, điều khiển như người dùng (giống Compose UI test + Espresso bên Android).
final class NihongoEDUUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
    }

    /// Trên simulator CI sạch thường còn thẻ "Bật nhắc ôn tập" → danh sách dài hơn máy local đã cấp quyền.
    @discardableResult
    private func reveal(_ query: XCUIElement, maxSwipes: Int = 8) -> Bool {
        if query.waitForExistence(timeout: 2), query.isHittable { return true }
        for _ in 0..<maxSwipes {
            if query.exists, query.isHittable { return true }
            app.swipeUp()
        }
        return query.waitForExistence(timeout: 3) && query.isHittable
    }

    private func homeCard(_ title: String) -> XCUIElement {
        // NavCard gắn accessibilityLabel(title) + id nav-…; fallback StaticText cho bản cũ.
        let byId = app.descendants(matching: .any)["nav-\(title)"]
        if byId.exists { return byId }
        let button = app.buttons[title]
        if button.exists { return button }
        return app.staticTexts[title]
    }

    func testHomeListsNewFeatures() {
        app.launch()
        for title in ["Tiến độ học", "Bài học", "Đọc hiểu", "Thi thử JLPT", "Luyện kana", "Chat cộng đồng"] {
            let card = homeCard(title)
            XCTAssertTrue(reveal(card), "thiếu thẻ \(title)")
        }
    }

    /// Widget và thông báo nhắc ôn mở app bằng nihongo://srs: phải vào thẳng màn SRS.
    func testDeepLinkOpensReviewScreen() {
        app.launch()
        XCTAssertTrue(app.navigationBars["Nihongo EDU"].waitForExistence(timeout: 8))
        app.open(URL(string: "nihongo://srs")!)
        XCTAssertTrue(app.navigationBars["Ôn tập SRS"].waitForExistence(timeout: 8))
    }

    /// Luồng hoàn toàn offline: không phụ thuộc backend, chạy được trong CI.
    func testKanaQuizCountsAnswer() {
        app.launch()
        let kana = homeCard("Luyện kana")
        XCTAssertTrue(reveal(kana), "không thấy Luyện kana")
        kana.tap()

        XCTAssertTrue(app.staticTexts["kanaChar"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["Đúng 0/0"].waitForExistence(timeout: 3))
        let option = app.buttons.matching(NSPredicate(format: "label MATCHES %@", "^[a-z]+$")).firstMatch
        XCTAssertTrue(option.waitForExistence(timeout: 3), "không thấy đáp án romaji")
        option.tap()
        XCTAssertTrue(
            app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "^Đúng [01]/1$")).firstMatch
                .waitForExistence(timeout: 3)
        )
        XCTAssertTrue(app.buttons["Câu tiếp"].waitForExistence(timeout: 3))
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
