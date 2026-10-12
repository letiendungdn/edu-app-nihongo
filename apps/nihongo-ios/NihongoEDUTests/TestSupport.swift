import Foundation
import SwiftData
@testable import NihongoEDU

/// Server HTTP giả: chặn mọi request của URLSession dùng config này (giống MockWebServer bên Android).
final class StubURLProtocol: URLProtocol {
    struct Reply {
        var status: Int = 200
        var body: Data = Data("{}".utf8)
        var headers: [String: String] = [:]
        var error: URLError?
    }

    nonisolated(unsafe) static var replies: [Reply] = []
    nonisolated(unsafe) static var requests: [URLRequest] = []
    private static let lock = NSLock()

    static func reset(_ replies: [Reply]) {
        lock.lock(); defer { lock.unlock() }
        self.replies = replies
        requests = []
    }

    static func json(_ s: String, status: Int = 200) -> Reply { Reply(status: status, body: Data(s.utf8)) }

    static var session: URLSession {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubURLProtocol.self]
        return URLSession(configuration: config)
    }

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        Self.lock.lock()
        Self.requests.append(request)
        let reply = Self.replies.isEmpty ? Reply(status: 500) : Self.replies.removeFirst()
        Self.lock.unlock()

        if let error = reply.error {
            client?.urlProtocol(self, didFailWithError: error)
            return
        }
        let response = HTTPURLResponse(url: request.url!, statusCode: reply.status, httpVersion: "HTTP/1.1", headerFields: reply.headers)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: reply.body)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}

final class MemoryTokenStore: TokenStoring {
    var token: String?
    var cleared = 0
    init(_ token: String? = "old") { self.token = token }
    func accessToken() -> String? { token }
    func saveAccessToken(_ token: String) { self.token = token }
    func clear() { token = nil; cleared += 1 }
}

@MainActor
func makeMemoryContainer() throws -> ModelContainer {
    let schema = Schema(versionedSchema: SchemaV2.self)
    return try ModelContainer(for: schema, configurations: [ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)])
}

let fixedNow = Date(timeIntervalSince1970: 1_800_000_000) // 2027-01-15

@MainActor
@discardableResult
func seedCard(_ context: ModelContext, id: Int, nextReviewAt: Date, mastered: Bool = false, repetitions: Int = 0) -> SRSCard {
    let vocab = Vocabulary(id: id, lessonNumber: 1, kana: "かな\(id)", kanji: id.isMultiple(of: 2) ? nil : "漢\(id)", meaning: "nghĩa \(id)")
    context.insert(vocab)
    let card = SRSCard()
    card.vocabulary = vocab
    card.nextReviewAt = nextReviewAt
    card.mastered = mastered
    card.repetitions = repetitions
    vocab.srsCard = card
    context.insert(card)
    try? context.save()
    return card
}
