import SwiftUI

@Observable
@MainActor
final class ChatViewModel {
    let roomId: Int
    @ObservationIgnored let api: ChatServing
    @ObservationIgnored private let now: () -> Date
    private(set) var history: [ChatMessage] = []
    private(set) var live: [ChatMessage] = []
    private(set) var pending: [ChatMessage] = []
    private(set) var myId: Int?
    private(set) var connected = false
    var error: String?
    var draft = ""

    var messages: [ChatMessage] { mergeMessages(history: history, live: live, pending: pending) }

    init(roomId: Int, api: ChatServing = CommunityAPI(), now: @escaping () -> Date = Date.init) {
        self.roomId = roomId
        self.api = api
        self.now = now
    }

    /// Gọi trong `.task` của màn hình: rời màn hình thì task bị hủy, stream đóng.
    func run() async {
        myId = try? await api.me()
        await loadHistory()
        await api.markRead(roomId: roomId)
        for await event in api.events(roomId: roomId) {
            switch event {
            case .open:
                connected = true
                error = nil
                await loadHistory() // lấp tin lỡ trong lúc mất kết nối
            case .closed:
                connected = false
            case .message(let dto):
                live.append(dto.model)
            }
        }
        connected = false
    }

    func send() {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, let me = myId else { return }
        draft = ""
        // Lạc quan: hiện ngay với trạng thái đang gửi; "~" xếp sau mọi ngày ISO cho tới khi có giờ thật
        let msg = ChatMessage(serverId: nil, localId: UUID().uuidString, senderId: me, senderName: "Bạn",
                              content: text, createdAt: "~\(now().timeIntervalSince1970)", status: .sending)
        pending.append(msg)
        Task { await deliver(msg) }
    }

    func retry(_ localId: String) {
        guard let i = pending.firstIndex(where: { $0.localId == localId }) else { return }
        pending[i].status = .sending
        let msg = pending[i]
        Task { await deliver(msg) }
    }

    private func deliver(_ msg: ChatMessage) async {
        do {
            let sent = try await api.send(roomId: roomId, content: msg.content)
            // Thay tin lạc quan bằng tin thật. SSE cũng đẩy về đúng tin này: mergeMessages loại trùng.
            pending.removeAll { $0.localId == msg.localId }
            history.append(sent.model)
        } catch {
            if let i = pending.firstIndex(where: { $0.localId == msg.localId }) { pending[i].status = .failed }
        }
    }

    private func loadHistory() async {
        do { history = try await api.history(roomId: roomId).map(\.model) }
        catch { self.error = error.userMessage }
    }
}

struct RoomsView: View {
    @Environment(AuthState.self) private var auth
    @State private var rooms: [ChatRoomDTO] = []
    @State private var query = ""
    @State private var results: [ChatUserDTO] = []
    @State private var error: String?
    @State private var opened: Int?
    private let api = CommunityAPI()

    var body: some View {
        Group {
            if !auth.isLoggedIn {
                ContentUnavailableView("Đăng nhập để chat với học viên khác", systemImage: "person.2")
            } else {
                List {
                    Section {
                        TextField("Tìm học viên để nhắn tin", text: $query)
                            .textInputAutocapitalization(.never)
                        ForEach(results, id: \.id) { u in
                            Button("💬 \(u.displayName)") { Task { await startChat(u) } }
                        }
                    }
                    Section("Cuộc trò chuyện") {
                        if rooms.isEmpty { Text(error ?? "Chưa có cuộc trò chuyện nào.").foregroundStyle(.secondary) }
                        ForEach(rooms, id: \.id) { r in
                            NavigationLink(value: AppRoute.chat(roomId: r.id)) {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(r.name ?? "Hội thoại").font(.headline)
                                        if let last = r.lastMessage?.content { Text(last).font(.caption).lineLimit(1) }
                                    }
                                    Spacer()
                                    if let n = r.unreadCount, n > 0 { Text("\(n)").font(.caption.bold()).padding(6).background(.red, in: Circle()).foregroundStyle(.white) }
                                }
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Cộng đồng")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(item: $opened) { ChatView(roomId: $0) }
        .task { await load() }
        // Debounce kiểu SwiftUI: mỗi lần gõ, task cũ bị hủy (giống mapLatest/switchMap); chờ 300 ms mới tìm
        .task(id: query) {
            guard query.count >= 2 else { results = []; return }
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            results = (try? await api.searchUsers(query)) ?? []
        }
    }

    private func load() async {
        guard auth.isLoggedIn else { return }
        do { rooms = try await api.rooms() } catch { self.error = error.userMessage }
    }

    private func startChat(_ u: ChatUserDTO) async {
        do { opened = try await api.openDirect(userId: u.id) } catch { self.error = error.userMessage }
    }
}

struct ChatView: View {
    @State private var vm: ChatViewModel

    init(roomId: Int) { _vm = State(initialValue: ChatViewModel(roomId: roomId)) }

    var body: some View {
        VStack(spacing: 0) {
            if let e = vm.error { Text(e).font(.caption).foregroundStyle(.red).padding(4) }
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 6) {
                        ForEach(vm.messages) { m in
                            Bubble(message: m, mine: m.senderId == vm.myId) { if let id = m.localId { vm.retry(id) } }
                                .id(m.id)
                        }
                    }
                    .padding(12)
                }
                .onChange(of: vm.messages.count) { _, _ in
                    if let last = vm.messages.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
                }
            }
            HStack {
                TextField("Nhắn tin…", text: $vm.draft).textFieldStyle(.roundedBorder)
                Button("Gửi") { vm.send() }.buttonStyle(.borderedProminent).disabled(vm.draft.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(8)
        }
        .navigationTitle(vm.connected ? "Phòng chat · trực tuyến" : "Phòng chat · đang kết nối…")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.run() }
    }
}

private struct Bubble: View {
    let message: ChatMessage
    let mine: Bool
    let onRetry: () -> Void

    var body: some View {
        HStack {
            if mine { Spacer(minLength: 40) }
            VStack(alignment: .leading, spacing: 2) {
                if !mine { Text(message.senderName).font(.caption2).foregroundStyle(.secondary) }
                Text(message.content)
                switch message.status {
                case .sending: Text("Đang gửi…").font(.caption2)
                case .failed: Button("Gửi lỗi · chạm để thử lại", action: onRetry).font(.caption2).foregroundStyle(.red)
                case .sent: EmptyView()
                }
            }
            .padding(10)
            .background(mine ? Color.red.opacity(0.15) : Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
            if !mine { Spacer(minLength: 40) }
        }
    }
}
