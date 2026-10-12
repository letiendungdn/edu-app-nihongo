import Foundation
import Observation

/// Trạng thái đăng nhập dùng chung. Bản cũ chỉ cập nhật khi màn hình nhớ gọi `refresh()`, nên token
/// bị xóa ở chỗ khác (refresh token hết hạn) mà UI vẫn hiện "Đã đăng nhập". Giờ tự nghe thay đổi token.
@Observable
@MainActor
final class AuthState {
    var isLoggedIn: Bool
    @ObservationIgnored private var observers: [NSObjectProtocol] = []
    @ObservationIgnored private let read: () -> Bool

    init(read: @escaping () -> Bool = { TokenStore.isLoggedIn }, center: NotificationCenter = .default) {
        self.read = read
        isLoggedIn = read()
        for name in [Notification.Name.authTokensChanged, .sessionExpired] {
            observers.append(center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.refresh() }
            })
        }
    }

    func refresh() {
        isLoggedIn = read()
    }
}
