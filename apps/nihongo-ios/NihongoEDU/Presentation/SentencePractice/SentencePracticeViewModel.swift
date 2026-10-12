import Foundation

struct FeedbackEntry: Identifiable {
    let id = UUID()
    let sentence: String
    let feedback: SentenceFeedback
}

@Observable
@MainActor
final class SentencePracticeViewModel {
    var history: [FeedbackEntry] = []
    var isLoading: Bool = false
    var error: String? = nil

    func analyze(_ sentence: String) async {
        let trimmed = sentence.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isLoading else { return }

        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let feedback = try await GeminiAPI.analyze(trimmed)
            history.insert(FeedbackEntry(sentence: trimmed, feedback: feedback), at: 0)
        } catch {
            self.error = error.userMessage
        }
    }
}
