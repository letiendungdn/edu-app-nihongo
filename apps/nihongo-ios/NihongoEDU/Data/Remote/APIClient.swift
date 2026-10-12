import Foundation

protocol TokenStoring: AnyObject {
    func accessToken() -> String?
    func saveAccessToken(_ token: String)
    func clear()
}

final class KeychainTokenStore: TokenStoring {
    func accessToken() -> String? { TokenStore.accessToken() }
    func saveAccessToken(_ token: String) { TokenStore.saveAccessToken(token) }
    func clear() { TokenStore.clear() }
}

extension Notification.Name {
    /// Refresh token bị từ chối: đã xóa token, UI cần về trạng thái chưa đăng nhập.
    static let sessionExpired = Notification.Name("sessionExpired")
}

enum RefreshOutcome: Equatable {
    case newToken(String)
    case rejected
    case networkError
}

/// Mọi request có đăng nhập đi qua đây.
///
/// Gặp 401 thì gọi `POST /auth/refresh` (refresh token nằm trong cookie httpOnly; URLSession tự lưu
/// cookie vào `HTTPCookieStorage` và tự gửi kèm), rồi gửi lại request MỘT lần. Refresh bị từ chối thì
/// đăng xuất; lỗi mạng thì giữ phiên. Bản cũ không xử lý 401: token hết hạn là mọi request đều lỗi.
final class APIClient: @unchecked Sendable {
    static let shared = APIClient()

    let session: URLSession
    let baseURL: String
    let tokens: TokenStoring
    private let refresher = RefreshCoordinator()
    /// Gateway local (Docker, NODE_ENV=production) đặt cờ Secure cho cookie dù chạy HTTP. URLSession
    /// đúng chuẩn không gửi cookie Secure qua HTTP. Chỉ bật khi dev (DEBUG + URL http).
    let allowSecureCookieOverHTTP: Bool

    init(
        session: URLSession = .shared,
        baseURL: String = APIConfig.baseURL,
        tokens: TokenStoring = KeychainTokenStore(),
        allowSecureCookieOverHTTP: Bool = APIClient.isDebugBuild
    ) {
        self.session = session
        self.baseURL = baseURL
        self.tokens = tokens
        self.allowSecureCookieOverHTTP = allowSecureCookieOverHTTP
    }

    static var isDebugBuild: Bool {
        #if DEBUG
        true
        #else
        false
        #endif
    }

    func url(_ path: String, query: [URLQueryItem] = []) throws -> URL {
        guard var c = URLComponents(string: "\(baseURL)/\(path)") else { throw APIError.invalidURL }
        if !query.isEmpty { c.queryItems = query }
        guard let u = c.url else { throw APIError.invalidURL }
        return u
    }

    func request<Body: Encodable>(_ path: String, method: String = "GET", query: [URLQueryItem] = [], body: Body) throws -> URLRequest {
        var req = URLRequest(url: try url(path, query: query))
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(body)
        return req
    }

    func request(_ path: String, method: String = "GET", query: [URLQueryItem] = []) throws -> URLRequest {
        var req = URLRequest(url: try url(path, query: query))
        req.httpMethod = method
        return req
    }

    @discardableResult
    func send(_ original: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let sentToken = tokens.accessToken()
        let (data, http) = try await perform(original, token: sentToken)
        guard http.statusCode == 401, !Self.isAuthPath(original.url) else {
            return try Self.checked(data, http)
        }

        switch await refresher.refresh(tokens: tokens, failedToken: sentToken, perform: { await self.performRefresh() }) {
        case .newToken(let token):
            let (d2, h2) = try await perform(original, token: token)
            return try Self.checked(d2, h2)
        case .rejected:
            tokens.clear()
            NotificationCenter.default.post(name: .sessionExpired, object: nil)
            throw APIError.badStatus(401)
        case .networkError:
            throw APIError.badStatus(401)
        }
    }

    /// Cho luồng không đi qua `send` (SSE): gặp 401 thì gọi đây. Trả token mới, hoặc nil nếu đã đăng xuất / lỗi mạng.
    func refreshAfterUnauthorized(failedToken: String?) async -> String? {
        switch await refresher.refresh(tokens: tokens, failedToken: failedToken, perform: { await self.performRefresh() }) {
        case .newToken(let token): return token
        case .rejected:
            tokens.clear()
            NotificationCenter.default.post(name: .sessionExpired, object: nil)
            return nil
        case .networkError: return nil
        }
    }

    private func perform(_ original: URLRequest, token: String?) async throws -> (Data, HTTPURLResponse) {
        var req = original
        if req.value(forHTTPHeaderField: "Accept") == nil { req.setValue("application/json", forHTTPHeaderField: "Accept") }
        if let token, !token.isEmpty { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.decodingFailed }
        return (data, http)
    }

    /// Gọi thẳng, không qua `send`, để refresh lỗi không vòng lại chính nó.
    func performRefresh() async -> RefreshOutcome {
        guard let url = try? url("auth/refresh") else { return .networkError }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        if allowSecureCookieOverHTTP, url.scheme == "http", let cookie = refreshCookieIgnoringSecure(for: url) {
            req.setValue("refresh_token=\(cookie)", forHTTPHeaderField: "Cookie")
        }
        do {
            let (data, response) = try await session.data(for: req)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
                  let token = Self.accessToken(from: data) else { return .rejected }
            return .newToken(token)
        } catch {
            return .networkError
        }
    }

    private func refreshCookieIgnoringSecure(for url: URL) -> String? {
        let storage = session.configuration.httpCookieStorage ?? .shared
        return storage.cookies?.first { $0.name == "refresh_token" && url.host == $0.domain.trimmingCharacters(in: ["."]) }?.value
    }

    static func accessToken(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        let payload = (json["data"] as? [String: Any]) ?? json
        return (payload["access_token"] as? String).flatMap { $0.isEmpty ? nil : $0 }
    }

    static func isAuthPath(_ url: URL?) -> Bool {
        guard let path = url?.path else { return false }
        return ["/auth/refresh", "/auth/login", "/auth/oidc", "/auth/logout"].contains { path.hasSuffix($0) }
    }

    static func checked(_ data: Data, _ http: HTTPURLResponse) throws -> (Data, HTTPURLResponse) {
        guard (200..<300).contains(http.statusCode) else { throw APIError.badStatus(http.statusCode) }
        return (data, http)
    }
}

/// Mười request cùng nhận 401 thì chỉ MỘT lần refresh; các request khác chờ chung kết quả.
actor RefreshCoordinator {
    private var inFlight: Task<RefreshOutcome, Never>?

    /// `perform` gọi `POST /auth/refresh`. Nhận hàm thay vì nhận APIClient: test truyền hàm giả.
    func refresh(tokens: TokenStoring, failedToken: String?, perform: @escaping () async -> RefreshOutcome) async -> RefreshOutcome {
        // Luồng khác vừa refresh xong: token hiện tại khác token của request lỗi
        if let current = tokens.accessToken(), current != failedToken {
            return .newToken(current)
        }
        if let task = inFlight { return await task.value }
        let task = Task { await perform() }
        inFlight = task
        let outcome = await task.value
        inFlight = nil
        if case .newToken(let token) = outcome { tokens.saveAccessToken(token) }
        return outcome
    }
}
