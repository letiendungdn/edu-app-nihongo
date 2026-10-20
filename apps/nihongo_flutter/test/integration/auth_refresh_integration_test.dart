import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/data/remote/auth_api.dart';
import 'package:nihongo_app/data/remote/auth_interceptor.dart';

import '../data/auth_interceptor_test.dart' show MemoryTokenStore;

/// Chạy với backend thật: INTEGRATION=1 flutter test test/integration
void main() {
  final enabled = Platform.environment['INTEGRATION'] == '1';
  const base = 'http://localhost:3000/api';

  test('đăng nhập lưu refresh cookie; token hỏng → tự refresh bằng cookie → request thành công', () async {
    final tokens = MemoryTokenStore();
    Dio make() => Dio(BaseOptions(baseUrl: base));
    final dio = make();
    dio.interceptors.add(AuthInterceptor(
      tokenStore: tokens,
      dio: dio,
      refresh: refreshWith(make(), tokens, sendCookieHeader: true),
    ));

    await AuthApi(dio, tokens).login(email: 'ios-e2e-receiver@nihongo.test', password: 'Passw0rd!e2e');
    expect(tokens.cookie, startsWith('refresh_token='));

    tokens.access = 'token-hong';
    final res = await dio.get<dynamic>('/learning-progress');

    expect(res.statusCode, 200);
    expect(tokens.access, isNot('token-hong'));
  }, skip: enabled ? false : 'đặt INTEGRATION=1 để chạy với backend thật');
}
