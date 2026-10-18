import 'package:dio/dio.dart';

import 'envelope.dart';

class SentenceFeedback {
  const SentenceFeedback({
    required this.corrected,
    required this.reading,
    required this.meaning,
    required this.explanation,
    required this.examples,
  });

  final String corrected;   // empty = câu đúng
  final String reading;
  final String meaning;
  final String explanation;
  final List<String> examples;

  factory SentenceFeedback.fromJson(Map<String, dynamic> j) => SentenceFeedback(
        corrected:   (j['corrected']   as String? ?? '').trim(),
        reading:     (j['reading']     as String? ?? '').trim(),
        meaning:     (j['meaning']     as String? ?? '').trim(),
        explanation: (j['explanation'] as String? ?? '').trim(),
        examples: (j['examples'] as List<dynamic>? ?? [])
            .map((e) => e.toString())
            .toList(),
      );
}

/// Luyện câu với AI qua gateway (`POST /api/ai/sentence-feedback`).
///
/// Bản cũ gọi thẳng Gemini bằng `--dart-define=GEMINI_API_KEY`: key được biên dịch vào app, giải
/// nén là lấy được. Giờ dùng Dio chung của app (tự gắn token), key chỉ nằm ở server.
class SentencePracticeApi {
  SentencePracticeApi(this._dio);

  final Dio _dio;

  Future<SentenceFeedback> analyze(String sentence) async {
    final res = await _dio.post<dynamic>(
      '/ai/sentence-feedback',
      data: {'sentence': sentence.trim()},
      options: Options(receiveTimeout: const Duration(seconds: 40)),
    );
    final data = unwrapEnvelope(res.data);
    if (data is! Map<String, dynamic>) {
      throw Exception('Máy chủ không trả kết quả');
    }
    return SentenceFeedback.fromJson(data);
  }
}
