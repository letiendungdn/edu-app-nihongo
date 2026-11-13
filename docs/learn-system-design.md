# Học System Design — Từ Project Này

## 1. Cách senior suy nghĩ về system design

Senior không hỏi "Dùng công nghệ gì?" — hỏi:
- **Consistency vs Availability**: khi DB down, user thấy gì?
- **Read vs Write ratio**: đọc nhiều hay ghi nhiều → ảnh hưởng caching
- **Failure modes**: component X fail → ảnh hưởng gì đến Y?
- **Scale bottleneck**: component nào sẽ chết đầu tiên khi traffic tăng 10x?

---

## 2. Phân tích các quyết định thiết kế trong project

### Tại sao app tiếng Anh dùng DB riêng (nihongo vs english_learning)?

```
Option A: 1 DB chung
  ✅ Đơn giản, 1 connection pool
  ❌ Schema conflict: nihongo.User vs english.User khác nhau
  ❌ Một team migrate → ảnh hưởng cả 2 app
  ❌ Không thể scale riêng từng app

Option B: 2 DB riêng (đã chọn)
  ✅ Schema độc lập, migrate không ảnh hưởng nhau
  ✅ Scale riêng: nihongo nặng hơn → PostgreSQL riêng
  ✅ Auth riêng biệt (Bearer vs Cookie)
  ❌ Không SSO giữa 2 app (user phải tạo 2 account)
  ❌ Không cross-query (không JOIN nihongo.User với english.User)

→ Quyết định đúng vì 2 app thực sự độc lập về domain
→ 10/2026 đi tiếp một bước: app tiếng Anh tách hẳn sang repo `edu-app-english`; repo này chỉ còn DB `nihongo`
```

### Tại sao gRPC cho content/exam nhưng in-process cho payment?

```
Tiến trình riêng, gọi qua gRPC (content-service, exam-service):
  → Hai vùng nghiệp vụ khác nhau: nội dung (đọc nhiều) và thi/tiến độ (ghi nhiều theo người dùng)
  → Deploy riêng; exam-service treo thì vẫn đọc được bài học
  → Scale riêng: HPA tối thiểu 2 pod cho content/exam (infra/k8s/grpc-services-autoscaling.yaml)
  → KHÔNG nhanh hơn nhờ Protobuf: chỉ có một RPC Dispatch, payload vẫn là chuỗi JSON

Module chạy chung trong gateway (payment-service):
  → Thanh toán cần transaction DB chắc chắn cùng dữ liệu khác
  → Tải thấp, không cần scale riêng
  → Không thêm một chỗ có thể lỗi mạng giữa "trừ tiền" và "kích hoạt gói"

→ Không phải mọi thứ đều cần microservice
→ Cả gateway, content, exam đang dùng CHUNG một database: chưa tách được ở tầng dữ liệu
```

Phân tích đầy đủ, kèm số liệu đo: [learn-microservices.md](./learn-microservices.md).

### Tại sao Redis cho rate limit thay vì in-memory?

```
In-memory (❌):
  api-gateway instance A: ip_x → 4 requests
  api-gateway instance B: ip_x → 4 requests
  → User thực sự gửi 8 requests, bypass limit

Redis (✅):
  Cả 2 instance đọc cùng 1 Redis key
  → Accurate cross-instance rate limiting
```

### Tại sao Kafka thay vì direct DB update?

```
Webhook flow nếu không có Kafka:
  POST /webhooks/stripe
    → UPDATE Payment
    → UPDATE Subscription
    → INSERT Notification
    → Send email (gọi email service)
    → Trigger payout logic
    → Total: ~2-3 seconds
    → Stripe timeout = 30s (ok), nhưng nếu email service chậm?

Với Kafka:
  POST /webhooks/stripe
    → Verify signature (50ms)
    → Check idempotency (10ms)
    → Publish event (5ms)
    → Return 200 (65ms total) ← Stripe happy

  Consumer (async, không block webhook):
    → Xử lý tất cả side effects
    → Retry tự động nếu fail
    → Scale consumer riêng nếu queue lag
```

---

## 3. CAP Theorem — áp dụng vào project

