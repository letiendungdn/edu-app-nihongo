import 'package:dio/dio.dart';

import '../local/token_store.dart';
import 'auth_interceptor.dart';

String? _extractAccessToken(dynamic data) {
  if (data is! Map) return null;
  final map = Map<String, dynamic>.from(data);
  final nested = map['data'];
  if (nested is Map && nested['access_token'] is String) {
    return nested['access_token'] as String;
  }
  final direct = map['access_token'];
  return direct is String ? direct : null;
}

class AuthApi {
  AuthApi(this._dio, this._tokenStore);
  final Dio _dio;
  final TokenStore _tokenStore;

  Future<void> login({required String email, required String password}) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'email': email, 'password': password},
    );
    final token = _extractAccessToken(res.data);
    if (token == null || token.isEmpty) {
      throw DioException(
        requestOptions: res.requestOptions,
        message: 'Không nhận được access token',
      );
    }
    await _saveSession(token, res.headers);
  }

  Future<void> loginWithOidc({
    required String accessToken,
    String? idToken,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/auth/oidc',
      data: {
        'accessToken': accessToken,
        if (idToken != null && idToken.isNotEmpty) 'idToken': idToken,
      },
    );
    final token = _extractAccessToken(res.data);
    if (token == null || token.isEmpty) {
      throw DioException(
        requestOptions: res.requestOptions,
        message: 'Không nhận được access token từ OIDC',
      );
    }
    await _saveSession(token, res.headers);
  }

  /// Lưu cả refresh cookie: thiếu nó thì 15 phút sau (access token hết hạn) không refresh được.
  Future<void> _saveSession(String accessToken, Headers headers) async {
    await _tokenStore.saveAccessToken(accessToken);
    final cookie = refreshCookieFrom(headers);
    if (cookie != null) await _tokenStore.saveRefreshCookie(cookie);
  }

  Future<void> logout() async {
    try {
      // Gửi kèm refresh cookie để server thu hồi đúng refresh token của máy này
      final cookie = await _tokenStore.getRefreshCookie();
      await _dio.post('/auth/logout', options: Options(headers: {if (cookie != null) 'Cookie': cookie}));
    } finally {
      await _tokenStore.clear();
    }
  }
}
