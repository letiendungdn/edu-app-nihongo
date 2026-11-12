import SwiftData
import Foundation

/// Nghĩa tiếng Anh của một chữ kanji (KANJIDIC2, CC BY-SA 4.0 — ghi nguồn ở màn kanji). SchemaV4.
///
/// Tách khỏi `KanjiItem` vì cùng lý do với `VocabularyExtra`: SchemaV2 dùng chung class `KanjiItem`,
/// thêm field vào đó làm đổi checksum của bản cũ → store trên máy người dùng bị cất vào Quarantine.
@Model
final class KanjiExtra {
    @Attribute(.unique) var kanjiId: Int
    var meaningEn: String?

    init(kanjiId: Int, meaningEn: String? = nil) {
        self.kanjiId = kanjiId
        self.meaningEn = meaningEn
    }
}
