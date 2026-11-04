# Bảo mật Mobile — OWASP Top 10 & Thực tế trong nihongo-cli

> File local — không upload cloud.

---

## OWASP Mobile Top 10 (2024)

| # | Lỗ hổng | Trạng thái trong app |
|---|---------|----------------------|
| M1 | Improper Credential Usage | ✅ Dùng MMKV encrypted storage |
| M2 | Inadequate Supply Chain Security | ⚠️ Pin npm deps trong package-lock.json |
| M3 | Insecure Authentication/Authorization | ✅ JWT + refresh mutex + PKCE |
| M4 | Insufficient Input/Output Validation | ✅ Validate email/password trước khi gửi |
| M5 | Insecure Communication | ✅ HTTPS prod, cert pinning (xem bên dưới) |
| M6 | Inadequate Privacy Controls | ✅ Không log token, không lưu trong AsyncStorage |
| M7 | Insufficient Binary Protections | ⚠️ ProGuard/R8 Android, Bitcode iOS |
| M8 | Security Misconfiguration | ✅ __DEV__ guard, no hardcoded secrets |
| M9 | Insecure Data Storage | ✅ MMKV (native encrypted), SQLite local |
| M10 | Insufficient Cryptography | ✅ PKCE S256 (SHA-256), JWT RS256 |

---

## M1 — Credential Storage với MMKV

**Vấn đề:** AsyncStorage lưu plain text — ai có thể đọc file system đều đọc được token.

**Giải pháp trong app:**
```typescript
// authStore.ts — MMKV native encrypted
const storage = new MMKV({ id: 'auth-store' });

const mmkvStorage = createJSONStorage(() => ({
  getItem:    (key) => storage.getString(key) ?? null,
  setItem:    (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}));
```

MMKV dùng **AES-128** để encrypt data tại iOS Keychain / Android Keystore — không thể đọc plain text dù rooted device.

---

## M3 — Authentication với JWT + Refresh Token Mutex

**Vấn đề:** Nếu 3 request cùng nhận 401, mỗi cái tự gọi `/refresh` → race condition, refresh token bị dùng nhiều lần → tất cả đều fail.

**Giải pháp — Mutex pattern:**
```typescript
// client.ts — chỉ 1 refresh tại 1 thời điểm
let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(res => res, async error => {
  if (error.response?.status !== 401 || original._retry) return Promise.reject(error);
  original._retry = true;

  if (!refreshPromise) {
    refreshPromise = useAuthStore.getState().refresh()
      .finally(() => { refreshPromise = null; });
  }

  try {
    await refreshPromise;       // tất cả 3 request đều chờ cùng 1 promise
    return api(original);       // retry với token mới
  } catch {
    useAuthStore.getState().logout();
    return Promise.reject(error);
  }
});
```

**OWASP liên quan:** A07:2021 Identification and Authentication Failures.

---

## M3 — OAuth 2.0 + OIDC với PKCE (Keycloak)

**Vấn đề:** Authorization Code flow trên mobile có thể bị **code interception attack** nếu không dùng PKCE.

**PKCE (Proof Key for Code Exchange — RFC 7636):**
```
1. App sinh: code_verifier (ngẫu nhiên 43-128 ký tự)
2. App tính: code_challenge = BASE64URL(SHA256(code_verifier))
3. Gửi code_challenge tới Keycloak khi request authorization
4. Keycloak trả authorization_code
5. App gửi code + code_verifier tới Keycloak để exchange token
6. Keycloak verify: SHA256(code_verifier) == code_challenge → cấp token
```

`react-native-app-auth` tự động xử lý bước 1-5, app chỉ cần:
```typescript
const result = await authorize(keycloakConfig);
// result.authorizationCode — gửi lên backend
// result.codeVerifier     — tự động quản lý bởi thư viện
```

**Tại sao không dùng Implicit Flow?** Implicit Flow trả `access_token` trực tiếp trong URL fragment — dễ bị lộ qua browser history, referer header. Authorization Code + PKCE an toàn hơn và là tiêu chuẩn hiện tại (RFC 9700).

