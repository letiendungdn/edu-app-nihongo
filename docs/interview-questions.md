# Bộ Câu Hỏi Phỏng Vấn Senior — EDU APP

Mỗi câu trả lời đều dựa vào **code thực trong project**. Không trả lời chung chung.

Câu hỏi theo JD backend NestJS (RxJS, MQTT, Kafka, view/materialized view, Flyway, DDD): [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md).

---

## PostgreSQL & Database

**Q1: Giải thích Keyset Pagination và tại sao nó tốt hơn OFFSET trên bảng lớn?**

> OFFSET phải scan và bỏ qua N rows trước khi lấy page. Ở trang 50,000 với limit 20, PostgreSQL phải đọc 1,000,020 rows để trả về 20. Keyset dùng `WHERE id > last_cursor` — PostgreSQL seek thẳng tới vị trí đó qua index, O(log n) thay vì O(n). Trong project, Vocabulary có thể lên đến hàng triệu records khi scale, endpoint `GET /vocabularies` phải dùng cursor thay vì OFFSET. Trade-off: không thể nhảy tới page N tùy ý.

---

**Q2: Tại sao cần SELECT FOR UPDATE khi book coaching session?**

> Hai user cùng book coach A lúc 8:00 sáng. Cả 2 query conflict check đều thấy 0 rows → cả 2 INSERT thành công → double booking. SELECT FOR UPDATE lock coach row, buộc transaction thứ 2 đợi transaction 1 COMMIT. Sau khi transaction 1 COMMIT tạo session, transaction 2 mới chạy conflict check → thấy đã có → rollback. Đây là pessimistic locking, phù hợp khi conflict rate cao (booking slots).

---

**Q3: Phân biệt 4 isolation levels. Project dùng level nào và tại sao?**

> PostgreSQL default là READ COMMITTED — đủ cho hầu hết queries (vocab fetch, profile load). REPEATABLE READ dùng khi cần snapshot nhất quán across multiple queries trong 1 transaction, ví dụ report cuối tháng tính doanh thu. SERIALIZABLE dùng cho financial reconciliation — transaction chạy như thể tuần tự, tránh anomaly. Project dùng READ COMMITTED mặc định, chỉ raise level cho Payout reconciliation cron job. READ UNCOMMITTED PostgreSQL không support (treat như READ COMMITTED).

---

**Q4: Covering index là gì? Cho ví dụ trong project.**

> Covering index include đủ các cột SELECT — PostgreSQL chỉ đọc index mà không cần đọc heap (bảng chính), tiết kiệm 1 random I/O per row. Trong project, coach search query `SELECT id, hourlyRateUsd, avgRating, totalSessions FROM CoachProfile WHERE isActive=true ORDER BY avgRating DESC LIMIT 10` có thể dùng covering index: `CREATE INDEX ON CoachProfile (isActive, avgRating DESC) INCLUDE (hourlyRateUsd, totalSessions)`. Trên bảng 100k coaches, difference là ~200ms vs ~20ms.

---

**Q5: COUNT(*) trên bảng 1 triệu rows có vấn đề gì? Fix thế nào?**

> COUNT(*) phải scan toàn bộ bảng dù có index — khoảng 800ms-1s trên 1M rows. Fix tùy trường hợp: (1) Estimate từ `pg_class.reltuples` — sai lệch 1-5%, đủ để hiển thị "khoảng 1 triệu từ vựng". (2) Chỉ COUNT với WHERE clause có index và selective (ví dụ count payments của 1 user). (3) Maintain counter riêng — denormalized field `totalVocabCount` update khi insert/delete. Trong project, `/admin/stats` nên dùng estimate, không COUNT(*) trực tiếp.

---

**Q6: Giải thích deadlock và cách phòng tránh trong transaction.**

> Deadlock xảy ra khi 2 transactions lock resources theo thứ tự ngược nhau: Tx A lock User 1 → đợi User 2, Tx B lock User 2 → đợi User 1. Phòng tránh: (1) Luôn lock resources theo cùng thứ tự (alphabetical, numeric ID). (2) Giảm scope transaction — lock muộn nhất, release sớm nhất. (3) Dùng `SELECT FOR UPDATE SKIP LOCKED` cho queue-style processing. PostgreSQL tự detect deadlock và rollback 1 transaction — app cần catch và retry.

---

## NestJS & Backend

**Q7: Execution order của Guard, Interceptor, Pipe, ExceptionFilter?**

