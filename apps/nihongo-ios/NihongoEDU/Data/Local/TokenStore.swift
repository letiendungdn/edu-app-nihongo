import Foundation
import Security

extension Notification.Name {
    /// Token vừa được lưu hoặc xóa: AuthState cập nhật theo.
    static let authTokensChanged = Notification.Name("authTokensChanged")
}

enum TokenStore {
    private static let service = "com.edu.nihongo.ios"
    private static let installFlagKey = "hasLaunchedBefore"

    static func saveAccessToken(_ token: String) {
        write(token, account: "access_token")
        NotificationCenter.default.post(name: .authTokensChanged, object: nil)
    }

    static func saveRefreshToken(_ token: String) {
        write(token, account: "refresh_token")
    }

    static func accessToken() -> String? { read(account: "access_token") }
    static func refreshToken() -> String? { read(account: "refresh_token") }

    static func clear() {
        delete(account: "access_token")
        delete(account: "refresh_token")
        NotificationCenter.default.post(name: .authTokensChanged, object: nil)
    }

    static var isLoggedIn: Bool { accessToken() != nil }

    /// Keychain KHÔNG bị xóa khi gỡ app (khác UserDefaults và file trong sandbox). Cài lại app thì
    /// token cũ vẫn còn: app tưởng đang đăng nhập với một token đã hết hạn hoặc của người khác.
    /// Cờ trong UserDefaults thì bị xóa theo app, nên "chưa có cờ" nghĩa là lần chạy đầu sau khi cài.
    static func clearIfFreshInstall(defaults: UserDefaults = .standard, clearKeychain: () -> Void = { TokenStore.clear() }) {
        guard !defaults.bool(forKey: installFlagKey) else { return }
        clearKeychain()
        defaults.set(true, forKey: installFlagKey)
    }

    private static func write(_ token: String, account: String) {
        let data = Data(token.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
        var add = query
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(add as CFDictionary, nil)
    }

    private static func read(account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func delete(account: String) {
        SecItemDelete([
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ] as CFDictionary)
    }
}
