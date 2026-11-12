/// Một chữ kanji trong bài (GET /kanji?lessonNumber=N). Chỉ đọc từ server, không lưu offline.
class KanjiEntry {
  const KanjiEntry({
    required this.id,
    required this.character,
    this.hanViet,
    this.onyomi,
    this.kunyomi,
    this.meaningVi,
    this.meaningEn,
  });

  final int id;
  final String character;
  final String? hanViet;
  final String? onyomi;
  final String? kunyomi;
  final String? meaningVi;

  /// Nghĩa tiếng Anh từ KANJIDIC2 (CC BY-SA 4.0, EDRDG) — ghi nguồn ở màn kanji.
  final String? meaningEn;

  static KanjiEntry? fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    final character = json['character'];
    if (id is! int || character is! String || character.isEmpty) return null;
    String? str(String key) {
      final v = json[key];
      return v is String && v.trim().isNotEmpty ? v : null;
    }

    return KanjiEntry(
      id: id,
      character: character,
      hanViet: str('hanViet'),
      onyomi: str('onyomi'),
      kunyomi: str('kunyomi'),
      meaningVi: str('meaningVi'),
      meaningEn: str('meaningEn'),
    );
  }
}

/// Một bài kanji để chọn (GET /kanji-lessons).
class KanjiLessonOption {
  const KanjiLessonOption({required this.lessonNumber, required this.label, required this.count});

  final int lessonNumber;
  final String label;
  final int count;

  static KanjiLessonOption? fromJson(Map<String, dynamic> json) {
    final n = json['lessonNumber'];
    if (n is! int) return null;
    final title = json['title'] is String ? json['title'] as String : 'Bài $n';
    final book = json['textbook'] is String ? json['textbook'] as String : null;
    final count = json['_count'] is Map && (json['_count'] as Map)['entries'] is int
        ? (json['_count'] as Map)['entries'] as int
        : 0;
    return KanjiLessonOption(
      lessonNumber: n,
      label: book == null ? title : '$title · $book',
      count: count,
    );
  }
}
