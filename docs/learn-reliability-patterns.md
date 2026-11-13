# Học các Pattern Độ tin cậy — Từ Project Này

> Hệ thống phân tán **chắc chắn** gặp lỗi: mạng chập chờn, service chậm, Kafka khởi động lại.
> Senior không hỏi "có lỗi không" mà hỏi **"khi lỗi thì dữ liệu còn đúng không, user thấy gì?"**
> Tài liệu dùng luồng **nộp bài thi → Kafka** của project làm ví dụ xuyên suốt. Kafka cơ bản: [learn-kafka.md](./learn-kafka.md).

> **Cập nhật 2026-09-29 — đã sửa trong code** (mục 1 mô tả trạng thái trước khi sửa):
> - **Transactional outbox** cho `edu.exam.submitted` + relay `FOR UPDATE SKIP LOCKED` + producer tự kết nối lại —
>   [ADR-0006](./adr/0006-transactional-outbox-exam-events.md). Đã kiểm chứng: tắt Kafka + restart exam-service → nộp bài
>   vẫn thành công, event chờ trong outbox và tự lên Kafka khi Kafka sống lại.
> - Timeout 10s (env `MICROSERVICE_TIMEOUT_MS`) cho **mọi** lời gọi gateway → microservice, quá hạn trả **504**
>   ([`grpc-dispatch.client.ts`](../packages/nest-common/src/grpc/grpc-dispatch.client.ts)).
> - Graceful shutdown (`enableShutdownHooks`) ở cả 3 service.
> - **Consumer idempotent** `progress-updater` ([`progress-updater.ts`](../services/exam-service/src/kafka/progress-updater.ts)):
>   ghi hoạt động `exam` + `StudyStreak` theo giờ VN, dấu `ProcessedEvent` cùng transaction, lỗi 3 lần → topic DLQ.
>   Đã thử: gửi lại event trùng → bị bỏ qua, số liệu không đổi.
> - **Circuit breaker** trong gateway ([`circuit-breaker.ts`](../packages/nest-common/src/grpc/circuit-breaker.ts)): lỗi hạ tầng
>   ≥ 50%/20 lần gọi → trả 503 trong 30s. Đã thử: tắt content-service → sau vài lần 504 (10s) chuyển sang 503 trong ~5ms;
>   bật lại → tự đóng mạch sau ~20s.
> - **Chưa làm:** retry có backoff cho lời gọi đọc (bài 5 phần mở rộng).

## 1. Luồng hiện tại và những chỗ có thể mất dữ liệu

```
api-gateway ──gRPC──▶ exam-service
                        SubmitExamHandler.execute()
                          ① mockExamsService.submit()  → INSERT ExamResult vào Postgres ✅ đã commit
                          ② eventBus.publish(ExamSubmittedEvent)
                               └─ ExamSubmittedHandler
                                    ③ kafkaProducer.emit("edu.exam.submitted")
                                         ├─ producer == null → return (im lặng)
                                         └─ lỗi → logger.error(...) và bỏ qua
```

Đọc code thật ([`kafka.producer.ts`](../services/exam-service/src/kafka/kafka.producer.ts),
`exam-submitted.handler.ts` (đã xoá khi chuyển sang outbox)):

| Tình huống | Chuyện gì xảy ra | Hậu quả |
|------------|------------------|---------|
| Kafka chưa sẵn sàng lúc exam-service **khởi động** | `connect()` lỗi → `producer = null` | **mọi** event bị bỏ im lặng cho tới khi restart service |
| Kafka chập chờn lúc gửi | `send()` ném lỗi → chỉ `logger.error` | event mất vĩnh viễn, không thử lại |
| exam-service chết giữa ① và ③ | DB đã có kết quả, event chưa gửi | streak/SRS/email không bao giờ được cập nhật |
| Gửi không có `key` | Kafka chia partition ngẫu nhiên | 2 bài thi của cùng user có thể được xử lý **sai thứ tự** |

Gốc rễ: **dual write** — ghi vào **hai hệ thống** (Postgres và Kafka) mà không có transaction chung. Không có cách
nào để hai lần ghi này "cùng thành công hoặc cùng thất bại" bằng try/catch.

> Ghi chú: repo hiện **chưa có consumer** cho `edu.exam.submitted` — event đang được gửi mà chưa ai đọc. Đây là thời
> điểm tốt nhất để sửa kiến trúc, trước khi có consumer phụ thuộc vào nó.

