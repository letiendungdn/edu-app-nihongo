# Redis — Là Gì & Dùng Để Làm Gì Trong EDU APP

Tài liệu giải thích **Redis là gì** và **project này dùng Redis vào những việc gì, tại sao**.
Bám vào code thật trong repo.

---

## 1. Redis là gì?

**Redis** (REmote DIctionary Server) là một **kho dữ liệu key–value chạy trong RAM**
(in-memory data store). Đặc điểm:

- **Nhanh**: dữ liệu nằm trong bộ nhớ → mỗi thao tác cỡ **micro giây**, không phải mili giây
  như đọc đĩa.
- **Đơn luồng cho lệnh**: xử lý lệnh tuần tự → nhiều thao tác là **atomic** tự nhiên
  (không cần lock).
- **Nhiều kiểu dữ liệu**, không chỉ string: `String`, `Hash`, `List`, `Set`,
  `Sorted Set (ZSet)`, `Stream`, `Pub/Sub channel`, bitmap, HyperLogLog…
- **TTL**: đặt hạn sống cho key (`EX`, `PX`, `EXPIRE`) → key tự biến mất, không cần cron dọn.
- **Không phải nguồn sự thật**: dữ liệu quan trọng vẫn ở PostgreSQL. Redis là lớp phụ trợ —
  mất Redis thì chậm/rớt vài tính năng phụ, không mất dữ liệu nghiệp vụ.

Có thể hình dung Redis như "một cái `Map<string, any>` khổng lồ, dùng chung cho mọi
service, siêu nhanh, có hẹn giờ tự xoá".

### Redis ≠ PostgreSQL ≠ Kafka

| | PostgreSQL | Redis | Kafka |
|---|---|---|---|
| Vai trò | Nguồn sự thật, quan hệ, ACID | Cache / state tạm / tín hiệu nhanh | Nhật ký sự kiện bền, replay |
| Lưu trên | Đĩa | RAM (có thể snapshot ra đĩa) | Đĩa |
| Query | SQL phức tạp, JOIN | Tra theo key, thao tác trên cấu trúc | Đọc tuần tự theo offset |
| Mất dữ liệu khi restart? | Không | Có thể (tuỳ cấu hình persistence) | Không |

---

## 2. Vì sao project cần Redis?

Hệ thống là **microservices nhiều instance** (`api-gateway`, `content-service`,
`exam-service`, `signaling-service` — mỗi cái có thể chạy nhiều bản sao). Sinh ra 3 nhu cầu
mà bộ nhớ trong process **không** giải quyết được:

1. **State dùng chung giữa các instance** — instance A tạo phiên thi, instance B nhận
   request submit; cả hai phải thấy cùng dữ liệu.
2. **Giảm tải PostgreSQL** — cùng một danh sách bài học được đọc hàng nghìn lần/phút, không
   nên đánh DB mỗi lần.
3. **Tín hiệu real-time xuyên instance** — exam-service muốn báo "chấm xong" tới đúng
   instance gateway đang giữ kết nối của user đó.

Redis là "vùng nhớ chung, nhanh, có TTL" cho cả ba.

Trong repo, một **instance Redis duy nhất** (`edu-redis`, `redis:7-alpine`, cổng `6379` —
`docker-compose.yml`) phục vụ tất cả service. URL lấy từ `REDIS_URL`
(`packages/nest-common/src/config/configuration.ts` → `redis.url`, mặc định
`redis://localhost:6379`).

---

## 3. Redis được dùng vào việc gì trong project

### 3.1. Cache đọc (giảm tải PostgreSQL)

- **Ở đâu**: `content-service` và `exam-service` cấu hình `CacheModule` với
  `cache-manager-redis-yet` (`redisStore`) — `services/content-service/src/content.module.ts`,
  `services/exam-service/src/exam.module.ts`.
- **Dùng thế nào**: `services/content-service/src/modules/lessons/lessons.service.ts` →
  `findAll()` đọc `cacheManager.get('lessons:all')` trước; miss thì query Postgres rồi
  `cacheManager.set(key, data, CacheTTL.medium * 1000)` (300 giây). Tương tự
  `grammars.service.ts` (`grammar:lesson:{id}`), `vocabularies.service.ts`
  (`vocab:lesson:{id}`).
- **Invalidate**: khi admin sửa/xoá nội dung → `cacheManager.del(...)` để lần sau đọc lại
  từ DB.