```
CAP: Consistency, Availability, Partition Tolerance
→ Chỉ chọn được 2 trong 3

PostgreSQL (CP — Consistency + Partition Tolerance):
  Nếu DB bị partition (network split):
    → Refuse write (giữ consistency)
    → API trả lỗi 503
  Ví dụ: booking session — thà lỗi còn hơn double-book

Redis (AP — Availability + Partition Tolerance):
  Nếu Redis down:
    → Rate limit bypass (vẫn serve request)
    → Cache miss (query DB trực tiếp)
    → Không crash app ← đúng behavior
  
MongoDB audit (AP):
  Nếu MongoDB down:
    → Không ghi audit log
    → Request vẫn được phục vụ ← đúng (audit là non-critical)
```

**Hỏi trong interview:** "Nếu Redis down lúc 2am, điều gì xảy ra với app?"

```
Đúng:
  - Rate limit bypass tạm thời (10 phút)
  - Vocab cache miss → query PostgreSQL trực tiếp → chậm hơn 3x
  - Coach presence không update → stale data
  - App vẫn chạy được

Sai nếu trả lời:
  - App crash (Redis là single point of failure)
```

---

## 4. Read/Write Ratio — thiết kế cache

```
Phân tích traffic:
  GET /vocabularies?lessonNumber=1    → 10,000 req/day ← đọc nhiều
  POST /mock-exams/:id/submit         → 500 req/day
  POST /subscriptions                 → 50 req/day
  POST /marketplace/sessions          → 200 req/day

→ Read:Write ratio ≈ 20:1
→ Cache aggressively cho vocab/grammar (immutable content)

Cache strategy:
  Vocab by lesson:     Redis TTL 5 phút    ← stable data
  Coach search:        Redis TTL 1 phút    ← changes khi coach update profile
  Subscription status: No cache            ← phải accurate (payment decision)
  SRS review queue:    No cache            ← personal, changes after every review

Cache invalidation:
  Khi admin update vocab → DELETE cache key → next request rebuild cache
  Pattern: "cache-aside" (đọc cache → miss → query DB → set cache)
```

---

## 5. Failure Modes — vẽ failure tree

```
Scenario: Stripe webhook fail

Stripe gửi webhook
  → Nginx nhận (OK)
  → api-gateway nhận
       → Verify signature: FAIL?
          → Return 400 → Stripe không retry (đúng — invalid signature)
          → Log alert

       → PostgreSQL write (WebhookEvent): FAIL?
          → Return 500 → Stripe retry sau 5 phút → eventually consistent

       → Publish Kafka: FAIL?
          → Rollback PostgreSQL write → Return 500 → Stripe retry
          → Payment remain PENDING → user thấy chưa active (temporary)

       → Kafka Consumer fail sau 3 lần?
          → Vào DLQ → Alert on-call engineer
          → Manual replay từ DLQ sau khi fix bug

→ Mọi failure đều có recovery path, không có data loss
```

---

## 6. Scale Bottleneck — component nào fail đầu tiên

```
Traffic tăng 10x (10k concurrent users):

1. api-gateway (NestJS) → scale horizontal ← dễ, stateless
2. PostgreSQL → scale vertical trước, sau đó read replicas
3. Redis → scale: Redis Cluster
4. content-service / exam-service → scale horizontal (gRPC load balance)
5. Kafka → tăng partition count

Bottleneck thực sự:
  PostgreSQL connection pool:
    NestJS default: 10 connections/instance
    10 instances × 10 connections = 100 connections
    PostgreSQL max_connections = 100 (default)
    → Deadlock ở 100 concurrent DB operations

  Fix:
    PgBouncer (connection pooler) trước PostgreSQL
    → 1000 app connections → 100 PostgreSQL connections (pooled)
```

---

## 7. Database Design Decisions

### Tại sao Payout lưu grossAmount, feeAmount, netAmount riêng?

```
Option A: Chỉ lưu netAmount
  → Không thể reconcile nếu platformFeePercent thay đổi
  → Không biết platform đã thu bao nhiêu fee

Option B: Lưu cả 3 (đã chọn):
  grossAmountCents = tổng session prices
  feeAmountCents   = gross × platformFeePercent / 100
  amountCents      = gross - fee (số coach nhận)

  → Audit trail đầy đủ
  → Reconciliation chính xác: SUM(fee) = platform revenue
  → Thay đổi fee% trong tương lai không ảnh hưởng records cũ
```

### Tại sao CoachingSession.priceUsdCents lưu snapshot?

