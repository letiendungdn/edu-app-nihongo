# Lab Keycloak 30 phút (EDU APP)

Lab thực hành trên Docker đang chạy. Không cần cài thêm gì.

**Chuẩn bị:** stack up (`edu-keycloak`, `edu-nginx`, `edu-nihongo-web`, `edu-gateway`).

| Thời gian | Mục tiêu |
|-----------|----------|
| 0–5′ | Admin Console + realm |
| 5–12′ | Users, roles, clients |
| 12–20′ | Login web + xem token |
| 20–25′ | Tạo user mới tự tay |
| 25–30′ | BFF `/api/auth/oidc` + JWKS |

---

## Phút 0–5 — Vào Admin Console

1. Mở http://auth.localhost:8080  
2. Đăng nhập: `admin` / `admin`  
3. Góc trên bên trái: chọn realm **`edu-app`** (đừng ở lại `master`).

**Khái niệm:** *Realm* = không gian tenant (users + clients + roles riêng). App của bạn chỉ tin issuer:

`http://auth.localhost:8080/realms/edu-app`

Mở thêm tab:  
http://auth.localhost:8080/realms/edu-app/.well-known/openid-configuration  

Tìm các field: `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`. Đây là “bản đồ” OIDC mà app đọc.

---

## Phút 5–12 — Users, Roles, Clients

### Users
**Users** → mở `demo` và `admin-kc`.

Quan sát:
- Username / Email  
- **Credentials** (password đã set sẵn)  
- **Role mapping** → realm roles

| User | Password | Roles |
|------|----------|--------|
| `demo` | `demo123` | `user` |
| `admin-kc` | `admin123` | `admin`, `user` |

### Realm roles
**Realm roles** → thấy `user`, `admin`.

**Khái niệm:** Role gắn user trong Keycloak; app/gateway có thể map sang quyền local sau khi login.

### Clients
**Clients** → mở lần lượt:

| Client | Dùng cho | Redirect URI quan trọng |
|--------|----------|-------------------------|
| `nihongo-web` | React | `http://nihongo.localhost:8080/*` |
| `nihongo-mobile` | Flutter / Android / iOS / Expo | `nihongo://…`, `com.edu.nihongo…` |

Với mỗi client, kiểm tra:
- **Client authentication** = Off → *public client*  
- **Standard flow** = On → Authorization Code  
- **PKCE** bắt buộc với public client (app mobile/SPA không giữ secret)

**Thử nghiệm nhanh (cố ý sai):** sửa tạm Valid redirect URIs của `nihongo-web` thành `http://evil.example/*` → Save → login web sẽ lỗi `invalid_redirect_uri` → **đổi lại** `http://nihongo.localhost:8080/*`.

→ Redirect URI là tường lửa chống app giả mạo nhận code.

---

## Phút 12–20 — Login thật + decode token

1. Mở http://nihongo.localhost:8080/login (cửa sổ ẩn danh nếu muốn sạch cookie).  
2. Bấm **Đăng nhập Keycloak**.  
3. Login `demo` / `demo123`.  
4. Sau khi về app: mở DevTools → **Network**.

Lọc request:
- Redirect sang `auth.localhost` … `/protocol/openid-connect/auth` (có `code_challenge`, `code_challenge_method=S256`)  
- Callback `/auth/callback` (có `code=…`)  
- `POST …/api/auth/oidc` body gồm `accessToken` và thường cả `idToken`

### Decode JWT
1. Copy `id_token` (hoặc access token từ response Keycloak nếu bắt được).  
2. Dán vào https://jwt.io (chỉ dùng token **local/dev**).  
3. So sánh:

| Claim | Thường thấy ở | Ý nghĩa |
|-------|----------------|---------|
| `iss` | cả hai | phải khớp issuer realm |
| `sub` | **id_token** (quan trọng) | ID user Keycloak |
| `email` / `preferred_username` | id_token | map sang User local |
| `aud` | client id | audience |

