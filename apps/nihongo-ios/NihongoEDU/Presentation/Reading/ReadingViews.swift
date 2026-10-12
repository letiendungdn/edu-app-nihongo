import SwiftData
import SwiftUI

struct ReadingListView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: [SortDescriptor(\ReadingPassageItem.sortOrder), SortDescriptor(\ReadingPassageItem.id)]) private var passages: [ReadingPassageItem]
    @State private var state = CachedListState()

    var body: some View {
        CachedListContainer(isEmpty: passages.isEmpty, state: state, emptyText: "Chưa có bài đọc.") {
            ForEach(passages) { p in
                NavigationLink(value: AppRoute.readingDetail(id: p.id)) {
                    VStack(alignment: .leading) {
                        Text(p.title).font(.headline)
                        Text("\(p.jlptLevel ?? "") · \(p.estimatedMin) phút · \(p.questionCount) câu\(p.content != nil ? " · đã tải" : "")")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Đọc hiểu")
        .navigationBarTitleDisplayMode(.inline)
        .task { await refresh() }
        .refreshable { await refresh() }
    }

    private func refresh() async {
        state.isRefreshing = true
        defer { state.isRefreshing = false }
        do { try await ContentSync().syncReadingList(in: context); state.error = nil }
        catch { state.error = error.userMessage }
    }
}

struct ReadingDetailView: View {
    let id: Int
    @Environment(\.modelContext) private var context
    @Query private var found: [ReadingPassageItem]
    /// Đáp án đang chọn: @SceneStorage sống qua việc HỆ THỐNG giết app (giống SavedStateHandle).
    /// Chỉ lưu được kiểu đơn giản nên lưu JSON.
    @SceneStorage private var answersJSON: String
    @State private var score: QuizScore?
    @State private var gradedOffline = false
    @State private var submitting = false
    @State private var error: String?
    @State private var loading = true

    init(id: Int) {
        self.id = id
        _found = Query(filter: #Predicate<ReadingPassageItem> { $0.id == id })
        _answersJSON = SceneStorage(wrappedValue: "{}", "reading.\(id).answers")
    }

    private var answers: [Int: String] {
        let raw = (try? JSONDecoder().decode([String: String].self, from: Data(answersJSON.utf8))) ?? [:]
        return Dictionary(uniqueKeysWithValues: raw.compactMap { k, v in Int(k).map { ($0, v) } })
    }

    private func choose(_ q: Int, _ option: String) {
        guard score == nil else { return }
        var a = answers
        a[q] = option
        answersJSON = String(data: try! JSONEncoder().encode(Dictionary(uniqueKeysWithValues: a.map { ("\($0)", $1) })), encoding: .utf8)!
    }

    var body: some View {
        Group {
            if let p = found.first, let content = p.content {
                let questions = p.questions.sorted { $0.sortOrder < $1.sortOrder }
                List {
                    Section { Text(content).font(.body) }
                    ForEach(questions) { q in
                        Section(q.question) {
                            ForEach(q.options, id: \.self) { option in
                                let picked = answers[q.id] == option
                                let correct = score != nil && option == q.answer
                                Button { choose(q.id, option) } label: {
                                    HStack {
                                        Image(systemName: picked ? "largecircle.fill.circle" : "circle")
                                        Text(option)
                                        if correct { Spacer(); Image(systemName: "checkmark").foregroundStyle(.green) }
                                    }
                                }
                                .accessibilityAddTraits(picked ? .isSelected : [])
                            }
                            if score != nil, let e = q.explanation { Text(e).font(.caption).foregroundStyle(.secondary) }
                        }
                    }
                    Section {
                        if let score {
                            Text("Đúng \(score.correct)/\(score.total) (\(score.percent)%)").font(.title3.weight(.semibold))
                            if gradedOffline { Text("Chấm offline bằng đáp án đã lưu. Kết quả chưa gửi lên server.").font(.caption) }
                        } else {
                            Button(submitting ? "Đang nộp…" : "Nộp bài") { Task { await submit(p, questions) } }
                                .disabled(submitting || answers.count < questions.count || questions.isEmpty)
                        }
                        if let error { Text(error).foregroundStyle(.red) }
                    }
                }
            } else if loading {
                ProgressView("Đang tải…")
            } else {
                ContentUnavailableView(error ?? "Cần mạng để tải bài lần đầu.", systemImage: "wifi.slash")
            }
        }
        .navigationTitle(found.first?.title ?? "Đọc hiểu")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            defer { loading = false }
            do { try await ContentSync().syncReading(id: id, in: context) } catch { self.error = error.userMessage }
        }
    }

    private func submit(_ p: ReadingPassageItem, _ questions: [ReadingQuestionItem]) async {
        submitting = true
        defer { submitting = false }
        let a = answers
        do {
            let s = try await ContentAPI().submitReading(id: p.id, answers: Dictionary(uniqueKeysWithValues: a.map { ("\($0)", $1) }))
            score = QuizScore(correct: s.correct ?? 0, total: s.total ?? questions.count)
        } catch is URLError {
            // Mất mạng: vẫn cho biết kết quả, chấm bằng đáp án đã lưu trong SwiftData
            score = gradeReading(questions.map { ($0.id, $0.answer) }, answers: a)
            gradedOffline = true
        } catch {
            self.error = error.userMessage
        }
    }
}
