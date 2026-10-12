import SwiftUI
import SwiftData

@main
struct NihongoEDUApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @Environment(\.scenePhase) private var scenePhase

    private let modelContainer: ModelContainer
    @State private var authState: AuthState
    @State private var pushService = PushService()
    @State private var networkMonitor = NetworkMonitor()
    @State private var syncEngine = SyncEngine()
    @State private var router = AppRouter.shared

    init() {
        // Keychain sống sót qua việc gỡ app: cài lại thì xóa token cũ trước khi đọc trạng thái đăng nhập
        TokenStore.clearIfFreshInstall()
        _authState = State(initialValue: AuthState())
        do {
            let (container, quarantined) = try AppStore.makeContainer()
            if let quarantined { print("[SwiftData] Store cũ không mở được, đã cất ở \(quarantined.path)") }
            modelContainer = container
        } catch {
            fatalError("ModelContainer init failed: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environment(authState)
                .environment(pushService)
                .environment(networkMonitor)
                .environment(syncEngine)
                .environment(router)
                .task {
                    appDelegate.pushService = pushService
                    await pushService.registerIfAuthorized()
                }
                // nihongo://srs từ widget
                .onOpenURL { router.handle(url: $0) }
                .onChange(of: authState.isLoggedIn) { _, loggedIn in
                    guard loggedIn else { return }
                    Task {
                        await pushService.requestPermissionIfNeeded()
                        await pushService.registerWithBackend()
                    }
                }
        }
        .modelContainer(modelContainer)
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active else { return }
            let context = modelContainer.mainContext
            // Quay lại app: gửi hàng đợi còn tồn, cập nhật widget và giờ nhắc
            Task { @MainActor in
                await syncEngine.flush(in: context, isOnline: networkMonitor.isOnline, isLoggedIn: authState.isLoggedIn)
                DueCardsReporter.shared.report(from: context)
            }
        }
    }
}
