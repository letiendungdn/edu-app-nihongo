# Lộ trình lên Senior — dựa trên edu_app

> **Phạm vi:** backend / system design / Everfit Tech Lead (NestJS, Prisma, Stripe, Kafka…).  
> **Không nhầm với:** [learn-mobile-senior.md](./learn-mobile-senior.md) (tier skill mobile) · [notes-senior-study.md](./notes-senior-study.md) Phần 2 (11 tuần thực hành mobile).  
> Status feature mobile/web: [mobile-tech-stacks.md](./mobile-tech-stacks.md), [system-design.md](./system-design.md).

> Dựa trên codebase thực tế + yêu cầu Everfit Tech Lead JD.
> Mỗi câu hỏi có đáp án ngắn gọn để tự kiểm tra.

---

## Mức độ hiện tại

| Kỹ năng | Mức | Bằng chứng trong project |
|---------|-----|--------------------------|
| NestJS architecture | Trung-Khá | api-gateway, content-service, exam-service, shared packages |
| PostgreSQL + Prisma | Khá | 2 DBs, composite indexes, migrations, SM-2 schema |
| gRPC | Trung | content/exam service, contracts package |
| Redis | Cơ bản | cache-manager, sliding window rate limit |
| Docker | Trung | multi-service compose, healthchecks |
| JWT Auth | Khá | refresh token rotation, guards, RBAC |
| Stripe | Đang học | subscription lifecycle, webhooks, Connect |
| Kafka | Đang học | topics, producer/consumer |
| MongoDB | Đang học | audit log với TTL |
| Testing | Yếu — ưu tiên 1 | ít test coverage |
| System Design | Đang hình thành | có architecture diagram |

---

## GIAI ĐOẠN 1 — Nền tảng vững chắc (1–2 tháng)

### 1.1 NestJS Internals

**Cần nắm:**
- Lifecycle: `OnModuleInit` → `OnApplicationBootstrap` → request → `BeforeApplicationShutdown`
- DI container: circular deps, `forwardRef`, `useFactory`, `useExisting`
- Execution order: Middleware → Guard → Interceptor (pre) → Pipe → Handler → Interceptor (post) → Filter
- `APP_INTERCEPTOR` (global, wrap mọi route) vs method-level (`@UseInterceptors`)
- `ExecutionContext`: `switchToHttp()`, `switchToRpc()`, `getHandler()`, `getClass()`

**Tài liệu:**
- **Udemy:** "NestJS: The Complete Developer's Guide" — Stephen Grider (bài bản nhất, cover DI sâu)
- **Udemy:** "NestJS Microservices: Build & Deploy a Scaleable Backend" — Kelvin Mai (gRPC + Kafka)
- **Ebook:** NestJS docs chính thức — đọc hết phần Fundamentals + Techniques

**Q&A:**

---

**Q1: AuditInterceptor dùng `tap()` và `catchError()`. Nếu request ném exception trước `next.handle()`, audit có được ghi không?**

```
A: Không. Exception trước next.handle() (trong guard hoặc pipe) không đi qua
   interceptor's Observable chain. catchError() chỉ catch lỗi từ next.handle() trở đi.

   Fix: dùng try/catch bọc toàn bộ intercept():
   intercept(ctx, next) {
     const start = Date.now();
     try {
       return next.handle().pipe(
         tap(() => this.log({ success: true, ... })),
         catchError(err => {
           this.log({ success: false, errorMessage: err.message, ... });
           return throwError(() => err);
         })
       );
     } catch (syncErr) {
       this.log({ success: false, errorMessage: syncErr.message });
       throw syncErr;
     }
   }
```

---

**Q2: Guard vs Middleware vs Interceptor — khi nào dùng cái nào?**

```
A:
  Middleware: xử lý request/response thuần túy, không biết context NestJS.
              Dùng cho: logging HTTP (morgan/pino-http), cors, rate limit đơn giản.
              Ví dụ edu_app: không có middleware custom (dùng Helmet, cors là Express middleware).

  Guard: quyết định có cho phép request tiếp tục không (true/false/throw).
         Có access đến ExecutionContext (biết handler, class, metadata).
         Dùng cho: authentication, authorization, RBAC.
         Ví dụ: JwtAuthGuard, RolesGuard, SlidingWindowRateLimitGuard.

  Interceptor: bọc cả request lẫn response, có thể transform data cả 2 chiều.
               Dùng cho: logging thực thi, transform response shape, caching, audit.
               Ví dụ: AuditInterceptor, ResponseInterceptor.

  Thứ tự: Middleware → Guard → Interceptor(pre) → Pipe → Handler → Interceptor(post)
```

---

**Q3: `@Public()` decorator hoạt động thế nào với JwtAuthGuard?**

```
A: SetMetadata + Reflector pattern:

   // decorator
   export const Public = () => SetMetadata('isPublic', true);

   // guard
   canActivate(ctx: ExecutionContext) {
     const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
       ctx.getHandler(),  // method-level
       ctx.getClass(),    // class-level
     ]);
     if (isPublic) return true;
     // ... verify JWT
   }

   @Public() đặt metadata 'isPublic' = true lên handler.
   Guard đọc metadata bằng Reflector trước khi verify token.
   getAllAndOverride: method-level override class-level.
```

---

**Q4: Tại sao AuditInterceptor dùng fire-and-forget cho MongoDB?**

```
A: Vì audit log KHÔNG được làm chậm response chính.
   Nếu await auditModel.create() và MongoDB lag 200ms → mọi request chậm 200ms.

   Fire-and-forget:
   this.auditModel.create(params).catch(() => {});
   // không await, lỗi bị swallow

   Rủi ro: nếu MongoDB down → mất audit log trong thời gian down.
   Acceptable vì audit log là "nice to have", không phải "critical path".

   Production-grade hơn: emit event → queue (Redis Stream / Kafka)
   → consumer write MongoDB. Không mất event ngay cả khi MongoDB down ngắn.
```

---

**Q5: Circular dependency giữa AuthService và UserService — fix thế nào?**

```
A: Có 2 cách:

   1. forwardRef (tránh dùng nếu có thể — smell bad design):
      @Inject(forwardRef(() => UserService))
      private userService: UserService

   2. Restructure (đúng hơn): tạo UserRepository hoặc UserModule chung,
      cả 2 service import từ đó thay vì import lẫn nhau.
      AuthService chỉ cần find user by email → tách sang UserService.findByEmail.
      Không cần AuthService biết về UserService.
```

---

### 1.2 PostgreSQL & Query Optimization

