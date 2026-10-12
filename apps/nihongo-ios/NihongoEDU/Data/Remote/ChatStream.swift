import Foundation

enum StreamEvent: Equatable {
    /// Vừa (nối lại) thành công. Tin gửi trong lúc mất kết nối không đi qua stream: tải lại lịch sử.
    case open
    /// Kết nối vừa đứt, đang chờ nối lại.
    case closed
    case message(ChatMessageDTO)
}

/// SSE `GET /api/community/rooms/{id}/stream` bằng `URLSession.bytes(for:)` + `.lines`.
/// Tự nối lại với backoff 1-2-4-8-16-30 giây; 4xx (trừ 408/429) thì dừng hẳn.
struct ChatStream {
    let client: APIClient
    /// Bẫy giống `readTimeout` bên Android: URLSession mặc định hủy request nếu 60 giây không có dữ liệu.
    /// Phòng chat im lặng hơn một phút là bình thường, nên đặt dài.
    static let idleTimeout: TimeInterval = 3600
    var sleep: (Duration) async throws -> Void = { try await Task.sleep(for: $0) }

    static func backoff(attempt: Int) -> Duration {
        .seconds(attempt >= 5 ? 30 : min(30, 1 << attempt))
    }

    static func retryable(_ status: Int) -> Bool { status >= 500 || status == 408 || status == 429 }

    /// Gateway gửi `data: {"data": <message>}`; chấp nhận cả message không bọc.
    static func parse(line: String) -> ChatMessageDTO? {
        guard line.hasPrefix("data:") else { return nil }
        let json = Data(line.dropFirst(5).trimmingCharacters(in: .whitespaces).utf8)
        struct Wrapped: Decodable { let data: ChatMessageDTO }
        if let w = try? JSONDecoder().decode(Wrapped.self, from: json) { return w.data }
        return try? JSONDecoder().decode(ChatMessageDTO.self, from: json)
    }

    func events(roomId: Int) -> AsyncStream<StreamEvent> {
        AsyncStream { continuation in
            let task = Task {
                var attempt = 0
                var token = client.tokens.accessToken()
                while !Task.isCancelled {
                    var shouldRetry = true
                    do {
                        var req = try client.request("community/rooms/\(roomId)/stream")
                        req.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                        req.timeoutInterval = Self.idleTimeout
                        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }

                        let (bytes, response) = try await client.session.bytes(for: req)
                        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                        if status == 401 {
                            // Token hết hạn lúc mở stream: refresh như request thường rồi mở lại ngay
                            if let fresh = await client.refreshAfterUnauthorized(failedToken: token) {
                                token = fresh
                                continue
                            }
                            break
                        }
                        guard (200..<300).contains(status) else {
                            shouldRetry = Self.retryable(status)
                            throw APIError.badStatus(status)
                        }

                        continuation.yield(.open)
                        attempt = 0
                        for try await line in bytes.lines {
                            if let message = Self.parse(line: line) { continuation.yield(.message(message)) }
                        }
                        // Hết body = server đóng stream (deploy, restart pod): nối lại
                    } catch is CancellationError {
                        break
                    } catch {
                        if Task.isCancelled || !shouldRetry { break }
                    }
                    guard !Task.isCancelled else { break }
                    continuation.yield(.closed)
                    try? await sleep(Self.backoff(attempt: attempt))
                    attempt += 1
                }
                continuation.finish()
            }
            // Không còn ai nghe (rời màn hình): hủy task, URLSession đóng kết nối
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}

/// Gộp lịch sử (REST), tin từ stream (SSE) và tin đang gửi. Cùng một tin có thể tới từ cả hai nguồn
/// (nhất là sau khi nối lại) nên loại trùng theo id; tin đang gửi luôn ở cuối. Hàm thuần để test.
func mergeMessages(history: [ChatMessage], live: [ChatMessage], pending: [ChatMessage]) -> [ChatMessage] {
    var byId: [Int: ChatMessage] = [:]
    for m in history + live { if let id = m.serverId { byId[id] = m } }
    let confirmed = byId.values.sorted { ($0.createdAt, $0.serverId ?? 0) < ($1.createdAt, $1.serverId ?? 0) }
    return confirmed + pending
}
