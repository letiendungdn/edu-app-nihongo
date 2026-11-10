package com.edu.nihongo.domain.search

import java.text.Normalizer

/**
 * Cây tiền tố (Trie) để gợi ý từ vựng khi gõ romaji: gõ "kan" ra mọi từ có romaji bắt đầu bằng "kan".
 * Kotlin thuần, không phụ thuộc Android (test trên JVM). Bài 48 trong docs/interview-java-dsa.md.
 *
 * - insert: O(độ dài khóa). search: O(độ dài tiền tố + số nút phải duyệt để lấy đủ `limit` kết quả).
 * - Kết quả theo thứ tự: khóa ngắn trước (gõ "ka" thì "ka" đứng trước "kaban"), cùng độ dài thì theo bảng chữ cái.
 * - Một mục có thể nằm ở nhiều khóa (ví dụ "kandō" lưu cả "kando" và "kandou"); search không trả trùng.
 */
class RomajiTrie<T> {
    private class Node<T> {
        var children: HashMap<Char, Node<T>>? = null // tạo khi cần: phần lớn nút là lá, không tốn một HashMap rỗng
        var items: MutableList<T>? = null
    }

    private val root = Node<T>()

    /** Số nút (không tính gốc). Đo trên 14.609 từ vựng thật: khoảng 33.700 nút. */
    var nodeCount = 0
        private set

    /** Số mục đã thêm (một mục tính một lần dù có nhiều khóa). */
    var itemCount = 0
        private set

    fun insert(romaji: String, item: T) {
        val keys = romajiKeys(romaji)
        if (keys.isEmpty()) return
        itemCount++
        for (key in keys) {
            var node = root
            for (c in key) {
                val children = node.children ?: HashMap<Char, Node<T>>(4).also { node.children = it }
                node = children.getOrPut(c) { nodeCount++; Node() }
            }
            (node.items ?: mutableListOf<T>().also { node.items = it }).add(item)
        }
    }

    fun search(prefix: String, limit: Int = 30): List<T> {
        val p = normalizeRomaji(prefix)
        if (p.isEmpty() || limit <= 0) return emptyList()
        var node = root
        for (c in p) node = node.children?.get(c) ?: return emptyList()

        // BFS theo từng tầng: khóa ngắn hơn ra trước. Con của mỗi nút đi theo thứ tự chữ cái.
        val result = LinkedHashSet<T>()
        val queue = ArrayDeque<Node<T>>().apply { add(node) }
        while (queue.isNotEmpty() && result.size < limit) {
            val n = queue.removeFirst()
            n.items?.forEach { if (result.size < limit) result.add(it) }
            n.children?.entries?.sortedBy { it.key }?.forEach { queue.addLast(it.value) }
        }
        return result.toList()
    }
}

private val LONG_VOWELS = mapOf(
    'ā' to "aa", 'ī' to "ii", 'ū' to "uu", 'ē' to "ee", 'ō' to "ou",
    'â' to "aa", 'î' to "ii", 'û' to "uu", 'ê' to "ee", 'ô' to "ou",
)

/**
 * Chuẩn hóa chữ người dùng gõ: chữ thường, bỏ dấu (ō → o), bỏ mọi thứ không phải a–z
 * (khoảng trắng, dấu câu, ngoặc). "Kandō shimasu" → "kandoshimasu".
 */
fun normalizeRomaji(text: String): String =
    Normalizer.normalize(text.lowercase(), Normalizer.Form.NFD)
        .filter { it in 'a'..'z' }

/**
 * Các khóa để lưu một romaji trong DB. Dữ liệu dùng dấu trường âm (Hepburn: "kandō"), còn người dùng
 * gõ "kando" hoặc "kandou" (kiểu gõ bàn phím). Lưu cả hai để gõ kiểu nào cũng tìm ra.
 */
fun romajiKeys(romaji: String): Set<String> {
    val plain = normalizeRomaji(romaji)
    val doubled = buildString { romaji.lowercase().forEach { append(LONG_VOWELS[it] ?: it) } }
        .let(::normalizeRomaji)
    return setOf(plain, doubled).filterTo(LinkedHashSet()) { it.isNotEmpty() }
}
