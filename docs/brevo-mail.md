# Brevo mail (transactional)

Senior-style outbound email: **port/adapter** in `@app/common`, Brevo as one provider, Noop when no API key.

## Architecture

```text
AuthService / future jobs
        │
        ▼
   MailService          ← templates + APP_PUBLIC_URL
        │
        ▼
   MAIL_PORT (interface)
     ├── BrevoMailAdapter   (BREVO_API_KEY set)
     └── NoopMailAdapter    (dev / missing key)
```

Callers never import Brevo HTTP. Swap SES later by adding an adapter + factory branch.

## Features wired

| Trigger | Behavior |
|---------|----------|
| `POST /api/auth/register` | Welcome email (`sendWelcomeSafe` — không fail register) |
| `POST /api/auth/forgot-password` | Anti-enumeration; SHA-256 token trong `PasswordResetToken`; email link |
| `POST /api/auth/reset-password` | Đổi mật khẩu, invalidate reset tokens + revoke refresh |

Web UI: `/forgot-password`, `/reset-password?token=…`, link từ `/login`.

## Env

```bash
BREVO_API_KEY=xkeysib-...
MAIL_FROM_EMAIL=noreply@your-verified-domain.com   # domain đã verify trên Brevo
MAIL_FROM_NAME=Nihongo EDU
APP_PUBLIC_URL=http://nihongo.localhost:8080
MAIL_RESET_EXPIRES_MINUTES=30
```

Docker: cùng biến trên service `api-gateway` (xem `.env.docker.example`).

## Brevo setup (checklist)

1. Tạo API key (Transactional)  
2. Verify sender domain / email  
3. Gửi thử forgot-password với user có `passwordHash`  
4. Xem log gateway: `Brevo email accepted` hoặc noop warning  

## Security notes (interview)

- Token reset: random 32 bytes → chỉ **hash** lưu DB (giống refresh pattern)  
- Forgot luôn cùng message → chống email enumeration  
- Reset thành công → revoke mọi refresh session  
- Rate limit trên forgot/reset  
- Noop mặc định local → CI/dev không phụ thuộc Brevo  

## Migrate DB

```bash
# từ repo root / packages/prisma-nihongo
npx prisma migrate deploy
# hoặc docker: migrate chạy theo pipeline hiện có của gateway
```

Migration: `20260718150000_password_reset_token`.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **10. Tích hợp: đăng nhập, mail, thanh toán** — bài 5/7.

- Bài trước: [google-oauth-setup.md](./google-oauth-setup.md) — Đăng nhập bằng Google
- **Bài tiếp: [payment-wallets.md](./payment-wallets.md)** — Apple Pay / Google Pay: cách hoạt động

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
