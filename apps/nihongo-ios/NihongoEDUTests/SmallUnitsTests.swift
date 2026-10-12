import SwiftData
import XCTest
@testable import NihongoEDU

@MainActor
final class SRSQueriesTests: XCTestCase {
    func testDueIncludesMasteredAndExcludesFuture() throws {
        let container = try makeMemoryContainer()
        let ctx = container.mainContext
        seedCard(ctx, id: 1, nextReviewAt: fixedNow.addingTimeInterval(-60))
        seedCard(ctx, id: 2, nextReviewAt: fixedNow.addingTimeInterval(-60), mastered: true)
        seedCard(ctx, id: 3, nextReviewAt: fixedNow.addingTimeInterval(3600))

        let due = try ctx.fetch(FetchDescriptor(predicate: SRSQueries.due(at: fixedNow)))
        // Bản cũ loại thẻ mastered: thẻ đã thuộc không bao giờ được ôn lại
        XCTAssertEqual(Set(due.compactMap { $0.vocabulary?.id }), [1, 2])
        // Một tiếng sau thẻ 3 cũng đến hạn
        XCTAssertEqual(try ctx.fetchCount(FetchDescriptor(predicate: SRSQueries.due(at: fixedNow.addingTimeInterval(3600)))), 3)
    }
}

final class TokenStoreTests: XCTestCase {
    func testFreshInstallClearsKeychainOnce() {
        let defaults = UserDefaults(suiteName: UUID().uuidString)!
        var cleared = 0
        TokenStore.clearIfFreshInstall(defaults: defaults) { cleared += 1 }
        TokenStore.clearIfFreshInstall(defaults: defaults) { cleared += 1 }
        XCTAssertEqual(cleared, 1, "chỉ xóa ở lần chạy đầu sau khi cài")
    }
}

@MainActor
final class AuthStateTests: XCTestCase {
    func testUpdatesWhenTokensChangeElsewhere() {
        var loggedIn = true
        let center = NotificationCenter()
        let state = AuthState(read: { loggedIn }, center: center)
        XCTAssertTrue(state.isLoggedIn)

        loggedIn = false
        center.post(name: .sessionExpired, object: nil)
        XCTAssertFalse(state.isLoggedIn)
    }
}

@MainActor
final class AppRouterTests: XCTestCase {
    /// Thông báo bấm lúc app khởi động lạnh: route phải chờ tới khi Home lấy, không được mất.
    func testRouteWaitsUntilConsumedOnce() {
        let router = AppRouter()
        router.open(.srs)
        XCTAssertEqual(router.consume(), .srs)
        XCTAssertNil(router.consume())
    }

    func testHandlesOnlyAppURLs() {
        let router = AppRouter()
        XCTAssertTrue(router.handle(url: URL(string: "nihongo://srs")!))
        XCTAssertEqual(router.pending, .srs)
        XCTAssertFalse(router.handle(url: URL(string: "https://example.com")!))
    }
}

final class TranslationCacheTests: XCTestCase {
    func testEvictsLeastRecentlyUsed() async {
        let cache = TranslationCache(limit: 2)
        await cache.set("a", for: "1")
        await cache.set("b", for: "2")
        _ = await cache.value(for: "1") // 1 vừa được dùng
        await cache.set("c", for: "3")  // đẩy 2 ra
        let v1 = await cache.value(for: "1"), v2 = await cache.value(for: "2"), n = await cache.count
        XCTAssertEqual(v1, "a")
        XCTAssertNil(v2)
        XCTAssertEqual(n, 2)
    }
}

final class VocabAPITests: XCTestCase {
    /// Server lỗi mà trang nào cũng đủ 100 dòng: bản cũ lặp mãi.
    func testStopsAtMaxPages() async throws {
        let page = (0..<100).map { #"{"id":\#($0),"kana":"k","meaning":"m"}"# }.joined(separator: ",")
        StubURLProtocol.reset(Array(repeating: StubURLProtocol.json(#"{"data":{"data":[\#(page)]}}"#), count: VocabAPI.maxPages + 5))
        let api = VocabAPI(client: APIClient(session: StubURLProtocol.session, baseURL: "http://test.local/api", tokens: MemoryTokenStore(nil)))

        let all = try await api.fetchAll(lessonNumber: 1)

        XCTAssertEqual(StubURLProtocol.requests.count, VocabAPI.maxPages)
        XCTAssertEqual(all.count, VocabAPI.maxPages * 100)
    }

    func testStopsWhenTotalReached() async throws {
        let page = (0..<100).map { #"{"id":\#($0),"kana":"k","meaning":"m"}"# }.joined(separator: ",")
        StubURLProtocol.reset([StubURLProtocol.json(#"{"data":{"data":[\#(page)],"total":100}}"#)])
        let api = VocabAPI(client: APIClient(session: StubURLProtocol.session, baseURL: "http://test.local/api", tokens: MemoryTokenStore(nil)))
        _ = try await api.fetchAll(lessonNumber: 1)
        XCTAssertEqual(StubURLProtocol.requests.count, 1)
    }
}

final class UserMessageTests: XCTestCase {
    func testFriendlyMessages() {
        XCTAssertEqual(URLError(.cannotConnectToHost).userMessage, "Không có kết nối mạng.")
        XCTAssertEqual(APIError.badStatus(401).userMessage, "Phiên đăng nhập đã hết hạn. Đăng nhập lại nhé.")
        XCTAssertEqual(APIError.badStatus(503).userMessage, "Máy chủ đang gặp sự cố, thử lại sau.")
    }
}

final class ReminderPlanTests: XCTestCase {
    private var hcm: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
        return c
    }()

    private func at(_ h: Int, day: Int = 11) -> Date { hcm.date(from: DateComponents(year: 2026, month: 10, day: day, hour: h))! }

    func testCountsCardsDueByTonight() {
        let plan = ReminderPlan.next(dueDates: [at(9), at(19), at(21)], now: at(18), calendar: hcm)
        XCTAssertEqual(plan, .init(fireDate: at(20), count: 2))
    }

    func testAfterEightMovesToTomorrow() {
        let plan = ReminderPlan.next(dueDates: [at(21)], now: at(21, day: 11), calendar: hcm)
        XCTAssertEqual(plan, .init(fireDate: at(20, day: 12), count: 1))
    }

    func testNothingDueMeansNoReminder() {
        XCTAssertNil(ReminderPlan.next(dueDates: [at(23, day: 12)], now: at(18), calendar: hcm))
    }

    func testDueDatesCount() {
        XCTAssertEqual(DueDates.count([at(1), at(5), at(9)], at: at(5)), 2)
    }
}

final class FrameGateTests: XCTestCase {
    func testLetsThroughOneFramePerIntervalAndNotWhileBusy() {
        let gate = FrameGate()
        let t0 = fixedNow
        XCTAssertTrue(gate.shouldProcess(at: t0))
        XCTAssertFalse(gate.shouldProcess(at: t0.addingTimeInterval(2)), "frame trước chưa xong")
        gate.finish()
        XCTAssertFalse(gate.shouldProcess(at: t0.addingTimeInterval(0.5)), "chưa đủ 0,95 giây")
        XCTAssertTrue(gate.shouldProcess(at: t0.addingTimeInterval(1)))
        gate.finish()
        gate.setPaused(true)
        XCTAssertFalse(gate.shouldProcess(at: t0.addingTimeInterval(5)))
    }
}