**Cần nắm:**
- `EXPLAIN ANALYZE` — đọc Seq Scan vs Index Scan vs Index Only Scan
- Composite index: column order quan trọng, equality trước, range sau
- `SELECT FOR UPDATE` — pessimistic lock, dùng trong transaction
- Connection pool: max connections = (2 × CPU cores) + effective_spindles
- N+1: query 1 → N queries con thay vì 1 JOIN query

**Tài liệu:**
- **Udemy:** "SQL and PostgreSQL: The Complete Developer's Guide" — Stephen Grider (thực chiến nhất)
- **Ebook:** "The Art of PostgreSQL" — Dimitri Fontaine (miễn phí 1 chương, mua PDF)
- **Ebook:** "Use The Index, Luke" — usetheindexluke.com (miễn phí online, cực hay về index)
- **YouTube:** Hussein Nasser — "Database Engineering" playlist (explain analyze, vacuum, MVCC)

**Q&A:**

---

**Q6: 2 users cùng book coach cùng slot — race condition ở đâu và fix thế nào?**

```
A: Race condition:
   User A và B cùng gọi findFirst → cả 2 thấy không có conflict
   → cả 2 tạo session → double booking.

   Fix 1 — Unique constraint (đơn giản nhất):
   @@unique([coachId, scheduledAt])  // trong schema Prisma
   Prisma throw UniqueConstraintError nếu duplicate → catch + trả 409.

   Fix 2 — SELECT FOR UPDATE trong transaction:
   await prisma.$transaction(async (tx) => {
     const locked = await tx.$queryRaw`
       SELECT id FROM "CoachProfile"
       WHERE id = ${coachId}
       FOR UPDATE`;
     const conflict = await tx.coachingSession.findFirst({ where: ... });
     if (conflict) throw new ConflictException();
     await tx.coachingSession.create({ ... });
   });

   Production: dùng cả 2 — unique constraint là safety net,
   SELECT FOR UPDATE để UX tốt hơn (conflict check trước khi write).
```

---

**Q7: Index `(userId, nextReviewAt)` — tại sao composite tốt hơn 2 single indexes?**

```
A: Query: WHERE userId=1 AND nextReviewAt <= now()

   Index đơn (userId): DB tìm tất cả rows của userId=1, rồi filter nextReviewAt (heap scan).
   Index đơn (nextReviewAt): DB tìm rows <= now(), rồi filter userId (có thể nhiều users).

   Composite (userId, nextReviewAt):
   - equality trên userId → thu hẹp xuống chỉ rows của user đó
   - range trên nextReviewAt → trong subset đó tìm tiếp
   - Một lần scan duy nhất, không cần heap access

   Quy tắc: equality columns trước, range column cuối.
   (userId = ?, nextReviewAt <= ?) → (userId, nextReviewAt) đúng thứ tự.
```

---

**Q8: Giải thích N+1 với ví dụ lessons + vocabularies trong content-service.**

```
A: N+1 problem:
   // BAD: 1 query lấy lessons, rồi N queries lấy vocab của mỗi lesson
   const lessons = await prisma.lesson.findMany();  // query 1
   for (const lesson of lessons) {
     lesson.vocab = await prisma.vocabulary.findMany({ where: { lessonId: lesson.id } });
     // query 2, 3, 4... N+1 queries tổng
   }

   // GOOD: 1 query với JOIN
   const lessons = await prisma.lesson.findMany({
     include: { vocabularies: { orderBy: { sortOrder: 'asc' } } }
   });
   // Prisma tạo: SELECT * FROM Lesson LEFT JOIN Vocabulary ON ...
   // hoặc 2 queries (lessons + vocabs IN (...)) — vẫn tốt hơn N+1

   Nhận biết N+1: xem query logs, thấy pattern:
   SELECT * FROM Lesson
   SELECT * FROM Vocabulary WHERE lessonId = 1
   SELECT * FROM Vocabulary WHERE lessonId = 2
   ... (N lần)
```

---

**Q9: Prisma `$transaction` — khi nào bắt buộc phải dùng?**

```
A: Dùng $transaction khi:
   1. Nhiều writes phải thành công cùng nhau hoặc rollback hết.
      Ví dụ: bookSession tạo CoachingSession + Payment cùng lúc.
      Nếu Payment tạo fail → CoachingSession orphaned (không có payment).

   2. Read-then-write cần consistency:
      Đọc slot availability → tạo session (cần atomic để tránh race condition).

   Không cần $transaction:
   - Single write operation
   - Multiple independent reads

   Interactive transaction (Prisma):
   await prisma.$transaction(async (tx) => {
     const session = await tx.coachingSession.create({ ... });
     await tx.payment.create({ ... sessionId: session.id });
   });
   // Nếu bất kỳ line nào throw → tất cả rollback
```

---

**Q10: Connection pool size bao nhiêu là hợp lý?**

```
A: Formula: (CPU cores × 2) + số disk spindles (thường = 1 cho SSD)
   Server 4 cores SSD: pool = (4 × 2) + 1 = 9 ≈ 10

   Prisma default: 5 connections (quá thấp cho production).
   Cấu hình: DATABASE_URL=...?connection_limit=20&pool_timeout=30

   Nhưng quan trọng hơn: PostgreSQL max_connections (default 100).
   Nếu 5 services × 20 connections = 100 → hết.
   Production: dùng PgBouncer (connection pooler) ở giữa.
   Services → PgBouncer (transaction mode, 1000 connections) → PostgreSQL (100 connections).
```

---

### 1.3 Testing

**Cần nắm:**
- Test pyramid: Unit (70%) → Integration (20%) → E2E (10%)
- AAA: Arrange (setup) → Act (execute) → Assert (verify)
- Mock: thay thế dependency bằng fake; Spy: wrap real object, track calls
- Branch coverage: mỗi if/else branch đều được test
- Test isolation: không share state giữa tests, reset mocks trong `beforeEach`

**Tài liệu:**
- **Ebook:** "Unit Testing Principles, Practices, and Patterns" — Vladimir Khorikov (best book về testing)
- **Udemy:** "JavaScript Unit Testing - The Practical Guide" — Maximilian Schwarzmüller
- **Ebook:** "Testing Node.js Applications" — nhà xuất bản Manning
- **Udemy:** "NestJS: The Complete Developer's Guide" — Stephen Grider (có chapter về testing)

**Q&A:**

---

**Q11: Viết test cho SM-2 edge case `easeFactor = max(1.3, ...)`**

