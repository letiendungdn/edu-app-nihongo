import SwiftData
import Foundation

/// Nghĩa tiếng Anh, âm Hán Việt, furigana của một từ (SchemaV3).
///
/// Tách khỏi `Vocabulary` có chủ ý: SchemaV1/V2 dùng chung class `Vocabulary`, thêm field vào đó làm đổi
/// checksum của cả bản cũ → store trên máy người dùng không khớp bản nào → bị cất vào Quarantine
/// (mất thẻ SRS chưa sync). Thêm entity mới thì migration nhẹ, SwiftData tự làm.
@Model
final class VocabularyExtra {
    @Attribute(.unique) var vocabId: Int
    var meaningEn: String?
    /// manual | jmdict | ai — "ai" thì UI ghi "dịch máy"
    var meaningEnSource: String?
    var hanViet: String?
    /// JSON [["食","た"],["べます",""]] do backend tính
    var furigana: String?

    init(vocabId: Int, meaningEn: String? = nil, meaningEnSource: String? = nil, hanViet: String? = nil, furigana: String? = nil) {
        self.vocabId = vocabId
        self.meaningEn = meaningEn
        self.meaningEnSource = meaningEnSource
        self.hanViet = hanViet
        self.furigana = furigana
    }

    var furiganaSegments: [FuriganaSegment] { FuriganaSegment.parse(furigana) }
}
