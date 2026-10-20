import 'dart:async';

import 'package:dio/dio.dart';

import '../local/token_store.dart';

enum RefreshOutcome { refreshed, rejected, networkError }

/// Lấy cặp `refresh_token=...` trong header `Set-Cookie` (bỏ Path, HttpOnly…). Hàm thuần để test.
String? refreshCookieFrom(Headers headers) {
  for (final raw in headers.map['set-cookie'] ?? const <String>[]) {
    final pair = raw.split(';').first.trim();
    if (pair.startsWith('refresh_token=') && pair.length > 'refresh_token='.length) return pair;
  }
  return null;
}

/// Gắn Bearer token; gặp 401 thì refresh MỘT lần rồi gửi lại request.
///
/// Bản cũ chỉ gắn token: access token hết hạn sau 15 phút là mọi request cần đăng nhập đều lỗi
/// cho tới khi người dùng tự đăng nhập lại.
/// - Nhiều request cùng 401 → chỉ một lần refresh, các request khác chờ chung kết quả.
/// - Request gửi lại vẫn 401 → trả lỗi, không lặp.
/// - Endpoint đăng nhập/refresh không bao giờ kích hoạt refresh (sai mật khẩu cũng là 401).
/// - Server TỪ CHỐI refresh token → xóa phiên; lỗi mạng → giữ phiên.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required TokenStore tokenStore,
    required Dio dio,
    required Future<RefreshOutcome> Function() refresh,
  })  : _tokens = tokenStore,
        _dio = dio,
        _refresh = refresh;

  final TokenStore _tokens;
  final Dio _dio;
  final Future<RefreshOutcome> Function() _refresh;
  Future<RefreshOutcome>? _inFlight;

  static const _retriedKey = 'auth_retried';
  static const _authPaths = ['/auth/login', '/auth/oidc', '/auth/refresh', '/auth/logout', '/auth/register'];

  static bool isAuthPath(String path) => _authPaths.any(path.endsWith);

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _tokens.getAccessToken();
    if (token != null && token.isNotEmpty) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final req = err.requestOptions;
    if (err.response?.statusCode != 401 || req.extra[_retriedKey] == true || isAuthPath(req.path)) {
      return handler.next(err);
    }

    final sentToken = (req.headers['Authorization'] as String?)?.replaceFirst('Bearer ', '');
    final current = await _tokens.getAccessToken();
    // Luồng khác vừa refresh xong (token đã khác token của request lỗi) → gửi lại luôn
    final outcome = (current != null && current.isNotEmpty && current != sentToken)
        ? RefreshOutcome.refreshed
        : await _refreshOnce();

    if (outcome != RefreshOutcome.refreshed) return handler.next(err);

    try {
      final retry = req.copyWith(extra: {...req.extra, _retriedKey: true});
      retry.headers.remove('Authorization'); // onRequest gắn token mới
      handler.resolve(await _dio.fetch<dynamic>(retry));
    } on DioException catch (e) {
      handler.next(e);
    }
  }

  Future<RefreshOutcome> _refreshOnce() {
    final running = _inFlight;
    if (running != null) return running;
    final run = _refresh().then((outcome) async {
      if (outcome == RefreshOutcome.rejected) await _tokens.clear();
      return outcome;
    });
    _inFlight = run;
    return run.whenComplete(() => _inFlight = null);
  }
}

/// `POST /api/auth/refresh` bằng một Dio RIÊNG (không có interceptor, để refresh lỗi không vòng lại).
Future<RefreshOutcome> Function() refreshWith(Dio bare, TokenStore tokens, {required bool sendCookieHeader}) {
  return () async {
    final cookie = await tokens.getRefreshCookie();
    // Mobile: tự gửi cookie đã lưu. Web: trình duyệt tự gửi cookie httpOnly (withCredentials).
    if (sendCookieHeader && (cookie == null || cookie.isEmpty)) return RefreshOutcome.rejected;
    try {
      final res = await bare.post<dynamic>(
        '/auth/refresh',
        options: Options(headers: {if (sendCookieHeader) 'Cookie': cookie}),
      );
      final body = res.data;
      final data = body is Map && body['data'] is Map ? body['data'] as Map : body;
      final token = data is Map ? data['access_token'] : null;
      if (token is! String || token.isEmpty) return RefreshOutcome.rejected;
      await tokens.saveAccessToken(token);
      final rotated = refreshCookieFrom(res.headers); // server xoay vòng refresh token
      if (rotated != null) await tokens.saveRefreshCookie(rotated);
      return RefreshOutcome.refreshed;
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      return (status == 400 || status == 401 || status == 403)
          ? RefreshOutcome.rejected
          : RefreshOutcome.networkError;
    }
  };
}