- **Key & TTL**: `packages/nest-common/src/cache/cache-keys.ts`
  ```ts
  CacheKeys = { lessonList: () => 'lessons:all',
                vocabByLesson: id => `vocab:lesson:${id}`,
                grammarByLesson: id => `grammar:lesson:${id}` }
  CacheTTL  = { short: 60, medium: 300, long: 3600, veryLong: 86400 }  // giây
  ```
- **Tại sao Redis**: cache dùng chung cho mọi instance content-service (không phải mỗi
  instance một bản cache riêng lệch nhau), có TTL tự hết hạn.
- **Lưu ý đã gặp**: seed thẳng vào DB bằng script ngoài (vd `seed-jlpt-content.ts`)
  **không** bust được cache của service đang chạy → phải đợi TTL 5 phút hoặc restart
  service.

### 3.2. Lưu phiên thi thử (state tạm, xuyên instance)

- **Ở đâu**: `services/exam-service/src/modules/mock-exams/mock-exams.service.ts`.
- **Dùng thế nào**: `start()` tạo `MockExamSession` gồm **câu hỏi + đáp án đúng
  (`answerKey`)**, lưu tại key `mock-exam:${examId}` với `SESSION_TTL_MS = 3 giờ` (qua
  `cacheManager`, store Redis TTL `3 * 60 * 60 * 1000`). `submit()` đọc lại phiên, chấm,
  rồi `cacheManager.del(sessionKey(examId))`.
- **Tại sao Redis chứ không Postgres**:
  1. **Xuyên instance** — instance nào nhận `POST /mock-exams/:id/submit` cũng đọc được.
  2. **Sống ngắn, tự dọn** — 3h TTL, không cần bảng + cron xoá.
  3. **Chứa đáp án đúng** — không muốn để lẫn trong bảng nghiệp vụ; client không bao giờ
     thấy `answerKey`.
- Chỉ **kết quả cuối** (`ExamResult`) mới ghi vào PostgreSQL.

### 3.3. Pub/Sub — tín hiệu real-time xuyên instance

- **Ở đâu**: `mock-exams.service.ts` (`submit()`), `redis.publish(...)` qua client
  `ioredis` (`REDIS_CLIENT`).
- **Channel**:
  - `exam:question-scored` — publish từng câu khi chấm, kèm `runningScore` (bộ đếm điểm
    live).
  - `exam:completed` — publish khi chấm xong (`examResultId`, `passed`, `percent`).
- **Ai nghe**: instance `api-gateway` đang giữ kết nối SSE/WebSocket của user đó thì đẩy
  xuống browser; instance khác bỏ qua. (Đây là điểm mấu chốt: `Subject` RxJS in-process chỉ
  tới được 1 process — cần Redis để fan-out ra mọi instance.)
- **Tại sao Redis Pub/Sub chứ không Kafka**: đây là bộ đếm cosmetic, **mất một message
  cũng không sao** (user vẫn thấy kết quả cuối qua HTTP response). Redis Pub/Sub:
  fire-and-forget, latency sub-millisecond, không lưu, không cần partition/retention.
- **Nhớ**: Redis Pub/Sub là "at most once" — subscriber offline lúc publish thì mất luôn,
  không replay. (Kafka thì ngược lại.)

### 3.4. Rate limiting kiểu sliding window (state chia sẻ + atomic)

- **Ở đâu**: `packages/nest-common/src/rate-limit/sliding-window.guard.ts`
  (`SlidingWindowRateLimitGuard`), bật cho endpoint qua decorator `@RateLimit`.
- **Dùng thế nào**: key `rl:{ip}:{Class}:{handler}` là một **Sorted Set**; mỗi request:
  ```
  ZREMRANGEBYSCORE key 0 (now - window)   # bỏ record ngoài cửa sổ
  ZCARD key                                # đếm request còn trong cửa sổ
  ZADD  key now "{now}-{random}"           # ghi request này
  EXPIRE key windowSec+1                   # tự dọn
  ```
  chạy trong **pipeline** (1 vòng mạng). `count >= limit` → ném `429`.
- **Tại sao Redis, tại sao Sorted Set**:
  - Nhiều instance gateway phải **đếm chung** — nếu đếm trong RAM mỗi process thì limit
    nhân lên theo số instance.
  - Sorted Set với score = timestamp cho phép "sliding window" chính xác (không phải
    fixed bucket), và các lệnh là atomic.
