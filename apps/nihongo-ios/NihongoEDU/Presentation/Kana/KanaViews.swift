import AVFoundation
import SwiftUI

struct Kana: Equatable { let char: String; let romaji: String }

enum KanaScript: String, CaseIterable, Identifiable {
    case hiragana = "Hiragana", katakana = "Katakana"
    var id: String { rawValue }
}

/// 46 chữ cơ bản. Dữ liệu tĩnh: không cần mạng, không cần DB.
enum KanaData {
    private static let romaji = ["a","i","u","e","o","ka","ki","ku","ke","ko","sa","shi","su","se","so",
        "ta","chi","tsu","te","to","na","ni","nu","ne","no","ha","hi","fu","he","ho",
        "ma","mi","mu","me","mo","ya","yu","yo","ra","ri","ru","re","ro","wa","wo","n"]
    private static let hiragana = Array("あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん")
    private static let katakana = Array("アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン")

    static func of(_ script: KanaScript) -> [Kana] {
        (script == .hiragana ? hiragana : katakana).enumerated().map { Kana(char: String($1), romaji: romaji[$0]) }
    }
}

@Observable
@MainActor
final class KanaQuiz {
    struct Question: Equatable { let kana: Kana; let options: [String] }

    private(set) var script: KanaScript
    private(set) var question: Question?
    private(set) var picked: String?
    private(set) var correct = 0
    private(set) var answered = 0
    /// Số lần sai theo chữ: chữ hay sai được hỏi lại nhiều hơn.
    private(set) var mistakes: [String: Int] = [:]
    @ObservationIgnored private var rng: any RandomNumberGenerator

    /// `rng` inject được: test truyền bộ sinh có seed để ra cùng một chuỗi câu hỏi.
    init(script: KanaScript = .hiragana, rng: any RandomNumberGenerator = SystemRandomNumberGenerator()) {
        self.script = script
        self.rng = rng
        next()
    }

    func setScript(_ s: KanaScript) {
        script = s
        correct = 0; answered = 0; mistakes = [:]
        next()
    }

    func answer(_ option: String) {
        guard let q = question, picked == nil else { return }
        picked = option
        answered += 1
        if option == q.kana.romaji { correct += 1 } else { mistakes[q.kana.char, default: 0] += 1 }
    }

    func next() {
        let all = KanaData.of(script)
        let kana = pickWeighted(all)
        var others = all.filter { $0.romaji != kana.romaji }
        others.shuffle(using: &rng)
        var options = others.prefix(3).map(\.romaji) + [kana.romaji]
        options.shuffle(using: &rng)
        question = Question(kana: kana, options: options)
        picked = nil
    }

    /// Trọng số = 1 + 2 × số lần sai.
    private func pickWeighted(_ all: [Kana]) -> Kana {
        let weights = all.map { 1 + 2 * (mistakes[$0.char] ?? 0) }
        var r = Int.random(in: 0..<weights.reduce(0, +), using: &rng)
        for (i, k) in all.enumerated() {
            r -= weights[i]
            if r < 0 { return k }
        }
        return all[all.count - 1]
    }
}

struct KanaView: View {
    @State private var quiz = KanaQuiz()
    @State private var speech = AVSpeechSynthesizer()

    var body: some View {
        VStack(spacing: 16) {
            Picker("Bảng chữ", selection: Binding(get: { quiz.script }, set: { quiz.setScript($0) })) {
                ForEach(KanaScript.allCases) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            Text("Đúng \(quiz.correct)/\(quiz.answered)").foregroundStyle(.secondary)
            if let q = quiz.question {
                Text(q.kana.char).font(.system(size: 110)).foregroundStyle(.red).accessibilityIdentifier("kanaChar")
                LazyVGrid(columns: [GridItem(), GridItem()], spacing: 10) {
                    ForEach(q.options, id: \.self) { option in
                        Button { quiz.answer(option) } label: {
                            Text(option).font(.title2).frame(maxWidth: .infinity).padding(.vertical, 10)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(tint(option, q))
                    }
                }
                if quiz.picked != nil { Button("Câu tiếp") { quiz.next() }.buttonStyle(.bordered) }
                HStack {
                    Button("🔊 Nghe") {
                        let u = AVSpeechUtterance(string: q.kana.char)
                        u.voice = AVSpeechSynthesisVoice(language: "ja-JP")
                        speech.speak(u)
                    }
                    NavigationLink("✍️ Luyện viết", value: AppRoute.kanjiDraw(kanji: q.kana.char, kana: q.kana.romaji))
                }
            }
            Spacer()
        }
        .padding()
        .navigationTitle("Luyện kana")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func tint(_ option: String, _ q: KanaQuiz.Question) -> Color {
        guard quiz.picked != nil else { return .red }
        if option == q.kana.romaji { return .green }
        return option == quiz.picked ? .orange : .gray
    }
}
