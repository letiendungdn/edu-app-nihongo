import Foundation
import SwiftData

/// Tải nội dung từ server rồi ghi vào SwiftData. UI chỉ đọc SwiftData (@Query), nên offline vẫn có dữ liệu cũ.
@MainActor
struct ContentSync {
    var api = ContentAPI()

    /// Xóa cả bài rồi chèn lại: mẫu ngữ pháp bị xóa trên server cũng biến mất ở máy.
    /// Xóa GrammarItem thì SwiftData xóa luôn GrammarExample (deleteRule: .cascade).
    func syncGrammar(lesson: Int, in context: ModelContext) async throws {
        let items = try await api.grammars(lesson: lesson)
        try context.delete(model: GrammarItem.self, where: #Predicate { $0.lessonNumber == lesson })
        for (i, g) in items.enumerated() {
            let item = GrammarItem(id: g.id, lessonNumber: lesson, pattern: g.pattern ?? "", meaning: g.meaning ?? "",
                                   explanation: g.explanation, sortOrder: g.sortOrder ?? i)
            context.insert(item)
            item.examples = (g.examples ?? []).enumerated().map { j, e in
                GrammarExample(id: e.id, jp: e.jp ?? "", romaji: e.romaji, vi: e.vi, sortOrder: e.sortOrder ?? j)
            }
        }
        try context.save()
    }

    func syncKanji(lesson: Int, in context: ModelContext) async throws {
        let items = try await api.kanji(lesson: lesson)
        try context.delete(model: KanjiItem.self, where: #Predicate { $0.lessonNumber == lesson })
        for (i, k) in items.enumerated() {
            context.insert(KanjiItem(id: k.id, lessonNumber: lesson, character: k.character ?? "", hanViet: k.hanViet,
                                     onyomi: k.onyomi, kunyomi: k.kunyomi, meaning: k.meaningVi, mnemonic: k.mnemonicVi,
                                     sortOrder: k.sortOrder ?? i))
        }
        try context.save()
    }

    /// Danh sách bài đọc không có nội dung: giữ lại `content` và câu hỏi đã tải của bài đã mở.
    func syncReadingList(in context: ModelContext) async throws {
        let items = try await api.readingList()
        let existing = Dictionary(uniqueKeysWithValues: ((try? context.fetch(FetchDescriptor<ReadingPassageItem>())) ?? []).map { ($0.id, $0) })
        for (i, r) in items.enumerated() {
            if let p = existing[r.id] {
                p.title = r.title ?? p.title
                p.jlptLevel = r.jlptLevel
                p.estimatedMin = r.estimatedMin ?? p.estimatedMin
                p.sortOrder = r.sortOrder ?? i
                p.questionCount = r._count?.questions ?? p.questionCount
            } else {
                context.insert(ReadingPassageItem(id: r.id, title: r.title ?? "", jlptLevel: r.jlptLevel,
                                                  estimatedMin: r.estimatedMin ?? 3, sortOrder: r.sortOrder ?? i,
                                                  questionCount: r._count?.questions ?? 0))
            }
        }
        try context.save()
    }

    func syncReading(id: Int, in context: ModelContext) async throws {
        let d = try await api.reading(id: id)
        let passage: ReadingPassageItem
        if let p = try context.fetch(FetchDescriptor<ReadingPassageItem>(predicate: #Predicate { $0.id == id })).first {
            passage = p
        } else {
            passage = ReadingPassageItem(id: d.id, title: d.title ?? "", jlptLevel: d.jlptLevel,
                                         estimatedMin: d.estimatedMin ?? 3, sortOrder: d.sortOrder ?? 0, questionCount: 0)
            context.insert(passage)
        }
        passage.content = d.content ?? ""
        for q in passage.questions { context.delete(q) }
        passage.questions = (d.questions ?? []).enumerated().map { i, q in
            ReadingQuestionItem(id: q.id, question: q.question ?? "", answer: q.answer ?? "", explanation: q.explanation,
                                options: (q.options ?? []).sorted { ($0.sortOrder ?? 0) < ($1.sortOrder ?? 0) }.compactMap(\.text),
                                sortOrder: q.sortOrder ?? i)
        }
        passage.questionCount = passage.questions.count
        try context.save()
    }
}

struct QuizScore: Equatable {
    let correct: Int
    let total: Int
    var percent: Int { total == 0 ? 0 : correct * 100 / total }
}

/// Chấm thuần, không I/O: dùng khi offline và để test.
func gradeReading(_ questions: [(id: Int, answer: String)], answers: [Int: String]) -> QuizScore {
    QuizScore(
        correct: questions.filter { answers[$0.id]?.trimmingCharacters(in: .whitespaces) == $0.answer.trimmingCharacters(in: .whitespaces) }.count,
        total: questions.count
    )
}
