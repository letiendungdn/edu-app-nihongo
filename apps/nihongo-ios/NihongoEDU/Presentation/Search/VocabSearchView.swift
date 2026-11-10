import SwiftUI
import SwiftData

/// Bản sao giá trị của một từ: @Model của SwiftData không nên giữ lâu ngoài context, và cần Hashable cho Trie.
struct VocabHit: Hashable, Identifiable {
    let id: Int
    let lessonNumber: Int
    let kana: String
    let kanji: String?
    let meaning: String
    let romaji: String

    init(_ v: Vocabulary) {
        id = v.id; lessonNumber = v.lessonNumber; kana = v.kana; kanji = v.kanji; meaning = v.meaning; romaji = v.romaji
    }
}

/// Chỉ mục tra từ: dựng Trie từ từ vựng trong SwiftData, mỗi lần gõ chỉ là một lần search.
@Observable
@MainActor
final class VocabSearchIndex {
    private(set) var trie = RomajiTrie<VocabHit>()
    private(set) var isIndexing = true
    var indexedCount: Int { trie.itemCount }

    func rebuild(from vocabulary: [Vocabulary]) {
        let next = RomajiTrie<VocabHit>()
        for v in vocabulary { next.insert(v.romaji, item: VocabHit(v)) }
        trie = next
        isIndexing = false
    }

    func search(_ query: String, limit: Int = 30) -> [VocabHit] {
        trie.search(query, limit: limit)
    }
}

/// Tra từ theo romaji, offline. @Query tự cập nhật khi bài mới được sync vào SwiftData.
struct VocabSearchView: View {
    @Query(sort: [SortDescriptor(\Vocabulary.lessonNumber), SortDescriptor(\Vocabulary.sortOrder)])
    private var vocabulary: [Vocabulary]
    @State private var index = VocabSearchIndex()
    @State private var query = ""
    /// Bật ngay khi màn hiện ra: ô tìm tự được chọn, bàn phím tự bật, gõ được luôn (iOS 17+).
    @State private var searchPresented = false

    /// Đổi khi thêm/xóa từ hoặc từ được sửa: dựng lại Trie.
    private var indexKey: String {
        "\(vocabulary.count)-\(vocabulary.map(\.updatedAt).max()?.timeIntervalSince1970 ?? 0)"
    }

    var body: some View {
        content
            .navigationTitle("Tra từ (romaji)")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $query, isPresented: $searchPresented, placement: .navigationBarDrawer(displayMode: .always), prompt: "Gõ romaji, ví dụ: tabe, kandou")
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .task(id: indexKey) { index.rebuild(from: vocabulary) }
            .task { searchPresented = true }
    }

    @ViewBuilder
    private var content: some View {
        let results = index.search(query)
        if index.isIndexing {
            ProgressView("Đang dựng chỉ mục…")
        } else if index.indexedCount == 0 {
            message("Chưa có từ vựng trên máy. Mở một bài học khi có mạng để tải từ vựng về.")
        } else if query.trimmingCharacters(in: .whitespaces).isEmpty {
            message("Tìm trong \(index.indexedCount) từ đã có trên máy, không cần mạng.")
        } else if results.isEmpty {
            message("Không có từ nào bắt đầu bằng \"\(query)\".")
        } else {
            List(results) { hit in
                VStack(alignment: .leading, spacing: 2) {
                    Text(hit.kanji.map { "\(hit.kana)  ·  \($0)" } ?? hit.kana).font(.headline)
                    Text(hit.romaji).font(.caption).foregroundStyle(.tint)
                    Text(hit.meaning)
                    Text("Bài \(hit.lessonNumber)").font(.caption2).foregroundStyle(.secondary)
                }
            }
            .listStyle(.plain)
        }
    }

    private func message(_ text: String) -> some View {
        Text(text).multilineTextAlignment(.center).foregroundStyle(.secondary).padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
