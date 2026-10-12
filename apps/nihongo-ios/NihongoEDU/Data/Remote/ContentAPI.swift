import Foundation

// DTO khớp đúng JSON thật của gateway (đã lấy mẫu bằng curl). Field nào cũng có thể vắng nên đều Optional.

struct GrammarDTO: Decodable {
    struct Example: Decodable { let id: Int; let jp: String?; let romaji: String?; let vi: String?; let sortOrder: Int? }
    let id: Int
    let pattern: String?
    let meaning: String?
    let explanation: String?
    let sortOrder: Int?
    let examples: [Example]?
}

struct Page<T: Decodable>: Decodable { let data: [T]?; let total: Int? }

struct KanjiDTO: Decodable {
    let id: Int
    let character: String?
    let hanViet: String?
    let onyomi: String?
    let kunyomi: String?
    let meaningVi: String?
    let mnemonicVi: String?
    let sortOrder: Int?
}

struct ReadingSummaryDTO: Decodable {
    struct Count: Decodable { let questions: Int? }
    let id: Int
    let title: String?
    let jlptLevel: String?
    let estimatedMin: Int?
    let sortOrder: Int?
    let _count: Count?
}

struct ReadingDetailDTO: Decodable {
    struct Question: Decodable {
        struct Option: Decodable { let text: String?; let sortOrder: Int? }
        let id: Int
        let question: String?
        let answer: String?
        let explanation: String?
        let sortOrder: Int?
        let options: [Option]?
    }
    let id: Int
    let title: String?
    let content: String?
    let jlptLevel: String?
    let estimatedMin: Int?
    let sortOrder: Int?
    let questions: [Question]?
}

struct ScoreDTO: Decodable { let correct: Int?; let total: Int? }

struct ContentAPI {
    var client: APIClient = .shared

    private func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        let (data, _) = try await client.send(try client.request(path, query: query))
        guard let value = try JSONDecoder().decode(Envelope<T>.self, from: data).data else { throw APIError.decodingFailed }
        return value
    }

    func grammars(lesson: Int) async throws -> [GrammarDTO] {
        let page: Page<GrammarDTO> = try await get("grammars", query: [.init(name: "lessonNumber", value: "\(lesson)"), .init(name: "limit", value: "100")])
        return page.data ?? []
    }

    func kanji(lesson: Int) async throws -> [KanjiDTO] {
        try await get("kanji", query: [.init(name: "lessonNumber", value: "\(lesson)")])
    }

    func readingList() async throws -> [ReadingSummaryDTO] { try await get("reading") }

    func reading(id: Int) async throws -> ReadingDetailDTO { try await get("reading/\(id)") }

    func submitReading(id: Int, answers: [String: String]) async throws -> ScoreDTO {
        let (data, _) = try await client.send(try client.request("reading/\(id)/submit", method: "POST", body: ["answers": answers]))
        guard let score = try JSONDecoder().decode(Envelope<ScoreDTO>.self, from: data).data else { throw APIError.decodingFailed }
        return score
    }
}
