import SwiftData
import XCTest
@testable import NihongoEDU

final class RomajiTrieTests: XCTestCase {
    private func trie(_ romaji: [String]) -> RomajiTrie<String> {
        let t = RomajiTrie<String>()
        romaji.forEach { t.insert($0, item: $0) }
        return t
    }

    func testNormalizeDropsCaseMarksSpacesAndPunctuation() {
        XCTAssertEqual(normalizeRomaji("Kandō shimasu"), "kandoshimasu")
        XCTAssertEqual(normalizeRomaji("ja, mata [ashita]."), "jamataashita")
    }

    func testLongVowelFoundWhetherTypedPlainOrDoubled() {
        let t = trie(["kandō shimasu", "kanji"])
        XCTAssertEqual(t.search("kando"), ["kandō shimasu"])
        XCTAssertEqual(t.search("kandou"), ["kandō shimasu"])
        XCTAssertEqual(t.search("Kandō Shi"), ["kandō shimasu"])
    }

    func testShorterKeysFirstThenAlphabetical() {
        XCTAssertEqual(trie(["kaban", "ka", "kasa", "kagi"]).search("ka"), ["ka", "kagi", "kasa", "kaban"])
    }

    func testItemUnderTwoKeysReturnedOnce() {
        let t = trie(["tōrimasu"])
        XCTAssertEqual(t.search("to"), ["tōrimasu"])
        XCTAssertEqual(t.itemCount, 1)
    }

    func testLimitAndUnknownOrBlankPrefix() {
        let t = trie(["a", "ai", "aisu", "ame", "ane"])
        XCTAssertEqual(t.search("a", limit: 3).count, 3)
        XCTAssertTrue(t.search("zzz").isEmpty)
        XCTAssertTrue(t.search("   ").isEmpty)
    }

    func testRealRomajiSamplesFromContentDatabase() {
        let t = trie(["nyūgaku shimasu", "nyūgakushiki", "yūshū desu", "nandesuka.", "tōrimasu"])
        XCTAssertEqual(t.search("nyuugakushi"), ["nyūgakushiki", "nyūgaku shimasu"])
        XCTAssertEqual(t.search("yushu"), ["yūshū desu"])
        XCTAssertEqual(t.search("nandesuka"), ["nandesuka."])
    }
}

/// Chỉ mục dựng từ SwiftData thật (bộ nhớ trong): dữ liệu sync thêm thì dựng lại là tìm được.
@MainActor
final class VocabSearchIndexTests: XCTestCase {
    func testRebuildFromSwiftDataAndSearch() throws {
        // Phải giữ container: chỉ giữ mainContext thì container bị giải phóng ngay và context dùng sau đó làm crash
        let container = try makeMemoryContainer()
        let ctx = container.mainContext
        ctx.insert(Vocabulary(id: 1, lessonNumber: 30, kana: "かんどうします", kanji: "感動します", meaning: "cảm động", romaji: "kandō shimasu"))
        ctx.insert(Vocabulary(id: 2, lessonNumber: 1, kana: "かんじ", kanji: "漢字", meaning: "chữ Hán", romaji: "kanji"))
        try ctx.save()

        let index = VocabSearchIndex()
        XCTAssertTrue(index.isIndexing)
        index.rebuild(from: try ctx.fetch(FetchDescriptor<Vocabulary>()))

        XCTAssertFalse(index.isIndexing)
        XCTAssertEqual(index.indexedCount, 2)
        XCTAssertEqual(index.search("kandou").map(\.meaning), ["cảm động"])
        XCTAssertEqual(Set(index.search("kan").map(\.id)), [1, 2])

        ctx.insert(Vocabulary(id: 3, lessonNumber: 6, kana: "のみます", meaning: "uống", romaji: "nomimasu"))
        try ctx.save()
        index.rebuild(from: try ctx.fetch(FetchDescriptor<Vocabulary>()))
        XCTAssertEqual(index.search("nomi").map(\.meaning), ["uống"])
    }
}