**Vì sao app gửi `idToken`?** Keycloak 26 đôi khi access token **không có `sub`**. Gateway cần `sub` để upsert `User.keycloakId` → lấy identity từ **id token**.

Code liên quan:
- Web OIDC: `apps/nihongo-web/src/lib/keycloak.ts`  
- Exchange: `POST /api/auth/oidc` trong API gateway  
- Setup: `docs/keycloak-setup.md`

---

## Phút 20–25 — Tạo user mới

Trong Admin Console (realm `edu-app`):

1. **Users** → **Add user**  
   - Username: `labuser`  
   - Email: `labuser@nihongo.local`  
   - Email verified: On  
2. **Credentials** → Set password `lab123`, Temporary = Off  
3. **Role mapping** → Assign role **`user`**  
4. Logout web (hoặc ẩn danh) → Keycloak login bằng `labuser` / `lab123`  
5. Thành công = bạn đã hiểu vòng đời user IdP.

(Tuỳ chọn) Assign thêm role `admin` rồi login lại — quan sát profile/API nếu app có phân quyền admin.

---

## Phút 25–30 — BFF + JWKS

Flow trong project này:

```text
Browser ──PKCE──► Keycloak (code → KC tokens)
Browser ──POST /api/auth/oidc { accessToken, idToken }──► API Gateway
Gateway ──fetch JWKS──► Keycloak
Gateway verify JWT → upsert User.keycloakId → trả JWT local (+ refresh cookie)
```

**BFF (Backend-for-Frontend):** frontend không gọi API học với token Keycloak trực tiếp; đổi sang JWT app để cookie/session và rule nghiệp vụ thống nhất (email login, Google, Keycloak cùng một loại token).

### Xem JWKS
Mở:  
http://auth.localhost:8080/realms/edu-app/protocol/openid-connect/certs  

Thấy mảng `keys` (RSA). Gateway dùng các key này verify chữ ký token — không tin token chỉ vì “có vẻ là JWT”.

### Checklist tự kiểm

- [ ] Đổi được realm `edu-app` trong Admin  
- [ ] Chỉ ra được 3 clients và redirect của chúng  
- [ ] Login web bằng `demo` / `demo123`  
- [ ] Thấy `code_challenge` trên URL auth  
- [ ] Decode được `sub` / `email` trên id_token  
- [ ] Tạo được `labuser` và login được  
- [ ] Giải thích được vì sao cần `/api/auth/oidc` thay vì chỉ giữ token Keycloak

---

## Gặp lỗi thường gặp

| Triệu chứng | Nguyên nhân gần đúng |
|-------------|----------------------|
| `invalid_redirect_uri` | Redirect URI client ≠ URL thật của app |
| Không mở được `*.localhost` | Thêm hosts (xem `docs/keycloak-setup.md`) |
| OIDC exchange 401 | Thiếu `idToken`, hoặc issuer trong token ≠ `KEYCLOAK_ISSUER` |
| Client `nihongo-mobile` không thấy | Realm import cũ — tạo tay hoặc reset volume Keycloak |

---

## Bước tiếp (sau lab)

1. Đọc [Server Admin — Clients](https://www.keycloak.org/docs/latest/server_admin/#_clients)  
2. Đọc [PKCE](https://oauth.net/2/pkce/)  
3. So sánh login **Dev email** vs **Keycloak** trên cùng trang `/login` — hai đường vào, một JWT local  
4. Làm tiếp [Lab #1 — Refresh / Logout / Roles](./keycloak-lab-refresh-roles.md)

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **10. Tích hợp: đăng nhập, mail, thanh toán** — bài 2/7.

- Bài trước: [keycloak-setup.md](./keycloak-setup.md) — Cài Keycloak (local/Docker)
- **Bài tiếp: [keycloak-lab-refresh-roles.md](./keycloak-lab-refresh-roles.md)** — Lab refresh token, logout, roles

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
