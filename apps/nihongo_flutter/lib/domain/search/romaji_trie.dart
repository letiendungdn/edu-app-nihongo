import 'dart:collection';

/// Cây tiền tố (Trie) để gợi ý từ vựng khi gõ romaji. Cùng thuật toán với bản Android
/// (`RomajiTrie.kt`) và bài 48 trong docs/interview-java-dsa.md.
///
/// - Kết quả: khóa ngắn trước (gõ "ka" thì "ka" trước "kaban"), cùng độ dài theo bảng chữ cái.
/// - Một mục có thể nằm ở nhiều khóa ("kandō" lưu cả "kando" và "kandou"); search không trả trùng.
class RomajiTrie<T> {
  final _Node<T> _root = _Node<T>();
  int _nodeCount = 0;
  int _itemCount = 0;

  int get nodeCount => _nodeCount;
  int get itemCount => _itemCount;

  void insert(String romaji, T item) {
    final keys = romajiKeys(romaji);
    if (keys.isEmpty) return;
    _itemCount++;
    for (final key in keys) {
      var node = _root;
      for (final c in key.split('')) {
        final children = node.children ??= <String, _Node<T>>{};
        node = children.putIfAbsent(c, () {
          _nodeCount++;
          return _Node<T>();
        });
      }
      (node.items ??= <T>[]).add(item);
    }
  }

  List<T> search(String prefix, {int limit = 30}) {
    final p = normalizeRomaji(prefix);
    if (p.isEmpty || limit <= 0) return const [];
    var node = _root;
    for (final c in p.split('')) {
      final next = node.children?[c];
      if (next == null) return const [];
      node = next;
    }
    // BFS theo tầng: khóa ngắn ra trước; con của mỗi nút theo thứ tự chữ cái.
    final result = <T>{}; // set literal của Dart giữ thứ tự chèn (LinkedHashSet)
    final queue = Queue<_Node<T>>()..add(node);
    while (queue.isNotEmpty && result.length < limit) {
      final n = queue.removeFirst();
      for (final item in n.items ?? <T>[]) {
        if (result.length >= limit) break;
        result.add(item);
      }
      final children = n.children;
      if (children != null) {
        for (final key in children.keys.toList()..sort()) {
          queue.add(children[key]!);
        }
      }
    }
    return result.toList();
  }
}

class _Node<T> {
  Map<String, _Node<T>>? children; // tạo khi cần: phần lớn nút là lá
  List<T>? items;
}

// Dart không có Unicode NFD sẵn: bảng bỏ dấu cho nguyên âm hay gặp trong romaji.
const _stripMarks = {
  'ā': 'a', 'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a',
  'ī': 'i', 'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
  'ū': 'u', 'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
  'ē': 'e', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'ō': 'o', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o',
};

const _longVowels = {
  'ā': 'aa', 'ī': 'ii', 'ū': 'uu', 'ē': 'ee', 'ō': 'ou',
  'â': 'aa', 'î': 'ii', 'û': 'uu', 'ê': 'ee', 'ô': 'ou',
};

final _notLetter = RegExp('[^a-z]');

/// Chữ thường, bỏ dấu (ō → o), bỏ mọi thứ không phải a–z. "Kandō shimasu" → "kandoshimasu".
String normalizeRomaji(String text) {
  final lower = text.toLowerCase();
  final buffer = StringBuffer();
  for (final c in lower.split('')) {
    buffer.write(_stripMarks[c] ?? c);
  }
  return buffer.toString().replaceAll(_notLetter, '');
}

/// Các khóa lưu một romaji: bỏ dấu ("kando") và nhân đôi nguyên âm dài ("kandou").
Set<String> romajiKeys(String romaji) {
  final plain = normalizeRomaji(romaji);
  final doubled = normalizeRomaji(
    romaji.toLowerCase().split('').map((c) => _longVowels[c] ?? c).join(),
  );
  return {plain, doubled}..removeWhere((k) => k.isEmpty);
}
