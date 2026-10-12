import SwiftData
import XCTest
@testable import NihongoEDU

/// Store trên đĩa thật (thư mục tạm), không phải in-memory: migration chỉ có nghĩa với file thật.
@MainActor
final class MigrationTests: XCTestCase {
    private var dir: URL!
    private var storeURL: URL { dir.appending(path: "default.store") }

    override func setUp() async throws {
        dir = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }

    override func tearDown() async throws {
        try? FileManager.default.removeItem(at: dir)
    }

    /// Bản đã phát hành tạo store KHÔNG có VersionedSchema. Mở bằng migration plan phải giữ dữ liệu.
    func testUnversionedV1StoreUpgradesKeepingPendingReview() throws {
        do {
            let old = try ModelContainer(for: Vocabulary.self, SRSCard.self, SyncQueueItem.self,
                                         configurations: ModelConfiguration(url: storeURL))
            let card = seedCard(old.mainContext, id: 7, nextReviewAt: fixedNow)
            card.syncStatus = "pending"
            old.mainContext.insert(SyncQueueItem(operation: "UPDATE_SRS", entityId: 7, payload: "{}"))
            try old.mainContext.save()
        }

        let (container, quarantined) = try AppStore.makeContainer(storeURL: storeURL)
        let ctx = container.mainContext

        XCTAssertNil(quarantined, "không được cất store đi: phải migrate được")
        XCTAssertEqual(try ctx.fetch(FetchDescriptor<SRSCard>()).first?.syncStatus, "pending")
        XCTAssertEqual(try ctx.fetchCount(FetchDescriptor<SyncQueueItem>()), 1)
        XCTAssertEqual(try ctx.fetchCount(FetchDescriptor<GrammarItem>()), 0) // bảng mới có và trống
    }

    /// Bản cũ: store không mở được thì XÓA cả Application Support. Giờ: cất sang Quarantine.
    func testUnreadableStoreIsQuarantinedNotDeleted() throws {
        try Data("rác, không phải SQLite".utf8).write(to: storeURL)
        let neighbour = dir.appending(path: "user-notes.txt")
        try Data("dữ liệu khác của app".utf8).write(to: neighbour)

        let (container, quarantined) = try AppStore.makeContainer(storeURL: storeURL)

        let folder = try XCTUnwrap(quarantined)
        XCTAssertTrue(FileManager.default.fileExists(atPath: folder.appending(path: "default.store").path))
        XCTAssertTrue(FileManager.default.fileExists(atPath: neighbour.path), "file khác của app phải còn nguyên")
        XCTAssertEqual(try container.mainContext.fetchCount(FetchDescriptor<Vocabulary>()), 0)
    }
}
