import SwiftData
import XCTest
@testable import NihongoEDU

private func stubClient() -> APIClient {
    APIClient(session: StubURLProtocol.session, baseURL: "http://test.local/api", tokens: MemoryTokenStore("t"), allowSecureCookieOverHTTP: false)
}

@MainActor
final class ContentSyncTests: XCTestCase {
    func testGrammarReplacesLessonAndCascadesExamples() async throws {
        let container = try makeMemoryContainer()
        let ctx = container.mainContext
        let sync = ContentSync(api: ContentAPI(client: stubClient()))

        StubURLProtocol.reset([StubURLProtocol.json(#"{"data":{"data":[{"id":1,"pattern":"N1 は N2 です","meaning":"N1 là N2","examples":[{"id":10,"jp":"わたしは マイクです。","vi":"Tôi là Mike."}]},{"id":2,"pattern":"cũ","meaning":"x"}]}}"#)])
        try await sync.syncGrammar(lesson: 1, in: ctx)
        XCTAssertEqual(try ctx.fetchCount(FetchDescriptor<GrammarItem>()), 2)

        // Server đã xóa mẫu id 2: máy cũng phải xóa, và ví dụ của mẫu bị xóa đi theo
        StubURLProtocol.reset([StubURLProtocol.json(#"{"data":{"data":[{"id":1,"pattern":"N1 は N2 です","meaning":"N1 là N2","examples":[]}]}}"#)])
        try await sync.syncGrammar(lesson: 1, in: ctx)
        XCTAssertEqual(try ctx.fetch(FetchDescriptor<GrammarItem>()).map(\.id), [1])
        XCTAssertEqual(try ctx.fetchCount(FetchDescriptor<GrammarExample>()), 0)
    }

    /// API danh sách không trả nội dung: làm mới danh sách không được xóa bài đã tải.
    func testReadingListKeepsDownloadedContent() async throws {
        let container = try makeMemoryContainer()
        let ctx = container.mainContext
        let sync = ContentSync(api: ContentAPI(client: stubClient()))
        StubURLProtocol.reset([StubURLProtocol.json(#"{"data":{"id":1,"title":"メール","content":"本文","questions":[{"id":5,"question":"Q","answer":"A","options":[{"text":"B","sortOrder":2},{"text":"A","sortOrder":1}]}]}}"#)])
        try await sync.syncReading(id: 1, in: ctx)

        StubURLProtocol.reset([StubURLProtocol.json(#"{"data":[{"id":1,"title":"メール (mới)","_count":{"questions":1}}]}"#)])
        try await sync.syncReadingList(in: ctx)

        let p = try XCTUnwrap(try ctx.fetch(FetchDescriptor<ReadingPassageItem>()).first)
        XCTAssertEqual(p.title, "メール (mới)")
        XCTAssertEqual(p.content, "本文")
        XCTAssertEqual(p.questions.first?.options, ["A", "B"], "lựa chọn xếp theo sortOrder")
    }

    func testGradeReadingTrimsAndCounts() {
        let s = gradeReading([(1, "A"), (2, "D")], answers: [1: " A ", 2: "C"])
        XCTAssertEqual(s, QuizScore(correct: 1, total: 2))
        XCTAssertEqual(s.percent, 50)
    }
}

private final class FakeExamService: ExamServing {
    var submits = 0
    var lastAnswers: [String: String]?
    func start(key: String) async throws -> ExamDTO {
        ExamDTO(examId: "e1", title: "N5", level: "n5", durationMinutes: 50, questions: [
            .init(id: "q1", sectionName: "Từ vựng", question: "?", options: [.init(text: "a"), .init(text: "b")], audioText: nil),
            .init(id: "q2", sectionName: "Nghe", question: "?", options: [.init(text: "c")], audioText: "あき"),
        ])
    }
    func submit(examId: String, answers: [String: String]) async throws -> ExamResultDTO {
        submits += 1
        lastAnswers = answers
        return ExamResultDTO(correctCount: 1, total: 2, percent: 50, passed: false, sectionScores: nil,
                             review: [.init(question: "q1", correctAnswer: "a", userAnswer: "a"), .init(question: "q2", correctAnswer: "c", userAnswer: nil)])
    }
}

@MainActor
final class ExamStoreTests: XCTestCase {
    func testStartPersistsAbsoluteDeadlineAndSubmitOnce() async throws {
        let container = try makeMemoryContainer()
        let ctx = container.mainContext
        let service = FakeExamService()
        let store = ExamStore(api: service)

        let id = try await store.start(key: "n5", in: ctx, now: fixedNow)
        let attempt = try XCTUnwrap(try ctx.fetch(FetchDescriptor<ExamAttemptRecord>()).first { $0.examId == id })
        XCTAssertEqual(attempt.endsAt, fixedNow.addingTimeInterval(50 * 60))
        XCTAssertEqual(attempt.questions.last?.audioText, "あき")

        store.saveAnswer("a", question: "q1", attempt: attempt, in: ctx)
        store.saveAnswer("c", question: "q2", attempt: attempt, in: ctx)
        let first = try await store.submit(attempt, in: ctx)
        let second = try await store.submit(attempt, in: ctx)

        XCTAssertEqual(service.submits, 1, "nộp hai lần chỉ gọi server một lần")
        XCTAssertEqual(service.lastAnswers, ["q1": "a", "q2": "c"])
        XCTAssertEqual(first, second)
        XCTAssertEqual(first.wrong.count, 1)

        store.saveAnswer("b", question: "q1", attempt: attempt, in: ctx)
        XCTAssertEqual(attempt.answers["q1"], "a", "đã nộp thì không sửa được")
    }

    func testRemainingIsComputedFromDeadline() {
        let a = ExamAttemptRecord(examId: "x", title: "", level: "", startedAt: fixedNow, endsAt: fixedNow.addingTimeInterval(3000), questionsData: Data("[]".utf8))
        XCTAssertEqual(formatRemaining(a.remaining(at: fixedNow)), "50:00")
        XCTAssertEqual(formatRemaining(a.remaining(at: fixedNow.addingTimeInterval(65))), "48:55")
        XCTAssertEqual(formatRemaining(a.remaining(at: fixedNow.addingTimeInterval(9999))), "00:00")
    }

    /// Người dùng tự tắt app thì @SceneStorage mất (-1): mở ở câu đầu tiên chưa trả lời.
    func testResolveIndex() {
        let qs = (1...5).map { ExamQuestion(id: "q\($0)", sectionName: "", question: "", options: [], audioText: nil) }
        XCTAssertEqual(resolveIndex(saved: -1, questions: qs, answers: ["q1": "a", "q2": "a"]), 2)
        XCTAssertEqual(resolveIndex(saved: 9, questions: qs, answers: [:]), 4)
        XCTAssertEqual(resolveIndex(saved: -1, questions: qs, answers: Dictionary(uniqueKeysWithValues: qs.map { ($0.id, "a") })), 4)
    }
}

final class ChatStreamTests: XCTestCase {
    private func sse(_ ids: Int...) -> StubURLProtocol.Reply {
        let body = ids.map { #"id: \#($0)"# + "\n" + #"data: {"data":{"id":\#($0),"roomId":1,"senderId":3,"content":"m\#($0)","createdAt":"2026-10-11T13:26:44.909Z"}}"# + "\n\n" }.joined()
        return StubURLProtocol.Reply(status: 200, body: Data(body.utf8), headers: ["Content-Type": "text/event-stream"])
    }

    private func collect(_ stream: AsyncStream<StreamEvent>, _ n: Int) async -> [StreamEvent] {
        var out: [StreamEvent] = []
        for await e in stream {
            out.append(e)
            if out.count == n { break }
        }
        return out
    }

    func testReceivesMessagesAfterOpen() async {
        StubURLProtocol.reset([sse(1, 2)])
        let events = await collect(ChatStream(client: stubClient()).events(roomId: 1), 3)
        XCTAssertEqual(events.first, .open)
        XCTAssertEqual(events.dropFirst().compactMap { if case .message(let m) = $0 { m.id } else { nil } }, [1, 2])
        XCTAssertEqual(StubURLProtocol.requests.first?.url?.path, "/api/community/rooms/1/stream")
        XCTAssertEqual(StubURLProtocol.requests.first?.timeoutInterval, ChatStream.idleTimeout, "không để mặc định 60 giây")
    }

    /// Server đóng stream (pod restart): báo Closed rồi nối lại.
    func testReconnectsAfterServerCloses() async {
        StubURLProtocol.reset([sse(1), sse(2)])
        var stream = ChatStream(client: stubClient())
        stream.sleep = { _ in } // bỏ backoff cho test nhanh
        let kinds = await collect(stream.events(roomId: 1), 5).map { e -> String in
            switch e { case .open: "open"; case .closed: "closed"; case .message: "msg" }
        }
        XCTAssertEqual(kinds, ["open", "msg", "closed", "open", "msg"])
    }

    func testRejectedRefreshStopsStream() async {
        StubURLProtocol.reset([StubURLProtocol.Reply(status: 401), StubURLProtocol.Reply(status: 401)])
        var events: [StreamEvent] = []
        for await e in ChatStream(client: stubClient()).events(roomId: 1) { events.append(e) }
        XCTAssertTrue(events.isEmpty)
        XCTAssertEqual(StubURLProtocol.requests.map { $0.url!.path }, ["/api/community/rooms/1/stream", "/api/auth/refresh"])
    }

    func testBackoffAndParsing() {
        XCTAssertEqual((0...6).map { ChatStream.backoff(attempt: $0) }, [1, 2, 4, 8, 16, 30, 30].map { Duration.seconds($0) })
        XCTAssertNil(ChatStream.parse(line: "id: 3"))
        XCTAssertNil(ChatStream.parse(line: "data: not json"))
        XCTAssertEqual(ChatStream.parse(line: #"data: {"id":9,"roomId":1,"senderId":2}"#)?.id, 9)
    }
}

private final class FakeChat: ChatServing {
    var serverHistory = [ChatMessageDTO(id: 1, roomId: 1, senderId: 3, content: "m1", createdAt: "2026-10-11T10:00:00Z", sender: nil)]
    var historyCalls = 0
    var sendResult: Result<ChatMessageDTO, Error> = .failure(URLError(.notConnectedToInternet))
    var continuation: AsyncStream<StreamEvent>.Continuation?
    func me() async throws -> Int { 7 }
    func rooms() async throws -> [ChatRoomDTO] { [] }
    func history(roomId: Int) async throws -> [ChatMessageDTO] { historyCalls += 1; return serverHistory }
    func send(roomId: Int, content: String) async throws -> ChatMessageDTO { try sendResult.get() }
    func markRead(roomId: Int) async {}
    func searchUsers(_ q: String) async throws -> [ChatUserDTO] { [] }
    func openDirect(userId: Int) async throws -> Int { 1 }
    func events(roomId: Int) -> AsyncStream<StreamEvent> { AsyncStream { self.continuation = $0 } }
}

@MainActor
final class ChatViewModelTests: XCTestCase {
    private func settle() async { for _ in 0..<20 { await Task.yield() } }

    /// Chờ tới khi điều kiện đúng (tối đa 2 giây). Đếm số lần Task.yield() là đoán mò: Task tạo bằng
    /// `Task { }` không hứa sẽ chạy sau đúng N lần yield.
    private func waitUntil(_ condition: () -> Bool, file: StaticString = #filePath, line: UInt = #line) async {
        let deadline = Date().addingTimeInterval(2)
        while !condition() && Date() < deadline { try? await Task.sleep(for: .milliseconds(10)) }
        XCTAssertTrue(condition(), "hết giờ chờ", file: file, line: line)
    }

    func testOptimisticSendThenServerCopyIsNotDuplicated() async {
        let chat = FakeChat()
        let vm = ChatViewModel(roomId: 1, api: chat, now: { fixedNow })
        let run = Task { await vm.run() }
        await settle()

        vm.draft = "こんにちは"
        let server = ChatMessageDTO(id: 2, roomId: 1, senderId: 7, content: "こんにちは", createdAt: "2026-10-11T10:01:00Z", sender: nil)
        chat.sendResult = .success(server)
        vm.send()
        XCTAssertEqual(vm.messages.last?.status, .sending)
        XCTAssertEqual(vm.draft, "")
        await waitUntil { vm.messages.last?.serverId == 2 }
        await waitUntil { chat.continuation != nil }
        chat.continuation?.yield(.message(server)) // SSE cũng đẩy về đúng tin đó
        await settle()

        XCTAssertEqual(vm.messages.map(\.serverId), [1, 2])
        run.cancel()
    }

    func testFailedSendCanBeRetried() async {
        let chat = FakeChat()
        let vm = ChatViewModel(roomId: 1, api: chat, now: { fixedNow })
        let run = Task { await vm.run() }
        await settle()

        vm.draft = "hi"
        vm.send()
        await waitUntil { vm.messages.last?.status == .failed }
        let failed = vm.messages.last!

        chat.sendResult = .success(ChatMessageDTO(id: 3, roomId: 1, senderId: 7, content: "hi", createdAt: "2026-10-11T10:02:00Z", sender: nil))
        vm.retry(failed.localId!)
        await waitUntil { vm.messages.last?.serverId == 3 }
        run.cancel()
    }

    func testReconnectReloadsHistoryAndTogglesOnlineFlag() async {
        let chat = FakeChat()
        let vm = ChatViewModel(roomId: 1, api: chat, now: { fixedNow })
        let run = Task { await vm.run() }
        // Chờ ViewModel mở stream: bắn sự kiện trước đó thì continuation còn nil, sự kiện mất
        // (bản đầu của test này chập chờn 3/4 lần vì đúng lý do đó).
        await waitUntil { chat.continuation != nil }
        let before = chat.historyCalls

        chat.continuation?.yield(.open)
        await waitUntil { vm.connected }
        await waitUntil { chat.historyCalls == before + 1 }

        chat.continuation?.yield(.closed)
        await waitUntil { !vm.connected } // mất kết nối thì thôi hiện trực tuyến

        chat.serverHistory.append(ChatMessageDTO(id: 5, roomId: 1, senderId: 3, content: "tin lỡ", createdAt: "2026-10-11T10:05:00Z", sender: nil))
        chat.continuation?.yield(.open)
        await waitUntil { vm.messages.last?.serverId == 5 } // nối lại thì tải lại lịch sử, lấp tin lỡ
        XCTAssertEqual(chat.historyCalls, before + 2)
        run.cancel()
    }

    func testMergeDedupesAndKeepsPendingLast() {
        let m = { (id: Int, at: String) in ChatMessage(serverId: id, localId: nil, senderId: 1, senderName: "", content: "", createdAt: at) }
        let pending = ChatMessage(serverId: nil, localId: "tmp", senderId: 7, senderName: "Bạn", content: "x", createdAt: "~1", status: .sending)
        let merged = mergeMessages(history: [m(2, "b"), m(1, "a")], live: [m(2, "b"), m(3, "c")], pending: [pending])
        XCTAssertEqual(merged.map(\.serverId), [1, 2, 3, nil])
    }
}

/// Bộ sinh số có seed: test ra cùng một chuỗi câu hỏi mỗi lần chạy.
struct SplitMix64: RandomNumberGenerator {
    var state: UInt64
    mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
}

@MainActor
final class KanaQuizTests: XCTestCase {
    func testFourDistinctOptionsIncludingAnswer() {
        let q = KanaQuiz(rng: SplitMix64(state: 1)).question!
        XCTAssertEqual(Set(q.options).count, 4)
        XCTAssertTrue(q.options.contains(q.kana.romaji))
    }

    func testAnswerCountsOnceAndRecordsMistake() {
        let quiz = KanaQuiz(rng: SplitMix64(state: 1))
        let q = quiz.question!
        quiz.answer(q.options.first { $0 != q.kana.romaji }!)
        quiz.answer(q.kana.romaji)
        XCTAssertEqual(quiz.answered, 1)
        XCTAssertEqual(quiz.correct, 0)
        XCTAssertEqual(quiz.mistakes[q.kana.char], 1)
    }

    func testOftenMissedKanaIsAskedMoreOften() {
        let quiz = KanaQuiz(rng: SplitMix64(state: 42))
        let target = quiz.question!.kana.char
        for _ in 0..<10 {
            let q = quiz.question!
            quiz.answer(q.kana.char == target ? q.options.first { $0 != q.kana.romaji }! : q.kana.romaji)
            quiz.next()
        }
        var hits = 0
        for _ in 0..<500 { quiz.next(); if quiz.question!.kana.char == target { hits += 1 } }
        // Không trọng số: kỳ vọng 500/46 ≈ 11 lần
        XCTAssertGreaterThan(hits, 20)
    }

    func testKatakanaScript() {
        let quiz = KanaQuiz(rng: SplitMix64(state: 3))
        quiz.setScript(.katakana)
        XCTAssertTrue(("ア"..."ン").contains(quiz.question!.kana.char))
    }
}

@MainActor
final class ProgressTests: XCTestCase {
    func testSaveReplacesSnapshotAndDays() throws {
        let container = try makeMemoryContainer()
        let ctx = container.mainContext
        let json = #"{"summary":{"currentStreak":3,"longestStreak":7,"totalSeconds":3900,"vocabTotal":44,"kanjiTotal":5},"recentDays":[{"studyDate":"2026-10-06T00:00:00.000Z","vocabCount":7},{"studyDate":"2026-10-05","vocabCount":5,"kanjiCount":2}]}"#
        let dto = try JSONDecoder().decode(LearningProgressDTO.self, from: Data(json.utf8))
        ProgressViewModel.save(dto, in: ctx, now: fixedNow)
        ProgressViewModel.save(dto, in: ctx, now: fixedNow) // lần 2 thay thế, không nhân đôi

        XCTAssertEqual(try ctx.fetchCount(FetchDescriptor<ProgressSnapshot>()), 1)
        XCTAssertEqual(try ctx.fetch(FetchDescriptor<StudyDayRecord>(sortBy: [SortDescriptor(\.date)])).map(\.date), ["2026-10-05", "2026-10-06"])
        XCTAssertEqual(formatStudyTime(3900), "1 giờ 5 phút")
        XCTAssertEqual(formatStudyTime(750), "12 phút")
    }
}

final class WidgetTimelineTests: XCTestCase {
    /// Widget tự đổi số đúng lúc từng thẻ đến hạn, không cần app chạy.
    func testEntriesAtEachUpcomingDueMoment() {
        let dates = [fixedNow.addingTimeInterval(-60), fixedNow.addingTimeInterval(3600), fixedNow.addingTimeInterval(7200), fixedNow.addingTimeInterval(100_000)]
        let tl = DueDates.timeline(dates, now: fixedNow)
        XCTAssertEqual(tl.map(\.count), [1, 2, 3])
        XCTAssertEqual(tl.map(\.date), [fixedNow, fixedNow.addingTimeInterval(3600), fixedNow.addingTimeInterval(7200)])
    }
}
