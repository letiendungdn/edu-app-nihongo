import Foundation

/// Cây tiền tố (Trie) để gợi ý từ vựng khi gõ romaji. Cùng thuật toán với bản Android (`RomajiTrie.kt`),
/// Flutter (`romaji_trie.dart`) và bài 48 trong docs/interview-java-dsa.md.
///
/// - Kết quả: khóa ngắn trước (gõ "ka" thì "ka" trước "kaban"), cùng độ dài theo bảng chữ cái.
/// - Một mục có thể nằm ở nhiều khóa ("kandō" lưu cả "kando" và "kandou"); search không trả trùng.
final class RomajiTrie<T: Hashable> {
    private final class Node {
        var children: [Character: Node]?   // tạo khi cần: phần lớn nút là lá
        var items: [T]?
    }

    private let root = Node()
    private(set) var nodeCount = 0
    private(set) var itemCount = 0

    func insert(_ romaji: String, item: T) {
        let keys = romajiKeys(romaji)
        guard !keys.isEmpty else { return }
        itemCount += 1
        for key in keys {
            var node = root
            for c in key {
                if node.children == nil { node.children = [:] }
                if let next = node.children?[c] {
                    node = next
                } else {
                    let next = Node()
                    node.children?[c] = next
                    nodeCount += 1
                    node = next
                }
            }
            node.items = (node.items ?? []) + [item]
        }
    }

    func search(_ prefix: String, limit: Int = 30) -> [T] {
        let p = normalizeRomaji(prefix)
        guard !p.isEmpty, limit > 0 else { return [] }
        var node = root
        for c in p {
            guard let next = node.children?[c] else { return [] }
            node = next
        }
        // BFS theo tầng (mảng + chỉ số đầu thay cho hàng đợi)
        var result: [T] = []
        var seen = Set<T>()
        var queue = [node]
        var head = 0
        while head < queue.count, result.count < limit {
            let n = queue[head]; head += 1
            for item in n.items ?? [] where result.count < limit && seen.insert(item).inserted {
                result.append(item)
            }
            if let children = n.children {
                for key in children.keys.sorted() { queue.append(children[key]!) }
            }
        }
        return result
    }
}

private let longVowels: [Character: String] = [
    "ā": "aa", "ī": "ii", "ū": "uu", "ē": "ee", "ō": "ou",
    "â": "aa", "î": "ii", "û": "uu", "ê": "ee", "ô": "ou",
]

/// Chữ thường, bỏ dấu (ō → o), bỏ mọi thứ không phải a–z. "Kandō shimasu" → "kandoshimasu".
func normalizeRomaji(_ text: String) -> String {
    text.lowercased()
        .folding(options: .diacriticInsensitive, locale: nil)
        .filter { $0 >= "a" && $0 <= "z" }
}

/// Các khóa lưu một romaji: bỏ dấu ("kando") và nhân đôi nguyên âm dài ("kandou").
func romajiKeys(_ romaji: String) -> [String] {
    let plain = normalizeRomaji(romaji)
    let doubled = normalizeRomaji(romaji.lowercased().map { longVowels[$0] ?? String($0) }.joined())
    var keys: [String] = []
    for k in [plain, doubled] where !k.isEmpty && !keys.contains(k) { keys.append(k) }
    return keys
}
