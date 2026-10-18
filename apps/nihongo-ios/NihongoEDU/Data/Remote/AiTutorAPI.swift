import Foundation

/// `POST /api/ai/chat`. Bản cũ: gọi `/ai/chat` (gateway đặt route thiếu `api/` → luôn 404) và đọc
/// `json["answer"]` ở cấp ngoài, trong khi gateway bọc `{ success, data: { answer } }` → luôn rỗng.
struct AiTutorAPI {
    var client: APIClient = .shared

    struct Message: Encodable { let role: String; let content: String }
    private struct Body: Encodable { let question: String; let history: [Message]; let context: String? }
    private struct Answer: Decodable { let answer: String }

    func ask(question: String, history: [[String: String]], context: String? = nil) async throws -> String {
        let messages = history.compactMap { m -> Message? in
            guard let role = m["role"], let content = m["content"] else { return nil }
            return Message(role: role, content: content)
        }
        let body = Body(question: question, history: messages, context: (context?.isEmpty ?? true) ? nil : context)
        let (data, _) = try await client.send(try client.request("ai/chat", method: "POST", body: body))
        guard let answer = try JSONDecoder().decode(Envelope<Answer>.self, from: data).data?.answer else {
            throw APIError.decodingFailed
        }
        return answer.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
