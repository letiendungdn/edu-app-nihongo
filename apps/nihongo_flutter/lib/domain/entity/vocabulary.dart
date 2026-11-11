import '../vocab/furigana.dart';
import 'sync_status.dart';

class Vocabulary {
  const Vocabulary({
    required this.id,
    required this.lessonNumber,
    required this.kana,
    this.kanji,
    required this.meaning,
    required this.romaji,
    required this.sortOrder,
    this.syncStatus = SyncStatus.synced,
    this.meaningEn,
    this.meaningEnSource,
    this.hanViet,
    this.furigana = const [],
  });

  final int id;
  final int lessonNumber;
  final String kana;
  final String? kanji;
  final String meaning;
  final String romaji;
  final int sortOrder;
  final SyncStatus syncStatus;
  final String? meaningEn;

  /// manual | jmdict | ai — "ai" thì UI ghi "dịch máy".
  final String? meaningEnSource;
  final String? hanViet;

  /// Các đoạn (chữ, cách đọc); rỗng = không tách được, hiện chữ trơn.
  final List<FuriganaSegment> furigana;

  Vocabulary copyWith({
    SyncStatus? syncStatus,
  }) {
    return Vocabulary(
      id: id,
      lessonNumber: lessonNumber,
      kana: kana,
      kanji: kanji,
      meaning: meaning,
      romaji: romaji,
      sortOrder: sortOrder,
      syncStatus: syncStatus ?? this.syncStatus,
      meaningEn: meaningEn,
      meaningEnSource: meaningEnSource,
      hanViet: hanViet,
      furigana: furigana,
    );
  }
}
