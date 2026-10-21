import SwiftUI
import SwiftData
import UserNotifications

enum AppRoute: Hashable {
    case vocab, srs, sentencePractice, login, cameraTranslate, live, progress
    case reading, readingDetail(id: Int), exams, exam(id: String), kana, community, chat(roomId: Int)
    case aiTutor, pronunciation(kana: String, meaning: String), kanjiDraw(kanji: String, kana: String)
    case premium
}

struct HomeView: View {
    @Environment(AuthState.self) private var authState
    @Environment(PushService.self) private var pushService
    @Environment(NetworkMonitor.self) private var network
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var engine
    @Environment(AppRouter.self) private var router
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Hero
                    VStack(spacing: 8) {
                        Text("🇯🇵").font(.system(size: 52))
                        Text("Học tiếng Nhật")
                            .font(.system(size: 26, weight: .bold))
                        Text("Offline-first · SM-2 SRS · AI Gemini")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                        HStack(spacing: 6) {
                            Circle()
                                .fill(network.isOnline ? Color.green : Color.orange)
                                .frame(width: 8, height: 8)
                            Text(network.isOnline ? "Online" : "Offline")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(.secondary)
                        }
                        .padding(.top, 4)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(28)
                    .background(.background, in: RoundedRectangle(cornerRadius: 20))
                    .overlay(RoundedRectangle(cornerRadius: 20).stroke(.separator, lineWidth: 0.5))
                    .padding(.bottom, 24)

                    SectionLabel("TÀI KHOẢN")
                    if authState.isLoggedIn {
                        NavCard(title: "Đã đăng nhập", subtitle: "Keycloak / JWT local", icon: "👤") {
                            Task {
                                await pushService.unregisterFromBackend()
                                await AuthAPI().logout()
                                authState.refresh()
                            }
                        }
                    } else {
                        NavCard(title: "Đăng nhập", subtitle: "Keycloak OIDC hoặc email", icon: "🔑") {
                            path.append(AppRoute.login)
                        }
                    }

                    NavCard(title: "Nâng cấp Premium", subtitle: "Mua gói bằng Apple Pay", icon: "⭐️") {
                        path.append(AppRoute.premium)
                    }

                    ReminderPermissionCard()

                    SectionLabel("HỌC TẬP")
                    NavCard(title: "Tiến độ học", subtitle: "Chuỗi ngày học, thống kê, biểu đồ 14 ngày", icon: "📈", badge: "MỚI") {
                        path.append(AppRoute.progress)
                    }
                    NavCard(title: "Bài học", subtitle: "Từ vựng · ngữ pháp · kanji, dùng được offline", icon: "📖") {
                        path.append(AppRoute.vocab)
                    }
                    NavCard(title: "Ôn tập SRS", subtitle: "Spaced repetition — SM-2 algorithm", icon: "🔁") {
                        path.append(AppRoute.srs)
                    }

                    NavCard(title: "Đọc hiểu", subtitle: "Bài đọc + câu hỏi, chấm cả khi offline", icon: "📰") {
                        path.append(AppRoute.reading)
                    }
                    NavCard(title: "Thi thử JLPT", subtitle: "Đếm giờ, tắt app vẫn làm tiếp được", icon: "📝") {
                        path.append(AppRoute.exams)
                    }

                    SectionLabel("LUYỆN TẬP")
                    NavCard(title: "Luyện kana", subtitle: "Hiragana · Katakana, chữ hay sai hỏi lại nhiều hơn", icon: "あ") {
                        path.append(AppRoute.kana)
                    }
                    NavCard(title: "Luyện câu AI", subtitle: "Phân tích & sửa câu bằng Gemini", icon: "🤖", badge: "MỚI") {
                        path.append(AppRoute.sentencePractice)
                    }
                    NavCard(title: "Dịch camera", subtitle: "OCR tiếng Nhật → dịch tiếng Việt", icon: "📷", badge: "MỚI") {
                        path.append(AppRoute.cameraTranslate)
                    }
                    NavCard(title: "Luyện phát âm", subtitle: "Speech-to-text tiếng Nhật + điểm", icon: "🎤") {
                        path.append(AppRoute.pronunciation(kana: "おはようございます", meaning: "Chào buổi sáng"))
                    }
                    NavCard(title: "Vẽ Kanji", subtitle: "Luyện viết tay trên màn hình", icon: "✍️") {
                        path.append(AppRoute.kanjiDraw(kanji: "行", kana: "いく"))
                    }

                    SectionLabel("CỘNG ĐỒNG")
                    NavCard(title: "Chat cộng đồng", subtitle: "Nhắn tin realtime với học viên khác", icon: "💬") {
                        path.append(AppRoute.community)
                    }

                    SectionLabel("AI & LIVESTREAM")
                    NavCard(title: "AI Tutor", subtitle: "Hỏi ngữ pháp / từ vựng", icon: "🧠") {
                        path.append(AppRoute.aiTutor)
                    }
                    NavCard(title: "Livestream", subtitle: "Xem / phát buổi học LiveKit", icon: "📡") {
                        path.append(AppRoute.live)
                    }
                }
                .padding(16)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Nihongo EDU")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: AppRoute.self) { route in
                switch route {
                case .vocab:             VocabView()
                case .srs:               SRSView()
                case .sentencePractice:  SentencePracticeView()
                case .login:             LoginView()
                case .cameraTranslate:   CameraTranslateView()
                case .live:              LiveListView()
                case .aiTutor:           AiTutorView()
                case .pronunciation(let kana, let meaning):
                    PronunciationView(kana: kana, meaning: meaning)
                case .kanjiDraw(let kanji, let kana):
                    KanjiDrawView(kanji: kanji, kana: kana)
                case .progress:          ProgressScreen()
                case .reading:           ReadingListView()
                case .readingDetail(let id): ReadingDetailView(id: id)
                case .exams:             ExamListView()
                case .exam(let id):      ExamView(examId: id)
                case .kana:              KanaView()
                case .community:         RoomsView()
                case .chat(let roomId):  ChatView(roomId: roomId)
                case .premium:           PremiumView()
                }
            }
            // Mạng vừa có lại: gửi hàng đợi ôn tập
            .task(id: network.isOnline) {
                await engine.flush(in: modelContext, isOnline: network.isOnline, isLoggedIn: authState.isLoggedIn)
            }
            // Route từ thông báo / widget / UITEST_DEEPLINK.
            // `initial: true` bắt cả trường hợp pending đã set trước khi Home gắn listener.
            .onChange(of: router.pending, initial: true) { _, pending in
                guard pending != nil, let route = router.consume() else { return }
                path.append(route)
            }
        }
    }
}

/// Hỏi quyền thông báo trong ngữ cảnh (người dùng hiểu để làm gì), không bật hộp thoại ngay khi mở app:
/// iOS chỉ hỏi ĐÚNG MỘT LẦN, từ chối rồi thì phải vào Cài đặt.
private struct ReminderPermissionCard: View {
    @Environment(PushService.self) private var push
    @Environment(\.modelContext) private var context
    @State private var status: UNAuthorizationStatus = .authorized

    var body: some View {
        Group {
            if status == .notDetermined {
                NavCard(title: "Bật nhắc ôn tập", subtitle: "20:00 mỗi tối khi có thẻ SRS đến hạn", icon: "🔔") {
                    Task {
                        await push.requestPermissionIfNeeded()
                        status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
                        DueCardsReporter.shared.report(from: context)
                    }
                }
            }
        }
        .task { status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus }
    }
}

private struct SectionLabel: View {
    let text: String
    init(_ text: String) { self.text = text }

    var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(.secondary)
            .tracking(1)
            .padding(.top, 8)
            .padding(.bottom, 10)
    }
}