> Middleware → Guard → Interceptor (before) → Pipe → Controller → Interceptor (after) → ExceptionFilter. Quan trọng: nếu Guard throw UnauthorizedException, Interceptor after không chạy — ExceptionFilter bắt thẳng. AuditInterceptor trong project dùng `tap()` operator vì nó là side-effect operator — Observable vẫn flow xuống client, audit log ghi sau. Nếu dùng `subscribe()` sẽ consume Observable, client không nhận được response.

---

**Q8: Tại sao dùng `void asyncMethod()` trong AuditInterceptor thay vì `await`?**

> Audit log là fire-and-forget — không cần đợi MongoDB write trước khi trả response cho client. `await` sẽ block response thêm 5-20ms mỗi request. `void` là signal explicit rằng đây là intentional unhandled Promise, TypeScript không warning. Trade-off: nếu MongoDB down, audit log mất nhưng request vẫn thành công — đây là correct behavior vì audit là non-critical.

---

**Q9: Tại sao Redis Sliding Window tốt hơn Fixed Window cho rate limiting?**

> Fixed Window (INCR + TTL): user gửi 5 requests lúc 00:59, counter reset lúc 01:00, gửi thêm 5 requests — trong 2 giây user đã gửi 10 requests, bypass limit. Sliding Window (ZADD/ZREMRANGEBYSCORE): mỗi request là 1 entry với timestamp, luôn đếm đúng trong 60 giây trước hiện tại, không có edge case ở boundary. Trong project, `POST /auth/login` limit 5 req/60s dùng sliding window — critical vì brute force attack tại boundary sẽ bypass fixed window.

---

**Q10: Giải thích Scope của NestJS Provider. Khi nào dùng REQUEST scope?**

> DEFAULT (Singleton): 1 instance cho toàn app, shared across requests. REQUEST: 1 instance mỗi request, useful khi cần inject request context (user ID, correlation ID). TRANSIENT: mới mỗi lần inject. REQUEST scope có overhead — tạo/destroy mỗi request, tạo chain reaction lên tất cả dependencies cũng phải REQUEST scoped. Trong project, AuditInterceptor dùng Singleton nhưng đọc request từ ExecutionContext — không cần REQUEST scope vì ExecutionContext cung cấp context on-demand.

---

## Kafka & Async

**Q11: Kafka đảm bảo "at least once" delivery nghĩa là gì? Xử lý thế nào?**

> Consumer đọc message → xử lý → commit offset. Nếu consumer crash sau khi xử lý nhưng trước khi commit, Kafka retry → message được process 2 lần. "At least once" = có thể duplicate, không bao giờ mất. Xử lý bằng idempotent consumer: mỗi message có unique key, check DB trước khi xử lý. Trong project, `edu.exam.submitted` consumer check `processedMessage` table trước khi update SrsCard — cùng message process 2 lần chỉ update 1 lần.

---

**Q12: Tại sao publish Kafka event thay vì xử lý ngay trong webhook handler?**

> Stripe timeout là 30 giây. Webhook handler cần respond 200 trong thời gian đó. Nếu xử lý synchronous: UPDATE Subscription + INSERT Notification + trigger payout + send email = 2-3 giây trong trường hợp tốt, có thể 30+ giây nếu email service chậm → Stripe timeout → retry → double processing. Với Kafka: handler chỉ verify signature + check idempotency + publish event = 65ms → return 200. Consumer xử lý async, có thể retry riêng, scale riêng.

---

**Q13: Dead Letter Queue là gì? Khi nào dùng?**

> DLQ là topic đặc biệt chứa messages đã fail sau N lần retry. Sau 3 lần fail, message move sang `edu.payment.succeeded.dlq` thay vì retry infinite. DLQ consumer không business logic — chỉ alert on-call engineer và lưu vào DB để manual review. Quan trọng: sau khi move vào DLQ phải commit offset (không throw), nếu không consumer sẽ stuck tại message đó mãi. Trong project, payment DLQ cực quan trọng — mất message = mất tiền của user.

---

**Q14: Tại sao Kafka message key quan trọng?**

> Key quyết định partition. Cùng key → cùng partition → messages của cùng 1 entity luôn theo thứ tự. `edu.exam.submitted` dùng `key=userId`: user A submit exam 2 lần nhanh → cả 2 messages vào cùng partition → consumer xử lý đúng thứ tự → SrsCard update không bị race condition. Nếu không có key → round-robin → 2 messages có thể vào 2 partition → 2 consumer xử lý song song → race condition.

---

## Payment & Stripe

