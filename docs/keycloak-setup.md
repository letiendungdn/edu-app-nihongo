# Keycloak (local / Docker)

OIDC IdP cho EDU APP. Web login qua Keycloak (PKCE) → API Gateway đổi access token thành JWT local (BFF).

**Lab thực hành 30′:** [keycloak-lab-30m.md](./keycloak-lab-30m.md)  
**Lab #1 (refresh / logout / roles):** [keycloak-lab-refresh-roles.md](./keycloak-lab-refresh-roles.md)

## URLs

| | |
|--|--|
| Admin Console | http://auth.localhost:8080 (user `admin` / `admin`) |
| Realm | `edu-app` |
| Issuer | http://auth.localhost:8080/realms/edu-app |

## Clients (public + PKCE)

| Client ID | Redirect |
|-----------|----------|
| `nihongo-web` | `http://nihongo.localhost:8080/*` |
| `nihongo-mobile` | `nihongo://auth/callback`, `com.edu.nihongo:/oauth2redirect`, `com.edu.nihongoapp:/oauth2redirect`, `com.edu.nihongo.ios:/oauth2redirect` |

Mobile apps (Flutter / Android / iOS / Expo) dùng client `nihongo-mobile`, rồi `POST /api/auth/oidc` như web.

| App | Redirect | Keycloak host (emulator / sim) |
|-----|----------|--------------------------------|
| Expo (`nihongo-mobile`) | `nihongo://auth/callback` | `http://10.0.2.2:8080` (Android) |
| Android native | `com.edu.nihongo:/oauth2redirect` | `http://10.0.2.2:8080` |
| Flutter | `com.edu.nihongoapp:/oauth2redirect` | `http://10.0.2.2:8080` |
| iOS | `com.edu.nihongo.ios:/oauth2redirect` | `http://localhost:8080` (simulator) |

> Realm chỉ import lần đầu. Nếu realm đã tồn tại, `--import-realm` bỏ qua realm đó; sửa file JSON rồi restart Keycloak không cập nhật cấu hình hiện tại. Ưu tiên chỉnh trong Admin Console. Chỉ xóa volume Keycloak khi dữ liệu trong đó có thể mất và bạn chủ động muốn tạo realm mới (xem [lab #1](./keycloak-lab-refresh-roles.md)).

## Demo users (realm)

| Email / username | Password | Realm roles | App `Role` |
|------------------|----------|-------------|------------|
| `demo@nihongo.local` / `demo` | `demo123` | `user` | USER |
| `coach@nihongo.local` / `coach` | `coach123` | `teacher`, `user` | TEACHER |
| `admin-kc@nihongo.local` / `admin-kc` | `admin123` | `admin`, `user` | ADMIN |

Client scope **`edu-app-roles`**: protocol mapper → claim `app_roles` (gateway đọc khi `POST /api/auth/oidc`).

## Flow

1. Browser → Keycloak login (OIDC code + PKCE)
2. Front nhận Keycloak `access_token`
3. `POST /api/auth/oidc` `{ "accessToken": "...", "idToken": "..." }`  
   (`idToken` cần thiết vì access token Keycloak 26 có thể không có claim `sub`)
4. Gateway verify JWKS, map roles → `User.role`, upsert `User.keycloakId`, trả JWT local + cookie refresh
5. Access JWT hết hạn → `POST /api/auth/refresh` (cookie); logout → revoke local + Keycloak `end_session`

Email/password + Google vẫn dùng được (Dev login trên trang `/login`).

## Windows note

Trình duyệt thường resolve `*.localhost` → `127.0.0.1`. Nếu không mở được, thêm vào `C:\Windows\System32\drivers\etc\hosts`:

```
127.0.0.1 auth.localhost nihongo.localhost
```

## Env

```bash
# Browser / Next build
NEXT_PUBLIC_KEYCLOAK_URL=http://auth.localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=edu-app
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=nihongo-web

# API Gateway (Docker network)
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_ISSUER=http://auth.localhost:8080/realms/edu-app
KEYCLOAK_REALM=edu-app
```

## Start

```bash
docker compose up -d postgres-keycloak keycloak
# rồi rebuild nginx nếu cần
docker compose up -d --build nginx api-gateway nihongo-web
```

Realm import: `infra/keycloak/realm-edu-app.json` (chỉ import lần đầu khi volume Keycloak trống).

## Lỗi `Invalid scopes: openid profile email`

Web client yêu cầu `openid profile email`. Nếu Keycloak trả `invalid_scope`, kiểm tra realm `edu-app` đang chạy có các client scope chuẩn `profile` và `email`, và client `nihongo-web` được gán chúng trong **Default Client Scopes**:

1. Admin Console → realm `edu-app` → **Client scopes**: xác nhận `profile` và `email` tồn tại.
2. **Clients** → `nihongo-web` → **Client scopes**: gán `profile` và `email` làm scope mặc định. Làm tương tự với `nihongo-mobile` nếu client này cũng đăng nhập.
3. Thử đăng nhập lại từ `/login`; không cần rebuild web sau khi đổi client scope.

Có thể kiểm tra metadata công khai tại `http://auth.localhost:8080/realms/edu-app/.well-known/openid-configuration`; `scopes_supported` cần có `profile` và `email`. `openid` là scope bắt buộc, không bỏ nó khỏi yêu cầu đăng nhập.

Nếu thiếu scope, lưu ý realm import chỉ chạy khi tạo realm lần đầu. Log `Realm 'edu-app' already exists. Import skipped` nghĩa là file [realm-edu-app.json](../infra/keycloak/realm-edu-app.json) chưa được áp dụng vào database Keycloak hiện tại. Khôi phục scope trong Admin Console; không xóa volume/database nếu chưa xác nhận dữ liệu trong đó có thể mất.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **10. Tích hợp: đăng nhập, mail, thanh toán** — bài 1/7.

- **Bài tiếp: [keycloak-lab-30m.md](./keycloak-lab-30m.md)** — Lab Keycloak 30 phút

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
