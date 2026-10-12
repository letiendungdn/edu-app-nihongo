import Foundation

struct LearningProgressDTO: Decodable {
    struct Summary: Decodable {
        let currentStreak: Int?
        let longestStreak: Int?
        let totalSeconds: Int?
        let totalCards: Int?
        let vocabTotal: Int?
        let kanjiTotal: Int?
    }
    struct Day: Decodable {
        let studyDate: String?
        let seconds: Int?
        let cardsReviewed: Int?
        let vocabCount: Int?
        let kanjiCount: Int?
    }
    let summary: Summary?
    let recentDays: [Day]?
}

/// Gateway bọc mọi response: `{ success, data: ... }`.
struct Envelope<T: Decodable>: Decodable {
    let data: T?
}

struct ProgressAPI {
    var client: APIClient = .shared

    /// `GET /api/learning-progress`: view + materialized view ở backend.
    func mine() async throws -> LearningProgressDTO {
        let (data, _) = try await client.send(try client.request("learning-progress"))
        guard let dto = try JSONDecoder().decode(Envelope<LearningProgressDTO>.self, from: data).data else {
            throw APIError.decodingFailed
        }
        return dto
    }
}