**Q15: Giải thích webhook idempotency. Tại sao cần WebhookEvent table?**

> Stripe retry webhook nếu không nhận 200 trong 30 giây (server crash, timeout). Không có idempotency: cùng `payment_intent.succeeded` event xử lý 2 lần → UPDATE Subscription 2 lần (ok) nhưng INSERT Payment 2 lần (BUG — user thấy 2 charges). WebhookEvent table dùng `eventId` (Stripe `evt_...`) với UNIQUE constraint. Trước khi xử lý: check `eventId` đã tồn tại với `status=PROCESSED` → skip. Pattern: UPSERT status=RECEIVED → process → UPDATE status=PROCESSED.

---

**Q16: Tại sao dùng $transaction khi xử lý payment_intent.succeeded?**

> Cần UPDATE Payment status=SUCCEEDED và UPDATE Subscription status=ACTIVE phải atomic. Nếu không transaction: UPDATE Payment succeed → UPDATE Subscription crash → Payment SUCCEEDED nhưng Subscription vẫn PENDING → user thanh toán rồi nhưng không được upgrade. Với $transaction: nếu Subscription update fail → rollback cả Payment update → Stripe retry webhook → xử lý lại từ đầu → eventually consistent. Rule: mọi thứ liên quan đến money phải trong transaction.

---

**Q17: Stripe Idempotency Key khi gọi API là gì?**

> Khi ta gọi Stripe API, nếu request timeout và retry, Stripe có thể tạo 2 subscription. Idempotency Key là header `Idempotency-Key: unique-value` — Stripe cache result trong 24h, cùng key → return cached result thay vì execute lại. Key phải stable và unique: `sub-create-{userId}-{plan}-{date}`. Scope phải đúng: date-scoped để user có thể retry ngày hôm sau nếu muốn.

---

## System Design

**Q18: Tại sao app tiếng Anh dùng DB riêng (và nay tách hẳn sang repo `edu-app-english`)?**

> Schema conflict: nihongo.User có `stripeCustomerId`, english.User không có. Rollout independence: team nihongo migrate schema không ảnh hưởng english. Scale independence: nihongo có content lớn hơn nhiều (vocab, grammar, kanji, JLPT data) — có thể scale PostgreSQL riêng. Auth riêng biệt: nihongo dùng JWT Bearer + Google OAuth, english dùng JWT Cookie với `aud:english` claim — nếu 1 DB sẽ phức tạp. Trade-off: không SSO, không cross-query, user phải đăng ký 2 account. Bước tiếp theo của chính lập luận này: app tiếng Anh đã được tách sang repo riêng (10/2026) — repo này chỉ còn sản phẩm tiếng Nhật.

---

**Q19: Giải thích CAP theorem với ví dụ cụ thể từ project.**

> CAP: chỉ đảm bảo được 2 trong 3 (Consistency, Availability, Partition Tolerance). PostgreSQL là CP: khi network partition, refuse writes để giữ consistency — booking session trả lỗi 503 còn hơn double-book. Redis là AP: khi Redis down, rate limit bypass tạm thời, cache miss query DB trực tiếp — app vẫn chạy. MongoDB audit là AP: khi MongoDB down, không ghi log nhưng request vẫn serve — audit là non-critical. Quyết định CP vs AP phụ thuộc vào: failure của component này có acceptable không?

---

**Q20: Scale bottleneck nào sẽ xuất hiện đầu tiên khi traffic tăng 10x?**

> PostgreSQL connection pool. NestJS default 10 connections/instance, 10 instances = 100 connections, PostgreSQL default `max_connections=100`. Ở 10x traffic, 100 concurrent DB operations = deadlock và timeout. Fix: PgBouncer trước PostgreSQL — 1000 app connections pool thành 100 DB connections. Sau đó: Redis connection pool (ioredis default 10), Kafka partition count (mỗi partition 1 consumer), content-service/exam-service instances (gRPC load balance).

---

**Q21: Tại sao WebhookEvent không bao giờ xóa records?**

> Audit trail cho financial compliance — phải giữ tối thiểu 7 năm. Nếu dispute với Stripe hoặc user claim bị charge sai, cần replay lịch sử. Debug: khi bug xảy ra trong payment flow, cần biết event nào đã processed, event nào failed. Idempotency: nếu xóa record cũ và Stripe retry event đó sau 1 năm (edge case) → process lại. Dùng partitioning theo year để archive records cũ sang cold storage mà không xóa.

---

**Q22: Tại sao CoachingSession.priceUsdCents lưu snapshot thay vì JOIN CoachProfile?**

