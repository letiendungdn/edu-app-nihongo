import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/data/local/token_store.dart';
import 'package:nihongo_app/data/remote/auth_interceptor.dart';

class MemoryTokenStore extends TokenStore {
  String? access;
  String? cookie;
  MemoryTokenStore({this.access, this.cookie});
  @override
  Future<String?> getAccessToken() async => access;
  @override
  Future<void> saveAccessToken(String token) async => access = token;
  @override
  Future<String?> getRefreshCookie() async => cookie;
  @override
  Future<void> saveRefreshCookie(String c) async => cookie = c;
  @override
  Future<void> clear() async => access = cookie = null;
}

/// Server giả: trả lời theo hàm `reply`, ghi lại mọi request.
class ScriptedAdapter implements HttpClientAdapter {
  ScriptedAdapter(this.reply);
  final FutureOr<(int, Object, Map<String, List<String>>)> Function(RequestOptions) reply;
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s, Future<void>? c) async {
    requests.add(o);
    final (status, body, headers) = await reply(o);
    return ResponseBody.fromString(jsonEncode(body), status, headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
      ...headers,
    });
  }

  @override
  void close({bool force = false}) {}
}

const none = <String, List<String>>{};

void main() {
  late MemoryTokenStore tokens;

  /// Dio của app (có interceptor) + Dio riêng cho refresh, cùng một server giả.
  (Dio, ScriptedAdapter) build(FutureOr<(int, Object, Map<String, List<String>>)> Function(RequestOptions) reply) {
    final adapter = ScriptedAdapter(reply);
    Dio make() => Dio(BaseOptions(baseUrl: 'http://test.local/api'))..httpClientAdapter = adapter;
    final dio = make();
    dio.interceptors.add(AuthInterceptor(
      tokenStore: tokens,
      dio: dio,
      refresh: refreshWith(make(), tokens, sendCookieHeader: true),
    ));
    return (dio, adapter);
  }

  bool isBearer(RequestOptions o, String t) => o.headers['Authorization'] == 'Bearer $t';

  setUp(() => tokens = MemoryTokenStore(access: 'old', cookie: 'refresh_token=R1'));

  test('lấy refresh_token từ Set-Cookie, bỏ Path/HttpOnly', () {
    final headers = Headers.fromMap({
      'set-cookie': ['other=1; Path=/', 'refresh_token=abc.def; Path=/api/auth; HttpOnly; Secure'],
    });
    expect(refreshCookieFrom(headers), 'refresh_token=abc.def');
    expect(refreshCookieFrom(Headers.fromMap({})), isNull);
  });

  test('401 → refresh (gửi cookie đã lưu) → gửi lại với token mới; lưu refresh token xoay vòng', () async {
    final (dio, server) = build((o) {
      if (o.path.endsWith('/auth/refresh')) {
        return (200, {'success': true, 'data': {'access_token': 'new'}}, {'set-cookie': ['refresh_token=R2; Path=/api/auth']});
      }
      return isBearer(o, 'new') ? (200, {'ok': 1}, none) : (401, {}, none);
    });

    final res = await dio.get<dynamic>('/progress');

    expect(res.statusCode, 200);
    expect(server.requests.map((r) => r.path).toList(), ['/progress', '/auth/refresh', '/progress']);
    expect(server.requests[1].headers['Cookie'], 'refresh_token=R1');
    expect(tokens.access, 'new');
    expect(tokens.cookie, 'refresh_token=R2');
  });

  test('10 request cùng 401 → chỉ MỘT lần refresh', () async {
    final gate = Completer<void>();
    final (dio, server) = build((o) async {
      if (o.path.endsWith('/auth/refresh')) {
        await gate.future;
        return (200, {'data': {'access_token': 'new'}}, none);
      }
      return isBearer(o, 'new') ? (200, {}, none) : (401, {}, none);
    });

    final all = Future.wait(List.generate(10, (i) => dio.get<dynamic>('/r$i')));
    await pumpEventQueue();
    gate.complete();
    await all;

    expect(server.requests.where((r) => r.path.endsWith('/auth/refresh')).length, 1);
  });

  test('server từ chối refresh → xóa phiên, trả 401', () async {
    final (dio, _) = build((o) => (401, {}, none));
    await expectLater(dio.get<dynamic>('/progress'), throwsA(isA<DioException>()));
    expect(tokens.access, isNull);
    expect(tokens.cookie, isNull);
  });

  test('lỗi mạng/502 khi refresh → GIỮ phiên', () async {
    final (dio, _) = build((o) => o.path.endsWith('/auth/refresh') ? (502, {}, none) : (401, {}, none));
    await expectLater(dio.get<dynamic>('/progress'), throwsA(isA<DioException>()));
    expect(tokens.access, 'old');
  });

  test('token mới vẫn 401 → không refresh vòng vòng', () async {
    final (dio, server) = build((o) =>
        o.path.endsWith('/auth/refresh') ? (200, {'data': {'access_token': 'new'}}, none) : (401, {}, none));
    await expectLater(dio.get<dynamic>('/progress'), throwsA(isA<DioException>()));
    expect(server.requests.where((r) => r.path.endsWith('/auth/refresh')).length, 1);
    expect(server.requests.length, 3);
  });

  test('sai mật khẩu (401 ở /auth/login) → không refresh', () async {
    final (dio, server) = build((o) => (401, {}, none));
    await expectLater(dio.post<dynamic>('/auth/login', data: {}), throwsA(isA<DioException>()));
    expect(server.requests.length, 1);
    expect(tokens.access, 'old');
  });
}
