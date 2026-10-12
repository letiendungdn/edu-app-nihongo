import Foundation
import SwiftData

/// V1: schema của bản đã phát hành (store cũ trên máy người dùng có đúng 3 entity này).
enum SchemaV1: VersionedSchema {
    static var versionIdentifier = Schema.Version(1, 0, 0)
    static var models: [any PersistentModel.Type] { [Vocabulary.self, SRSCard.self, SyncQueueItem.self] }
}

/// V2: thêm tiến độ, ngữ pháp, kanji, đọc hiểu, bài thi.
enum SchemaV2: VersionedSchema {
    static var versionIdentifier = Schema.Version(2, 0, 0)
    static var models: [any PersistentModel.Type] {
        SchemaV1.models + [
            ProgressSnapshot.self, StudyDayRecord.self,
            GrammarItem.self, GrammarExample.self, KanjiItem.self,
            ReadingPassageItem.self, ReadingQuestionItem.self,
            ExamAttemptRecord.self,
        ]
    }
}

/// Thêm entity mới là "lightweight": SwiftData tự làm. Đổi kiểu, tách hay gộp field thì cần
/// `.custom(fromVersion:toVersion:willMigrate:didMigrate:)`.
enum NihongoMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] { [SchemaV1.self, SchemaV2.self] }
    static var stages: [MigrationStage] {
        [.lightweight(fromVersion: SchemaV1.self, toVersion: SchemaV2.self)]
    }
}

enum AppStore {
    /// Tạo container với migration plan. Bản cũ khi lỗi thì XÓA CẢ thư mục Application Support
    /// (mất thẻ SRS chưa sync, hàng đợi, và mọi file khác của app). Giờ: chuyển store hỏng sang
    /// thư mục riêng để còn cứu được, rồi tạo store mới. Trả về đường dẫn bản đã cất nếu có.
    static func makeContainer(storeURL: URL? = nil, fileManager: FileManager = .default) throws
        -> (container: ModelContainer, quarantined: URL?)
    {
        let url = storeURL ?? defaultStoreURL(fileManager)
        let schema = Schema(versionedSchema: SchemaV2.self)
        let config = ModelConfiguration(schema: schema, url: url)
        do {
            let c = try ModelContainer(for: schema, migrationPlan: NihongoMigrationPlan.self, configurations: [config])
            return (c, nil)
        } catch {
            let moved = try quarantine(storeAt: url, fileManager: fileManager)
            let c = try ModelContainer(for: schema, migrationPlan: NihongoMigrationPlan.self, configurations: [config])
            return (c, moved)
        }
    }

    static func defaultStoreURL(_ fileManager: FileManager = .default) -> URL {
        let support = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? fileManager.createDirectory(at: support, withIntermediateDirectories: true)
        // Tên mặc định của SwiftData: store cũ (tạo bằng ModelConfiguration() không có url) nằm đúng ở đây
        return support.appending(path: "default.store")
    }

    /// Chuyển store cùng file -wal/-shm sang Application Support/Quarantine/<thời điểm>/.
    static func quarantine(storeAt url: URL, fileManager: FileManager = .default) throws -> URL? {
        let related = [url, URL(fileURLWithPath: url.path + "-wal"), URL(fileURLWithPath: url.path + "-shm")]
            .filter { fileManager.fileExists(atPath: $0.path) }
        guard !related.isEmpty else { return nil }
        let folder = url.deletingLastPathComponent()
            .appending(path: "Quarantine")
            .appending(path: ISO8601DateFormatter().string(from: .now).replacingOccurrences(of: ":", with: "-"))
        try fileManager.createDirectory(at: folder, withIntermediateDirectories: true)
        for file in related {
            try fileManager.moveItem(at: file, to: folder.appending(path: file.lastPathComponent))
        }
        return folder
    }
}