- Lưu ý: `ThrottlerModule.forRoot([{ ttl: 60s, limit: 120 }])` toàn cục
  (`api-gateway/src/app.module.ts`) **không cấu hình storage → in-memory per instance**;
  guard sliding-window trên là bản phân tán, dùng cho endpoint nhạy cảm cụ thể.

### 3.5. Presence & phòng gọi video (state phiên, TTL)

- **Presence** (`services/signaling-service/src/presence/presence.service.ts`,
  `api-gateway/src/realtime/video-presence.service.ts`): key `vc:presence:{userId}` =
  string timestamp, `SET ... EX 120`. WebSocket disconnect → `DEL`; còn kết nối → `EXPIRE`
  gia hạn. `listOnlineUserIds()` ở gateway làm `KEYS vc:presence:*`.
- **Phòng gọi** (`services/signaling-service/src/signaling/room.service.ts`): key
  `vcroom:{sessionId}` = JSON mảng `{ userId, socketId }`, `SETEX ... 3600`, tối đa 2
  người. Join/leave đọc–sửa–ghi lại; rỗng thì `DEL`.
- **Tại sao Redis**: WebSocket là stateful, kết nối có thể rơi vào bất kỳ instance
  signaling nào; trạng thái "ai đang trong phòng nào" phải ở nơi dùng chung. TTL giúp tự
  dọn phòng ma khi client mất kết nối đột ngột.
- (Lưu ý: `PresenceService`/`RoomService` tự tạo `new Redis(REDIS_URL)` trực tiếp, không
  qua `RedisModule` — cùng một Redis instance.)

### 3.6. Hàng đợi job nền — BullMQ (chạy trên Redis)

- **Ở đâu**: `BullModule.forRootAsync({ connection: { url: redis.url } })` trong
  `api-gateway/src/app.module.ts`; queue `EMAIL_BROADCAST_QUEUE` đăng ký ở
  `email-template.module.ts`.
- **Dùng thế nào**: `email-template.service.ts` → `broadcastQueue.addBulk(jobs)` khi gửi
  chiến dịch email; `email-broadcast.processor.ts` (`@Processor`, `WorkerHost`) tiêu thụ
  từng job `compose` / `send-template`, render template + gửi qua `MailPort`.
- **Tại sao Redis**: BullMQ dùng Redis làm backend cho queue (List + Hash + Sorted Set để
  quản lý job delayed/retry/priority). Gửi vài nghìn email không được nằm trong request
  path → đẩy vào queue, worker xử lý dần, retry riêng.
- Khác Kafka: BullMQ là **task queue nội bộ** (job có trạng thái, retry, delay), không phải
  event bus liên-service. Kafka ở project dành cho `edu.exam.submitted`,
  `edu.payment.succeeded` (xem `docs/microservices-communication.md`).

### 3.7. (Gián tiếp) Tra danh sách online ở gateway

`VideoPresenceService.listOnlineUserIds()` quét `KEYS vc:presence:*` để trả danh sách user
đang online cho các tính năng cộng đồng. (Trên tập key nhỏ thì `KEYS` chấp nhận được; tập
lớn nên đổi sang `SCAN` hoặc một Set tổng.)

---

## 4. Redis KHÔNG được dùng để làm gì (trong project này)

| Việc | Ở đâu thay vì Redis | Vì |
|---|---|---|
| Nguồn sự thật (user, bài học, kết quả thi, thanh toán) | PostgreSQL | cần ACID, quan hệ, bền |
| Refresh token / thu hồi token | bảng `RefreshToken` trong Postgres (`auth.service.ts` `refreshTokens()`, cột `revoked`) | cần lưu bền, audit, xoay vòng |
| Nhật ký sự kiện cần replay | Kafka (`edu.exam.submitted`, `edu.payment.succeeded`) | cần retention + nhiều consumer group |
| Tài liệu phi cấu trúc (chat, nội dung động lớn) | MongoDB (`MongooseModule` ở gateway) | schema linh hoạt |
| Media call audio/video | LiveKit (SFU) | Redis không xử lý luồng RTP |

Nguyên tắc: **mất toàn bộ Redis, hệ thống vẫn phải khởi động lại và chạy được** — chỉ
chậm hơn (cache lạnh), rớt điểm-live và presence tạm thời.

---

