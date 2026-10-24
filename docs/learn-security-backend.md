# Học Bảo mật Backend / API — Từ Project Này

> Bản cho mobile: [security-owasp-mobile.md](./security-owasp-mobile.md). Tài liệu này theo **OWASP API Security Top 10**,
> soát từng mục trên code `api-gateway` thật: cái gì **đã làm tốt**, cái gì **còn hở**, sửa thế nào.

> **Cập nhật 2026-09-29 — đã sửa trong code:**
> - JWT secret: production thiếu / dùng giá trị mặc định → **không khởi động** ([`jwt-secret.ts`](../services/api-gateway/src/auth/jwt-secret.ts)).
>   Kiểm tra này bắt được ngay stack docker local đang chạy `change-me-in-production` → đã đổi sang secret ngẫu nhiên,
>   compose bắt buộc có `JWT_SECRET`. ⚠️ `.env` ở gốc repo vẫn được git theo dõi (chứa cả `BREVO_API_KEY`, `GOOGLE_CLIENT_SECRET`) — xem mục 10.
> - CORS: `localhost:*` chỉ ở dev; origin lạ không còn gây 500 mà chỉ không nhận header CORS.
> - Body > 1 MB → **413**, trừ route soạn nội dung (8 MB) ([`body-limit.middleware.ts`](../services/api-gateway/src/body-limit.middleware.ts)).
> - Upload presigned: chỉ ảnh (không SVG), PDF, âm thanh; thư mục theo danh sách ([`upload.dto.ts`](../services/api-gateway/src/http/dto/upload.dto.ts)).
> - **Soát IDOR** (mục 2): 26 bảng có chủ sở hữu, 32 chỗ truy vấn theo `id` không kèm chủ → 31 hợp lệ (webhook Stripe,
>   token bí mật, bản ghi đã lọc theo user trước, route admin, có `assertParticipant` / kiểm tra `learnerId` / owner-or-admin),
>   **1 lỗi thật**: `DELETE /api/push/unregister` gỡ token thiết bị của bất kỳ ai → đã giới hạn theo user. Test IDOR:
>   [`ownership.idor.spec.ts`](../services/payment-service/src/ownership.idor.spec.ts), [`push.service.spec.ts`](../services/api-gateway/src/push/push.service.spec.ts).
> - **CI job `security`**: gitleaks trên commit mới ([`.gitleaks.toml`](../.gitleaks.toml)) + `audit-ci` chặn **HIGH và CRITICAL**
>   ([`audit-ci.jsonc`](../audit-ci.jsonc)). Đã nâng `next` (nihongo-web ≥15.5.28), `source-map-js` ≥1.2.2,
>   `follow-redirects` 1.16.1, `launch-editor` 2.14.2 (override),
>   Prisma 6.19.3, fabric 7.4, OpenTelemetry 0.222. Override thêm: `body-parser` 2.4.0,
>   `dompurify` 3.4.17, `multer` 2.5.0, `undici` 7.30.1, `qs` 6.16.1. Allowlist tạm:
>   `GHSA-86w9-cpqp-85rv` (node-forge chưa vá), `GHSA-mrhx-c7xc-m3w5` (zod 3 trong Expo CLI;
>   bản vá chỉ có ở zod 4).
> - ⚠️ **Repo đang PUBLIC**: `.env` (GOOGLE_CLIENT_SECRET, BREVO_API_KEY…) và backup DB trong `infra/backups/` đã công khai —
>   cần đổi các key và chuyển repo private / bỏ theo dõi các file này.

## 0. Tư duy của senior về bảo mật

```
1. Mặc định là ĐÓNG: route nào cũng cần đăng nhập, trừ khi ghi rõ @Public()
2. Không tin client: mọi input phải kiểm tra ở server, kể cả khi web đã kiểm tra
3. Nhiều lớp: sai một lớp (code) vẫn còn lớp khác (DB constraint, rate limit, network)
4. Bí mật không nằm trong code/repo; có bí mật mặc định = có lỗ hổng
5. Ghi log đủ để điều tra, nhưng KHÔNG ghi mật khẩu/token/thông tin cá nhân
```

---

## 1. Soát nhanh hiện trạng `api-gateway`

