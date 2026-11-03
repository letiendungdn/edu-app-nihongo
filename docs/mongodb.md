# MongoDB dùng để làm gì?

Trong EDU APP, **MongoDB** (`edu-mongodb`, port **27017**, DB `nihongo_audit`) **chỉ dùng cho một việc: lưu Audit Log** — nhật ký hành động của user gọi API. Toàn bộ dữ liệu nghiệp vụ (user, vocab, bài học, thanh toán…) nằm ở **PostgreSQL**, không phải Mongo.

- Container: `docker-compose.yml` → service `mongodb` (image `mongo:7-jammy`)
- Kết nối: `MONGODB_URL=mongodb://mongodb:27017/nihongo_audit` (gateway)
- Code: [`packages/nest-common/src/audit/`](../packages/nest-common/src/audit/) — Mongoose (`@nestjs/mongoose`)

---

## Vì sao dùng MongoDB cho audit (không phải Postgres)?

| Lý do | Giải thích |
|-------|------------|
| **Ghi nhiều, schema linh hoạt** | Mỗi log có `metadata` tự do (method, path, …) — document JSON hợp hơn bảng quan hệ cứng. |
| **Fire-and-forget** | `auditService.log()` ghi bất đồng bộ, nuốt lỗi (`.catch(() => {})`) → không chặn request chính. |
| **TTL tự xoá** | Index `expireAfterSeconds = 90 ngày` → Mongo tự dọn log cũ, không cần cron. |
| **Tách khỏi DB nghiệp vụ** | Log ghi liên tục không làm phình / nặng Postgres. |

---

## Ghi log thế nào?

`AuditInterceptor` bọc mọi request **có user đăng nhập**, tự ghi 1 document sau khi handler chạy xong:

```
Request (đã auth)
   │
   ▼
AuditInterceptor  ──►  AuditService.log()  ──►  MongoDB: audit_logs
   │ (không chặn response)
   ▼
Response trả về user
```

Mỗi document (`collection: audit_logs`):

| Field | Ý nghĩa |
|-------|---------|
| `userId` | User thực hiện |
| `action` | `<resource>.<handler>`, vd `lessons.findAll` |
| `resource` | Tên controller (bỏ `Controller`, lowercase) |
| `metadata` | `{ method, path }` + tuỳ ý |
| `ip`, `userAgent` | Nguồn request |
| `success` / `errorMessage` | Thành công hay lỗi (bắt qua `catchError`) |
| `durationMs` | Thời gian xử lý |
| `createdAt` | Tự động (`timestamps: true`), có TTL 90 ngày |

---

## Đọc / thống kê log

`AuditService` cung cấp:

- `findByUser(userId, limit)` — log gần nhất của 1 user
- `getStats(userId, days)` — aggregate theo `action`: số lần, thời gian TB, số lần fail

---

## Xem trực tiếp trong Mongo

```powershell
docker exec -it edu-mongodb mongosh nihongo_audit

# trong mongosh:
db.audit_logs.find().sort({ createdAt: -1 }).limit(10)
db.audit_logs.countDocuments()
db.audit_logs.find({ success: false }).limit(20)
```

---

## Không dùng cho gì?

- **Không** lưu user / vocab / bài học / progress / payment → tất cả ở **PostgreSQL** (Prisma).
- **Không** bắt buộc để app chạy: `log()` nuốt lỗi, nếu Mongo down thì chỉ **mất audit log**, API vẫn hoạt động.

---

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [docker.md](./docker.md) | Danh sách container, port |
| [db-design.md](./db-design.md) | Thiết kế PostgreSQL (dữ liệu nghiệp vụ) |
| [`packages/nest-common/src/audit/`](../packages/nest-common/src/audit/) | Schema, service, interceptor |

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **3. Backend (NestJS)** — bài 3/8.

- Bài trước: [redis.md](./redis.md) — Redis dùng vào việc gì trong project
- **Bài tiếp: [learn-kafka.md](./learn-kafka.md)** — Kafka: vì sao dùng, producer/consumer

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