## 5. Các cấu trúc dữ liệu Redis project đang dùng

| Cấu trúc | Dùng cho | Lệnh chính |
|---|---|---|
| **String + TTL** | cache value, presence, phòng gọi (JSON), phiên thi | `GET/SET/SETEX/DEL/EXPIRE` |
| **Sorted Set (ZSet)** | sliding-window rate limit (score = timestamp) | `ZADD/ZREMRANGEBYSCORE/ZCARD` |
| **Pub/Sub channel** | tín hiệu chấm điểm live | `PUBLISH/SUBSCRIBE` |
| **List / Hash / ZSet** (BullMQ quản lý) | hàng đợi email | (BullMQ tự lo) |
| **Pipeline** | gộp nhiều lệnh rate-limit thành 1 vòng mạng | `pipeline().exec()` |

---

## 6. Client Redis trong repo

| Thư viện | Dùng ở | Cho việc gì |
|---|---|---|
| `ioredis` (qua provider `REDIS_CLIENT` trong `packages/nest-common/src/redis/redis.module.ts`) | exam-service, rate-limit guard, video-presence | pub/sub, ZSet, thao tác key trực tiếp |
| `cache-manager-redis-yet` (`redisStore`) + `@nestjs/cache-manager` | content-service, exam-service | cache `get/set/del` có TTL |
| `new Redis(REDIS_URL)` tạo trực tiếp | signaling-service (`PresenceService`, `RoomService`) | presence + phòng gọi |
| `bullmq` (`connection: { url }`) | api-gateway | queue email |

Tất cả trỏ về **cùng một** Redis instance.

---

## 7. Q&A

**Q1: Vì sao không cache trong RAM của process cho nhanh hơn nữa?**

> Cache in-process (Map/LRU) nhanh hơn thật, nhưng: (1) mỗi instance một bản → không nhất
> quán, invalidate ở instance A không tới instance B; (2) restart là mất sạch; (3) không
> chia sẻ được state như phiên thi. Redis đánh đổi ~0.5ms latency mạng để có **một** bản
> cache dùng chung, đúng đắn. Có thể làm 2 tầng (in-process L1 + Redis L2) nếu cần, nhưng
> project chưa tới mức đó.

**Q2: Redis mất dữ liệu khi restart không? Có sao không?**

