import SwiftData
import Foundation

/// Bản dịch tiếng Anh (dịch máy) của một câu ví dụ ngữ pháp. SchemaV5.
///
/// Tách khỏi `GrammarExample` vì cùng lý do với `VocabularyExtra` / `KanjiExtra`: SchemaV2 dùng chung class
/// `GrammarExample`, thêm field vào đó làm đổi checksum của bản cũ → store trên máy người dùng bị cất vào Quarantine.
@Model
final class GrammarExampleExtra {
    @Attribute(.unique) var exampleId: Int
    var en: String?

    init(exampleId: Int, en: String? = nil) {
        self.exampleId = exampleId
        self.en = en
    }
}
