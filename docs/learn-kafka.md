# Học Kafka — Từ Project Này

## 1. Tại sao project dùng Kafka

```
Không dùng Kafka:
  POST /mock-exams/:id/submit
    → chấm điểm (2s)
    → cập nhật SrsCard (0.5s)
    → cập nhật StudyStreak (0.3s)
    → gửi email kết quả (1s)
    → response về user sau 3.8s ← quá chậm

Dùng Kafka:
  POST /mock-exams/:id/submit
    → chấm điểm (2s)
    → publish edu.exam.submitted (1ms)
    → response về user sau 2.001s ✅

  Consumer (async):
    → cập nhật SrsCard
    → cập nhật StudyStreak
    → gửi email
    (chạy nền, không block user)
```

**Nguyên tắc:** Kafka dành cho việc có thể làm **sau** mà không cần user đợi.

---

## 2. Concepts cốt lõi

```
Topic: edu.exam.submitted
  │
  ├── Partition 0: [msg1, msg2, msg5, msg8...]
  ├── Partition 1: [msg3, msg6, msg9...]
  └── Partition 2: [msg4, msg7, msg10...]
                     ↑
               Offset (vị trí trong partition)

Consumer Group: exam-service-consumers
  ├── Consumer A → đọc Partition 0
  ├── Consumer B → đọc Partition 1
  └── Consumer C → đọc Partition 2
```

**Quan trọng:**
- 1 message chỉ được 1 consumer trong group đọc
- Nhiều group khác nhau có thể đọc cùng topic (fan-out)
- Thứ tự đảm bảo **trong 1 partition**, không đảm bảo cross-partition

---

## 3. Topics trong project

```typescript
// packages/nest-contracts/src/kafka/topics.ts
export const KAFKA_TOPICS = {
  EXAM_SUBMITTED:      'edu.exam.submitted',
  PAYMENT_SUCCEEDED:   'edu.payment.succeeded',
  SESSION_COMPLETED:   'edu.session.completed',
  VOCAB_REVIEWED:      'edu.vocab.reviewed',
} as const;
```

**Tại sao `edu.payment.succeeded` không xử lý ngay trong webhook?**

```
Webhook handler nhận từ Stripe:
  → cần respond 200 trong 30 giây (Stripe timeout)
  → nếu xử lý hết: cập nhật DB, gửi email, trigger payout... → có thể > 30s
  → Stripe retry → double processing

Tách ra Kafka:
  WebhookHandler:
    1. Verify Stripe signature
    2. Check idempotency (WebhookEvent table)
    3. Save WebhookEvent status=RECEIVED
    4. Publish edu.payment.succeeded
    5. Return 200 ngay ← Stripe happy

  Consumer (async):
    → UPDATE Subscription status
    → INSERT Notification
    → Trigger payout logic
    → Update Payment status
```

---

## 4. Producer — publish event

```typescript
// services/exam-service/src/exam/exam.service.ts
@Injectable()
export class ExamService {
  constructor(
    @Inject('KAFKA_CLIENT') private kafka: ClientKafka,
    private prisma: PrismaService,
  ) {}

  async submitExam(userId: number, examId: string, answers: Record<string, string>) {
    // 1. Chấm điểm
    const result = await this.gradeExam(examId, answers);

    // 2. Lưu kết quả
    const examResult = await this.prisma.examResult.create({
      data: { userId, ...result },
    });

    // 3. Publish event — fire and forget
    this.kafka.emit(KAFKA_TOPICS.EXAM_SUBMITTED, {
      key: String(userId),        // ← cùng userId → cùng partition → đảm bảo thứ tự
      value: JSON.stringify({
        userId,
        examResultId: examResult.id,
        score: result.score,
        passed: result.passed,
        level: result.level,
        submittedAt: new Date().toISOString(),
      }),
    });

    return examResult;
  }
}
```

**Tại sao `key: String(userId)`?**