> Redis có thể cấu hình persistence (RDB snapshot / AOF log). Ảnh `redis:7-alpine` mặc định
> có RDB. Nhưng project **thiết kế để không phụ thuộc**: mất Redis → cache lạnh (query DB
> lại), phiên thi đang dở bị huỷ (user bắt đầu đề mới — `submit()` ném 404 "phiên không tồn
> tại"), presence reset. Không mất user/điểm/tiền vì những thứ đó ở Postgres.

**Q3: Một Redis instance dùng chung cho mọi thứ có phải điểm chết (SPOF)?**

> Đúng — hiện tại là SPOF. Chấp nhận ở quy mô này. Khi scale: (1) tách theo mục đích
> (Redis cache riêng, Redis queue riêng, Redis pub/sub riêng) để cô lập tải; (2)
> Redis Sentinel hoặc Cluster cho HA. Về nghiệp vụ, các tính năng phụ thuộc Redis đều
> degrade "mềm" nên downtime Redis không làm sập lõi.

**Q4: `KEYS vc:presence:*` có vấn đề gì?**

> `KEYS` quét toàn bộ keyspace, **block** Redis (đơn luồng) trong lúc quét — nguy hiểm khi
> nhiều triệu key. Ở đây tập presence nhỏ (số user đang online) nên tạm ổn. Production nên
> đổi sang `SCAN` (quét từng phần, không block) hoặc duy trì một `Set` tổng
> `vc:presence:online` và `SADD/SREM` khi vào/ra.

**Q5: Vì sao rate limit dùng Sorted Set chứ không `INCR` + `EXPIRE`?**

> `INCR`+`EXPIRE` là **fixed window**: reset đột ngột ở mốc phút → cho phép "burst kép" ở
> ranh giới (2× limit trong 2 giây quanh mốc). Sorted Set với score = timestamp cho
> **sliding window** thật: luôn đếm đúng số request trong N giây gần nhất. Đổi lại tốn bộ
> nhớ hơn (lưu từng timestamp) và cần `ZREMRANGEBYSCORE` dọn rác.

**Q6: Pub/Sub vs Kafka — chọn thế nào?**

> - Cần **bền, replay, nhiều consumer group, thứ tự theo key** → Kafka. Ví dụ:
>   `edu.exam.submitted` (SRS + analytics + notification cùng đọc, bug thì tua lại).
> - Cần **latency thấp, fan-out nhanh, mất được** → Redis Pub/Sub. Ví dụ: điểm live khi
>   đang chấm.
> Trong 1 luồng submit, project dùng **cả hai**: EventBus→Kafka cho việc phải xử lý,
> Redis PUBLISH cho hiển thị tức thời.

**Q7: Vì sao BullMQ (Redis) mà không phải Kafka cho email?**

> Gửi email là **job** cần: retry với backoff, delay ("gửi sau 1 giờ"), priority, xem
> trạng thái từng job, huỷ job. BullMQ (trên Redis) làm sẵn tất cả. Kafka là commit log,
> không phải job manager — làm được nhưng phải tự viết retry/dedup/tracking. Email cũng là
> việc **nội bộ 1 service** (gateway), không cần broadcast liên-service.

**Q8: `cache-manager` và `ioredis` cùng project — có xung đột không?**

> Không. `cache-manager-redis-yet` chỉ dùng cho pattern cache `get/set/del` có TTL.
> `ioredis` (`REDIS_CLIENT`) dùng khi cần lệnh Redis thô (pub/sub, ZSet, pipeline). Cùng
> một server Redis, khác namespace key, khác mục đích.

---

## 8. Bảng key namespace đang dùng

| Prefix / channel | Loại | Ý nghĩa | TTL | Nguồn |
|---|---|---|---|---|
| `lessons:all` | String (cache) | danh sách bài học | 300s | content-service |
| `vocab:lesson:{id}` | String (cache) | từ vựng theo bài | 300s | content-service |
| `grammar:lesson:{id}` | String (cache) | ngữ pháp theo bài | 300s | content-service |
| `mock-exam:{examId}` | String (cache) | phiên thi + đáp án đúng | 3h | exam-service |
| `rl:{ip}:{Class}:{handler}` | Sorted Set | cửa sổ trượt rate limit | windowSec+1 | rate-limit guard |
| `vc:presence:{userId}` | String | user online (timestamp) | 120s | signaling / gateway |
| `vcroom:{sessionId}` | String (JSON) | thành viên phòng gọi | 3600s | signaling |
| `exam:question-scored` | Pub/Sub channel | điểm live từng câu | — | exam-service |
| `exam:completed` | Pub/Sub channel | báo chấm xong | — | exam-service |
| `bull:email-broadcast:*` | List/Hash/ZSet | queue email (BullMQ quản lý) | — | api-gateway |

---

## 9. File tham chiếu nhanh

| Chủ đề | Đường dẫn |
|---|---|
| Provider `REDIS_CLIENT` (ioredis) | `packages/nest-common/src/redis/redis.module.ts` |
| Key & TTL cache | `packages/nest-common/src/cache/cache-keys.ts` |
| Config `redis.url` | `packages/nest-common/src/config/configuration.ts` |
| Cache module (redisStore) | `services/content-service/src/content.module.ts`, `services/exam-service/src/exam.module.ts` |
| Dùng cache trong service | `services/content-service/src/modules/lessons/lessons.service.ts` |
| Phiên thi + pub/sub | `services/exam-service/src/modules/mock-exams/mock-exams.service.ts` |
| Rate limit sliding window | `packages/nest-common/src/rate-limit/sliding-window.guard.ts` |
| Presence / phòng gọi | `services/signaling-service/src/presence/presence.service.ts`, `.../signaling/room.service.ts` |
| BullMQ queue email | `services/api-gateway/src/email-template/email-template.module.ts`, `email-broadcast.processor.ts` |
| Container Redis | `docker-compose.yml` (`redis:`) |

Xem thêm: `docs/microservices-communication.md` (Redis Pub/Sub vs Kafka),
`docs/learn-edu-app.md` (Tuần 4).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **3. Backend (NestJS)** — bài 2/8.

- Bài trước: [learn-nestjs.md](./learn-nestjs.md) — NestJS: thứ tự pipeline, guard, interceptor, DI, rate limit, pipe
- **Bài tiếp: [mongodb.md](./mongodb.md)** — MongoDB chỉ dùng cho audit log

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
