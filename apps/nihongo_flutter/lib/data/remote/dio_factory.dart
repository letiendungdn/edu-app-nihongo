import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../local/token_store.dart';
import 'api_config.dart';
import 'auth_interceptor.dart';

BaseOptions _options() => BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
      // Web: trình duyệt giữ cookie refresh_token (httpOnly) và tự gửi khi có withCredentials
      extra: {if (kIsWeb) 'withCredentials': true},
    );

Dio createDio(TokenStore tokenStore) {
  final dio = Dio(_options());
  dio.interceptors.add(
    AuthInterceptor(
      tokenStore: tokenStore,
      dio: dio,
      // Mobile không có kho cookie: tự gửi cookie đã lưu lúc đăng nhập
      refresh: refreshWith(Dio(_options()), tokenStore, sendCookieHeader: !kIsWeb),
    ),
  );
  return dio;
}
