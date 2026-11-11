import 'dart:convert';

/// Một đoạn furigana: chữ + cách đọc (rỗng nếu đoạn không có kanji).
class FuriganaSegment {
  const FuriganaSegment(this.text, this.ruby);

  final String text;
  final String ruby;

  @override
  bool operator ==(Object other) =>
      other is FuriganaSegment && other.text == text && other.ruby == ruby;

  @override
  int get hashCode => Object.hash(text, ruby);

  @override
  String toString() => '($text, $ruby)';
}

/// Đọc JSON `[["食","た"],["べます",""]]` do backend tính. Sai định dạng → danh sách rỗng.
List<FuriganaSegment> parseFurigana(String? raw) {
  if (raw == null || raw.isEmpty) return const [];
  try {
    final list = jsonDecode(raw);
    if (list is! List) return const [];
    final out = <FuriganaSegment>[];
    for (final seg in list) {
      if (seg is! List || seg.length != 2 || seg[0] is! String || seg[1] is! String) {
        return const [];
      }
      out.add(FuriganaSegment(seg[0] as String, seg[1] as String));
    }
    return out;
  } on FormatException {
    return const [];
  }
}
