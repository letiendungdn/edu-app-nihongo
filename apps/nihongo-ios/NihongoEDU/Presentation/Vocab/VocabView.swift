import SwiftUI
import SwiftData

struct VocabView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var viewModel = VocabViewModel()
    /// Tab đang chọn: @SceneStorage để xoay máy hay bị hệ thống giết app vẫn ở đúng tab.
    @SceneStorage("lesson.tab") private var tab: LessonTab = .vocab

    var body: some View {
        VStack(spacing: 0) {
            Picker("Nội dung", selection: $tab) {
                ForEach(LessonTab.allCases) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.top, 8)

            switch tab {
            case .vocab:
                VocabContent(lesson: viewModel.selectedLesson, viewModel: viewModel, modelContext: modelContext)
                    // .id forces @Query to rebuild with new predicate when lesson changes
                    .id(viewModel.selectedLesson)
            case .grammar:
                LessonPickerOnly(viewModel: viewModel)
                GrammarList(lesson: viewModel.selectedLesson).id(viewModel.selectedLesson)
            case .kanji:
                LessonPickerOnly(viewModel: viewModel)
                KanjiList(lesson: viewModel.selectedLesson).id(viewModel.selectedLesson)
            }
        }
            .navigationTitle("Bài học")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await viewModel.syncLesson(viewModel.selectedLesson, modelContext: modelContext) }
                    } label: {
                        if viewModel.isSyncing {
                            ProgressView().controlSize(.small)
                        } else {
                            Image(systemName: "icloud.and.arrow.down")
                        }
                    }
                    .disabled(viewModel.isSyncing)
                }
            }
    }
}

// MARK: - Inner view with dynamic @Query

private struct VocabContent: View {
    let lesson: Int
    let viewModel: VocabViewModel
    let modelContext: ModelContext

    @Query private var vocab: [Vocabulary]
    /// Chỉ có từ của các bài đã sync (vài trăm–vài nghìn dòng); @Query để tự vẽ lại sau khi sync xong
    @Query private var extras: [VocabularyExtra]

    private var extrasById: [Int: VocabularyExtra] {
        let ids = Set(vocab.map(\.id))
        return Dictionary(extras.filter { ids.contains($0.vocabId) }.map { ($0.vocabId, $0) }, uniquingKeysWith: { a, _ in a })
    }

    init(lesson: Int, viewModel: VocabViewModel, modelContext: ModelContext) {
        self.lesson = lesson
        self.viewModel = viewModel
        self.modelContext = modelContext
        _vocab = Query(
            filter: #Predicate<Vocabulary> { $0.lessonNumber == lesson },
            sort: \Vocabulary.sortOrder
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            LessonPickerBar(
                selected: Binding(get: { lesson }, set: { viewModel.selectedLesson = $0 }),
                count: vocab.count,
                isSyncing: viewModel.isSyncing
            )
            .padding(16)

            if vocab.isEmpty {
                emptyState
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(vocab) { item in
                            VocabRow(item: item, extra: extrasById[item.id], viewModel: viewModel)
                        }
                        if extrasById.values.contains(where: { $0.meaningEnSource == "jmdict" }) {
                            JmdictAttribution().padding(.top, 8)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)
                }
            }
        }
        .background(Color(.systemGroupedBackground))
        .task {
            await viewModel.autoSyncIfNeeded(
                // Bản mới tạo VocabularyExtra cho mọi từ khi sync: bài có từ mà chưa có extra = tải từ bản cũ
                lesson: lesson, needsSync: vocab.isEmpty || extrasById.isEmpty, modelContext: modelContext
            )
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            if viewModel.isSyncing {
                ProgressView()
                    .controlSize(.large)
                Text("Đang tải bài \(lesson)…")
                    .foregroundStyle(.secondary)
            } else {
                Image(systemName: "icloud.and.arrow.down")
                    .font(.system(size: 52))
                    .foregroundStyle(.quaternary)
                Text("Chưa có dữ liệu bài \(lesson)")
                    .foregroundStyle(.secondary)
                if let err = viewModel.syncError {
                    Text(err).font(.caption).foregroundStyle(.red).multilineTextAlignment(.center)
                }
                Button("Tải từ server") {
                    Task { await viewModel.syncLesson(lesson, modelContext: modelContext) }
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
            }
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Subviews

private struct LessonPickerOnly: View {
    let viewModel: VocabViewModel
    var body: some View {
        Picker("Bài học", selection: Binding(get: { viewModel.selectedLesson }, set: { viewModel.selectedLesson = $0 })) {
            ForEach(1...50, id: \.self) { Text("Bài \($0)").tag($0) }
        }
        .padding(.horizontal, 16)
    }
}

private struct LessonPickerBar: View {
    @Binding var selected: Int
    let count: Int
    let isSyncing: Bool

    var body: some View {
        HStack {
            Text("Bài học").fontWeight(.semibold)
            Spacer()
            Picker("Bài học", selection: $selected) {
                ForEach(1...50, id: \.self) { n in
                    Text("Bài \(n)").tag(n)
                }
            }
            .labelsHidden()

            Group {
                if isSyncing {
                    ProgressView().controlSize(.mini)
                } else {
                    Text("\(count) từ")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(.red, in: Capsule())
                }
            }
            .frame(minWidth: 44)
        }
        .padding(14)
        .background(.background, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.separator, lineWidth: 0.5))
    }
}

private struct VocabRow: View {
    let item: Vocabulary
    let extra: VocabularyExtra?
    let viewModel: VocabViewModel

    private var furigana: [FuriganaSegment] { extra?.furiganaSegments ?? [] }

    private var jpText: String  { item.kanji ?? item.kana }
    private var readText: String { item.kanji != nil ? item.kana : item.romaji }
    private var isSpeaking: Bool { viewModel.speakingId == item.persistentModelID }

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .lastTextBaseline, spacing: 8) {
                    FuriganaText(segments: furigana, fallback: jpText, size: 20)
                    // Có furigana thì cách đọc đã nằm trên chữ: chỉ hiện romaji
                    if !furigana.isEmpty {
                        Text(item.romaji)
                            .font(.system(size: 13))
                            .foregroundStyle(.red)
                    } else if !readText.isEmpty {
                        Text(readText)
                            .font(.system(size: 13))
                            .foregroundStyle(.red)
                    }
                }
                Text(item.meaning)
                    .font(.system(size: 14))
                    .foregroundStyle(.secondary)
                VocabExtraMeanings(hanViet: extra?.hanViet, meaningEn: extra?.meaningEn, source: extra?.meaningEnSource)
            }

            Spacer()

            Button {
                viewModel.speak(text: item.kana, id: item.persistentModelID)
            } label: {
                ZStack {
                    if isSpeaking {
                        ProgressView().controlSize(.small)
                    } else {
                        Image(systemName: "speaker.wave.2.fill")
                            .foregroundStyle(.red)
                    }
                }
                .frame(width: 36, height: 36)
            }
            .disabled(isSpeaking)
        }
        .padding(14)
        .background(.background, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.separator, lineWidth: 0.5))
    }
}
