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

    /// Widget / thông báo dùng `nihongo://srs` → AppRouter → màn SRS.
    /// CI: không dùng `app.open(url)` (SpringBoard hay không giao custom scheme ổn định);
    /// truyền cùng URL qua `UITEST_DEEPLINK` để tập trung kiểm tra router + NavigationStack.
    func testDeepLinkOpensReviewScreen() {
        app.launchEnvironment["UITEST_DEEPLINK"] = "nihongo://srs"
        app.launch()
        XCTAssertTrue(
            app.navigationBars["Ôn tập SRS"].waitForExistence(timeout: 15),
            "UITEST_DEEPLINK=nihongo://srs phải mở màn Ôn tập SRS"
        )
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

    // MARK: Tra từ theo romaji

    /// Mở màn Tra từ và gõ: dùng được cả khi máy chưa có từ nào (CI không có backend).
    func testVocabSearchScreenOpensAndAcceptsTyping() {
        app.launch()
        let card = homeCard("Tra từ")
        XCTAssertTrue(reveal(card), "thiếu thẻ Tra từ")
        card.tap()

        XCTAssertTrue(app.navigationBars["Tra từ (romaji)"].waitForExistence(timeout: 8))
        let field = app.searchFields.firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        // Không chạm vào ô: ô tìm phải tự được chọn khi mở màn. app.typeText gõ vào ô đang có bàn phím.
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "bàn phím phải tự bật")
        app.typeText("wata")
        // Có dữ liệu thì có kết quả; chưa có thì thông báo hướng dẫn. Màn hình không được trống.
        let hasResultOrHint = app.staticTexts["watashi"].waitForExistence(timeout: 5)
            || app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'Chưa có từ vựng'")).firstMatch.exists
        XCTAssertTrue(hasResultOrHint)
    }

    /// Luồng đầy đủ với backend local: mở bài 1 (sync từ vựng về SwiftData) → Tra từ → gõ "wata" → thấy "watashi".
    /// Không gọi được backend thì bỏ qua thay vì báo đỏ.
    func testVocabSearchFindsSyncedWordEndToEnd() throws {
        let (reachable, detail) = backendReachable(URL(string: "http://localhost:3000/health")!)
        try XCTSkipUnless(reachable, "Cần backend local ở localhost:3000 (\(detail))")

        app.launch()
        let lessons = homeCard("Bài học")
        XCTAssertTrue(reveal(lessons))
        lessons.tap()
        XCTAssertTrue(app.staticTexts["わたし"].waitForExistence(timeout: 20), "bài 1 chưa sync được")
        app.navigationBars.buttons.element(boundBy: 0).tap()

        let search = homeCard("Tra từ")
        XCTAssertTrue(reveal(search))
        search.tap()
        let field = app.searchFields.firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        // Không chạm vào ô: ô tìm phải tự được chọn khi mở màn. app.typeText gõ vào ô đang có bàn phím.
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "bàn phím phải tự bật")
        app.typeText("wata")

        XCTAssertTrue(app.staticTexts["watashi"].waitForExistence(timeout: 5))
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "vocab-search-wata"
        shot.lifetime = .keepAlways
        add(shot)
    }

    /// Kiểm backend có sống không: hạn chờ 10 giây, thử 3 lần, trả về lý do nếu không gọi được.
    /// Không dùng Data(contentsOf:): nó chặn luồng, không có hạn chờ riêng (treo tới 60 giây) và nuốt lỗi.
    private func backendReachable(_ url: URL) -> (Bool, String) {
        var last = "chưa thử"
        for _ in 0..<3 {
            var request = URLRequest(url: url)
            request.timeoutInterval = 10
            let done = expectation(description: "health")
            var ok = false
            URLSession.shared.dataTask(with: request) { _, response, error in
                let status = (response as? HTTPURLResponse)?.statusCode
                ok = status == 200
                last = error.map { "\($0.localizedDescription)" } ?? "HTTP \(status ?? -1)"
                done.fulfill()
            }.resume()
            wait(for: [done], timeout: 12)
            if ok { return (true, last) }
        }
        return (false, last)
    }
}