→ Cùng key → cùng partition → events của 1 user luôn theo thứ tự.
→ Nếu user submit exam 2 lần nhanh, SrsCard cập nhật đúng thứ tự.

---

## 5. Consumer — xử lý event

```typescript
// services/exam-service/src/consumers/exam-submitted.consumer.ts
@Injectable()
export class ExamSubmittedConsumer implements OnApplicationBootstrap {
  constructor(
    @Inject('KAFKA_CLIENT') private kafka: ClientKafka,
    private srsService: SrsService,
    private streakService: StreakService,
  ) {}

  onApplicationBootstrap() {
    this.kafka.subscribeToResponseOf(KAFKA_TOPICS.EXAM_SUBMITTED);
  }

  @MessagePattern(KAFKA_TOPICS.EXAM_SUBMITTED)
  async handle(@Payload() data: string, @Ctx() context: KafkaContext) {
    const message = JSON.parse(data) as ExamSubmittedEvent;
    const { offset, partition } = context.getMessage();

    console.log(`Processing offset ${offset} partition ${partition}`);

    try {
      // Xử lý idempotent — nếu crash và retry thì không double count
      await this.srsService.updateAfterExam(message.userId, message.examResultId);
      await this.streakService.recordStudySession(message.userId);

      // Commit offset sau khi xử lý thành công
      // NestJS Kafka tự commit sau khi handler return
    } catch (err) {
      // Log error — message sẽ được retry tùy config
      console.error(`Failed to process exam.submitted for user ${message.userId}:`, err);
      throw err;  // ← throw để Kafka biết chưa xử lý xong
    }
  }
}
```

---

## 6. Idempotent Consumer — quan trọng nhất

**Vấn đề:** Kafka đảm bảo "at least once" — message có thể được deliver 2+ lần (broker retry, rebalance).

```
Scenario:
  Consumer nhận message → xử lý (5 giây) → crash trước khi commit offset
  → Kafka retry → consumer khác nhận lại message → xử lý lần 2
  → StudyStreak tăng 2 lần thay vì 1 lần ← BUG
```

**Fix — idempotency key:**

```typescript
@MessagePattern(KAFKA_TOPICS.EXAM_SUBMITTED)
async handle(@Payload() data: string, @Ctx() context: KafkaContext) {
  const message = JSON.parse(data) as ExamSubmittedEvent;
  const messageId = context.getMessage().headers?.['kafka-message-id'] as string
    ?? `${message.userId}-${message.examResultId}`;

  // Check đã xử lý chưa
  const existing = await this.prisma.processedMessage.findUnique({
    where: { messageId },
  });
  if (existing) {
    console.log(`Skipping duplicate message ${messageId}`);
    return;  // Idempotent — bỏ qua
  }

  // Xử lý trong transaction
  await this.prisma.$transaction(async (tx) => {
    // 1. Mark as processing
    await tx.processedMessage.create({ data: { messageId, processedAt: new Date() } });

    // 2. Business logic
    await this.srsService.updateAfterExam(message.userId, message.examResultId, tx);
    await this.streakService.recordStudySession(message.userId, tx);
  });
}
```

**ProcessedMessage table:**

```prisma
model ProcessedMessage {
  id          Int      @id @default(autoincrement())
  messageId   String   @unique
  processedAt DateTime @default(now())

  @@index([processedAt])  // để cleanup cron xóa records cũ
}
```

---

## 7. Dead Letter Queue — khi consumer fail liên tục

