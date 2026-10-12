import Foundation

struct ExamTemplateDTO: Decodable {
    let id: Int
    let slug: String?
    let level: String?
    let title: String?
    let durationMinutes: Int?
    let totalQuestions: Int?
    let scope: String?
}

struct ExamDTO: Decodable {
    struct Question: Decodable {
        struct Option: Decodable { let text: String? }
        let id: String
        let sectionName: String?
        let question: String?
        let options: [Option]?
        let audioText: String?
    }
    let examId: String
    let title: String?
    let level: String?
    let durationMinutes: Int?
    let questions: [Question]?
}

struct ExamResultDTO: Decodable {
    struct Section: Decodable { let sectionName: String?; let correct: Int?; let total: Int? }
    struct Review: Decodable { let question: String?; let correctAnswer: String?; let userAnswer: String? }
    let correctCount: Int?
    let total: Int?
    let percent: Int?
    let passed: Bool?
    let sectionScores: [Section]?
    let review: [Review]?
}

struct ExamAPI {
    var client: APIClient = .shared

    func templates() async throws -> [ExamTemplateDTO] {
        let (data, _) = try await client.send(try client.request("mock-exams"))
        return try JSONDecoder().decode(Envelope<[ExamTemplateDTO]>.self, from: data).data ?? []
    }

    func start(key: String) async throws -> ExamDTO {
        let (data, _) = try await client.send(try client.request("mock-exams/\(key)/start", method: "POST"))
        guard let exam = try JSONDecoder().decode(Envelope<ExamDTO>.self, from: data).data else { throw APIError.decodingFailed }
        return exam
    }

    func submit(examId: String, answers: [String: String]) async throws -> ExamResultDTO {
        let (data, _) = try await client.send(try client.request("mock-exams/\(examId)/submit", method: "POST", body: ["answers": answers]))
        guard let r = try JSONDecoder().decode(Envelope<ExamResultDTO>.self, from: data).data else { throw APIError.decodingFailed }
        return r
    }
}
