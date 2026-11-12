import AVFoundation

/// Chữ đưa cho giọng đọc tiếng Anh (cùng quy tắc với web): bỏ ghi chú trong ngoặc ("(in textbook)"),
/// dấu ~ của mẫu câu, đổi ";" thành "," để ngắt nghỉ tự nhiên.
func englishForSpeech(_ text: String) -> String {
    var s = text.replacingOccurrences(of: #"\([^)]*\)"#, with: " ", options: .regularExpression)
    s = s.replacingOccurrences(of: "[~～]", with: " ", options: .regularExpression)
    s = s.replacingOccurrences(of: #"\s*;\s*"#, with: ", ", options: .regularExpression)
    s = s.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
    s = s.replacingOccurrences(of: #"\s+,"#, with: ",", options: .regularExpression)
    return s.trimmingCharacters(in: .whitespaces)
}

/// Đọc nghĩa tiếng Anh (en-US). Một synthesizer dùng chung: bấm từ khác thì dừng câu đang đọc.
@MainActor
final class EnglishSpeaker {
    static let shared = EnglishSpeaker()
    private let synthesizer = AVSpeechSynthesizer()

    func speak(_ text: String) {
        let clean = englishForSpeech(text)
        let toSay = clean.isEmpty ? text : clean
        guard !toSay.isEmpty else { return }
        synthesizer.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: toSay)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        utterance.rate = 0.45
        synthesizer.speak(utterance)
    }
}