> Snapshot pattern: lưu giá tại thời điểm booking. Coach A charge $50/hr lúc user book → sau đó coach tăng lên $80/hr → history vẫn hiển thị $50 (đúng). Nếu JOIN: history hiển thị $80 (sai — user bị charged $50). Payment reconciliation: SUM(CoachingSession.priceUsdCents) phải khớp SUM(Payment.amountCents). Tương tự: `platformFeePercent` lưu % tại thời điểm tạo session — thay đổi policy sau không ảnh hưởng records cũ.

---

## Testing

**Q23: Tại sao không mock Prisma trong integration test?**

> Mock Prisma pass test nhưng không test thực tế. Ví dụ: mock `prisma.payment.create` luôn return success — test pass. Production: UNIQUE constraint `stripePaymentIntentId` fail vì duplicate. Nếu mock: không bao giờ biết. Integration test với real DB catch: constraint violations, transaction rollback behavior, query performance, migration correctness. Chỉ mock external services (Stripe API, email service) — không mock DB của mình.

---

**Q24: Phân biệt khi nào viết unit test, integration test, E2E test?**

> Unit test: pure functions không có side effects — SM-2 algorithm, formatPrice, encodeCursor. Chạy < 5ms, không cần DB. Integration test: code + DB thực, không HTTP — WebhookService idempotency, BookingService double-book prevention. Verify transaction behavior, constraint enforcement. E2E test: full flow qua HTTP — `POST /subscriptions → Stripe → webhook → GET /subscriptions/status = ACTIVE`. Tỷ lệ lý tưởng: 70% unit, 20% integration, 10% E2E. E2E chậm (2-5s/test) — không viết nhiều.

---

**Q25: Test gì trong payment flow là quan trọng nhất?**

> Idempotency — cùng webhook event được deliver 2 lần → chỉ 1 subscription được active, không tạo 2 payment records. Transaction rollback — UPDATE Payment succeed, UPDATE Subscription fail → cả 2 rollback → user thấy vẫn PENDING (consistent). Double booking — 10 concurrent requests book cùng slot → chỉ 1 CoachingSession, 9 nhận lỗi. Đây là những test mà nếu fail → user mất tiền hoặc thấy data sai.

---

## Câu hỏi hành vi (Behavioral)

**Q26: Kể về lần ta xử lý bug production liên quan đến data.**

> Câu trả lời tốt cần có: (1) Context — bug xảy ra khi nào, impact gì. (2) Investigation — dùng tool gì để debug (logs, EXPLAIN ANALYZE, Stripe dashboard). (3) Root cause — tìm ra nguyên nhân cụ thể. (4) Fix — code change cụ thể. (5) Prevention — thêm test/monitor gì để không tái diễn. Ví dụ từ project: "Payment webhook được process 2 lần vì chưa có idempotency table — user thấy 2 charges. Fix: thêm WebhookEvent table với UNIQUE eventId. Prevention: integration test gửi cùng event 2 lần."

---

**Q27: Tại sao ta chọn Kafka thay vì Redis Queue cho async processing?**

> Redis Queue (Bull/BullMQ): dễ setup, message bị xóa sau khi consume, không replay, max retention giới hạn. Kafka: message persist theo configured retention (7 ngày default), có thể replay từ bất kỳ offset nào, nhiều consumer groups độc lập cùng đọc 1 topic, partition cho ordering. Trong project, `edu.payment.succeeded` cần: (1) audit trail — không xóa. (2) Nhiều consumers — payment service + notification service + analytics service đọc cùng topic. (3) Replay khi bug — reprocess tất cả payments của 1 ngày để fix incorrect subscription status.

---

**Q28: Cách ta thiết kế API cho tính năng mới.**

> Quy trình: (1) Clarify: bao nhiêu users? Read-heavy hay write-heavy? Real-time cần không? (2) Data model trước khi code: normalize hay denormalize? Indexes nào cần? (3) API contract: REST resource, HTTP verbs, response shape. (4) Failure modes: component nào fail thì sao? (5) Scale: query đắt nhất là gì khi 10x traffic? Ví dụ: feature group study — cần clarify max members, cần WebSocket hay polling, billing per-user hay per-group trước khi viết 1 dòng code.

---

## Nhanh — 30 giây mỗi câu