---

## 2. Transactional Outbox — sửa dual write

Ý tưởng: **chỉ ghi vào DB**, trong **cùng transaction** với dữ liệu nghiệp vụ; một tiến trình riêng đọc bảng outbox
và đẩy lên Kafka.

```
Transaction Postgres:
  INSERT ExamResult ...
  INSERT OutboxEvent (topic='edu.exam.submitted', key=userId, payload=...)   ← cùng commit / cùng rollback
COMMIT

Outbox relay (vòng lặp mỗi 1s):
  SELECT * FROM "OutboxEvent" WHERE "publishedAt" IS NULL ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED
  → producer.send(...)
  → UPDATE "OutboxEvent" SET "publishedAt" = now() WHERE id IN (...)
```

```prisma
model OutboxEvent {
  id          Int       @id @default(autoincrement())
  topic       String
  key         String?
  payload     Json
  createdAt   DateTime  @default(now())
  publishedAt DateTime?
  attempts    Int       @default(0)
  lastError   String?

  @@index([publishedAt, id])
}
```

```ts
// mock-exams.service.ts — trong submit()
return this.prisma.$transaction(async (tx) => {
  const result = await tx.examResult.create({ data: { ... } });
  await tx.outboxEvent.create({
    data: {
      topic: KafkaTopics.EXAM_SUBMITTED,
      key: String(userId ?? "guest"),
      payload: { eventId: `exam-result-${result.id}`, examId, userId, percent: result.percent, ... },
    },
  });
  return result;
});
```

```ts
// outbox.relay.ts
@Interval(1000)
async relay() {
  const rows = await this.prisma.$queryRaw<OutboxRow[]>`
    SELECT id, topic, key, payload FROM "OutboxEvent"
    WHERE "publishedAt" IS NULL AND attempts < 20
    ORDER BY id LIMIT 100
    FOR UPDATE SKIP LOCKED`;      // nhiều pod chạy relay không lấy trùng dòng — cần chạy trong $transaction
  for (const r of rows) {
    try {
      await this.producer.send({ topic: r.topic, messages: [{ key: r.key, value: JSON.stringify(r.payload) }] });
      await this.prisma.outboxEvent.update({ where: { id: r.id }, data: { publishedAt: new Date() } });
    } catch (e) {
      await this.prisma.outboxEvent.update({
        where: { id: r.id },
        data: { attempts: { increment: 1 }, lastError: String(e) },
      });
    }
  }
}
```

Đổi lại: event đến chậm ~1s và có thể được gửi **hơn một lần** (gửi xong, chết trước khi `UPDATE publishedAt`).
→ Consumer **bắt buộc idempotent** (mục 5) — đó là lý do payload có `eventId`.

**Không muốn outbox?** Tối thiểu: `emit()` phải *retry với backoff* và `producer` phải *tự kết nối lại* thay vì
`null` vĩnh viễn; thêm metric `kafka_events_dropped_total` để **biết** khi mất event.

---

## 3. Timeout — lỗi nguy hiểm nhất là "chờ mãi"

Trong `api-gateway`, chỉ `/health` có `timeout(3000)` khi gọi microservice. Các route khác:

```ts
return firstValueFrom(this.contentClient.send(CONTENT_PATTERNS.GET_VOCABULARIES, {...}));   // không timeout
```

content-service treo (deadlock DB, GC dài) → mỗi request tới gateway **treo theo** → hết kết nối, hết RAM →
gateway chết theo → **lỗi lan truyền** (cascading failure) dù gateway không có bug.

```ts
// Một helper dùng chung cho mọi lời gọi microservice
export function callService<T>(client: ClientProxy, pattern: string, data: unknown, ms = 5000) {
  return firstValueFrom(
    client.send<T>(pattern, data).pipe(
      timeout(ms),
      catchError((err) =>
        throwError(() =>
          err instanceof TimeoutError
            ? new GatewayTimeoutException(`${pattern} timeout`)
            : err,
        ),
      ),
    ),
  );
}
```

Quy tắc: **mọi** lời gọi qua mạng (gRPC, HTTP, DB, Redis) đều có timeout; timeout tầng ngoài > tầng trong
(gateway 5s > content-service → DB 3s), nếu không tầng ngoài bỏ cuộc trong khi tầng trong vẫn làm.

---

## 4. Retry — đúng cách