```typescript
// A: Test phải verify easeFactor không bao giờ xuống dưới 1.3
describe('SM2Service.reviewCard', () => {
  it('never lets easeFactor drop below 1.3', async () => {
    // Arrange: card với easeFactor gần 1.3
    const card = { easeFactor: 1.35, interval: 6, repetitions: 2 };
    prismaMock.srsCard.findUnique.mockResolvedValue(card);

    // Act: quality=0 (worst answer — easeFactor giảm mạnh)
    await service.reviewCard({ cardId: 1, quality: 0 });

    // Assert
    const updated = prismaMock.srsCard.update.mock.calls[0][0].data;
    expect(updated.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('resets interval and repetitions on quality < 3', async () => {
    const card = { easeFactor: 2.5, interval: 21, repetitions: 5 };
    prismaMock.srsCard.findUnique.mockResolvedValue(card);

    await service.reviewCard({ cardId: 1, quality: 2 });

    const updated = prismaMock.srsCard.update.mock.calls[0][0].data;
    expect(updated.interval).toBe(0);
    expect(updated.repetitions).toBe(0);
    expect(updated.mastered).toBe(false);  // reset mastered
  });
});
```

---

**Q12: Test idempotency của WebhookService**

```typescript
// A:
describe('WebhookService.handleStripeEvent', () => {
  it('skips processing when event already PROCESSED', async () => {
    // Arrange: event đã được xử lý
    prismaMock.webhookEvent.findUnique.mockResolvedValue({
      id: 1,
      eventId: 'evt_123',
      status: 'PROCESSED',
    });

    const processEventSpy = jest.spyOn(service as any, 'processEvent');

    // Act
    await service.handleStripeEvent(rawBody, validSignature);

    // Assert: processEvent không được gọi
    expect(processEventSpy).not.toHaveBeenCalled();
  });

  it('processes and marks PROCESSED on first call', async () => {
    prismaMock.webhookEvent.findUnique.mockResolvedValue(null);
    // ... setup mocks

    await service.handleStripeEvent(rawBody, validSignature);

    expect(prismaMock.webhookEvent.update).toHaveBeenCalledWith({
      where: { id: expect.any(Number) },
      data:  { status: 'PROCESSED', processedAt: expect.any(Date) },
    });
  });
});
```

---

**Q13: Tại sao 100% line coverage không đảm bảo không có bug?**

```
A: Line coverage chỉ đảm bảo dòng code đó được chạy, không đảm bảo đúng.

   Ví dụ:
   function divide(a, b) { return a / b; }  // 100% line coverage nếu test với divide(4, 2)
   Nhưng divide(4, 0) → Infinity — bug không được test.

   Trong edu_app:
   bookSession() test với coach.isActive=true → line coverage 100%
   Nhưng không test coach.isActive=false → BadRequestException không được verify.

   Branch coverage tốt hơn: phải test cả 2 nhánh of/else.
   Mutation testing (Stryker) tốt nhất: thay đổi code → test phải fail.
   Nếu test vẫn pass sau khi đổi >= thành > → test không đủ mạnh.
```

---

## GIAI ĐOẠN 2 — Distributed Systems (2–3 tháng)

### 2.1 Kafka & Event-Driven

**Cần nắm:**
- Partition: tất cả messages cùng key → cùng partition → ordered
- Consumer group: mỗi partition chỉ được 1 consumer trong group đọc
- Offset: position trong partition, commit sau khi process xong
- At-least-once: commit sau process → có thể duplicate nếu crash sau process trước commit
- Exactly-once: idempotent producer + transaction → phức tạp hơn
- Outbox pattern: write event vào DB cùng transaction, poller gửi Kafka
- DLQ: sau N lần retry fail → gửi sang dead-letter topic để investigate

**Tài liệu:**
- **Udemy:** "Apache Kafka Series - Learn Apache Kafka for Beginners v3" — Stephane Maarek (best Kafka course)
- **Udemy:** "Kafka Streams for Data Processing" — Stephane Maarek (nâng cao)
- **Ebook:** "Kafka: The Definitive Guide, 2nd Edition" — O'Reilly (miễn phí download trên Confluent)
- **Udemy:** "NestJS Microservices: Build & Deploy a Scaleable Backend" — Kelvin Mai (Kafka trong NestJS)

**Q&A:**

---

**Q14: WebhookService emit Kafka sau khi update DB. Nếu Kafka down thì sao?**

```
A: Vấn đề hiện tại:
   1. UPDATE Payment SET status=SUCCEEDED (DB OK)
   2. kafkaProducer.emit(edu.payment.succeeded) ← Kafka down → throw
   3. Payment SUCCEEDED nhưng payout không bao giờ được tính toán

   Fix: Outbox Pattern
   // Trong transaction: lưu event vào DB thay vì gửi Kafka trực tiếp
   await prisma.$transaction(async (tx) => {
     await tx.payment.update({ ... status: 'SUCCEEDED' });
     await tx.outboxEvent.create({      // bảng mới
       data: {
         topic:   'edu.payment.succeeded',
         payload: JSON.stringify({ paymentId, userId, ... }),
         status:  'PENDING',
       }
     });
   });

   // Poller chạy mỗi 5 giây:
   const pending = await prisma.outboxEvent.findMany({ where: { status: 'PENDING' } });
   for (const event of pending) {
     await kafka.emit(event.topic, event.payload);
     await prisma.outboxEvent.update({ where: { id: event.id }, data: { status: 'SENT' } });
   }

   Đảm bảo: event không bao giờ mất (lưu trong DB), Kafka chỉ là transport.
```

---

**Q15: Consumer group có 3 instances, topic có 5 partitions → phân phối thế nào?**

```
A: Kafka gán: tối đa 1 consumer per partition.
   5 partitions / 3 consumers:
   - Consumer 1: partition 0, 1
   - Consumer 2: partition 2, 3
   - Consumer 3: partition 4

   Nếu có 6 consumers: 1 consumer nhàn rỗi (không có partition để đọc).
   Nếu consumer 1 crash: Kafka rebalance → consumer 2 hoặc 3 nhận thêm partition.

   Với edu_app (exam scoring):
   Partition key = userId → cùng user's events luôn vào 1 partition → đúng thứ tự.
   Nếu partition key = random → events của cùng user có thể đến consumer khác nhau → sai thứ tự.
```

---

**Q16: At-least-once vs Exactly-once — payment events cần loại nào?**

```
A:
  At-least-once: sau crash, consumer reprocess message → duplicate possible.
  Exactly-once:  idempotent producer + Kafka transactions → không duplicate, phức tạp hơn.

  Với payment events: Exactly-once KHÔNG đủ quan trọng nếu consumer idempotent.
  Đơn giản hơn: dùng At-least-once + make consumer idempotent:

  // Consumer xử lý edu.payment.succeeded:
  async handlePaymentSucceeded(event: PaymentSucceededEvent) {
    const payout = await prisma.payout.findFirst({
      where: { paymentId: event.paymentId }  // check đã tạo chưa
    });
    if (payout) return;  // đã xử lý rồi → skip (idempotent)
    await prisma.payout.create({ ... });
  }

  Đây là approach thực tế nhất trong industry.
  Exactly-once trong Kafka chỉ cần khi consumer KHÔNG idempotent được.
```

