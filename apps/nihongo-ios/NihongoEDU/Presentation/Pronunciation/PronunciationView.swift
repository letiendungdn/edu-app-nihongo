import AVFoundation
import Speech
import SwiftUI

struct PronunciationView: View {
    let kana: String
    let meaning: String

    @State private var available = false
    @State private var listening = false
    @State private var recognized = ""
    @State private var score: Double?
    @State private var errorText: String?

    @State private var speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "ja-JP"))
    @State private var audioEngine = AVAudioEngine()
    @State private var request: SFSpeechAudioBufferRecognitionRequest?
    @State private var task: SFSpeechRecognitionTask?
    private let synthesizer = AVSpeechSynthesizer()

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text(kana).font(.largeTitle.bold())
                Text(meaning).foregroundStyle(.secondary)
                Button {
                    let u = AVSpeechUtterance(string: kana)
                    u.voice = AVSpeechSynthesisVoice(language: "ja-JP")
                    synthesizer.speak(u)
                } label: {
                    Label("Nghe mẫu", systemImage: "speaker.wave.2.fill")
                }
                .buttonStyle(.bordered)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(.background, in: RoundedRectangle(cornerRadius: 16))

            if let errorText {
                Text(errorText).foregroundStyle(.red)
            } else if !available {
                Text("Thiết bị không hỗ trợ nhận dạng giọng nói.")
            } else {
                Button {
                    if listening { stop() } else { start() }
                } label: {
                    Image(systemName: listening ? "stop.circle.fill" : "mic.circle.fill")
                        .font(.system(size: 72))
                        .foregroundStyle(listening ? .red : .accentColor)
                }
                Text(listening ? "Đang nghe..." : "Bấm để nói")
                    .foregroundStyle(.secondary)
            }

            if !recognized.isEmpty {
                Text("Bạn đọc:").font(.caption)
                Text(recognized).font(.title2.bold())
            }

            if let score {
                Text("\(Int(score * 100))")
                    .font(.largeTitle.bold())
                    .foregroundStyle(scoreColor(score))
                Text(feedback(score))
                Button("Thử lại") { start() }
            }

            Spacer()
        }
        .padding()
        .navigationTitle("Luyện phát âm")
        .navigationBarTitleDisplayMode(.inline)
        .task { await requestAuth() }
        .onDisappear { stop() }
    }

    private func requestAuth() async {
        let speech = await withCheckedContinuation { (cont: CheckedContinuation<Bool, Never>) in
            SFSpeechRecognizer.requestAuthorization { status in
                cont.resume(returning: status == .authorized)
            }
        }
        let session = AVAudioSession.sharedInstance()
        let mic = await withCheckedContinuation { (cont: CheckedContinuation<Bool, Never>) in
            session.requestRecordPermission { cont.resume(returning: $0) }
        }
        available = speech && mic && (speechRecognizer?.isAvailable ?? false)
    }

    private func start() {
        stop()
        recognized = ""
        score = nil
        errorText = nil
        guard let speechRecognizer else { return }

        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        request = req

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let input = audioEngine.inputNode
            let format = input.outputFormat(forBus: 0)
            input.removeTap(onBus: 0)
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
                req.append(buffer)
            }
            audioEngine.prepare()
            try audioEngine.start()
            listening = true

            task = speechRecognizer.recognitionTask(with: req) { result, error in
                if let result {
                    recognized = result.bestTranscription.formattedString
                    if result.isFinal {
                        score = calcScore(recognized, kana)
                        stop()
                    }
                }
                if error != nil {
                    stop()
                }
            }
        } catch {
            errorText = error.userMessage
            stop()
        }
    }

    private func stop() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        task?.cancel()
        request = nil
        task = nil
        listening = false
    }

    private func calcScore(_ recognized: String, _ expected: String) -> Double {
        let r = recognized.replacingOccurrences(of: " ", with: "")
        let e = expected.replacingOccurrences(of: " ", with: "")
        if e.isEmpty { return 0 }
        if r == e { return 1 }
        let rChars = Array(r)
        let eChars = Array(e)
        var matches = 0
        for i in 0..<min(rChars.count, eChars.count) where rChars[i] == eChars[i] {
            matches += 1
        }
        return Double(matches) / Double(eChars.count)
    }

    private func scoreColor(_ score: Double) -> Color {
        if score >= 0.8 { return .green }
        if score >= 0.5 { return .orange }
        return .red
    }

    private func feedback(_ score: Double) -> String {
        if score >= 0.9 { return "Xuất sắc!" }
        if score >= 0.7 { return "Tốt lắm!" }
        if score >= 0.5 { return "Khá ổn, luyện thêm nhé!" }
        return "Thử lại nha!"
    }
}
