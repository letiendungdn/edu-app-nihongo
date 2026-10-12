import XCTest
@testable import NihongoEDU

/// Gọi backend THẬT (Docker, localhost:3000). Chỉ chạy khi bật:
///   TEST_RUNNER_INTEGRATION=1 xcodebuild test ... -only-testing:NihongoEDUTests/IntegrationTests
/// (xcodebuild chuyển biến TEST_RUNNER_X thành X trong process test.)
/// Ba điều ở đây unit test với server giả KHÔNG chứng minh được.
final class IntegrationTests: XCTestCase {
    private let base = "http://localhost:3000/api"

    /// Backend giới hạn 5 lần đăng nhập / phút (lần chạy đầu bị 429). Mỗi tài khoản đăng nhập
    /// MỘT lần cho cả lớp test; test cần session riêng thì chép cookie sang.
    nonisolated(unsafe) private static var sessions: [String: (APIClient, MemoryTokenStore)] = [:]

    override func setUpWithError() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["INTEGRATION"] == "1", "đặt TEST_RUNNER_INTEGRATION=1 để chạy")
    }

    /// Mỗi client một session ephemeral: kho cookie riêng, hai tài khoản không lẫn cookie của nhau.
    private func client(allowSecureCookie: Bool = true) -> (APIClient, MemoryTokenStore) {
        let tokens = MemoryTokenStore(nil)
        return (APIClient(session: URLSession(configuration: .ephemeral), baseURL: base, tokens: tokens, allowSecureCookieOverHTTP: allowSecureCookie), tokens)
    }

    private func login(_ c: APIClient, _ email: String, _ password: String) async throws {
        try await AuthAPI(client: c).login(email: email, password: password)
    }

    private func loggedIn(_ email: String, _ password: String = "Passw0rd!e2e") async throws -> (APIClient, MemoryTokenStore) {
        if let s = Self.sessions[email] { return s }
        let s = client()
        try await login(s.0, email, password)
        Self.sessions[email] = s
        return s
    }

    /// Session mới (kho cookie riêng) mang sẵn cookie refresh của tài khoản đã đăng nhập.
    private func copy(of source: APIClient, allowSecureCookie: Bool) -> (APIClient, MemoryTokenStore) {
        let config = URLSessionConfiguration.ephemeral
        for cookie in source.session.configuration.httpCookieStorage?.cookies ?? [] {
            config.httpCookieStorage?.setCookie(cookie)
        }
        let tokens = MemoryTokenStore(source.tokens.accessToken())
        return (APIClient(session: URLSession(configuration: config), baseURL: base, tokens: tokens, allowSecureCookieOverHTTP: allowSecureCookie), tokens)
    }

    /// Bản cũ không gửi `mastered`: server trả 400. Bản mới phải được nhận.
    func testReviewSyncIsAcceptedByRealServer() async throws {
        let (c, _) = try await loggedIn("admin@nihongo.local", "admin123")

        let item = ReviewSyncItem(kana: "ねこ", kanji: "猫", meaning: "con mèo", lessonNumber: 1, wrongCount: 0,
                                  reviewStreak: 2, mastered: false, lastReviewedAt: "2026-10-12T03:00:00.000Z")
        try await ProgressReviewUploader(client: c).upload([item])

        // Đối chứng: đúng payload bản cũ tạo ra (thiếu mastered) vẫn bị từ chối
        var old = try c.request("progress/review", method: "POST")
        old.setValue("application/json", forHTTPHeaderField: "Content-Type")
        old.httpBody = Data(#"{"items":[{"kana":"ねこ","kanji":null,"meaning":"con mèo","lessonNumber":1,"wrongCount":0,"reviewStreak":2}]}"#.utf8)
        do {
            _ = try await c.send(old)
            XCTFail("payload cũ lẽ ra bị 400")
        } catch {
            XCTAssertEqual(error as? APIError, .badStatus(400))
        }
    }

    /// Gateway local đặt cờ Secure cho cookie refresh dù chạy HTTP. Token hỏng → APIClient phải refresh được.
    func testRefreshWorksWithSecureCookieOverHTTP() async throws {
        let (admin, _) = try await loggedIn("admin@nihongo.local", "admin123")
        let (c, tokens) = copy(of: admin, allowSecureCookie: true)
        tokens.token = "token-hong"

        let (_, http) = try await c.send(try c.request("learning-progress"))
        XCTAssertEqual(http.statusCode, 200)
        XCTAssertNotEqual(tokens.token, "token-hong")
    }

    /// Đối chứng: không có xử lý riêng thì URLSession (đúng chuẩn) không gửi cookie Secure qua HTTP.
    func testWithoutWorkaroundSecureCookieIsNotSentOverHTTP() async throws {
        let (admin, _) = try await loggedIn("admin@nihongo.local", "admin123")
        let (c, tokens) = copy(of: admin, allowSecureCookie: false)
        tokens.token = "token-hong"

        do {
            _ = try await c.send(try c.request("learning-progress"))
            XCTFail("lẽ ra refresh thất bại")
        } catch {
            XCTAssertEqual(error as? APIError, .badStatus(401))
        }
    }

    /// SSE thật: một học viên nghe phòng, học viên khác gửi, tin phải tới qua stream.
    /// (Không dùng admin: backend chặn chat 1:1 với admin, bắt dùng trang Hỗ trợ.)
    func testChatStreamReceivesRealMessage() async throws {
        let (receiver, _) = try await loggedIn("ios-e2e-receiver@nihongo.test")
        let (sender, _) = try await loggedIn("ios-e2e-sender@nihongo.test")
        let receiverId = try await CommunityAPI(client: receiver).me()
        let room = try await CommunityAPI(client: sender).openDirect(userId: receiverId)

        let text = "e2e \(UUID().uuidString.prefix(8))"
        let received = Task { () -> String? in
            for await event in CommunityAPI(client: receiver).events(roomId: room) {
                if case .open = event { _ = try? await CommunityAPI(client: sender).send(roomId: room, content: text) }
                if case .message(let m) = event, m.content == text { return m.content }
            }
            return nil
        }
        let timeout = Task { try await Task.sleep(for: .seconds(10)); received.cancel() }
        let got = await received.value
        timeout.cancel()
        XCTAssertEqual(got, text)
    }
}
