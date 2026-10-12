import Foundation

/// Cache dịch: bản cũ là `static var cache: [String: String]` không giới hạn, đọc ghi từ nhiều Task
/// cùng lúc (data race: Swift 6 báo lỗi biên dịch). `actor` tuần tự hóa truy cập; LRU giới hạn 200 mục.
actor TranslationCache {
    static let shared = TranslationCache()
    private let limit: Int
    private var values: [String: String] = [:]
    private var order: [String] = [] // cũ → mới

    init(limit: Int = 200) { self.limit = limit }

    func value(for key: String) -> String? {
        guard let v = values[key] else { return nil }
        touch(key)
        return v
    }

    func set(_ value: String, for key: String) {
        values[key] = value
        touch(key)
        while order.count > limit { values.removeValue(forKey: order.removeFirst()) }
    }

    var count: Int { values.count }

    private func touch(_ key: String) {
        order.removeAll { $0 == key }
        order.append(key)
    }
}

struct TranslateAPI {
    var client: APIClient = .shared
    var cache: TranslationCache = .shared

    func translateJapanese(_ text: String) async throws -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return text }
        if let cached = await cache.value(for: trimmed) { return cached }

        let req = try HTTPClient.authorizedRequest(
            url: try client.url("translate"),
            method: "POST",
            jsonBody: ["text": trimmed, "from": "ja", "to": "vi"]
        )
        let (data, _) = try await client.send(req)
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw APIError.decodingFailed
        }
        let payload = (HTTPClient.unwrapDataField(json) as? [String: Any]) ?? json
        let translated = (payload["translation"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? trimmed
        await cache.set(translated, for: trimmed)
        return translated
    }
}
