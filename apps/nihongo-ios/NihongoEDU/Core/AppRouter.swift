import Foundation
import Observation

/// Điều hướng từ ngoài app: bấm thông báo, widget, URL `nihongo://srs`.
///
/// Bản cũ bắn `NotificationCenter.post(.navigateToSRS)`. Khi app khởi động lạnh do bấm thông báo,
/// sự kiện bắn ra TRƯỚC khi HomeView kịp nghe, nên bị mất và app chỉ mở Home. Router GIỮ route đang
/// chờ cho tới khi màn hình lấy ra: giống `Channel(BUFFERED)` thay `SharedFlow` bên Android (L8).
@Observable
@MainActor
final class AppRouter {
    static let shared = AppRouter()
    private(set) var pending: AppRoute?

    func open(_ route: AppRoute) { pending = route }

    /// Lấy route đang chờ đúng một lần.
    func consume() -> AppRoute? {
        defer { pending = nil }
        return pending
    }

    /// `nihongo://srs` / `nihongo://srs/` / `nihongo:///srs` → `.srs`.
    /// Trả false nếu URL không phải của app.
    @discardableResult
    func handle(url: URL) -> Bool {
        guard url.scheme == "nihongo" else { return false }
        let target = (url.host ?? "").lowercased().trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            .nilIfEmpty
            ?? url.path
                .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
                .lowercased()
                .nilIfEmpty
        switch target {
        case "srs": open(.srs)
        case "progress": open(.progress)
        default: return false
        }
        return true
    }
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