```typescript
// Sau 3 lần retry → gửi vào DLQ
@MessagePattern(KAFKA_TOPICS.EXAM_SUBMITTED)
async handle(@Payload() data: string, @Ctx() context: KafkaContext) {
  const retryCount = parseInt(
    context.getMessage().headers?.['retry-count'] as string ?? '0'
  );

  try {
    await this.processExamSubmitted(JSON.parse(data));
  } catch (err) {
    if (retryCount >= 3) {
      // Gửi vào Dead Letter Queue để xử lý thủ công / alert
      await this.kafka.emit(`${KAFKA_TOPICS.EXAM_SUBMITTED}.dlq`, {
        value: data,
        headers: {
          'original-error': err.message,
          'failed-at': new Date().toISOString(),
          'retry-count': String(retryCount),
        },
      });
      return;  // Không throw — để commit offset, tránh infinite retry
    }

    // Retry với exponential backoff
    await this.kafka.emit(KAFKA_TOPICS.EXAM_SUBMITTED, {
      value: data,
      headers: { 'retry-count': String(retryCount + 1) },
    });
    throw err;
  }
}
```

**DLQ Consumer — xử lý thủ công:**

```typescript
@MessagePattern(`${KAFKA_TOPICS.EXAM_SUBMITTED}.dlq`)
async handleDlq(@Payload() data: string, @Ctx() context: KafkaContext) {
  const headers = context.getMessage().headers;
  // Alert team qua Slack/email
  await this.alertService.send({
    message: `Failed message in DLQ`,
    error: headers['original-error'],
    failedAt: headers['failed-at'],
    payload: data,
  });
  // Lưu vào DB để admin retry thủ công
  await this.prisma.failedMessage.create({
    data: { topic: KAFKA_TOPICS.EXAM_SUBMITTED, payload: data, error: headers['original-error'] as string },
  });
}
```

---

## 8. Consumer Group Rebalancing

```
Ban đầu: 3 consumers, 3 partitions
  Consumer A → Partition 0
  Consumer B → Partition 1
  Consumer C → Partition 2

Consumer B crash:
  → Rebalance trigger
  → Consumer A → Partition 0, 1
  → Consumer C → Partition 2

  Trong lúc rebalance (~3-10s): không consumer nào đọc
  → Messages lag tăng lên
  → Cần monitor consumer lag!
```

**Monitor bằng Kafka CLI:**

```bash
# Xem consumer lag
docker exec edu-kafka kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group exam-service-consumers \
  --describe

# Output:
# TOPIC                  PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# edu.exam.submitted     0          1250            1251            1   ← lag 1 message
# edu.exam.submitted     1          890             890             0   ← caught up
```

---

## 9. Khi nào KHÔNG dùng Kafka

```
❌ Dùng sai:
  Kafka cho request/response (query user info)
  → Dùng gRPC hoặc REST

❌ Dùng sai:
  Kafka cho data cần đọc ngay (subscription status khi checkout)
  → Dùng PostgreSQL direct

✅ Dùng đúng:
  Kafka cho events mà consumer có thể xử lý sau
  Kafka khi cần multiple consumers (fan-out)
  Kafka khi cần replay events (debug, backfill)
  Kafka khi producer không cần biết consumer
```

---

## Bài tập thực hành

```
1. Reproduce at-least-once:
   → Consumer xử lý message, crash trước commit
   → Restart consumer
   → Thấy message được process 2 lần
   → Fix bằng idempotency table

2. Tạo topic edu.payment.succeeded.dlq
   → Simulate payment consumer fail 3 lần
   → Verify message vào DLQ, không infinite retry

3. Monitor lag:
   docker exec edu-kafka kafka-consumer-groups.sh \
     --bootstrap-server localhost:9092 \
     --group payment-service-consumers \
     --describe
   → Giải thích số LAG nghĩa là gì

4. Thêm partition key hợp lý:
   edu.payment.succeeded → key = userId hay stripeCustomerId?
   → Giải thích lý do chọn
```

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **3. Backend (NestJS)** — bài 4/8.

- Bài trước: [mongodb.md](./mongodb.md) — MongoDB chỉ dùng cho audit log
- **Bài tiếp: [learn-mqtt-flyway-ddd.md](./learn-mqtt-flyway-ddd.md)** — MQTT, RxJS, Flyway, view và DDD

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
