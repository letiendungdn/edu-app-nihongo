import XCTest
@testable import NihongoEDU

/// Luyện câu và gia sư AI giờ đi qua gateway (key AI chỉ nằm ở server).
final class AiAPITests: XCTestCase {
    private var client: APIClient!

    override func setUp() {
        client = APIClient(session: StubURLProtocol.session, baseURL: "http://test.local/api",
                           tokens: MemoryTokenStore("tok"), allowSecureCookieOverHTTP: false)
    }

    func testSentenceFeedbackCallsGatewayWithTokenNotGoogle() async throws {
        StubURLProtocol.reset([StubURLProtocol.json(
            #"{"success":true,"data":{"corrected":"","reading":"わたしは","meaning":"Tôi","explanation":"Đúng","examples":["a"]}}"#
        )])

        let fb = try await SentenceFeedbackAPI(client: client).analyze("私は")

        XCTAssertEqual(fb, SentenceFeedback(corrected: "", reading: "わたしは", meaning: "Tôi", explanation: "Đúng", examples: ["a"]))
        let req = StubURLProtocol.requests[0]
        XCTAssertEqual(req.url?.host, "test.local") // không còn gọi generativelanguage.googleapis.com
        XCTAssertEqual(req.url?.path, "/api/ai/sentence-feedback")
        XCTAssertEqual(req.value(forHTTPHeaderField: "Authorization"), "Bearer tok")
        XCTAssertNil(req.url?.query) // không còn ?key=
    }

    func testSentenceFeedbackServerErrorThrows() async {
        // Bản cũ bỏ qua mã lỗi: hết hạn mức → kết quả rỗng như thể câu đúng
        StubURLProtocol.reset([StubURLProtocol.json(#"{"success":false}"#, status: 503)])
        do {
            _ = try await SentenceFeedbackAPI(client: client).analyze("x")
            XCTFail("phải ném lỗi")
        } catch {
            XCTAssertEqual(error as? APIError, .badStatus(503))
        }
    }

    func testTutorUnwrapsEnvelopeAndUsesApiPrefix() async throws {
        // Bản cũ đọc json["answer"] ở cấp ngoài → luôn rỗng; và gọi /ai/chat (404)
        StubURLProtocol.reset([StubURLProtocol.json(#"{"success":true,"data":{"answer":"  は là trợ từ chủ đề. "}}"#)])

        let answer = try await AiTutorAPI(client: client).ask(
            question: "は là gì?", history: [["role": "user", "content": "chào"]])

        XCTAssertEqual(answer, "は là trợ từ chủ đề.")
        XCTAssertEqual(StubURLProtocol.requests[0].url?.path, "/api/ai/chat")
    }
}
