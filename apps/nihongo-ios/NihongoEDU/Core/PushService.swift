import Foundation
import Observation
import UIKit
import UserNotifications

@Observable
final class PushService: NSObject, UNUserNotificationCenterDelegate {
    private(set) var deviceToken: String?

    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    /// Gọi MỖI lần mở app. APNs có thể cấp token mới (cài lại app, khôi phục máy); bản cũ chỉ gọi
    /// registerForRemoteNotifications đúng lần đầu cấp quyền, nên lần mở sau không bao giờ có token,
    /// và server giữ token cũ đã chết.
    func registerIfAuthorized() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        guard [.authorized, .provisional, .ephemeral].contains(settings.authorizationStatus) else { return }
        await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
    }

    /// Hỏi quyền nếu người dùng chưa quyết định. Gọi sau khi đăng nhập hoặc khi bấm "Bật nhắc ôn".
    @discardableResult
    func requestPermissionIfNeeded() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        if settings.authorizationStatus == .notDetermined {
            let granted = (try? await center.requestAuthorization(options: [.alert, .badge, .sound])) ?? false
            if granted { await MainActor.run { UIApplication.shared.registerForRemoteNotifications() } }
            return granted
        }
        return settings.authorizationStatus == .authorized
    }

    /// AppDelegate gọi khi APNs trả token.
    func setDeviceToken(_ data: Data) {
        deviceToken = data.map { String(format: "%02x", $0) }.joined()
        Task { await registerWithBackend() }
    }

    /// Token có thể tới trước khi đăng nhập: gọi lại ngay sau khi đăng nhập xong.
    func registerWithBackend(client: APIClient = .shared) async {
        guard let token = deviceToken, client.tokens.accessToken() != nil,
              let req = try? client.request("push/register", method: "POST", body: ["token": token, "platform": "ios"])
        else { return }
        _ = try? await client.send(req)
    }

    func unregisterFromBackend(client: APIClient = .shared) async {
        guard let token = deviceToken, client.tokens.accessToken() != nil,
              let req = try? client.request("push/unregister", method: "DELETE", body: ["token": token])
        else { return }
        _ = try? await client.send(req)
        deviceToken = nil
    }

    // MARK: - UNUserNotificationCenterDelegate

    // Hiện banner cả khi app đang mở
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .badge, .sound])
    }

    // Bấm thông báo (push từ server hoặc nhắc ôn cục bộ): payload { screen: "srs" }
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let screen = response.notification.request.content.userInfo["screen"] as? String
        Task { @MainActor in
            if screen == "srs" { AppRouter.shared.open(.srs) }
            completionHandler()
        }
    }
}