```
Q: gRPC khác REST ở điểm gì?
A: Binary protocol (Protobuf) thay vì JSON, strongly typed contract, bi-directional streaming, tốt cho internal service-to-service. Project dùng gRPC cho content/exam service vì high-frequency internal calls.

Q: JWT access token và refresh token khác gì?
A: Access token short-lived (15m), stateless, verify bằng secret. Refresh token long-lived (7d), stateful (lưu DB), dùng 1 lần để lấy access token mới (rotation). Nếu refresh token bị steal → revoke trong DB.

Q: Redis TTL dùng để làm gì trong project?
A: Coach presence (90s — extend qua heartbeat), vocab cache (5m), rate limit window (60s), Livekit room state (1h). TTL = tự dọn mà không cần cron.

Q: Tại sao Stripe webhook cần verify signature?
A: Ai cũng có thể POST tới /webhooks/stripe với fake payload. Signature dùng STRIPE_WEBHOOK_SECRET — chỉ Stripe biết secret này — verify đảm bảo event thực sự từ Stripe, không phải attacker.

Q: N+1 query là gì? Fix thế nào trong Prisma?
A: Load 20 coaches → 20 query riêng để load profile mỗi coach. Fix: Prisma include({ coachProfile: true }) → 1 query với JOIN. Detect: enable Prisma query logging, đếm số queries per request.

Q: Soft delete vs hard delete?
A: Soft delete: thêm cột deletedAt, filter WHERE deletedAt IS NULL. Giữ audit trail, có thể restore. Hard delete: xóa hẳn, nhanh hơn, đơn giản hơn. Project dùng hard delete cho phần lớn, chỉ giữ WebhookEvent và Payment records vĩnh viễn (compliance).

Q: Idempotent API là gì?
A: Gọi nhiều lần với cùng input → cùng result, không side effect. GET luôn idempotent. PUT/DELETE nên idempotent. POST thường không (tạo mới mỗi lần). PATCH /subscriptions/cancel idempotent — cancel lần 2 trả 409 Conflict, không cancel 2 lần.

Q: Prisma $transaction vs raw SQL transaction?
A: $transaction([]) là parallel operations trong 1 transaction. $transaction(async (tx) => {}) là interactive transaction — có thể query result rồi dùng trong next query. Payment flow dùng interactive transaction: check conflict → insert → update phải sequential.
```

---

## Race Condition — Giỏ hàng còn 1 món, 2 người cùng mua

**Q29: Giỏ hàng chỉ còn 1 slot coaching session (hoặc 1 item), 2 user cùng checkout cùng lúc. Giải quyết thế nào?**

### Vấn đề — Naive approach fail

```
User A đọc: quantity = 1 → còn hàng → INSERT order
User B đọc: quantity = 1 → còn hàng → INSERT order  ← cùng lúc, chưa thấy A
→ Cả 2 INSERT thành công → oversell
```

### Giải pháp 1 — Atomic UPDATE (đơn giản nhất, dùng trước)

Không check rồi update — **update có điều kiện trong 1 câu SQL duy nhất**:

```sql
-- UPDATE chỉ thành công khi quantity > 0
UPDATE "Product"
SET quantity = quantity - 1
WHERE id = 42 AND quantity > 0
RETURNING id, quantity;

-- Nếu RETURNING trả về 0 rows → quantity đã = 0 → từ chối
-- Nếu trả về 1 row → update thành công → tạo order
```

```typescript
async purchaseItem(productId: number, userId: number) {
  const result = await this.prisma.$queryRaw<{ id: number; quantity: number }[]>`
    UPDATE "Product"
    SET quantity = quantity - 1
    WHERE id = ${productId} AND quantity > 0
    RETURNING id, quantity
  `;

  if (result.length === 0) {
    throw new ConflictException('Sản phẩm đã hết hàng');
  }

  // Tạo order sau khi đã trừ quantity thành công
  return this.prisma.order.create({
    data: { userId, productId, status: 'PENDING' },
  });
}
```

**Tại sao atomic UPDATE đủ?** PostgreSQL đảm bảo mỗi UPDATE là atomic — 2 UPDATE cùng row sẽ serialize tự động, không cần lock thủ công. Một cái thành công (trả về 1 row), một cái fail (quantity đã = 0, trả về 0 rows).

---

### Giải pháp 2 — SELECT FOR UPDATE (khi cần đọc trước khi quyết định)

Dùng khi logic phức tạp hơn (check nhiều điều kiện, cần đọc giá hiện tại...):

