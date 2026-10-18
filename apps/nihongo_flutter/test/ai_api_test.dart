import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/data/remote/ai_tutor_api.dart';
import 'package:nihongo_app/data/remote/envelope.dart';
import 'package:nihongo_app/data/remote/sentence_practice_api.dart';

/// Adapter giả: ghi lại request, trả response định sẵn.
class FakeAdapter implements HttpClientAdapter {
  FakeAdapter(this.status, this.body);
  final int status;
  final Object body;
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    requests.add(options);
    return ResponseBody.fromString(jsonEncode(body), status, headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    });
  }

  @override
  void close({bool force = false}) {}
}

Dio dioWith(FakeAdapter adapter) =>
    Dio(BaseOptions(baseUrl: 'http://test.local/api'))..httpClientAdapter = adapter;

void main() {
  test('unwrapEnvelope mở lớp { success, data }, không đụng response khác', () {
    expect(unwrapEnvelope({'success': true, 'data': {'a': 1}}), {'a': 1});
    expect(unwrapEnvelope({'success': false, 'error': 'x'}), {'success': false, 'error': 'x'});
    expect(unwrapEnvelope([1]), [1]);
  });

  test('luyện câu gọi gateway (không còn gọi Google bằng key trong app)', () async {
    final adapter = FakeAdapter(200, {
      'success': true,
      'data': {'corrected': '', 'reading': 'わたしは', 'meaning': 'Tôi', 'explanation': 'Đúng', 'examples': ['a']},
    });
    final fb = await SentencePracticeApi(dioWith(adapter)).analyze('  私は  ');

    expect(fb.reading, 'わたしは');
    expect(fb.examples, ['a']);
    expect(adapter.requests.single.uri.toString(), 'http://test.local/api/ai/sentence-feedback');
    expect(adapter.requests.single.data, {'sentence': '私は'});
  });

  test('server lỗi → ném lỗi, không trả kết quả rỗng', () async {
    final adapter = FakeAdapter(503, {'success': false});
    expect(() => SentencePracticeApi(dioWith(adapter)).analyze('x'), throwsA(isA<DioException>()));
  });

  test('gia sư AI đọc answer trong lớp data (bản cũ luôn rỗng)', () async {
    final adapter = FakeAdapter(200, {'success': true, 'data': {'answer': ' は là trợ từ chủ đề '}});
    final answer = await AiTutorApi(dioWith(adapter)).ask(question: 'は?', history: const []);
    expect(answer, 'は là trợ từ chủ đề');
  });
}
