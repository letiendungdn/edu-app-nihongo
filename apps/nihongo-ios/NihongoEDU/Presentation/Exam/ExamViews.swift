import AVFoundation
import SwiftData
import SwiftUI

struct ExamListView: View {
    @Environment(\.modelContext) private var context
    @Query(filter: #Predicate<ExamAttemptRecord> { $0.resultData == nil }, sort: \ExamAttemptRecord.startedAt, order: .reverse)
    private var active: [ExamAttemptRecord]
    @State private var templates: [ExamTemplateDTO] = []
    @State private var loading = true
    @State private var starting = false
    @State private var error: String?
    @State private var opened: String?

    var body: some View {
        List {
            if let a = active.first {
                Section {
                    NavigationLink(value: AppRoute.exam(id: a.examId)) {
                        VStack(alignment: .leading) {
                            Text("Làm tiếp: \(a.title)").font(.headline)
                            Text("Đã trả lời \(a.answers.count)/\(a.questions.count) câu").font(.caption)
                        }
                    }
                }
            }
            Section("Đề thi") {
                if loading { ProgressView() }
                ForEach(templates, id: \.id) { t in
                    Button {
                        Task { await start(t.slug ?? "\(t.id)") }
                    } label: {
                        VStack(alignment: .leading) {
                            Text("\((t.level ?? "").uppercased()) · \(t.title ?? "")").font(.headline)
                            Text("\(t.totalQuestions ?? 0) câu · \(t.durationMinutes ?? 0) phút").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    .disabled(starting)
                }
                if let error { Text(error).foregroundStyle(.red) }
            }
        }
        .navigationTitle("Thi thử JLPT")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(item: $opened) { ExamView(examId: $0) }
        .task {
            defer { loading = false }
            do { templates = try await ExamAPI().templates() } catch { self.error = error.userMessage }
        }
    }

    private func start(_ key: String) async {
        starting = true
        defer { starting = false }
        do { opened = try await ExamStore().start(key: key, in: context, now: .now) }
        catch { self.error = error.userMessage }
    }
}

struct ExamView: View {
    let examId: String
    @Environment(\.modelContext) private var context
    @Query private var found: [ExamAttemptRecord]
    @SceneStorage private var savedIndex: Int
    @State private var submitting = false
    @State private var error: String?
    private let speech = AVSpeechSynthesizer()

    init(examId: String) {
        self.examId = examId
        _found = Query(filter: #Predicate<ExamAttemptRecord> { $0.examId == examId })
        _savedIndex = SceneStorage(wrappedValue: -1, "exam.\(examId).index")
    }

    var body: some View {
        Group {
            if let attempt = found.first {
                if let result = attempt.result {
                    ResultView(result: result)
                } else {
                    question(attempt)
                        // Hết giờ khi đang mở (hoặc mở lại sau khi đã quá giờ): tự nộp đúng một lần
                        .task(id: attempt.examId) {
                            let wait = attempt.remaining(at: .now)
                            if wait > 0 { try? await Task.sleep(for: .seconds(wait)) }
                            guard !Task.isCancelled else { return }
                            await submit(attempt)
                        }
                }
            } else {
                ProgressView()
            }
        }
        .navigationTitle(found.first?.title ?? "Bài thi")
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private func question(_ attempt: ExamAttemptRecord) -> some View {
        let questions = attempt.questions
        let answers = attempt.answers
        let index = resolveIndex(saved: savedIndex, questions: questions, answers: answers)
        if questions.isEmpty {
            ContentUnavailableView("Đề không có câu hỏi", systemImage: "questionmark")
        } else {
            let q = questions[index]
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Câu \(index + 1)/\(questions.count) · \(q.sectionName)")
                    Spacer()
                    // Tính lại từ endsAt mỗi giây: không đếm lùi một biến (sẽ sai khi app ở nền)
                    TimelineView(.periodic(from: .now, by: 1)) { ctx in
                        let left = attempt.remaining(at: ctx.date)
                        Text(formatRemaining(left)).monospacedDigit().font(.headline)
                            .foregroundStyle(left < 300 ? .red : .primary)
                            .accessibilityLabel("Còn \(Int(left) / 60) phút")
                    }
                }
                ProgressView(value: Double(answers.count), total: Double(questions.count))
                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(q.question).font(.title3)
                        if let audio = q.audioText {
                            Button("🔊 Nghe") {
                                let u = AVSpeechUtterance(string: audio)
                                u.voice = AVSpeechSynthesisVoice(language: "ja-JP")
                                speech.speak(u)
                            }
                            .buttonStyle(.bordered)
                        }
                        ForEach(q.options, id: \.self) { option in
                            let picked = answers[q.id] == option
                            Button {
                                ExamStore().saveAnswer(option, question: q.id, attempt: attempt, in: context)
                            } label: {
                                HStack {
                                    Image(systemName: picked ? "largecircle.fill.circle" : "circle")
                                    Text(option).multilineTextAlignment(.leading)
                                }
                            }
                            .accessibilityAddTraits(picked ? .isSelected : [])
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                if let error { Text(error).foregroundStyle(.red).font(.caption) }
                HStack {
                    Button("← Trước") { savedIndex = index - 1 }.disabled(index == 0)
                    Spacer()
                    if index < questions.count - 1 {
                        Button("Tiếp →") { savedIndex = index + 1 }.buttonStyle(.borderedProminent)
                    } else {
                        Button(submitting ? "Đang nộp…" : "Nộp bài (\(answers.count)/\(questions.count))") {
                            Task { await submit(attempt) }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(submitting)
                    }
                }
            }
            .padding()
        }
    }

    private func submit(_ attempt: ExamAttemptRecord) async {
        guard !submitting, attempt.resultData == nil else { return }
        submitting = true
        defer { submitting = false }
        do { _ = try await ExamStore().submit(attempt, in: context); error = nil }
        catch { self.error = error.userMessage + " Bài vẫn được lưu, thử lại khi có mạng." }
    }
}

private struct ResultView: View {
    let result: ExamResult
    var body: some View {
        List {
            Section {
                Text(result.passed ? "Đạt 🎉" : "Chưa đạt").font(.title2.weight(.bold))
                Text("Đúng \(result.correct)/\(result.total) (\(result.percent)%)")
                ForEach(result.sections, id: \.name) { Text("\($0.name): \($0.correct)/\($0.total)") }
            }
            if !result.wrong.isEmpty {
                Section("Câu sai (\(result.wrong.count))") {
                    ForEach(Array(result.wrong.enumerated()), id: \.offset) { _, w in
                        VStack(alignment: .leading) {
                            Text(w.question)
                            Text("Đáp án: \(w.correctAnswer)").foregroundStyle(.green)
                            Text("Bạn chọn: \(w.userAnswer ?? "(bỏ trống)")").foregroundStyle(.red)
                        }
                    }
                }
            }
        }
    }
}
