import Foundation
import SwiftData

// Model thêm ở SchemaV2 (lightweight migration từ V1: chỉ thêm entity mới).

/// Tiến độ của người đang đăng nhập: luôn đúng một dòng (key = 0), xóa khi đăng xuất.
@Model
final class ProgressSnapshot {
    @Attribute(.unique) var key: Int
    var currentStreak: Int
    var longestStreak: Int
    var totalSeconds: Int
    var totalCards: Int
    var vocabTotal: Int
    var kanjiTotal: Int
    var fetchedAt: Date

    init(currentStreak: Int, longestStreak: Int, totalSeconds: Int, totalCards: Int,
         vocabTotal: Int, kanjiTotal: Int, fetchedAt: Date) {
        key = 0
        self.currentStreak = currentStreak
        self.longestStreak = longestStreak
        self.totalSeconds = totalSeconds
        self.totalCards = totalCards
        self.vocabTotal = vocabTotal
        self.kanjiTotal = kanjiTotal
        self.fetchedAt = fetchedAt
    }
}

@Model
final class StudyDayRecord {
    /// YYYY-MM-DD: so sánh chuỗi đúng thứ tự ngày.
    @Attribute(.unique) var date: String
    var seconds: Int
    var cardsReviewed: Int
    var vocabCount: Int
    var kanjiCount: Int

    var activity: Int { vocabCount + kanjiCount + cardsReviewed }

    init(date: String, seconds: Int, cardsReviewed: Int, vocabCount: Int, kanjiCount: Int) {
        self.date = date
        self.seconds = seconds
        self.cardsReviewed = cardsReviewed
        self.vocabCount = vocabCount
        self.kanjiCount = kanjiCount
    }
}

@Model
final class GrammarItem {
    @Attribute(.unique) var id: Int
    var lessonNumber: Int
    var pattern: String
    var meaning: String
    var explanation: String?
    var sortOrder: Int
    /// Xóa mẫu ngữ pháp thì xóa luôn ví dụ (giống FK ON DELETE CASCADE).
    @Relationship(deleteRule: .cascade, inverse: \GrammarExample.grammar)
    var examples: [GrammarExample] = []

    init(id: Int, lessonNumber: Int, pattern: String, meaning: String, explanation: String?, sortOrder: Int) {
        self.id = id
        self.lessonNumber = lessonNumber
        self.pattern = pattern
        self.meaning = meaning
        self.explanation = explanation
        self.sortOrder = sortOrder
    }
}

@Model
final class GrammarExample {
    @Attribute(.unique) var id: Int
    var jp: String
    var romaji: String?
    var vi: String?
    var sortOrder: Int
    var grammar: GrammarItem?

    init(id: Int, jp: String, romaji: String?, vi: String?, sortOrder: Int) {
        self.id = id
        self.jp = jp
        self.romaji = romaji
        self.vi = vi
        self.sortOrder = sortOrder
    }
}

@Model
final class KanjiItem {
    @Attribute(.unique) var id: Int
    var lessonNumber: Int
    var character: String
    var hanViet: String?
    var onyomi: String?
    var kunyomi: String?
    var meaning: String?
    var mnemonic: String?
    var sortOrder: Int

    init(id: Int, lessonNumber: Int, character: String, hanViet: String?, onyomi: String?,
         kunyomi: String?, meaning: String?, mnemonic: String?, sortOrder: Int) {
        self.id = id
        self.lessonNumber = lessonNumber
        self.character = character
        self.hanViet = hanViet
        self.onyomi = onyomi
        self.kunyomi = kunyomi
        self.meaning = meaning
        self.mnemonic = mnemonic
        self.sortOrder = sortOrder
    }
}

@Model
final class ReadingPassageItem {
    @Attribute(.unique) var id: Int
    var title: String
    var jlptLevel: String?
    var estimatedMin: Int
    var sortOrder: Int
    var questionCount: Int
    /// nil cho tới khi mở bài lần đầu (API danh sách không trả nội dung).
    var content: String?
    @Relationship(deleteRule: .cascade, inverse: \ReadingQuestionItem.passage)
    var questions: [ReadingQuestionItem] = []

    init(id: Int, title: String, jlptLevel: String?, estimatedMin: Int, sortOrder: Int, questionCount: Int) {
        self.id = id
        self.title = title
        self.jlptLevel = jlptLevel
        self.estimatedMin = estimatedMin
        self.sortOrder = sortOrder
        self.questionCount = questionCount
    }
}

@Model
final class ReadingQuestionItem {
    @Attribute(.unique) var id: Int
    var question: String
    /// Đáp án đúng: cho phép tự chấm khi offline.
    var answer: String
    var explanation: String?
    /// SwiftData lưu được mảng Codable trực tiếp, không cần TypeConverter như Room.
    var options: [String]
    var sortOrder: Int
    var passage: ReadingPassageItem?

    init(id: Int, question: String, answer: String, explanation: String?, options: [String], sortOrder: Int) {
        self.id = id
        self.question = question
        self.answer = answer
        self.explanation = explanation
        self.options = options
        self.sortOrder = sortOrder
    }
}

/// Bài thi đang làm. Lưu trong SwiftData để tắt app, hết pin hay bị hệ thống giết vẫn làm tiếp được.
@Model
final class ExamAttemptRecord {
    @Attribute(.unique) var examId: String
    var title: String
    var level: String
    var startedAt: Date
    /// Mốc tuyệt đối, không lưu "còn bao nhiêu giây": app ở nền vẫn tính đúng.
    var endsAt: Date
    var questionsData: Data
    var answersData: Data
    var resultData: Data?

    init(examId: String, title: String, level: String, startedAt: Date, endsAt: Date, questionsData: Data) {
        self.examId = examId
        self.title = title
        self.level = level
        self.startedAt = startedAt
        self.endsAt = endsAt
        self.questionsData = questionsData
        self.answersData = Data("{}".utf8)
    }
}
