import 'package:dio/dio.dart';

import '../../domain/entity/vocab_entry.dart';

class VocabularyApi {
  VocabularyApi(this._dio);
  final Dio _dio;

  Future<List<Map<String, dynamic>>> fetchVocabPage({
    required int lessonNumber,
    int page = 1,
    int limit = 100,
  }) async {
    final res = await _dio.get<dynamic>(
      '/vocabularies',
      queryParameters: {
        'lessonNumber': lessonNumber,
        'page': page,
        'limit': limit,
      },
    );

    final body = res.data;
    if (body == null) return [];

    if (body is List) {
      return body
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }

    // Unwrap one or two levels: { data: [...] } or { data: { data: [...] } }
    var data = body['data'];
    if (data is Map) data = data['data'];
    if (data is List) {
      return data
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    }

    return [];
  }

  Future<List<Map<String, dynamic>>> fetchAllVocabForLesson(
    int lessonNumber,
  ) async {
    final all = <Map<String, dynamic>>[];
    var page = 1;
    const limit = 100;

    while (true) {
      final batch = await fetchVocabPage(
        lessonNumber: lessonNumber,
        page: page,
        limit: limit,
      );
      if (batch.isEmpty) break;
      all.addAll(batch);
      if (batch.length < limit) break;
      page += 1;
    }

    return all;
  }

  /// Một trang từ vựng theo cấp JLPT, kèm tổng số từ (`GET /vocabularies?jlptLevel=N5&page=2&limit=30`).
  /// Gateway trả `{ success, data: { data: [...], total, page, limit } }`. Server giới hạn limit tối đa 200.
  Future<VocabPage> fetchVocabByLevel({
    required String jlptLevel,
    required int page,
    int limit = 30,
  }) async {
    final res = await _dio.get<dynamic>(
      '/vocabularies',
      queryParameters: {'jlptLevel': jlptLevel, 'page': page, 'limit': limit},
    );
    return parseVocabPage(res.data);
  }

  /// Hàm thuần để test: đọc trang từ body đã bọc hoặc chưa bọc.
  static VocabPage parseVocabPage(dynamic body) {
    final payload = body is Map && body['success'] == true ? body['data'] : body;
    final list = payload is Map ? payload['data'] : payload;
    final items = list is List
        ? list
            .whereType<Map>()
            .map((raw) => VocabEntry.fromJson(Map<String, dynamic>.from(raw)))
            .whereType<VocabEntry>()
            .toList()
        : <VocabEntry>[];
    final total = payload is Map && payload['total'] is int ? payload['total'] as int : items.length;
    return VocabPage(items: items, total: total);
  }

  Future<void> syncReviewBank(List<Map<String, dynamic>> items) async {
    await _dio.post('/progress/review', data: {'items': items});
  }
}
