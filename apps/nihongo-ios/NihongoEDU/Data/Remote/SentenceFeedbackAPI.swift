import Foundation

struct SentenceFeedback: Codable, Equatable, Sendable {
    var corrected: String
    var reading: String
    var meaning: String
    var explanation: String
    var examples: [String]
}

/// `POST /api/ai/sentence-feedback`: AI chạy ở server.
///
/// Bản cũ (`GeminiAPI`) gọi thẳng Google bằng `GEMINI_API_KEY` nằm trong app: ai bắt request cũng
/// lấy được key và dùng bằng tiền của mình. Lại bỏ qua mã lỗi HTTP: Gemini báo hết hạn mức thì app
/// parse JSON rác và hiện kết quả rỗng như thể câu đúng.
struct SentenceFeedbackAPI {
    var client: APIClient = .shared

    func analyze(_ sentence: String) async throws -> SentenceFeedback {
        let req = try client.request("ai/sentence-feedback", method: "POST", body: ["sentence": sentence])
        let (data, _) = try await client.send(req) // lỗi HTTP → throw; 401 → tự refresh
        guard let feedback = try JSONDecoder().decode(Envelope<SentenceFeedback>.self, from: data).data else {
            throw APIError.decodingFailed
        }
        return feedback
    }
}