---

### 2.2 Redis Nâng cao

**Cần nắm:**
- Sorted Set: ZADD key score member, ZRANGEBYSCORE, ZREMRANGEBYSCORE
- Cache stampede: nhiều requests cùng miss cache, cùng query DB
- Lua scripts: atomic multi-command (không bị interrupt)
- Redis Cluster: sharding qua 16384 hash slots, min 3 masters + 3 replicas
- Eviction: `allkeys-lru` (production recommendation)

**Tài liệu:**
- **Udemy:** "Redis: The Complete Developer's Guide" — Stephen Grider (cực kỳ thực chiến)
- **Ebook:** "Redis in Action" — Josiah Carlson (miễn phí online)
- **Docs:** redis.io/docs — đọc hết phần Data Types và Commands

**Q&A:**

---

**Q17: Tại sao rate limiter dùng Sorted Set thay vì INCR + EXPIRE?**

```
A:
  Fixed window (INCR + EXPIRE):
  Window: 0-60s, limit 5 requests.
  User gửi 5 requests lúc 0:59 (đầy window 1).
  Window reset lúc 1:00 → user gửi thêm 5 requests lúc 1:01.
  Trong 2 giây (0:59 - 1:01): 10 requests qua được → bypass limit.

  Sliding window (Sorted Set):
  Mỗi request là 1 entry với score = timestamp.
  Kiểm tra: đếm entries trong [now-60000, now].
  Không có boundary problem — window luôn là 60s tính từ now.

  Code trong edu_app SlidingWindowRateLimitGuard:
  pipe.zremrangebyscore(key, 0, now - windowMs);  // xóa entries cũ
  pipe.zcard(key);                                  // đếm trong window
  if count >= limit → 429
```

---

**Q18: Cache stampede — 1000 users cùng miss cache vocabByLesson(1)**

```
A: Vấn đề: 1000 requests → 1000 DB queries cùng lúc → DB overload.

  Fix 1 — Mutex (đơn giản):
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const lock = await redis.set(`lock:${key}`, '1', 'NX', 'PX', 5000);
  if (!lock) {
    await sleep(100);
    return redis.get(key);  // retry sau 100ms — lock held bởi người khác
  }
  const data = await db.query(...);
  await redis.set(key, JSON.stringify(data), 'EX', 300);
  await redis.del(`lock:${key}`);
  return data;

  Fix 2 — Probabilistic Early Expiration:
  Trước khi cache expire, một số requests xác suất nhỏ tự refresh sớm.
  Không cần lock, phức tạp hơn để implement đúng.

  Production: Cache warming — pre-populate cache sau deploy.
  Lesson vocab ít thay đổi → cache 1 giờ, warm up khi start.
```

---

**Q19: Admin approve coach mới nhưng search cache vẫn trả cũ 1 phút — acceptable không?**

```
A: Depends on business requirement.

  Acceptable nếu:
  - 1 phút delay không ảnh hưởng user experience
  - Coach mới không cần visible ngay lập tức
  - Traffic cao, cache miss cost cao

  Không acceptable nếu:
  - Admin approve rồi test ngay → thấy coach không xuất hiện → confusing
  - Real-time requirement (e.g. featured coaches phải visible ngay)

  Fix nếu cần invalidation ngay:
  // Khi admin approve coach:
  await prisma.coachProfile.update({ where: { id }, data: { isActive: true } });
  await redis.del('search:coaches:*');  // xóa tất cả search cache
  // hoặc dùng cache tag: tag tất cả search cache với "coaches"
  // khi update bất kỳ coach → invalidate tag

  edu_app hiện tại: TTL 1 phút là acceptable, không cần fix gấp.
```

---

### 2.3 API Design

**Cần nắm:**
- Idempotency key: header `Idempotency-Key: {uuid}` cho POST payment
- Cursor pagination: `WHERE id > lastCursor LIMIT 20` (stable, O(1) offset)
- HTTP semantics: 200 OK vs 201 Created vs 202 Accepted vs 204 No Content
- Problem Details RFC 7807: `{ type, title, status, detail, instance }`

