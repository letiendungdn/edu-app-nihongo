import 'package:dio/dio.dart';

import '../../domain/entity/kanji_entry.dart';
import 'envelope.dart';

class KanjiApi {
  KanjiApi(this._dio);
  final Dio _dio;

  /// Danh sách bài kanji (mọi giáo trình), bỏ bài rỗng.
  Future<List<KanjiLessonOption>> fetchLessons() async {
    final res = await _dio.get<dynamic>('/kanji-lessons');
    return parseLessons(res.data);
  }

  /// Kanji của một bài, có nghĩa tiếng Anh (`meaningEn`).
  Future<List<KanjiEntry>> fetchByLesson(int lessonNumber) async {
    final res = await _dio.get<dynamic>('/kanji', queryParameters: {'lessonNumber': lessonNumber});
    return parseEntries(res.data);
  }

  /// Hàm thuần để test: body đã bọc `{ success, data }` hoặc chưa bọc đều đọc được.
  static List<KanjiEntry> parseEntries(dynamic body) {
    final payload = unwrapEnvelope(body);
    final list = payload is Map ? payload['data'] : payload;
    if (list is! List) return const [];
    return list
        .whereType<Map>()
        .map((raw) => KanjiEntry.fromJson(Map<String, dynamic>.from(raw)))
        .whereType<KanjiEntry>()
        .toList();
  }

  static List<KanjiLessonOption> parseLessons(dynamic body) {
    final payload = unwrapEnvelope(body);
    final list = payload is Map ? payload['data'] : payload;
    if (list is! List) return const [];
    return list
        .whereType<Map>()
        .map((raw) => KanjiLessonOption.fromJson(Map<String, dynamic>.from(raw)))
        .whereType<KanjiLessonOption>()
        .where((l) => l.count > 0)
        .toList();
  }
}