| Hạng mục | Hiện trạng | Đánh giá |
|----------|------------|----------|
| Xác thực mặc định | `APP_GUARD: JwtAuthGuard` + `@Public()` cho ngoại lệ | ✅ mặc định đóng |
| Kiểm tra input | `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` | ✅ chặn field lạ |
| Header bảo mật | `helmet()` | ✅ |
| Rate limit | toàn cục 120 req/phút/IP; route auth chặt hơn (5–20/phút) | ✅ (xem 6) |
| SQL | Prisma + `$queryRaw` dạng **template tag** | ✅ không nối chuỗi |
| Log | pino chỉ log `method/url/id`, không log header | ✅ không lộ token |
| JWT secret | fallback `'change-me-in-production'` nếu thiếu env | ⚠️ mục 3 |
| CORS | cho **mọi** `http://localhost:*` kể cả production | ⚠️ mục 7 |
| `/metrics` | bị chặn 401 (lỗi ngược — xem learn-observability); khi mở ra phải giới hạn mạng | ⚠️ |
| Body JSON | giới hạn 8 MB (để upload banner base64) | ⚠️ mục 6 |

---

## 2. API1 — Broken Object Level Authorization (IDOR)

Lỗ hổng **phổ biến nhất** của API: kiểm tra *đã đăng nhập* nhưng quên kiểm tra *có phải của mình không*.

```ts
// ❌ user A gọi PATCH /daily-goal/items/555 → sửa được item của user B
await prisma.dailyGoalItem.update({ where: { id: itemId }, data: { done } });

// ✅ luôn lọc theo chủ sở hữu lấy từ TOKEN (không lấy userId từ body/query)
const item = await prisma.dailyGoalItem.findFirst({
  where: { id: itemId, goal: { userId: currentUser.id } },
});
if (!item) throw new NotFoundException();   // 404 thay vì 403: không tiết lộ "item có tồn tại"
await prisma.dailyGoalItem.update({ where: { id: item.id }, data: { done } });
```

Trong project, service tiến độ làm đúng mẫu này: mục tiêu ngày tìm theo `(userId, date)` của người đang đăng nhập;
các thao tác `update/delete` chỉ theo `id` nằm ở route **admin** (đề thi, sơ đồ tư duy).

**Cách soát cả codebase:**

```powershell
# mọi chỗ update/delete chỉ theo id — từng dòng phải trả lời được "ai được phép gọi?"
rg -n "\.(update|delete)\(\{\s*where: \{ id" services --glob "!**/*.spec.ts"
```

**Test tự động** — cách duy nhất để lỗi này không quay lại:

```ts
it("user B không sửa được mục tiêu của user A", async () => {
  const item = await createGoalItemFor(userA);
  await request(app).patch(`/api/daily-goal/items/${item.id}`)
    .set("Authorization", `Bearer ${tokenOf(userB)}`)
    .send({ done: true })
    .expect(404);
});
```

---

## 3. API2 — Broken Authentication

### 3.1. Secret mặc định

```ts
// jwt.strategy.ts & configuration.ts
secretOrKey: configService.get("jwt.secret") ?? "change-me-in-production",
```

Quên đặt `JWT_SECRET` ở production → server **vẫn chạy** với secret ai cũng biết (nó nằm trong repo công khai) →
ai cũng tự ký được token admin. Nguyên tắc: **thiếu cấu hình bí mật thì không khởi động**.

```ts
// validate env lúc khởi động (vd trong configuration.ts)
if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error("JWT_SECRET missing or too short");
}
```

### 3.2. Checklist token

```
□ Access token ngắn (15 phút); refresh token dài, lưu hash trong DB (project có bảng RefreshToken), xoay vòng khi dùng
□ Đăng xuất / đổi mật khẩu → thu hồi refresh token
□ Ký bằng thuật toán cố định (không chấp nhận "alg: none"); kiểm tra exp (project: ignoreExpiration: false ✅)
□ Mật khẩu hash bằng bcrypt/argon2 (không SHA-256 trần)
□ Đăng nhập sai: thông báo chung "email hoặc mật khẩu không đúng" (không lộ email nào đã đăng ký)
□ Quên mật khẩu: token 1 lần, hết hạn nhanh, lưu hash (project có PasswordResetToken)
```

---

