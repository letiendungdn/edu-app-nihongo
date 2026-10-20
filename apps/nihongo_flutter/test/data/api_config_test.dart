import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/data/remote/api_config.dart';

void main() {
  String url(TargetPlatform p, {bool web = false, String env = ''}) =>
      ApiConfig.resolve(fromEnv: env, isWeb: web, platform: p);

  test('emulator Android dùng 10.0.2.2; simulator iOS và web dùng localhost', () {
    expect(url(TargetPlatform.android), 'http://10.0.2.2:3000/api');
    expect(url(TargetPlatform.iOS), 'http://localhost:3000/api'); // bản cũ: 10.0.2.2 → không vào được API
    expect(url(TargetPlatform.android, web: true), 'http://localhost:3000/api');
  });

  test('--dart-define=API_BASE_URL thắng mọi mặc định', () {
    expect(url(TargetPlatform.iOS, env: 'http://192.168.1.5:3000/api'), 'http://192.168.1.5:3000/api');
  });
}
