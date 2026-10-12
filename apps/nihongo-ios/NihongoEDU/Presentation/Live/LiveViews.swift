import LiveKit
import SwiftUI

struct LiveListView: View {
    @Environment(AuthState.self) private var auth
    @State private var sessions: [LiveSessionSummary] = []
    @State private var loading = true
    @State private var error: String?
    @State private var joinPayload: LiveJoinResponse?
    @State private var hostPayload: LiveJoinResponse?
    @State private var titleInput = "Buổi học live"

    var body: some View {
        List {
            if auth.isLoggedIn {
                Section("Phát live") {
                    TextField("Tiêu đề buổi học", text: $titleInput)
                    Button("Bắt đầu phát") {
                        Task { await createHost() }
                    }
                }
            } else {
                Section {
                    Text("Đăng nhập để host livestream.")
                        .foregroundStyle(.secondary)
                }
            }

            Section("Đang live") {
                if loading {
                    ProgressView()
                } else if let error {
                    Text(error).foregroundStyle(.red)
                } else if sessions.isEmpty {
                    Text("Chưa có buổi live nào.").foregroundStyle(.secondary)
                } else {
                    ForEach(sessions) { session in
                        Button {
                            Task { await join(session.id) }
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(session.title).font(.headline)
                                Text(session.coachName ?? session.roomName)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Livestream")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
        .navigationDestination(item: $joinPayload) { payload in
            LiveViewerView(join: payload)
        }
        .navigationDestination(item: $hostPayload) { payload in
            LiveHostView(join: payload)
        }
    }

    private func load() async {
        loading = true
        error = nil
        do {
            sessions = try await LiveAPI().listSessions()
        } catch {
            self.error = error.userMessage
        }
        loading = false
    }

    private func join(_ id: Int) async {
        do {
            joinPayload = try await LiveAPI().joinSession(id: id)
        } catch {
            self.error = error.userMessage
        }
    }

    private func createHost() async {
        do {
            hostPayload = try await LiveAPI().createSession(title: titleInput)
        } catch {
            self.error = error.userMessage
        }
    }
}

struct LiveHostView: View {
    let join: LiveJoinResponse
    @Environment(\.dismiss) private var dismiss
    @StateObject private var room = Room()
    @State private var connecting = true
    @State private var error: String?
    @State private var micOn = true
    @State private var camOn = true

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let track = firstLocalVideoTrack {
                SwiftUIVideoView(track).ignoresSafeArea()
            } else if connecting {
                ProgressView("Đang kết nối…").tint(.white)
            }

            if let error {
                Text(error).foregroundStyle(.red).padding()
            }

            VStack {
                HStack {
                    Text("LIVE").font(.caption.bold())
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(.red, in: Capsule())
                        .foregroundStyle(.white)
                    Spacer()
                    Text("\(room.remoteParticipants.count) viewers")
                        .foregroundStyle(.white)
                }
                .padding()
                Spacer()
                HStack(spacing: 16) {
                    Button(micOn ? "Mic ON" : "Mic OFF") {
                        Task { await toggleMic() }
                    }
                    Button(camOn ? "Cam ON" : "Cam OFF") {
                        Task { await toggleCam() }
                    }
                    Button("Kết thúc", role: .destructive) {
                        Task { await end() }
                    }
                }
                .buttonStyle(.borderedProminent)
                .padding()
            }
        }
        .navigationBarBackButtonHidden(true)
        .task { await connect() }
        .onDisappear {
            Task { await room.disconnect() }
        }
    }

    private var firstLocalVideoTrack: VideoTrack? {
        for publication in room.localParticipant.trackPublications.values {
            if let track = publication.track as? VideoTrack {
                return track
            }
        }
        return nil
    }

    private func connect() async {
        do {
            try await room.connect(url: join.wsUrl, token: join.token)
            try await room.localParticipant.setCamera(enabled: true)
            try await room.localParticipant.setMicrophone(enabled: true)
            connecting = false
        } catch {
            self.error = error.userMessage
            connecting = false
        }
    }

    private func toggleMic() async {
        micOn.toggle()
        try? await room.localParticipant.setMicrophone(enabled: micOn)
    }

    private func toggleCam() async {
        camOn.toggle()
        try? await room.localParticipant.setCamera(enabled: camOn)
    }

    private func end() async {
        try? await LiveAPI().endSession(id: join.sessionId)
        await room.disconnect()
        dismiss()
    }
}

struct LiveViewerView: View {
    let join: LiveJoinResponse
    @StateObject private var room = Room()
    @State private var connecting = true
    @State private var error: String?
    @State private var chatInput = ""
    @State private var messages: [(text: String, isMe: Bool)] = []

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let track = firstRemoteVideoTrack {
                SwiftUIVideoView(track).ignoresSafeArea()
            } else if connecting {
                ProgressView("Đang vào phòng…").tint(.white)
            } else {
                Text(join.title ?? "Chờ coach bắt đầu…")
                    .foregroundStyle(.white)
            }

            if let error {
                Text(error).foregroundStyle(.red)
            }

            VStack {
                HStack {
                    Text("LIVE").font(.caption.bold())
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(.red, in: Capsule())
                        .foregroundStyle(.white)
                    Spacer()
                    Text("\(room.remoteParticipants.count) online")
                        .foregroundStyle(.white)
                }
                .padding()

                Spacer()

                VStack(alignment: .leading, spacing: 6) {
                    ForEach(Array(messages.suffix(5).enumerated()), id: \.offset) { _, msg in
                        Text(msg.isMe ? "Bạn: \(msg.text)" : msg.text)
                            .font(.caption)
                            .foregroundStyle(.white)
                            .padding(6)
                            .background(.black.opacity(0.45), in: RoundedRectangle(cornerRadius: 6))
                    }
                    HStack {
                        TextField("Chat…", text: $chatInput)
                            .textFieldStyle(.roundedBorder)
                        Button("Gửi") { Task { await sendChat() } }
                    }
                }
                .padding()
            }
        }
        .navigationTitle(join.title ?? "Xem live")
        .navigationBarTitleDisplayMode(.inline)
        .task { await connect() }
        .onDisappear {
            Task { await room.disconnect() }
        }
    }

    private var firstRemoteVideoTrack: VideoTrack? {
        for participant in room.remoteParticipants.values {
            for publication in participant.trackPublications.values {
                if let track = publication.track as? VideoTrack {
                    return track
                }
            }
        }
        return nil
    }

    private func connect() async {
        do {
            try await room.connect(url: join.wsUrl, token: join.token)
            connecting = false
        } catch {
            self.error = error.userMessage
            connecting = false
        }
    }

    private func sendChat() async {
        let text = chatInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, let data = text.data(using: .utf8) else { return }
        try? await room.localParticipant.publish(data: data)
        messages.append((text, true))
        chatInput = ""
    }
}
