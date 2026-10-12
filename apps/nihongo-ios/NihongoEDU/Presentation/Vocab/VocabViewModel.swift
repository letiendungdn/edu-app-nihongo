import SwiftUI
import SwiftData
import AVFoundation

@Observable
@MainActor
final class VocabViewModel {
    var selectedLesson: Int = 1
    var isSyncing: Bool = false
    var syncError: String? = nil
    var speakingId: PersistentIdentifier? = nil

    private let api = VocabAPI()
    private let synthesizer = AVSpeechSynthesizer()
    private var autoSyncedLessons: Set<Int> = []

    func autoSyncIfNeeded(lesson: Int, vocabIsEmpty: Bool, modelContext: ModelContext) async {
        guard vocabIsEmpty, !autoSyncedLessons.contains(lesson), !isSyncing else { return }
        autoSyncedLessons.insert(lesson)
        await syncLesson(lesson, modelContext: modelContext, silent: true)
    }

    func syncLesson(_ lessonNumber: Int, modelContext: ModelContext, silent: Bool = false) async {
        guard !isSyncing else { return }
        isSyncing = true
        syncError = nil
        defer { isSyncing = false }

        do {
            let items = try await api.fetchAll(lessonNumber: lessonNumber)

            // Batch fetch existing vocabularies to avoid N+1 queries
            let descriptor = FetchDescriptor<Vocabulary>(
                predicate: #Predicate { $0.lessonNumber == lessonNumber }
            )
            let existingList = (try? modelContext.fetch(descriptor)) ?? []
            let existingMap: [Int: Vocabulary] = Dictionary(
                uniqueKeysWithValues: existingList.map { ($0.id, $0) }
            )

            for (i, dict) in items.enumerated() {
                guard let id      = dict["id"]      as? Int,
                      let kana    = dict["kana"]    as? String, !kana.isEmpty,
                      let meaning = dict["meaning"] as? String, !meaning.isEmpty
                else { continue }

                let vocab: Vocabulary
                if let existing = existingMap[id] {
                    existing.kana      = kana
                    existing.kanji     = dict["kanji"]  as? String
                    existing.meaning   = meaning
                    existing.romaji    = dict["romaji"] as? String ?? ""
                    existing.sortOrder = i
                    existing.updatedAt = .now
                    vocab = existing
                } else {
                    vocab = Vocabulary(
                        id: id, lessonNumber: lessonNumber, kana: kana,
                        kanji: dict["kanji"] as? String, meaning: meaning,
                        romaji: dict["romaji"] as? String ?? "", sortOrder: i
                    )
                    modelContext.insert(vocab)
                }

                if vocab.srsCard == nil {
                    let card = SRSCard()
                    card.vocabulary = vocab
                    vocab.srsCard = card
                    modelContext.insert(card)
                }
            }

            try modelContext.save()
            // Thẻ mới tạo đến hạn ngay: cập nhật widget và giờ nhắc
            DueCardsReporter.shared.report(from: modelContext)
        } catch {
            if !silent { syncError = error.userMessage }
        }
    }

    func speak(text: String, id: PersistentIdentifier) {
        speakingId = id
        synthesizer.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "ja-JP")
        utterance.rate = 0.4
        synthesizer.speak(utterance)

        Task { @MainActor in
            try? await Task.sleep(for: .seconds(Double(text.count) * 0.35 + 0.6))
            speakingId = nil
        }
    }
}
