import XCTest
@testable import NihongoEDU

final class APIClientTests: XCTestCase {
    private var tokens: MemoryTokenStore!
    private var client: APIClient!

    override func setUp() {
        tokens = MemoryTokenStore("old")
        client = APIClient(session: StubURLProtocol.session, baseURL: "http://test.local/api", tokens: tokens, allowSecureCookieOverHTTP: false)
    }

    private let refreshOK = StubURLProtocol.json(#"{"success":true,"data":{"access_token":"new"}}"#)

    func testOn401RefreshesAndRetriesOnceWithNewToken() async throws {
        StubURLProtocol.reset([StubURLProtocol.Reply(status: 401), refreshOK, StubURLProtocol.json(#"{"ok":1}"#)])

        let (_, http) = try await client.send(try client.request("progress"))

        XCTAssertEqual(http.statusCode, 200)
        let r = StubURLProtocol.requests
        XCTAssertEqual(r.map { $0.url!.path }, ["/api/progress", "/api/auth/refresh", "/api/progress"])
        XCTAssertEqual(r[0].value(forHTTPHeaderField: "Authorization"), "Bearer old")
        XCTAssertEqual(r[2].value(forHTTPHeaderField: "Authorization"), "Bearer new")
        XCTAssertEqual(tokens.token, "new")
    }

    func testRefreshRejectedLogsOutAndPostsSessionExpired() async {
        StubURLProtocol.reset([StubURLProtocol.Reply(status: 401), StubURLProtocol.Reply(status: 401)])
        let expired = expectation(forNotification: .sessionExpired, object: nil)

        do {
            _ = try await client.send(try client.request("progress"))
            XCTFail("phải ném lỗi")
        } catch {
            XCTAssertEqual(error as? APIError, .badStatus(401))
        }
        await fulfillment(of: [expired], timeout: 1)
        XCTAssertNil(tokens.token)
    }

    func testNetworkErrorDuringRefreshKeepsSession() async {
        StubURLProtocol.reset([StubURLProtocol.Reply(status: 401), StubURLProtocol.Reply(error: URLError(.notConnectedToInternet))])
        _ = try? await client.send(try client.request("progress"))
        XCTAssertEqual(tokens.token, "old", "mất mạng không phải lý do đăng xuất")
    }

    func testStillUnauthorizedAfterRefreshDoesNotLoop() async {
        StubURLProtocol.reset([StubURLProtocol.Reply(status: 401), refreshOK, StubURLProtocol.Reply(status: 401)])
        _ = try? await client.send(try client.request("progress"))
        XCTAssertEqual(StubURLProtocol.requests.count, 3)
    }

    func testAuthEndpointsNeverTriggerRefresh() async {
        StubURLProtocol.reset([StubURLProtocol.Reply(status: 401)])
        _ = try? await client.send(try client.request("auth/login", method: "POST"))
        XCTAssertEqual(StubURLProtocol.requests.count, 1)
    }

    /// Mười request cùng nhận 401: chỉ một lần refresh.
    func testConcurrent401sShareOneRefresh() async {
        let coordinator = RefreshCoordinator()
        let counter = Counter()
        let perform: () async -> RefreshOutcome = {
            await counter.increment()
            try? await Task.sleep(for: .milliseconds(100)) // chậm để các lời gọi kịp chồng nhau
            return .newToken("fresh")
        }
        let store = tokens!
        async let a = coordinator.refresh(tokens: store, failedToken: "old", perform: perform)
        async let b = coordinator.refresh(tokens: store, failedToken: "old", perform: perform)
        async let c = coordinator.refresh(tokens: store, failedToken: "old", perform: perform)
        let results = await [a, b, c]
        XCTAssertEqual(results, Array(repeating: .newToken("fresh"), count: 3))
        let calls = await counter.value
        XCTAssertEqual(calls, 1)
    }

    func testParsesWrappedAndPlainTokens() {
        XCTAssertEqual(APIClient.accessToken(from: Data(#"{"data":{"access_token":"a"}}"#.utf8)), "a")
        XCTAssertEqual(APIClient.accessToken(from: Data(#"{"access_token":"b"}"#.utf8)), "b")
        XCTAssertNil(APIClient.accessToken(from: Data("nope".utf8)))
    }
}

private actor Counter {
    var value = 0
    func increment() { value += 1 }
}
