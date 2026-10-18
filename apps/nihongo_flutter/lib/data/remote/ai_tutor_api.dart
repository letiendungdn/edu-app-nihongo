import 'package:dio/dio.dart';

import 'envelope.dart';

class AiMessage {
  const AiMessage({required this.role, required this.text});
  final String role; // 'user' | 'assistant'
  final String text;
}

class AiTutorApi {
  AiTutorApi(this._dio);
  final Dio _dio;

  // Gửi câu hỏi → nhận câu trả lời từ Claude (qua backend)
  Future<String> ask({
    required String question,
    required List<AiMessage> history,
    String? vocabContext,
  }) async {
    final messages = history
        .map((m) => {'role': m.role, 'content': m.text})
        .toList();

    final res = await _dio.post<dynamic>(
      '/ai/chat',
      data: {
        'question': question,
        'history': messages,
        if (vocabContext != null) 'context': vocabContext,
      },
      options: Options(
        sendTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 30),
      ),
    );

    // Bản cũ đọc `answer` ở cấp ngoài: gateway bọc { success, data: { answer } } → luôn rỗng
    final data = unwrapEnvelope(res.data);
    return (data is Map ? data['answer'] as String? : null)?.trim() ?? '';
  }
}