```
Không snapshot:
  Session tạo lúc coach charge $50/hr
  Coach đổi giá lên $80/hr
  Query: SELECT c.hourlyRateUsd FROM CoachingSession s JOIN CoachProfile c ...
  → Session cũ hiển thị $80 ← SAI

Snapshot (đã chọn):
  Session.priceUsdCents = 5000  (tại thời điểm book)
  Coach thay đổi giá → session cũ không bị ảnh hưởng
  → Payment reconciliation luôn chính xác
```

### Tại sao SrsCard không lưu kana/kanji/meaning?

```
Version cũ (denormalized):
  SrsCard: { kana: "いく", kanji: "行く", meaning: "đi", interval: 6... }
  → Vocab được sửa (typo fix) → SrsCard không cập nhật
  → Inconsistency

Version mới (normalized):
  SrsCard: { contentType: VOCABULARY, contentId: 5, interval: 6... }
  → JOIN sang Vocabulary khi cần display
  → Vocab update → tất cả SrsCard tự nhận data mới
```

---

## 8. API Design — REST conventions

```
❌ Sai:
  POST /api/getSubscription       ← verb trong URL
  GET  /api/cancelSubscription    ← GET làm side effect
  POST /api/subscription/create   ← "create" thừa

✅ Đúng (trong project):
  GET    /api/subscriptions/status  ← read subscription
  POST   /api/subscriptions         ← create subscription
  DELETE /api/subscriptions         ← cancel subscription
  POST   /api/subscriptions/refund  ← action (exception: verb khi thực sự cần)

Nested resources:
  GET  /api/admin/users/:id/payments  ← payments của user cụ thể
  POST /api/marketplace/sessions      ← tạo session (thuộc marketplace context)
```

---

## 9. Thiết kế tính năng mới — quy trình senior

**Ví dụ:** Product yêu cầu "Thêm tính năng học theo nhóm (group study)"

```
Step 1: Clarify requirements
  - Tối đa bao nhiêu người/nhóm?
  - Real-time hay async?
  - Cần lưu history không?
  - Subscription plan nào được dùng?

Step 2: Data model trước
  StudyGroup: { id, name, ownerId, maxMembers, plan }
  StudyGroupMember: { groupId, userId, role, joinedAt }
  GroupStudySession: { groupId, lessonId, startedAt, endedAt }

Step 3: API design
  POST   /api/groups           ← tạo nhóm
  GET    /api/groups           ← list nhóm của user
  POST   /api/groups/:id/join  ← xin vào nhóm
  DELETE /api/groups/:id/leave ← rời nhóm
  POST   /api/groups/:id/start ← bắt đầu study session

Step 4: Failure modes
  - Owner rời nhóm → transfer ownership hay disband?
  - Group session khi 1 member mất kết nối?
  - Billing: charge từng member hay chỉ owner?

Step 5: Scale consideration
  - 1000 groups × 10 members = 10,000 WebSocket connections
  - Cần Socket.io rooms hay Kafka fan-out?
```

---

## Bài tập thực hành

```
1. Vẽ lại architecture từ đầu (không nhìn docs):
   → Chỉ dùng pen và paper
   → Sau đó so sánh với system-design.md
   → Giải thích từng component và tại sao cần nó

2. Failure analysis:
   → PostgreSQL down 5 phút → điều gì xảy ra?
   → Kafka down → webhook vẫn xử lý được không?
   → Redis down → rate limit còn hoạt động không?

3. Scale calculation:
   → Giả sử 10,000 active users
   → Mỗi user học 30 phút/ngày, 1 request/10 giây
   → Tổng req/s = ?
   → Cần bao nhiêu api-gateway instances?
   → PostgreSQL connection pool cần bao nhiêu?

4. Design mới: "Learner có thể share progress lên social"
   → Requirements, data model, API, failure modes
   → Có cần Kafka không? Tại sao?
   → Có ảnh hưởng subscription plan không?
```

## Luyện phỏng vấn

Câu hỏi phỏng vấn kèm đáp án (system design, testing, câu hỏi hành vi): [interview-questions.md](./interview-questions.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **2. Kiến trúc hệ thống** — bài 6/7.

- Bài trước: [media-storage.md](./media-storage.md) — Ảnh và file media lưu ở đâu: repo, S3, DB, thư mục gắn container
- **Bài tiếp: [learn-adr-design-docs.md](./learn-adr-design-docs.md)** — Viết ADR và design doc (ví dụ: thư mục adr/)

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
