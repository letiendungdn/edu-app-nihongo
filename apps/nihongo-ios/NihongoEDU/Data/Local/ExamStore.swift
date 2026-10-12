import Foundation
import SwiftData

struct ExamQuestion: Codable, Equatable, Identifiable {
    let id: String
    let sectionName: String
    let question: String
    let options: [String]
    let audioText: String?
}

struct ExamResult: Codable, Equatable {
    struct Section: Codable, Equatable { let name: String; let correct: Int; let total: Int }
    struct Wrong: Codable, Equatable { let question: String; let correctAnswer: String; let userAnswer: String? }
    let correct: Int
    let total: Int
    let percent: Int
    let passed: Bool
    let sections: [Section]
    let wrong: [Wrong]
}

protocol ExamServing {
    func start(key: String) async throws -> ExamDTO
    func submit(examId: String, answers: [String: String]) async throws -> ExamResultDTO
}

extension ExamAPI: ExamServing {}

extension ExamAttemptRecord {
    var questions: [ExamQuestion] { (try? JSONDecoder().decode([ExamQuestion].self, from: questionsData)) ?? [] }
    var answers: [String: String] { (try? JSONDecoder().decode([String: String].self, from: answersData)) ?? [:] }
    var result: ExamResult? { resultData.flatMap { try? JSONDecoder().decode(ExamResult.self, from: $0) } }
    func remaining(at now: Date) -> TimeInterval { max(0, endsAt.timeIntervalSince(now)) }
}

/// Mọi thao tác trên MainActor: `ModelContext` của UI không thread-safe, và vì chạy tuần tự trên
/// main nên hai lần chọn đáp án không thể ghi đè nhau (bên Android phải dùng Mutex cho việc này).
@MainActor
struct ExamStore {
    var api: ExamServing = ExamAPI()

    func start(key: String, in context: ModelContext, now: Date) async throws -> String {
        let exam = try await api.start(key: key)
        let questions = (exam.questions ?? []).map {
            ExamQuestion(id: $0.id, sectionName: $0.sectionName ?? "", question: $0.question ?? "",
                         options: ($0.options ?? []).compactMap(\.text), audioText: $0.audioText)
        }
        context.insert(ExamAttemptRecord(
            examId: exam.examId, title: exam.title ?? "", level: (exam.level ?? "").uppercased(),
            startedAt: now, endsAt: now.addingTimeInterval(Double(exam.durationMinutes ?? 0) * 60),
            questionsData: try JSONEncoder().encode(questions)
        ))
        try context.save()
        return exam.examId
    }

    func saveAnswer(_ option: String, question: String, attempt: ExamAttemptRecord, in context: ModelContext) {
        guard attempt.resultData == nil else { return } // đã nộp: không sửa nữa
        var a = attempt.answers
        a[question] = option
        attempt.answersData = (try? JSONEncoder().encode(a)) ?? attempt.answersData
        try? context.save()
    }

    /// Nộp hai lần chỉ gọi server một lần. Lỗi mạng: bài vẫn nằm trong SwiftData, thử lại sau.
    func submit(_ attempt: ExamAttemptRecord, in context: ModelContext) async throws -> ExamResult {
        if let done = attempt.result { return done }
        let dto = try await api.submit(examId: attempt.examId, answers: attempt.answers)
        let result = ExamResult(
            correct: dto.correctCount ?? 0, total: dto.total ?? 0, percent: dto.percent ?? 0, passed: dto.passed ?? false,
            sections: (dto.sectionScores ?? []).map { .init(name: $0.sectionName ?? "", correct: $0.correct ?? 0, total: $0.total ?? 0) },
            wrong: (dto.review ?? []).filter { $0.userAnswer != $0.correctAnswer }
                .map { .init(question: $0.question ?? "", correctAnswer: $0.correctAnswer ?? "", userAnswer: $0.userAnswer) }
        )
        attempt.resultData = try JSONEncoder().encode(result)
        try context.save()
        return result
    }
}

/// Câu cần hiện: câu đã lưu (≥ 0), hoặc câu đầu tiên chưa trả lời. Người dùng tự tắt app thì
/// @SceneStorage bị bỏ (giống SavedStateHandle bên Android): vẫn mở đúng chỗ đang làm.
func resolveIndex(saved: Int, questions: [ExamQuestion], answers: [String: String]) -> Int {
    guard !questions.isEmpty else { return 0 }
    if saved >= 0 { return min(saved, questions.count - 1) }
    return questions.firstIndex { answers[$0.id] == nil } ?? questions.count - 1
}

/// "49:05". Hàm thuần để test.
func formatRemaining(_ seconds: TimeInterval) -> String {
    let total = max(0, Int(seconds))
    return String(format: "%02d:%02d", total / 60, total % 60)
}
