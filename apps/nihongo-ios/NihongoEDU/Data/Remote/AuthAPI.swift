import Foundation

struct AuthAPI {
    var client: APIClient = .shared

    /// Server trả access token trong body và refresh token trong cookie httpOnly `refresh_token`
    /// (path /api/auth). URLSession tự lưu cookie vào HTTPCookieStorage, APIClient dùng nó khi gặp 401.
    func login(email: String, password: String) async throws {
        try await postAuth(path: "auth/login", body: ["email": email, "password": password])
    }

    func loginOidc(accessToken: String, idToken: String?) async throws {
        var body = ["accessToken": accessToken]
        if let idToken, !idToken.isEmpty { body["idToken"] = idToken }
        try await postAuth(path: "auth/oidc", body: body)
    }

    /// Cookie refresh token đi kèm nên server thu hồi được nó.
    func logout() async {
        defer { client.tokens.clear() }
        guard let req = try? client.request("auth/logout", method: "POST") else { return }
        _ = try? await client.send(req)
    }

    private func postAuth(path: String, body: [String: String]) async throws {
        let req = try client.request(path, method: "POST", body: body)
        let (data, _) = try await client.send(req)
        guard let token = APIClient.accessToken(from: data) else { throw APIError.decodingFailed }
        client.tokens.saveAccessToken(token)
    }
}
