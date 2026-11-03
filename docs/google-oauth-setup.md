# Đăng ký / đăng nhập bằng Gmail (Google OAuth)

App đã hỗ trợ **tạo tài khoản và đăng nhập bằng Gmail** qua nút Google trên `/login`. Cần cấu hình OAuth Client ID một lần.

## 1. Tạo OAuth Client trên Google Cloud

1. Mở [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Chọn project (hoặc tạo project mới)
3. **APIs & Services → OAuth consent screen** — cấu hình app (External), thêm email test nếu đang ở chế độ Testing
4. **Create Credentials → OAuth client ID**
5. Application type: **Web application**
6. **Authorized JavaScript origins** (bắt buộc):

   ```
   http://localhost:5173
   ```

7. **Authorized redirect URIs** — với `@react-oauth/google` (One Tap / button), thường **không cần** redirect URI riêng; để trống hoặc chỉ thêm origin ở trên.
8. Copy **Client ID** (dạng `xxxxx.apps.googleusercontent.com`)

   File JSON tải từ Google lưu tại:

   `infra/google-oauth/client_secret_<client_id>.apps.googleusercontent.com.json`

## 2. Cấu hình env

**`apps/nihongo-web/.env`**

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

**`services/.env`** (cùng Client ID — backend verify ID token)

```env
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

## 3. Restart dev servers

```powershell
# Ctrl+C gateway + nihongo-web, rồi:
npm run dev:gateway
npm run dev:nihongo-web
```

## 4. Dùng thử

1. Mở http://localhost:5173/login
2. Tab **Đăng ký** → bấm **Đăng ký bằng Google**
3. Chọn tài khoản Gmail
4. Lần đầu: server tạo user `role: USER` với `googleId`, `name`, `avatarUrl` từ Google
5. Lần sau: đăng nhập lại cùng Gmail

## Luồng kỹ thuật

```
Browser (Google button) → ID token (JWT)
  → POST /api/auth/google { credential }
  → api-gateway verify token với GOOGLE_CLIENT_ID
  → tạo/cập nhật User trong PostgreSQL
  → trả access_token + user
```

## Lưu ý

| Tình huống | Hành vi |
|------------|---------|
| Gmail mới | Tạo tài khoản tự động |
| Email đã đăng ký bằng mật khẩu, cùng Gmail | Gắn `googleId`, giữ tiến độ cũ |
| OAuth chưa cấu hình | Trang login hiện hướng dẫn thay vì nút Google |
| Consent screen ở chế độ Testing | Chỉ email được thêm vào **Test users** mới đăng nhập được |

## API (Swagger)

`POST /api/auth/google` — body: `{ "credential": "<google_id_token>" }`

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **10. Tích hợp: đăng nhập, mail, thanh toán** — bài 4/7.

- Bài trước: [keycloak-lab-refresh-roles.md](./keycloak-lab-refresh-roles.md) — Lab refresh token, logout, roles
- **Bài tiếp: [brevo-mail.md](./brevo-mail.md)** — Gửi mail qua Brevo

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
