import Foundation

struct ChatUserDTO: Decodable, Equatable { let id: Int; let name: String?; let email: String? }

struct ChatMessageDTO: Decodable, Equatable {
    let id: Int
    let roomId: Int
    let senderId: Int
    let content: String?
    let createdAt: String?
    let sender: ChatUserDTO?
}

struct ChatRoomDTO: Decodable {
    let id: Int
    let name: String?
    let lastMessage: ChatMessageDTO?
    let unreadCount: Int?
}

struct ChatRoomDetailDTO: Decodable {
    struct Info: Decodable { let id: Int; let name: String? }
    let room: Info
    let messages: [ChatMessageDTO]?
}

extension ChatUserDTO {
    var displayName: String { (name?.isEmpty == false ? name : nil) ?? email?.components(separatedBy: "@").first ?? "Người dùng" }
}

struct ChatMessage: Equatable, Identifiable {
    enum Status: Equatable { case sending, sent, failed }
    let serverId: Int?
    /// Chỉ có ở tin đang gửi (chưa có id từ server): tin "lạc quan".
    let localId: String?
    let senderId: Int
    let senderName: String
    let content: String
    let createdAt: String
    var status: Status = .sent
    var id: String { serverId.map { "s\($0)" } ?? "l\(localId ?? "")" }
}

extension ChatMessageDTO {
    var model: ChatMessage {
        ChatMessage(serverId: id, localId: nil, senderId: senderId, senderName: sender?.displayName ?? "Người dùng",
                    content: content ?? "", createdAt: createdAt ?? "")
    }
}

protocol ChatServing {
    func me() async throws -> Int
    func rooms() async throws -> [ChatRoomDTO]
    func history(roomId: Int) async throws -> [ChatMessageDTO]
    func send(roomId: Int, content: String) async throws -> ChatMessageDTO
    func markRead(roomId: Int) async
    func searchUsers(_ q: String) async throws -> [ChatUserDTO]
    func openDirect(userId: Int) async throws -> Int
    func events(roomId: Int) -> AsyncStream<StreamEvent>
}

struct CommunityAPI: ChatServing {
    var client: APIClient = .shared

    private func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        let (data, _) = try await client.send(try client.request(path, query: query))
        guard let v = try JSONDecoder().decode(Envelope<T>.self, from: data).data else { throw APIError.decodingFailed }
        return v
    }

    private struct Me: Decodable { let id: Int }
    private struct Sent: Decodable { let message: ChatMessageDTO }

    func me() async throws -> Int { (try await get("auth/me") as Me).id }
    func rooms() async throws -> [ChatRoomDTO] { try await get("community/rooms") }
    func history(roomId: Int) async throws -> [ChatMessageDTO] { (try await get("community/rooms/\(roomId)") as ChatRoomDetailDTO).messages ?? [] }
    func searchUsers(_ q: String) async throws -> [ChatUserDTO] { try await get("community/users", query: [.init(name: "q", value: q)]) }

    func send(roomId: Int, content: String) async throws -> ChatMessageDTO {
        let (data, _) = try await client.send(try client.request("community/rooms/\(roomId)/messages", method: "POST", body: ["content": content]))
        guard let s = try JSONDecoder().decode(Envelope<Sent>.self, from: data).data else { throw APIError.decodingFailed }
        return s.message
    }

    func markRead(roomId: Int) async {
        _ = try? await client.send(try client.request("community/rooms/\(roomId)/read", method: "PATCH"))
    }

    func openDirect(userId: Int) async throws -> Int {
        let (data, _) = try await client.send(try client.request("community/rooms/direct", method: "POST", body: ["userId": userId]))
        guard let d = try JSONDecoder().decode(Envelope<ChatRoomDetailDTO>.self, from: data).data else { throw APIError.decodingFailed }
        return d.room.id
    }

    func events(roomId: Int) -> AsyncStream<StreamEvent> { ChatStream(client: client).events(roomId: roomId) }
}
