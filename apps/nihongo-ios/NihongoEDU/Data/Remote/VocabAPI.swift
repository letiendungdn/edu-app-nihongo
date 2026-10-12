import Foundation

enum APIError: LocalizedError, Equatable {
    case invalidURL, badStatus(Int), decodingFailed

    var errorDescription: String? {
        switch self {
        case .invalidURL:         "URL không hợp lệ"
        case .badStatus(let c):   "Server lỗi \(c)"
        case .decodingFailed:     "Không đọc được dữ liệu"
        }
    }
}

struct VocabAPI {
    var client: APIClient = .shared
    static let pageSize = 100
    static let maxPages = 50

    func fetchPage(lessonNumber: Int, page: Int, limit: Int = VocabAPI.pageSize) async throws -> (items: [[String: Any]], total: Int?) {
        let req = try client.request("vocabularies", query: [
            URLQueryItem(name: "lessonNumber", value: "\(lessonNumber)"),
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "limit", value: "\(limit)"),
        ])
        let (data, _) = try await client.send(req)
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { return ([], nil) }
        // { data: { data: [...], total } } hoặc { data: [...] }
        var field = json["data"]
        var total: Int?
        if let nested = field as? [String: Any] {
            total = nested["total"] as? Int
            field = nested["data"]
        }
        return ((field as? [[String: Any]]) ?? [], total)
    }

    /// Có giới hạn trang: bản cũ `while true` dừng khi một trang ít hơn 100 dòng. Server lỗi mà
    /// trang nào cũng đủ 100 dòng thì lặp mãi.
    func fetchAll(lessonNumber: Int) async throws -> [[String: Any]] {
        var all: [[String: Any]] = []
        for page in 1...Self.maxPages {
            let (batch, total) = try await fetchPage(lessonNumber: lessonNumber, page: page)
            all.append(contentsOf: batch)
            if batch.count < Self.pageSize { break }
            if let total, all.count >= total { break }
        }
        return all
    }
}