---

## M5 — Certificate Pinning

**Vấn đề:** Trên mạng public, attacker có thể dùng MITM proxy (Burp Suite, Charles) để đọc traffic HTTPS.

**Thêm vào `client.ts` khi production:**
```typescript
import ssl from 'react-native-ssl-pinning';

// Thay axios bằng ssl-pinning fetch cho các API nhạy cảm
export const secureApi = {
  post: (url: string, body: object) =>
    ssl.fetch(url, {
      method: 'POST',
      pkPinning: true,
      // SHA256 fingerprint của cert từ server
      sslPinning: {
        certs: ['cert_sha256_fingerprint'],
      },
      body: JSON.stringify(body),
    }),
};
```

**Trade-off:** Certificate rotation phải cập nhật app. Dùng **public key pinning** (pin public key, không pin cert) để linh hoạt hơn.

---

## M6 — Privacy: Không log sensitive data

```typescript
// ❌ KHÔNG làm
console.log('Token:', accessToken);
console.log('User:', JSON.stringify(user));

// ✅ Làm
if (__DEV__) console.log('Auth state changed');
```

Trong production build (release mode), `__DEV__` = `false` nên toàn bộ log dev bị loại bỏ. Thêm ProGuard rule để strip logs:
```
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
}
```

---

## M8 — Security Misconfiguration

**Vấn đề:** Hardcode API key, secret, URL production trong source code.

**Giải pháp:**
```typescript
// ✅ client.ts — dùng __DEV__ để phân biệt môi trường
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3001/api'      // dev: emulator → localhost
  : 'https://api.nihongo.app/api';   // prod: HTTPS

// Không có secret nào hardcode — chỉ có public URLs
```

Secrets (API keys, client secrets) phải lưu trong:
- CI/CD: GitHub Secrets
- Runtime: Environment variables (không bake vào bundle)
- Không bao giờ commit vào git

---

## M9 — Secure Data Storage

| Loại data | Storage | Lý do |
|-----------|---------|-------|
| Access Token / Refresh Token | **MMKV** (encrypted) | Không thể đọc plain text |
| User profile | **MMKV** (encrypted) | PII data |
| Vocab cache (offline) | **SQLite** | Non-sensitive, performance |
| SRS sync queue | **SQLite** | Non-sensitive |
| OTA config | Không lưu | Fetch lại mỗi launch |

**Không dùng:**
- `AsyncStorage` cho sensitive data → plain text
- `localStorage` không tồn tại trong RN native
- Biến global JS → bị gc, không persist

---

## M10 — PKCE dùng SHA-256 (S256)

`react-native-app-auth` mặc định dùng `code_challenge_method=S256` (SHA-256), không cho phép `plain` method vì kém an toàn hơn.

Verify trong Keycloak logs:
```
code_challenge_method=S256 ← đúng
code_challenge_method=plain ← reject ngay
```

---

## Checklist trước khi release

- [ ] `__DEV__` logs không leak ra production build
- [ ] MMKV dùng cho tất cả sensitive data (không dùng AsyncStorage)
- [ ] HTTPS với valid cert (không bypass SSL trên production)
- [ ] Certificate pinning cho endpoints thanh toán / auth
- [ ] ProGuard/R8 bật, code obfuscation
- [ ] No hardcoded secrets trong bundle
- [ ] PKCE bật cho tất cả OAuth flows
- [ ] Refresh token rotation (server-side one-time use)
- [ ] Logout xóa sạch MMKV + SQLite sensitive data
- [ ] Jailbreak/root detection cho app tài chính (nếu cần)

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **9. Mobile** — bài 9/9.

- Bài trước: [learn-ml-mobile.md](./learn-ml-mobile.md) — Machine learning trong app mobile: on-device, LLM, SRS thông minh
- Xong nhóm này. **Nhóm tiếp: 10. Tích hợp: đăng nhập, mail, thanh toán** — bắt đầu bằng [keycloak-setup.md](./keycloak-setup.md) (Cài Keycloak (local/Docker))

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
