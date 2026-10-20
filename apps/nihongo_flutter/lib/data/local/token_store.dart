import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStore {
  TokenStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _accessKey = 'access_token';
  static const _refreshCookieKey = 'refresh_cookie';

  final FlutterSecureStorage _storage;

  Future<String?> getAccessToken() => _storage.read(key: _accessKey);

  Future<void> saveAccessToken(String token) =>
      _storage.write(key: _accessKey, value: token);

  /// `refresh_token=...` lấy từ `Set-Cookie` lúc đăng nhập (mobile không có kho cookie như trình duyệt).
  Future<String?> getRefreshCookie() => _storage.read(key: _refreshCookieKey);

  Future<void> saveRefreshCookie(String cookie) =>
      _storage.write(key: _refreshCookieKey, value: cookie);

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshCookieKey);
  }

  Future<bool> isLoggedIn() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