```typescript
async purchaseCoachingSlot(coachId: number, scheduledAt: Date, learnerId: number) {
  return this.prisma.$transaction(async (tx) => {

    // 1. Lock row coach — buộc transaction thứ 2 đợi
    const coach = await tx.$queryRaw<CoachProfile[]>`
      SELECT * FROM "CoachProfile"
      WHERE id = ${coachId}
      FOR UPDATE
    `;

    if (!coach[0].isActive) {
      throw new BadRequestException('Coach không còn nhận lịch');
    }

    // 2. Check conflict — an toàn vì đã lock
    const conflict = await tx.coachingSession.findFirst({
      where: { coachId, scheduledAt, status: { not: 'CANCELED' } },
    });

    if (conflict) {
      throw new ConflictException('Slot này đã được đặt');
    }

    // 3. Tạo session — chỉ 1 transaction làm được đến đây
    return tx.coachingSession.create({
      data: { coachId, learnerId, scheduledAt, status: 'PENDING' },
    });
  });
}
```

**Khi nào dùng SELECT FOR UPDATE?** Khi cần đọc nhiều thứ rồi mới quyết định — như booking slot (check coach active + check conflict + tạo session). Khi chỉ cần trừ số lượng → dùng Atomic UPDATE, đơn giản hơn.

---

### Giải pháp 3 — Optimistic Locking (throughput cao, ít conflict)

Không lock — thêm cột `version`, detect conflict khi UPDATE:

```typescript
// Schema: thêm version field
model Product {
  id       Int @id
  quantity Int
  version  Int @default(0)  // ← tăng mỗi lần update
}
```

```typescript
async purchaseOptimistic(productId: number, userId: number, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    // 1. Đọc hiện tại (không lock)
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.quantity <= 0) {
      throw new ConflictException('Hết hàng');
    }

    // 2. Update kèm version check — fail nếu người khác đã update trước
    const updated = await this.prisma.product.updateMany({
      where: {
        id: productId,
        version: product.version,  // ← điều kiện then chốt
        quantity: { gt: 0 },
      },
      data: {
        quantity: { decrement: 1 },
        version:  { increment: 1 },
      },
    });

    if (updated.count === 1) {
      // Thành công — tạo order
      return this.prisma.order.create({
        data: { userId, productId },
      });
    }

    // Thất bại (người khác vừa update) → retry
    await new Promise(r => setTimeout(r, 10 * (attempt + 1)));
  }

  throw new ConflictException('Không thể đặt hàng — thử lại sau');
}
```

---

### Giải pháp 4 — Redis + Lua Script (flash sale, throughput cực cao)

Khi có **hàng nghìn người** cùng mua 1 lúc (flash sale), PostgreSQL lock sẽ thành bottleneck. Dùng Redis atomic:

```lua
-- script.lua — chạy atomic trong Redis
local key = KEYS[1]           -- "inventory:product:42"
local quantity = redis.call('GET', key)
if not quantity or tonumber(quantity) <= 0 then
  return 0  -- hết hàng
end
redis.call('DECR', key)
return 1    -- thành công
```

```typescript
async purchaseFlashSale(productId: number, userId: number) {
  const key = `inventory:product:${productId}`;

  // Atomic: check + decrement trong 1 operation, không race condition
  const result = await this.redis.eval(luaScript, 1, key) as number;

  if (result === 0) {
    throw new ConflictException('Hết hàng');
  }

  // Publish event → Consumer tạo Order trong DB (async)
  await this.kafka.emit('order.created', {
    value: JSON.stringify({ userId, productId }),
  });

  return { message: 'Đặt hàng thành công — đang xử lý' };
}

// Khi khởi động: sync inventory từ DB vào Redis
async syncInventoryToRedis() {
  const products = await this.prisma.product.findMany();
  for (const p of products) {
    await this.redis.set(`inventory:product:${p.id}`, p.quantity);
  }
}
```

---

### Chọn giải pháp nào?

| Tình huống | Giải pháp | Lý do |
|-----------|-----------|-------|
| E-commerce thông thường | Atomic UPDATE | Đơn giản, đủ dùng |
| Booking + check nhiều điều kiện | SELECT FOR UPDATE | Cần đọc trước khi quyết định |
| Conflict rate thấp, read-heavy | Optimistic Locking | Không block concurrent reads |
| Flash sale 10k+ concurrent | Redis + Lua | PostgreSQL lock là bottleneck |

**Senior answer:** Luôn bắt đầu bằng Atomic UPDATE — đơn giản nhất, đúng nhất. Chỉ leo thang lên Redis khi thực sự có throughput problem đã đo được, không phải vì "có thể sẽ cần".

