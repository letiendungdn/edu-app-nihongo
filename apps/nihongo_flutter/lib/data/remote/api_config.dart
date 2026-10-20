import 'package:flutter/foundation.dart';

class ApiConfig {
  /// NestJS API Gateway, port 3000.
  ///
  /// - Chrome (flutter web) và **simulator iOS**: `localhost` (cùng mạng với máy Mac)
  /// - Emulator Android: `10.0.2.2` (địa chỉ của máy host, CHỈ có trên emulator Android).
  ///   Bản cũ trả 10.0.2.2 cho cả iOS → simulator iOS không vào được API.
  /// - Máy thật: `flutter run --dart-define=API_BASE_URL=http://192.168.x.x:3000/api`
  static String get baseUrl => resolve(
        fromEnv: const String.fromEnvironment('API_BASE_URL'),
        isWeb: kIsWeb,
        platform: defaultTargetPlatform,
      );

  /// Hàm thuần để test từng nền tảng.
  static String resolve({required String fromEnv, required bool isWeb, required TargetPlatform platform}) {
    if (fromEnv.isNotEmpty) return fromEnv;
    if (isWeb) return 'http://localhost:3000/api';
    return platform == TargetPlatform.android ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
  }
}
