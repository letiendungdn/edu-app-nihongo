# Lab Keycloak #1 — Refresh, Logout, Roles (interview)

Tiếp theo [lab 30′](./keycloak-lab-30m.md). Stack: gateway local JWT + cookie refresh; Keycloak end_session; protocol mapper `app_roles`.

## Đã có trong code

| Phần | Hành vi |
|------|---------|
| `POST /api/auth/refresh` | Cookie HttpOnly `refresh_token` → access JWT mới (15′) |
| Web `api-client` | 401 → gọi refresh một lần → retry |
| Logout | `POST /api/auth/logout` + Keycloak `signoutRedirect` (`id_token_hint`) |
| Role map | `admin` → `ADMIN`, `teacher` → `TEACHER`, else `USER` |
| Mapper | Client scope `edu-app-roles` → claim `app_roles` (id + access token) |

## Tài khoản Keycloak (sau khi import realm mới)

| User | Password | Realm roles | App role |
|------|----------|-------------|----------|
| `demo` | `demo123` | `user` | USER |
| `coach` | `coach123` | `teacher`, `user` | TEACHER |
| `admin-kc` | `admin123` | `admin`, `user` | ADMIN |

## Nếu Keycloak đã chạy (volume cũ)

Realm JSON **không** tự cập nhật. Làm một trong hai:

**A — Reset volume (dev only):**

```bash
docker compose stop keycloak
docker volume rm edu_app_postgres_keycloak_data
# tên volume có thể khác — xem: docker volume ls | findstr keycloak
docker compose up -d postgres-keycloak keycloak
```

**B — Thủ công trong Admin Console (realm `edu-app`):**

1. **Realm roles** → tạo `teacher`
2. **Users** → Add `coach` / email `coach@nihongo.local` / password `coach123` → Role mapping: `teacher` + `user`
3. **Client scopes** → Create `edu-app-roles` → Mapper:
   - Type: *User Realm Role*
   - Token Claim Name: `app_roles`
   - Add to ID token / access token / userinfo: On
   - Multivalued: On
4. Gắn scope `edu-app-roles` vào Default Client Scopes của `nihongo-web`, `nihongo-mobile`

## Checklist thử (15′)

1. Login http://nihongo.localhost:8080/login bằng Keycloak `coach` / `coach123`
2. DevTools → Network → `POST /api/auth/oidc` → response `user.role === "TEACHER"`
3. Decode access token Keycloak (jwt.io) → thấy `app_roles` và/hoặc `realm_access.roles`
4. Đợi hoặc xóa access token trong Application → localStorage rồi gọi API (vd. profile) → thấy `POST /api/auth/refresh` rồi request cũ thành công
5. Logout → Network thấy `POST /api/auth/logout` rồi redirect `…/protocol/openid-connect/logout`
6. Login lại không còn SSO im lặng (phải nhập password) nếu logout Keycloak thành công

## Câu trả lời phỏng vấn gắn lab này

- **Refresh ở đâu?** Cookie HttpOnly path `/api/auth` — XSS không đọc được; access JWT ngắn hạn trong memory/localStorage.
- **Logout đủ chưa nếu chỉ clear localStorage?** Chưa — SSO Keycloak còn; cần `end_session` (+ ideally back-channel sau này).
- **Role lấy từ đâu?** Prefer claim mapper `app_roles`, fallback `realm_access`; sync vào cột `User.role` rồi ký JWT local `{ sub, email, role }` — `RolesGuard` đọc DB qua JwtStrategy.
- **Vì sao không dùng Keycloak token gọi API học?** BFF thống nhất email / Google / KC; giảm phụ thuộc issuer khi gọi microservice nội bộ.

## Rebuild sau khi pull code

```bash
docker compose up -d --build api-gateway nihongo-web
```

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **10. Tích hợp: đăng nhập, mail, thanh toán** — bài 3/7.

- Bài trước: [keycloak-lab-30m.md](./keycloak-lab-30m.md) — Lab Keycloak 30 phút
- **Bài tiếp: [google-oauth-setup.md](./google-oauth-setup.md)** — Đăng nhập bằng Google

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
