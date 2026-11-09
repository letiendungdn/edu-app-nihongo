/// Một từ trong từ điển (màn duyệt từ vựng theo cấp). Gọn hơn [Vocabulary]: không cần bài học,
/// thứ tự hay trạng thái đồng bộ vì danh sách này chỉ đọc từ server, không lưu offline.
class VocabEntry {
  const VocabEntry({
    required this.id,
    required this.kana,
    required this.meaning,
    this.kanji,
    this.romaji = '',
    this.jlptLevel,
  });

  final int id;
  final String kana;
  final String? kanji;
  final String meaning;
  final String romaji;
  final String? jlptLevel;

  /// Chữ hiển thị to: kanji nếu có, không thì kana.
  String get headword => (kanji != null && kanji!.isNotEmpty) ? kanji! : kana;

  static VocabEntry? fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    final kana = json['kana'];
    final meaning = json['meaning'];
    if (id is! int || kana is! String || kana.isEmpty || meaning is! String) return null;
    return VocabEntry(
      id: id,
      kana: kana,
      kanji: json['kanji'] as String?,
      meaning: meaning,
      romaji: json['romaji'] as String? ?? '',
      jlptLevel: json['jlptLevel'] as String?,
    );
  }
}

/// Một trang kết quả: các từ của trang này và tổng số từ khớp bộ lọc.
class VocabPage {
  const VocabPage({required this.items, required this.total});

  final List<VocabEntry> items;
  final int total;
}
