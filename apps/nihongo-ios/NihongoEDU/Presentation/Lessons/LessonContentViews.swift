import SwiftData
import SwiftUI

enum LessonTab: String, CaseIterable, Identifiable {
    case vocab = "Từ vựng", grammar = "Ngữ pháp", kanji = "Kanji"
    var id: String { rawValue }
}

/// Khuôn chung cho danh sách offline: @Query đọc SwiftData, `.task` làm mới từ mạng.
/// Chỉ hiện "đang tải" khi CHƯA có gì để hiện (cùng ý tưởng sửa L2 bên Android).
struct CachedListState {
    var isRefreshing = false
    var error: String?
}

struct GrammarList: View {
    let lesson: Int
    @Environment(\.modelContext) private var context
    @Query private var items: [GrammarItem]
    @State private var state = CachedListState()

    init(lesson: Int) {
        self.lesson = lesson
        _items = Query(filter: #Predicate<GrammarItem> { $0.lessonNumber == lesson }, sort: \GrammarItem.sortOrder)
    }

    var body: some View {
        CachedListContainer(isEmpty: items.isEmpty, state: state, emptyText: "Chưa có ngữ pháp. Cần mạng để tải lần đầu.") {
            ForEach(items) { g in
                VStack(alignment: .leading, spacing: 6) {
                    Text(g.pattern).font(.headline).foregroundStyle(.red)
                    Text(g.meaning)
                    if let e = g.explanation, !e.isEmpty { Text(e).font(.caption).foregroundStyle(.secondary) }
                    ForEach(g.examples.sorted { $0.sortOrder < $1.sortOrder }) { ex in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(ex.jp).font(.subheadline)
                            if let vi = ex.vi { Text(vi).font(.caption).foregroundStyle(.secondary) }
                        }
                        .padding(.leading, 8)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .task(id: lesson) { await refresh() }
        .refreshable { await refresh() }
    }

    private func refresh() async {
        state.isRefreshing = true
        defer { state.isRefreshing = false }
        do { try await ContentSync().syncGrammar(lesson: lesson, in: context); state.error = nil }
        catch { state.error = error.userMessage }
    }
}

struct KanjiList: View {
    let lesson: Int
    @Environment(\.modelContext) private var context
    @Query private var items: [KanjiItem]
    @State private var state = CachedListState()

    init(lesson: Int) {
        self.lesson = lesson
        _items = Query(filter: #Predicate<KanjiItem> { $0.lessonNumber == lesson }, sort: \KanjiItem.sortOrder)
    }

    var body: some View {
        CachedListContainer(isEmpty: items.isEmpty, state: state, emptyText: "Chưa có kanji cho bài này.") {
            ForEach(items) { k in
                HStack(spacing: 16) {
                    Text(k.character).font(.system(size: 44)).foregroundStyle(.red)
                    VStack(alignment: .leading, spacing: 2) {
                        if let h = k.hanViet { Text(h).font(.subheadline.weight(.semibold)) }
                        if let m = k.meaning { Text(m) }
                        if let on = k.onyomi, !on.isEmpty { Text("On: \(on)").font(.caption) }
                        if let kun = k.kunyomi, !kun.isEmpty { Text("Kun: \(kun)").font(.caption) }
                    }
                }
                .accessibilityElement(children: .combine)
            }
        }
        .task(id: lesson) { await refresh() }
        .refreshable { await refresh() }
    }

    private func refresh() async {
        state.isRefreshing = true
        defer { state.isRefreshing = false }
        do { try await ContentSync().syncKanji(lesson: lesson, in: context); state.error = nil }
        catch { state.error = error.userMessage }
    }
}

struct CachedListContainer<Content: View>: View {
    let isEmpty: Bool
    let state: CachedListState
    let emptyText: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        if isEmpty && state.isRefreshing {
            ProgressView("Đang tải…").frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if isEmpty {
            ContentUnavailableView(state.error ?? emptyText, systemImage: "tray")
        } else {
            List {
                if let e = state.error {
                    Text("Đang hiện dữ liệu đã lưu · \(e)").font(.caption).foregroundStyle(.red)
                }
                content()
            }
            .listStyle(.plain)
        }
    }
}