```
❌ retry ngay lập tức, vô hạn     → dồn thêm tải lên service đang ốm → sập hẳn
✅ retry có giới hạn + backoff tăng dần + jitter (ngẫu nhiên)
     lần 1: 100ms ± 50   lần 2: 200ms ± 100   lần 3: 400ms ± 200   → rồi bỏ cuộc
```

```ts
client.send(pattern, data).pipe(
  timeout(3000),
  retry({ count: 2, delay: (_err, i) => timer(100 * 2 ** i + Math.random() * 100) }),
);
```

**Chỉ retry thao tác idempotent** (đọc, hoặc ghi có khoá chống trùng). Retry `SubmitExam` không idempotent =
**chấm điểm 2 lần**, tạo 2 `ExamResult`. Muốn retry ghi → client gửi `Idempotency-Key`, server lưu và trả lại kết
quả cũ khi gặp lại key (cùng ý tưởng `WebhookEvent.eventId` — [learn-stripe-idempotency.md](./learn-stripe-idempotency.md)).

---

## 5. Consumer idempotent

Kafka và outbox đều giao **ít nhất một lần** → consumer gặp cùng event 2 lần là chuyện bình thường.

```ts
// consumer cập nhật streak khi có edu.exam.submitted
async handle(evt: ExamSubmitted) {
  await this.prisma.$transaction(async (tx) => {
    // bảng ProcessedEvent(eventId UNIQUE): chèn trùng → lỗi P2002 → biết là đã xử lý
    const inserted = await tx.processedEvent.createMany({
      data: [{ eventId: evt.eventId, consumer: "streak-updater" }],
      skipDuplicates: true,
    });
    if (inserted.count === 0) return;          // đã xử lý rồi → bỏ qua
    await tx.studyStreak.upsert({ ... });       // làm việc thật, cùng transaction với dấu "đã xử lý"
  });
}
```

Hoặc thiết kế thao tác **tự nhiên idempotent**: `SET mastered = true` (chạy 2 lần vẫn vậy) tốt hơn
`SET correctCount = correctCount + 1` (chạy 2 lần sai).

---

## 6. Circuit breaker — ngừng gọi service đang chết

```
CLOSED ──(lỗi ≥ 50% trong 20 lần gọi)──▶ OPEN ──(sau 30s)──▶ HALF-OPEN ──(thử 1 lần OK)──▶ CLOSED
   gọi bình thường                        trả lỗi NGAY,            cho vài request                  └─(lỗi)─▶ OPEN
                                          không gọi service         đi qua để thử
```

Lợi ích: content-service đang chết thì gateway **trả lỗi ngay trong 1ms** thay vì treo 5s mỗi request → gateway sống,
content-service có thời gian hồi phục. Thư viện Node phổ biến: `opossum`.

```ts
const breaker = new CircuitBreaker((p: string, d: unknown) => callService(this.contentClient, p, d), {
  timeout: 5000, errorThresholdPercentage: 50, resetTimeout: 30_000,
});
breaker.fallback(() => ({ data: [], degraded: true }));   // trả dữ liệu rỗng / từ cache thay vì 500
```

---

## 7. Graceful degradation — hỏng một phần, không hỏng toàn bộ

| Thành phần chết | Nên như thế nào | Project |
|-----------------|-----------------|---------|
| Redis (cache) | đọc thẳng DB, chậm hơn nhưng chạy | kiểm tra: cache lỗi có làm request 500 không? |
| Kafka | vẫn nộp bài và lưu điểm; event gửi sau (outbox) | hiện: lưu điểm được, **event mất** |
| MongoDB (audit) | vẫn phục vụ; audit ghi lỗi → log + metric | kiểm tra `AuditInterceptor` có nuốt lỗi không |
| AI / email | tính năng đó báo "tạm thời không khả dụng" | |
| content-service | trang học lỗi; trang đăng nhập, hồ sơ vẫn chạy | nhờ timeout + circuit breaker |

Nguyên tắc: **phân biệt phụ thuộc bắt buộc và phụ thuộc phụ**. Audit log, analytics, email là phụ — không được làm hỏng
luồng chính.

---

## 8. Saga — giao dịch trải qua nhiều service

Đặt buổi học với coach: giữ lịch → thu tiền Stripe → xác nhận. Không có transaction chung giữa DB của mình và Stripe.