## 4. API3 — Broken Object Property Level Authorization (mass assignment, lộ trường)

**Ghi:** user gửi thêm field không được phép:

```http
PATCH /api/profile
{ "name": "An", "role": "ADMIN" }        ← tự nâng quyền
```

Project chặn được nhờ `whitelist + forbidNonWhitelisted`: DTO không khai báo `role` → **400**. Đừng bao giờ
`prisma.user.update({ data: req.body })` — luôn map từ DTO.

**Đọc:** trả thẳng bản ghi DB là lộ trường nhạy cảm:

```ts
// ❌ trả cả passwordHash, googleId, keycloakId
return prisma.user.findUnique({ where: { id } });
// ✅ chọn trường
return prisma.user.findUnique({ where: { id }, select: { id: true, name: true, avatarUrl: true } });
```

---

## 5. API5 — Broken Function Level Authorization

Route admin phải kiểm tra **vai trò** ở server, không chỉ ẩn nút trên web:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Post()
create(...) {}
```

Soát: mọi controller có `/admin` hoặc thao tác ghi nội dung (từ vựng, đề thi, sơ đồ tư duy) đều có `@Roles(Role.ADMIN)`.
Test: gọi bằng token USER → phải **403**.

---

## 6. API4 — Unrestricted Resource Consumption

Kẻ tấn công không cần "hack" — chỉ cần làm server **tốn tài nguyên**:

| Rủi ro | Hiện trạng | Cách giảm |
|--------|------------|-----------|
| Spam request | `ThrottlerModule` 120/phút/IP; auth 5/phút | ✅; sau Nginx/LB phải lấy IP thật (`trust proxy`) nếu không mọi request trông như cùng 1 IP |
| Brute-force mật khẩu | `@Throttle` 5/phút trên login | thêm khoá tạm theo **email** (IP đổi được) |
| Body khổng lồ | JSON 8 MB **toàn cục** | chỉ nới 8 MB cho route upload banner; route khác giữ mặc định ~100 KB |
| Trang kết quả khổng lồ | `limit` có `@Max(200)` ✅ | luôn giới hạn `limit` |
| Tra từ `q=a` quét 14.000 dòng | ILIKE toàn bảng | độ dài tối thiểu cho `q`, index trigram (`pg_trgm`) |
| Gọi AI / gửi email tốn tiền | có module AI, email | rate limit riêng theo **user**, hạn mức theo ngày |

> Rate limit và **load test** đụng nhau: k6 từ một máy nhận 429 sau 120 request — xem
> [learn-performance-k6.md](./learn-performance-k6.md).

---

## 7. API8 — Security Misconfiguration: CORS

```ts
if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);   // chạy cả ở production
```

Cùng `credentials: true`, điều này cho phép **bất kỳ trang nào chạy trên localhost của nạn nhân** (một tool dev,
một extension, một app độc chạy local server) gọi API bằng cookie/phiên của họ. Chỉ bật nhánh này ở dev:

```ts
const isDev = process.env.NODE_ENV !== "production";
if (isDev && /^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
```

CORS **không phải** cơ chế xác thực: nó chỉ ngăn *trình duyệt* đọc response. curl/Postman không bị CORS chặn.

---

## 8. Injection

| Loại | Trong project | Quy tắc |
|------|---------------|---------|
| SQL | Prisma + `` $queryRaw`…${x}` `` (tham số hoá) | **Cấm** `$queryRawUnsafe(\`… ${x}\`)` với input người dùng |
| NoSQL (Mongo audit) | ghi log | không đưa object từ request thẳng vào query (`{ $gt: "" }`) |
| XSS lưu trữ | nội dung admin nhập, tin nhắn chat, ghi chú | React tự escape; **cấm** `dangerouslySetInnerHTML` với dữ liệu người dùng; nếu cần HTML → sanitize (DOMPurify) |
| Header/Log injection | log `url` | pino ghi JSON → xuống dòng trong input không giả được dòng log mới |

```ts
// ✅ an toàn: Prisma tách tham số
await prisma.$queryRaw`SELECT * FROM "Vocabulary" WHERE "kana" = ${input}`;
// ❌ nguy hiểm: input thành một phần câu SQL
await prisma.$queryRawUnsafe(`SELECT * FROM "Vocabulary" WHERE "kana" = '${input}'`);
```

---

## 9. SSRF và upload file

- **Presigned URL S3**: server chỉ ký, file đi thẳng lên S3 ✅. Nhưng `contentType` lấy từ client → giới hạn danh
  sách cho phép (`image/png`, `image/jpeg`, `image/webp`) và giới hạn dung lượng (`Content-Length` trong điều kiện ký
  / presigned POST). Xem [learn-aws.md](./learn-aws.md) mục 5.
- **Server tự tải URL do người dùng đưa** (vd "nhập ảnh từ link") → kẻ tấn công đưa `http://169.254.169.254/…`
  (metadata cloud chứa credentials) hoặc `http://postgres:5432`. Chặn IP nội bộ, chỉ cho `https`, đặt timeout.
- Ảnh base64 8 MB trong JSON (banner): kiểm tra magic bytes thật là ảnh, không chỉ tin đuôi/`mime` gửi lên.

---

## 10. Bí mật & dữ liệu cá nhân

```
□ .env không commit (kiểm tra .gitignore); secret production ở GitHub Secrets → K8s Secret (deploy.yml đang làm ✅)
□ Không đặt mật khẩu mặc định trong manifest/compose cho production ("change-me-in-production", "admin123")
□ Xoay vòng secret khi người có quyền rời team; secret lộ trong git → coi như đã lộ, phải đổi (xoá commit không đủ)
□ Log không chứa: mật khẩu, token, số thẻ, nội dung email đầy đủ
□ Backup DB (infra/backups/*.sql) chứa email người dùng → repo phải private; cân nhắc ẩn danh hoá dữ liệu user khi backup cho dev
□ Quét tự động: npm audit, Dependabot, secret scanning (gitleaks) trong CI
```

---

## Bài tập thực hành

1. Chạy lệnh soát IDOR (mục 2), lập bảng: mỗi dòng → route nào gọi → ai được gọi → đã kiểm tra chủ sở hữu chưa.
2. Viết e2e test "user B không sửa được dữ liệu của user A" cho 2 tài nguyên cá nhân (mục tiêu ngày, ghi chú).
3. Làm server **không khởi động** được ở production khi thiếu/yếu `JWT_SECRET` (mục 3.1). Thử bằng `NODE_ENV=production`.
4. Sửa CORS chỉ cho localhost ở dev (mục 7). Kiểm tra bằng `curl -H "Origin: http://localhost:9999" -I …` ở chế độ production.
5. Giới hạn body 8 MB chỉ cho route upload banner; route khác gửi 1 MB phải nhận **413**.
6. Thử mass assignment: `PATCH` hồ sơ kèm `"role":"ADMIN"` → phải 400. Viết thành test.
7. Thêm `gitleaks` và `npm audit --audit-level=high` vào `ci.yml`.

<details>
<summary>Gợi ý đáp án</summary>

1. Kết quả lệnh hiện chỉ ra các thao tác theo `id` ở route admin (`mock-exams.service.ts`, `mind-maps.service.ts`) — hợp lệ
   **nếu** controller có `@Roles(Role.ADMIN)`; bước tiếp theo là mở từng controller xác nhận.
2. Mẫu test ở mục 2. Tạo 2 user trong `beforeAll`, đăng nhập lấy 2 token; mong đợi **404** (không phải 200, cũng không
   nên 403 để không lộ sự tồn tại).
3. Đặt kiểm tra trong hàm load config (chạy trước khi Nest tạo app) để lỗi xảy ra ngay lúc boot; bỏ luôn fallback
   `"change-me-in-production"` trong `jwt.strategy.ts`.
4. Production + origin localhost → callback lỗi → response **không có** header `Access-Control-Allow-Origin`.
5. Bỏ `app.useBodyParser("json", { limit: "8mb" })` toàn cục; trong route banner dùng middleware riêng
   `express.json({ limit: "8mb" })` gắn qua `MiddlewareConsumer.forRoutes(...)`. Mặc định body-parser là 100 KB.
6. `forbidNonWhitelisted: true` trả 400 với thông điệp `property role should not exist`.
7. ```yaml
   - uses: gitleaks/gitleaks-action@v2
     env: { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" }
   - run: npm audit --audit-level=high
   ```

</details>