**Tài liệu:**
- **Ebook:** "RESTful Web APIs" — Leonard Richardson (O'Reilly)
- **Ebook:** "API Design Patterns" — JJ Geewax (Manning, thực chiến nhất)
- **Udemy:** "REST API Design, Development & Management" — Rajeev Sakhuja
- **Docs:** stripe.com/docs/api — đọc cách Stripe design API (best in industry)

**Q&A:**

---

**Q20: `POST /api/marketplace/sessions` — làm sao tránh double booking khi client retry?**

```
A: Client gửi POST, timeout, không biết server đã xử lý chưa → retry → double booking.

  Fix: Idempotency Key
  // Client gửi:
  POST /api/marketplace/sessions
  Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000  ← UUID do client tạo

  // Server:
  @Post()
  async bookSession(@Headers('idempotency-key') idempKey: string, @Body() dto) {
    if (idempKey) {
      const cached = await redis.get(`idem:${idempKey}`);
      if (cached) return JSON.parse(cached);  // trả response cũ
    }

    const result = await bookingService.bookSession(...);

    if (idempKey) {
      await redis.set(`idem:${idempKey}`, JSON.stringify(result), 'EX', 86400); // 24h
    }
    return result;
  }

  Đây chính xác là cách Stripe implement Idempotency-Key.
```

---

**Q21: Offset pagination vs Cursor — với 10K coaches tại sao cursor tốt hơn?**

```
A:
  Offset: SELECT * FROM coaches LIMIT 20 OFFSET 2000
  PostgreSQL phải scan và bỏ qua 2000 rows đầu → chậm hơn khi offset tăng.
  OFFSET 50000 → scan 50020 rows → O(n).

  Nếu coach mới được thêm vào trong khi user đang page → dữ liệu bị shift.

  Cursor: SELECT * FROM coaches WHERE id > 1234 ORDER BY id LIMIT 20
  → Dùng index trên id → O(log n) bất kể trang bao nhiêu.
  → Stable: thêm coach mới không ảnh hưởng trang hiện tại.

  Response:
  {
    data: [...],
    nextCursor: "1254",   // id của item cuối
    hasMore: true
  }

  Client next request: GET /api/marketplace/coaches?cursor=1254&limit=20
```

---

## GIAI ĐOẠN 3 — Payment & Marketplace (2 tháng)

### 3.1 Stripe Production

**Cần nắm:**
- PaymentIntent state machine: requires_payment_method → requires_action → processing → succeeded
- Webhook retry: Stripe retry 3 ngày với exponential backoff nếu endpoint không return 200
- Connect: Express (Stripe handle onboarding) vs Standard (full control) vs Custom (build everything)
- SCA: 3D Secure — redirect-based flow, không transparent nữa
- Reconciliation: Stripe Balance Transactions vs internal Payment records

**Tài liệu:**
- **Docs:** stripe.com/docs — đọc hết phần: Payments, Webhooks, Connect, Testing
- **Udemy:** "Stripe Masterclass with React & Node.js" — Goran Lochert
- **Ebook:** stripe.com/docs/payments/checkout (Stripe Checkout vs Payment Elements)
- **YouTube:** Stripe YouTube channel — có video thực hành từng use case

**Q&A:**

---

**Q22: Stripe gọi webhook, handler xử lý 45s → Stripe timeout (30s limit) → làm gì?**

```
A: Stripe chờ max 30s. Nếu timeout → Stripe coi là fail → retry.
   Nếu handler thực sự chạy xong sau 45s → event được process nhưng bị retry → duplicate.

   Fix: Acknowledge ngay, process async

   // webhook handler:
   @Post('stripe')
   async handleStripe(@Headers('stripe-signature') sig, @Req() req) {
     const event = this.stripe.constructWebhookEvent(req.rawBody, sig, secret);

     // 1. Lưu event vào DB (< 50ms)
     await this.prisma.webhookEvent.upsert({
       where: { eventId: event.id },
       create: { ...event, status: 'RECEIVED' },
       update: { retryCount: { increment: 1 } }
     });

     // 2. Emit sang Kafka để xử lý async (< 10ms)
     this.kafkaProducer.emit('stripe.webhook.received', event);

     // 3. Return 200 NGAY (total < 100ms)
     return { received: true };
   }

   // Kafka consumer xử lý slow logic:
   @EventPattern('stripe.webhook.received')
   async processStripeEvent(event: Stripe.Event) {
     // slow DB queries, external API calls... không còn timeout nữa
   }
```

---

**Q23: Làm sao reverse Transfer sai cho coach?**

```
A: Stripe Transfer không "refund" được trực tiếp.
   Dùng Transfer Reversal:

   await stripe.transfers.createReversal(transferId, {
     amount: wrongAmountCents,  // partial hoặc toàn bộ
     metadata: { reason: 'wrong_account', correctedBy: 'admin' }
   });

   Sau khi reverse, tạo Transfer mới đến account đúng.

   Quan trọng: log toàn bộ vào Payout table với status REVERSED + failReason.
   Và tạo audit log trong MongoDB để có trail.
```

---

**Q24: Làm sao reconciliation khi cuối tháng DB khác Stripe?**

```
A: Quy trình reconciliation:

   1. Lấy tất cả charges từ Stripe trong tháng:
      const charges = await stripe.charges.list({ created: { gte: startTs, lte: endTs } });

   2. Lấy tất cả Payments SUCCEEDED trong DB cùng period.

   3. So sánh 2 lists:
      - Có trong Stripe nhưng không có trong DB → missing payment record → tạo bù
      - Có trong DB nhưng không có Stripe → orphaned record → investigate
      - Amount mismatch → bug trong payment creation

   4. Tạo reconciliation report:
      {
        period: { start, end },
        stripeTotal: 5000000,  // cents
        dbTotal: 4999500,      // cents
        discrepancy: 500,      // $5 difference
        missingInDb: [...],
        orphanedInDb: [...],
      }

   PayoutService.getReconciliationReport() trong edu_app đã có skeleton.
   Cần thêm Stripe API call để so sánh.
```

---

### 3.2 Marketplace Design

**Cần nắm:**
- Timezone: luôn lưu UTC, convert khi display
- Availability: weekly schedule → generate actual time slots → subtract booked
- Search ranking: score = (avgRating × weight1) + (totalSessions × weight2) + (featured ? bonus : 0)
- Cold start: chicken-and-egg — không có coach → không có learner; không có learner → coach không join

**Tài liệu:**
- **Ebook:** "The Platform Delusion" — Jonathan A. Knee (business side)
- **Ebook:** "Building Microservices" — Sam Newman (O'Reilly) — Chapter về API Gateway
- **Udemy:** "Microservices with NodeJS and React" — Stephen Grider (có marketplace patterns)
- **Blog:** engineering.grab.com, engineering.airbnb.com — đọc bài về booking, availability

**Q&A:**

---

**Q25: CoachAvailability lưu dayOfWeek + startHour. Vấn đề timezone?**

```
A: Vấn đề:
   Coach Việt Nam (UTC+7) set available Mon 9:00-17:00.
   Learner Mỹ (UTC-5) xem → thấy Mon 9:00 → thực ra là Mon 2:00 sáng theo giờ của họ.

   Fix đúng:
   1. Lưu availability trong UTC: startHour = 2 (= 9AM Vietnam = 2AM UTC)
   2. Khi generate slots: tạo DateTime objects trong UTC.
   3. Frontend: nhận UTC timestamps, hiển thị theo timezone local của user.

   Hoặc đơn giản hơn:
   - CoachProfile.timezone = "Asia/Ho_Chi_Minh"
   - Khi generate slots:
     const slot = DateTime.fromObject({ hour: 9 }, { zone: coach.timezone });
     const utcSlot = slot.toUTC().toISO();  // gửi về client

   CoachingSession.scheduledAt luôn lưu UTC → convert khi display.
```

---

**Q26: avgRating race condition — 1000 reviews cùng lúc → wrong average**

```
A: Race condition:
   Review 1: read avgRating=4.0, reviewCount=100 → new avg = (4.0*100 + 5) / 101 = 4.0099
   Review 2: đồng thời read avgRating=4.0, reviewCount=100 → new avg = (4.0*100 + 3) / 101 = 3.98
   Review 1 writes 4.0099, Review 2 writes 3.98 → sai (mất 1 review trong tính toán).

   Fix: Atomic SQL UPDATE (không read-modify-write ở application level):
   await prisma.$executeRaw`
     UPDATE "CoachProfile"
     SET
       "reviewCount" = "reviewCount" + 1,
       "avgRating"   = ("avgRating" * "reviewCount" + ${newRating}) / ("reviewCount" + 1)
     WHERE id = ${coachId}
   `;

   Đây là single atomic DB operation — không có race condition.
   PostgreSQL đảm bảo atomic update.
```

---

## GIAI ĐOẠN 4 — System Design Level Senior (2–3 tháng)

### 4.1 Design Patterns

**Cần nắm:**
- Outbox pattern, Circuit Breaker, Saga, CQRS
- Domain-Driven Design basics: Aggregate, Entity, Value Object, Bounded Context

**Tài liệu:**
- **Ebook:** "Designing Data-Intensive Applications" — Martin Kleppmann (cuốn sách quan trọng nhất về distributed systems, bắt buộc đọc)
- **Ebook:** "Clean Architecture" — Robert C. Martin
- **Udemy:** "Software Architecture & Design of Modern Large Scale Systems" — Michael Pogrebinsky
- **Udemy:** "Microservices Software Architecture: Patterns and Techniques" — Michael Pogrebinsky
- **Ebook:** "Enterprise Integration Patterns" — Gregor Hohpe (miễn phí patterns tại enterpriseintegrationpatterns.com)

**Q&A:**

---

**Q27: Stripe Circuit Breaker — implement thế nào?**

```
A: Circuit Breaker 3 states:
   CLOSED (bình thường): requests qua Stripe bình thường.
   OPEN (lỗi nhiều): requests bị reject ngay, không gọi Stripe.
   HALF-OPEN (test): 1 request thử → nếu OK → về CLOSED; nếu fail → về OPEN.

   Dùng thư viện: npm install opossum (Node.js circuit breaker)

   const CircuitBreaker = require('opossum');

   const breaker = new CircuitBreaker(stripe.createPaymentIntent.bind(stripe), {
     timeout:           3000,   // 3s timeout per call
     errorThresholdPercentage: 50,  // 50% errors → OPEN
     resetTimeout:      30000,  // 30s sau → thử HALF-OPEN
   });

   breaker.fallback(() => {
     throw new ServiceUnavailableException('Payment service temporarily unavailable');
   });

   // Sử dụng:
   const intent = await breaker.fire(params);

   Metrics: breaker.stats → track success/failure rates.
```

---

**Q28: Saga pattern cho booking flow**

```
A: Booking cần phối hợp 2 services (DB + Stripe). Nếu Stripe fail sau DB write → inconsistent.

  Choreography Saga (event-based):
  1. BookingService: CREATE CoachingSession (PENDING) + emit "session.created"
  2. PaymentService: nghe "session.created" → createPaymentIntent
     - Success: emit "payment.intent.created"
     - Fail: emit "session.cancel" (compensating transaction)
  3. BookingService: nghe "payment.intent.created" → session vẫn PENDING (chờ user confirm)
  4. Stripe webhook: payment_intent.succeeded → emit "payment.succeeded"
  5. BookingService: nghe "payment.succeeded" → UPDATE session CONFIRMED

  Compensating transactions:
  - "session.cancel" → DELETE CoachingSession, hoàn tiền nếu có

  Code hiện tại edu_app làm tất cả trong 1 service (tốt hơn cho quy mô hiện tại).
  Saga cần khi split sang separate microservices.
```

---

### 4.2 System Design Practice

**Framework RESHADED cho interview:**
1. Requirements (5 phút): functional + non-functional (QPS, latency, consistency)
2. Estimation (5 phút): users, storage, bandwidth
3. Storage: DB choice + sơ đồ
4. High-level: diagram các components
5. API: 3-5 key endpoints
6. Detailed design: deep dive bottleneck
7. Edge cases: failure scenarios

**Tài liệu:**
- **Ebook:** "System Design Interview" — Alex Xu (Volume 1 + 2, bắt buộc cho interview)
- **Ebook:** "System Design Interview Insider Guide" — ByteByteGo
- **Udemy:** "Rocking System Design" — Rajat Mehta
- **Website:** bytebytego.com — newsletter + videos (Alex Xu) rất chất lượng
- **YouTube:** "System Design Interview" — Gaurav Sen channel

**Q&A:**

---

**Q29: Scale edu_app lên 1M users — identify bottlenecks**

```
A: Estimation:
   1M users, 10% DAU = 100K daily active.
   SRS review: 100K × 50 cards/day = 5M reviews/day = ~58 QPS average, 580 QPS peak.
   Read (vocab/lesson): 100K × 20 reads/day = 2M reads/day = ~23 QPS average, 230 QPS peak.

Bottlenecks theo thứ tự:

1. PostgreSQL write (reviews): 58 QPS write → OK với single instance.
   580 QPS peak: cần monitor query time, có thể cần read replica.

2. api-gateway single instance: 580 QPS → OK với NestJS.
   Nếu slow: horizontal scaling + load balancer (Nginx upstream).

3. Redis cache: 230 QPS read → Redis handle >100K QPS, không phải bottleneck.

4. gRPC content-service: 230 QPS → OK.

5. PostgreSQL connections: 5 services × 20 connections = 100.
   Với 3 api-gateway instances: 300 connections → cần PgBouncer.

Scaling plan:
- Phase 1 (100K users): current setup OK, thêm read replica.
- Phase 2 (500K users): PgBouncer, 3× api-gateway horizontal, Redis Cluster.
- Phase 3 (1M users): sharding hoặc separate DB per region.
```

---

**Q30: Thiết kế Notification System cho sessions**

```
A: Requirements:
   - 1 giờ trước session: nhắc learner + coach
   - Session completed: gửi review request tới learner
   - Coach cancel: thông báo ngay cho learner

Design:

1. Scheduled Jobs:
   Cron chạy mỗi 5 phút:
   SELECT * FROM CoachingSession
   WHERE status = 'CONFIRMED'
   AND scheduledAt BETWEEN NOW() AND NOW() + 65 MINUTES
   AND reminderSentAt IS NULL;
   → Emit "session.reminder" events → Kafka
   → UPDATE SET reminderSentAt = NOW()

2. Notification Service (Kafka consumer):
   Nghe events → gửi push notification / email / SMS.
   Strategy pattern: EmailStrategy, PushNotificationStrategy, SMSStrategy.

3. Event triggers (real-time):
   session.canceled → emit immediately → consumer gửi ngay
   session.completed → emit → consumer gửi review request

4. Notification storage:
   Table Notification { userId, type, title, body, readAt, createdAt }
   → In-app notification center

Scale:
   100K sessions/day × 2 reminders = 200K notifications/day = ~2.3/second → nhẹ.
   Push notification provider: Firebase Cloud Messaging (FCM) — free, scale tốt.
```

---

**Q31: api-gateway là single point of failure — fix thế nào?**

```
A: Horizontal scaling:

1. Multiple instances:
   docker-compose:
   deploy:
     replicas: 3

   K8s:
   spec:
     replicas: 3

2. Load balancer (Nginx upstream):
   upstream api_gateway {
     server api-gateway-1:3000;
     server api-gateway-2:3000;
     server api-gateway-3:3000;
     keepalive 64;
   }

3. Stateless (quan trọng nhất):
   Không lưu state trong memory của api-gateway.
   JWT: stateless (verify bằng secret, không cần DB).
   Rate limit: Redis (shared giữa instances — đã implement đúng).
   Session: không có (dùng JWT).

4. Health check:
   GET /api/health → { status: 'ok', timestamp, version }
   Nginx: health_check interval=5s;

5. Graceful shutdown:
   SIGTERM → không nhận request mới → chờ active requests xong → exit.
   K8s: terminationGracePeriodSeconds: 30
```

---

## GIAI ĐOẠN 5 — Leadership (ongoing)

**Tài liệu:**
- **Ebook:** "Staff Engineer: Leadership Beyond the Management Track" — Will Larson
- **Ebook:** "The Manager's Path" — Camille Fournier (hiểu engineer → team lead → manager path)
- **Ebook:** "An Elegant Puzzle: Systems of Engineering Management" — Will Larson
- **Ebook:** "A Philosophy of Software Design" — John Ousterhout (code quality mindset)
- **Udemy:** "Software Architecture: The Hard Parts" — Neal Ford (distributed systems trade-offs)

**Q&A:**

---

**Q32: Review BookingService.bookSession() — tìm issues**

```typescript
// Code hiện tại (simplified):
async bookSession({ learnerId, coachId, scheduledAt, topic }) {
  const coach = await prisma.coachProfile.findUniqueOrThrow({ where: { id: coachId } });
  if (!coach.isActive) throw new BadRequestException('Coach not available');

  const conflict = await prisma.coachingSession.findFirst({
    where: { coachId, scheduledAt, status: { notIn: ['CANCELED'] } }
  });
  if (conflict) throw new ConflictException('Slot taken');

  const session = await prisma.$transaction(async (tx) => {
    const s = await tx.coachingSession.create({ ... });
    await tx.payment.create({ ... });
    return s;
  });

  const intent = await this.stripe.createPaymentIntent({ ... });
  await prisma.payment.update({ where: { sessionId: session.id }, data: { stripePaymentIntentId: intent.id } });

  return { session, clientSecret: intent.client_secret };
}

/*
ISSUES:

1. RACE CONDITION (critical):
   findFirst để check conflict không atomic với transaction tạo session.
   Fix: @@unique([coachId, scheduledAt]) trong schema + catch UniqueConstraintViolation.

2. NO RETRY KHI STRIPE FAIL (critical):
   Nếu stripe.createPaymentIntent() throw → session đã tạo trong DB nhưng không có paymentIntent.
   Session bị orphaned với Payment status PENDING mãi.
   Fix: Wrap Stripe call trong try/catch → cancel session nếu Stripe fail.
   Hoặc: không tạo session trước, tạo PaymentIntent trước, rồi mới tạo session.

3. PAYMENT UPDATE NGOÀI TRANSACTION:
   $transaction tạo session + payment, nhưng UPDATE stripePaymentIntentId nằm ngoài.
   Nếu crash giữa chừng → Payment không có stripePaymentIntentId.
   Fix: Đưa payment update vào trong $transaction hoặc dùng Outbox.

4. KHÔNG VALIDATE scheduledAt:
   scheduledAt có thể là quá khứ, không kiểm tra coach có available vào slot đó.
   Fix: validate scheduledAt >= now() + buffer (e.g. 2h), check CoachAvailability.
*/
```

---

**Q33: PM muốn "coach livestream" trong 2 tuần — estimate thế nào?**

```
A: Estimate bằng cách break down thành tasks (ví dụ phỏng vấn).

  Thực tế trong edu_app (đã có MVP):
  - LiveKit SFU container + LIVEKIT_* env
  - Gateway /api/live/* (token / session)
  - UI web + mobile join room
  → Đừng nói "không có trong codebase" nếu interview về project này.

  Estimate khi PHẢI build từ zero (hoặc mở rộng MVP):

  Backend (mới / mở rộng):
  - Session model + API create/join/end = 1–2 ngày (đã có thì giảm)
  - LiveKit (hoặc Agora) integrate + auth token = 2–4 ngày
  - Recording + S3 = 1–2 ngày
  - Per-minute billing / webhook = 2 ngày
  Total backend mở rộng: ~3–10 ngày tùy baseline

  Frontend:
  - Video UI + SDK = 2–4 ngày
  - Chat trong stream = 1 ngày
  Total frontend: ~3–5 ngày

  QA + DevOps: 2–3 ngày | Buffer 20%

  Communication với PM:
  "MVP livestream (LiveKit join room) đã có trong repo — ship coach UX trên nền đó
   có thể ~1–2 tuần. Full (recording, replay, per-minute billing, scale)
   thêm 3–4 tuần. Scope lại theo trade-off nào bạn ưu tiên?"
```

---

## 20 câu hỏi cuối — tự test trước phỏng vấn Everfit

### Backend

**Q34: Flow đầy đủ `POST /api/marketplace/sessions` từ browser đến DB:**
```
A: Browser → Nginx → api-gateway
   → JwtAuthGuard (verify Bearer token → extract userId)
   → AuditInterceptor (start timer)
   → BookingController.bookSession()
   → BookingService.bookSession():
       check coach.isActive
       check conflict (findFirst)
       $transaction: CREATE CoachingSession + CREATE Payment
       Stripe.createPaymentIntent()
       UPDATE Payment SET stripePaymentIntentId
   → Return { session, clientSecret }
   → AuditInterceptor (log to MongoDB: userId, action, durationMs)
   → Response JSON
```

**Q35: Tại sao dùng gRPC giữa api-gateway và content/exam service?**
```
A: Lợi ích:
   - Type-safe: proto file define contract, compile-time check
   - Binary encoding (protobuf) nhanh hơn JSON 3-10x, nhỏ hơn 5-7x
   - Bidirectional streaming: nếu cần push kết quả exam real-time
   - Code gen: NestJS tự generate types từ proto

   Khi nào KHÔNG dùng gRPC:
   - Browser clients: không support gRPC trực tiếp (cần grpc-web proxy)
   - Đội nhỏ không quen: overhead learning, setup phức tạp hơn REST
   - Public API: REST dễ document, test bằng Postman hơn

   edu_app đúng: gRPC cho internal services, REST cho client-facing.
```

**Q36: SM-2 — sau 10 lần review quality=5, interval bao nhiêu?**
```
A: Bắt đầu: easeFactor=2.5, interval=0, rep=0

   Rep 1 (quality=5): interval=1, easeFactor = 2.5 + 0.1*(5-5) = 2.5, rep=1
   Rep 2 (quality=5): interval=6, easeFactor=2.5, rep=2
   Rep 3: interval = round(6 × 2.5) = 15
   Rep 4: interval = round(15 × 2.5) = 38
   Rep 5: interval = round(38 × 2.5) = 95
   Rep 6: interval = round(95 × 2.5) = 238
   ...

   Sau 10 lần → interval hàng nghìn ngày (hơn 5 năm!).
   mastered = true sau khi interval >= 21 (bắt đầu từ rep 4).
```

### Database

**Q37: Tại sao `Payment.sessionId` cần `@unique`?**
```
A: Đảm bảo 1 CoachingSession chỉ có tối đa 1 Payment.
   Nếu không unique: bug tạo 2 Payment cho cùng session → learner bị charge 2 lần.
   Unique constraint = database-level guarantee, không thể bypass qua code.
   
   Relation: CoachingSession ──1 Payment (one-to-one, không phải one-to-many).
```

**Q38: Index `(provider, status, createdAt)` — query retry FAILED events trong 24h có dùng không?**
```
A: Query: WHERE provider='stripe' AND status='FAILED' AND createdAt > NOW()-24h

   Index (provider, status, createdAt):
   - provider = 'stripe' → equality → dùng index
   - status = 'FAILED' → equality trong subset → dùng index
   - createdAt > NOW()-24h → range → dùng index
   
   Đây là Left Prefix Rule: query dùng cả 3 columns theo đúng thứ tự → index optimal.
   Nếu query chỉ WHERE createdAt > ... (không có provider, status) → index KHÔNG được dùng.
```

### Payments

**Q39: Stripe gửi `payment_intent.succeeded` 2 lần — edu_app xử lý thế nào?**
```
A: WebhookService.handleStripeEvent():
   1. Check webhookEvent.findUnique({ where: { eventId: 'evt_123' } })
   2. Lần 1: không tìm thấy → xử lý → UPDATE status=PROCESSED
   3. Lần 2: tìm thấy với status=PROCESSED → early return, không xử lý

   eventId String @unique trong schema → đảm bảo không thể có 2 records cùng eventId.
   Đây là idempotency via database unique constraint.
```

**Q40: Coach payoutEnabled=false → PayoutService.processWeeklyPayouts() làm gì?**
```
A: Code:
   if (!coach.stripeAccountId || !coach.payoutEnabled) continue;

   Skip coach đó hoàn toàn, không tạo Payout record.
   Hệ quả: coach hoàn thành sessions nhưng tiền tích lại ở platform.

   Vấn đề: thiếu logging — không biết bao nhiêu tiền bị hold.
   Fix: tạo Payout với status=SKIPPED + metadata lý do → admin có thể reconcile.
```

### System Design

**Q41: Scale CoachSearchService lên 1M searches/day — PostgreSQL còn đủ không?**
```
A: 1M searches/day = ~12 QPS average, 120 QPS peak.
   PostgreSQL với index (isActive, avgRating) handle 120 QPS là OK.

   Khi cần Elasticsearch (thường từ 100K+ coaches hoặc complex search):
   - Full-text search trên coach bio
   - Faceted search (multiple filters đồng thời với count)
   - Personalized ranking (ML-based)
   - Geo-proximity search (gần learner's location)

   edu_app hiện tại: PostgreSQL đủ dùng cho 10K coaches.
   Next step khi scale: Elasticsearch với sync từ PostgreSQL qua Kafka.
```

**Q42: Kafka consumer lag 10K messages — ảnh hưởng thế nào?**
```
A: Lag = payout calculations bị delay.
   10K messages × avg 100ms per message = ~17 phút delay.
   Sau khi learner confirm payment → payout sẽ được tính muộn 17 phút.

   Với edu_app: acceptable nếu payout là weekly batch.

   Fix nếu không acceptable:
   1. Scale consumers: tăng số partitions + consumer instances
   2. Optimize consumer: batch processing thay vì single message
   3. Prioritization: payment events riêng topic, high priority

   Alert: monitor consumer lag bằng Kafka JMX metrics hoặc Burrow.
   Threshold: lag > 1000 messages → alert on-call.
```

---

## Timeline & Priority

```
Tuần 1-4:   Testing — viết tests cho toàn bộ services, đạt 80% coverage
            (Quan trọng nhất, mọi công ty check ngay)

Tuần 5-8:   PostgreSQL deep dive — EXPLAIN ANALYZE, fix N+1, race conditions
            Đặc biệt: fix race condition trong bookSession()

Tuần 9-12:  Kafka + Outbox pattern — implement đúng event-driven
            + Redis nâng cao

Tuần 13-16: Stripe production patterns — webhook reliability, reconciliation

Tháng 5-6:  System Design practice — làm hết bài tập trong file này
            + đọc "System Design Interview" Alex Xu

Tháng 7-9:  Leadership — code review thực tế, ADR writing, mock interviews
```

---

## Sách / Khóa học theo thứ tự ưu tiên

### Bắt buộc đọc (không có cái này thiếu nền tảng)

| # | Tên | Loại | Chủ đề |
|---|-----|------|--------|
| 1 | Designing Data-Intensive Applications — Martin Kleppmann | Ebook | Distributed systems |
| 2 | System Design Interview Vol.1+2 — Alex Xu | Ebook | System design interview |
| 3 | Unit Testing Principles, Practices, and Patterns — Vladimir Khorikov | Ebook | Testing |
| 4 | The Art of PostgreSQL — Dimitri Fontaine | Ebook | PostgreSQL |
| 5 | Use The Index, Luke | Website free | Database indexing |

### Udemy (mua khi sale ~200k VND/khóa)

| # | Tên | Tác giả | Chủ đề |
|---|-----|---------|--------|
| 1 | NestJS: The Complete Developer's Guide | Stephen Grider | NestJS |
| 2 | SQL and PostgreSQL: The Complete Developer's Guide | Stephen Grider | PostgreSQL |
| 3 | Redis: The Complete Developer's Guide | Stephen Grider | Redis |
| 4 | Apache Kafka Series - Learn Apache Kafka for Beginners v3 | Stephane Maarek | Kafka |
| 5 | Docker and Kubernetes: The Complete Guide | Stephen Grider | DevOps |
| 6 | Microservices with NodeJS and React | Stephen Grider | Microservices |
| 7 | Software Architecture & Design of Modern Large Scale Systems | Michael Pogrebinsky | Architecture |

### Đọc thêm nếu có thời gian

| Tên | Chủ đề |
|-----|--------|
| Clean Architecture — Robert C. Martin | Code design |
| Staff Engineer — Will Larson | Leadership |
| Building Microservices — Sam Newman | Microservices architecture |
| API Design Patterns — JJ Geewax | REST/API |

### Website / Blog theo dõi thường xuyên

| URL | Nội dung |
|-----|----------|
| bytebytego.com | System design digest hàng tuần |
| engineering.grab.com | Microservices, payments thực tế từ Grab |
| stripe.com/blog/engineering | Payment engineering |
| martinfowler.com | Patterns, refactoring, microservices |
| highscalability.com | Case studies scaling các hệ thống lớn |