```
Bước                    Hành động bù (compensation) nếu bước sau thất bại
1. Giữ slot (PENDING)   → giải phóng slot
2. Thu tiền Stripe      → hoàn tiền (refund)
3. Xác nhận (CONFIRMED)
```

Mỗi bước lưu **trạng thái** vào DB (project có `SessionStatus`, `PaymentStatus`) để khi service chết giữa chừng, một job
định kỳ tìm bản ghi kẹt ở `PENDING` quá 15 phút và bù trừ. Webhook Stripe là "tin nhắn" tiến trình saga — nên phải
idempotent (`WebhookEvent.eventId UNIQUE`).

---

## Bài tập thực hành

1. Tái hiện lỗi mất event: tắt Kafka (`docker stop edu-kafka`), **restart exam-service**, bật lại Kafka, nộp bài thi.
   Kiểm tra log và topic — event có tới không?
2. Làm `KafkaProducerService` tự kết nối lại (không để `producer = null` vĩnh viễn) + retry 3 lần có backoff khi `send` lỗi.
3. Cài đặt outbox (mục 2): bảng `OutboxEvent`, ghi trong transaction của `submit()`, relay với `FOR UPDATE SKIP LOCKED`.
4. Thêm `key: userId` cho message và giải thích vì sao thứ tự theo user được bảo đảm.
5. Viết helper `callService` có timeout (mục 3), thay ở mọi controller gateway. Giả lập content-service chậm
   (thêm `await sleep(10000)` vào một handler) và so sánh trước/sau.
6. Viết consumer `streak-updater` idempotent (mục 5). Gửi cùng một event 2 lần, chứng minh streak chỉ tăng 1.
7. (Nâng cao) Bọc lời gọi content-service bằng circuit breaker `opossum` có fallback; tắt content-service, quan sát
   trạng thái OPEN → HALF-OPEN → CLOSED.

<details>
<summary>Gợi ý đáp án</summary>

1. Log exam-service lúc khởi động: `Kafka producer connection failed — events will be skipped`. Sau khi Kafka lên lại
   vẫn không gửi được vì `producer` đã là `null`; `kafka-console-consumer --topic edu.exam.submitted --from-beginning`
   không thấy message. Kết quả thi vẫn nằm trong `ExamResult` → đúng kịch bản dual write.
2. Không `null` hoá: giữ instance `kafka.producer()`; trong `emit()` nếu chưa kết nối thì `await connect()` (có khoá
   để không kết nối song song). kafkajs cũng có cấu hình `retry: { retries: 5, initialRetryTime: 300 }` ở `new Kafka()`.
   Vẫn **không** giải quyết mất event khi process chết giữa chừng → cần outbox.
3. Relay phải chạy `SELECT … FOR UPDATE SKIP LOCKED` **và** `UPDATE publishedAt` trong cùng `$transaction`; nếu không,
   khoá dòng được nhả ngay sau SELECT và 2 pod có thể gửi trùng. Dọn bảng: xoá dòng đã publish quá 7 ngày.
4. Kafka băm `key` để chọn partition → mọi message cùng key vào **một** partition → một consumer đọc tuần tự theo offset.
   Không có key → round-robin/sticky → 2 message cùng user có thể ở 2 partition, xử lý song song.
5. Trước: request tới gateway treo 10s. Sau: 504 sau 5s (hoặc theo `ms`). Với nhiều request đồng thời, so số kết nối
   đang mở trên gateway.
6. Bảng `ProcessedEvent { eventId String, consumer String, @@id([eventId, consumer]) }`; lần 2 `createMany` trả
   `count: 0` → return. Bọc cùng transaction với `upsert` streak để không có trạng thái "đánh dấu đã xử lý nhưng
   chưa cập nhật".
7. Sự kiện `breaker.on("open" | "halfOpen" | "close", …)` để log; export trạng thái thành metric gauge để thấy trên Grafana.

</details>

## Luyện phỏng vấn

Câu hỏi phỏng vấn kèm đáp án về bảo mật API, thanh toán chống trùng và các pattern chịu lỗi: [interview-backend-security.md](./interview-backend-security.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **3. Backend (NestJS)** — bài 6/8.

- Bài trước: [learn-mqtt-flyway-ddd.md](./learn-mqtt-flyway-ddd.md) — MQTT, RxJS, Flyway, view và DDD
- **Bài tiếp: [learn-stripe-idempotency.md](./learn-stripe-idempotency.md)** — Thanh toán Stripe không trừ tiền hai lần

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
