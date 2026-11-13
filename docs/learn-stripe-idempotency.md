# Học Payment Idempotency — Từ Project Này

## 1. Tại sao idempotency là bắt buộc

```
Stripe gửi webhook: payment_intent.succeeded
  → Server xử lý: UPDATE Subscription status=ACTIVE
  → Server crash trước khi respond 200
  → Stripe không nhận 200 → retry sau 30 giây
  → Server xử lý lại: UPDATE Subscription (ok — idempotent)
                       INSERT Payment (ok — tạo thêm 1 payment ← BUG!)
```

**Mục tiêu:** Cùng 1 event được deliver nhiều lần → kết quả như xử lý 1 lần.

---

## 2. WebhookEvent table — idempotency log

```prisma
model WebhookEvent {
  id        Int                @id @default(autoincrement())
  eventId   String             @unique  // Stripe evt_1ABC... ← KEY
  provider  String             // "stripe"
  type      String             // "payment_intent.succeeded"
  payload   Json               // raw Stripe event
  status    WebhookEventStatus // RECEIVED | PROCESSED | FAILED | IGNORED
  error     String?
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt
}
```

**Flow xử lý:**

```typescript
// services/payment-service/src/webhook/webhook.service.ts
async handleStripeEvent(rawBody: Buffer, signature: string) {
  // 1. Verify signature trước
  let event: Stripe.Event;
  try {
    event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    throw new BadRequestException('Invalid signature');
  }

  // 2. Check idempotency
  const existing = await this.prisma.webhookEvent.findUnique({
    where: { eventId: event.id },
  });

  if (existing?.status === 'PROCESSED') {
    console.log(`Skipping duplicate event ${event.id}`);
    return { received: true };  // 200 OK, không xử lý lại
  }

  // 3. Upsert với status RECEIVED (tránh race condition)
  await this.prisma.webhookEvent.upsert({
    where: { eventId: event.id },
    create: { eventId: event.id, provider: 'stripe', type: event.type, payload: event as object, status: 'RECEIVED' },
    update: { status: 'RECEIVED' },
  });

  // 4. Xử lý event
  try {
    await this.processEvent(event);
    await this.prisma.webhookEvent.update({
      where: { eventId: event.id },
      data: { status: 'PROCESSED' },
    });
  } catch (err) {
    await this.prisma.webhookEvent.update({
      where: { eventId: event.id },
      data: { status: 'FAILED', error: err.message },
    });
    throw err;  // Stripe sẽ retry
  }

  return { received: true };
}
```

---

## 3. processEvent — xử lý từng loại event

```typescript
private async processEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await this.onPaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await this.onPaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case 'customer.subscription.updated':
      await this.onSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await this.onSubscriptionCanceled(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_failed':
      await this.onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      // Ignore unknown events
      await this.prisma.webhookEvent.update({
        where: { eventId: event.id },
        data: { status: 'IGNORED' },
      });
  }
}
```

---

## 4. onPaymentSucceeded — transaction đúng cách

```typescript
private async onPaymentSucceeded(intent: Stripe.PaymentIntent) {
  // Tìm Payment record từ stripePaymentIntentId
  const payment = await this.prisma.payment.findUnique({
    where: { stripePaymentIntentId: intent.id },
    include: { subscription: true, session: true },
  });

  if (!payment) {
    // PaymentIntent không do ta tạo (test mode, v.v.)
    console.warn(`Unknown PaymentIntent: ${intent.id}`);
    return;
  }

  // Xử lý trong 1 transaction — all or nothing
  await this.prisma.$transaction(async (tx) => {
    // 1. Update Payment status
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCEEDED', paidAt: new Date() },
    });

    // 2a. Nếu là subscription payment
    if (payment.subscriptionId) {
      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: 'ACTIVE',
          currentPeriodEnd: new Date(intent.metadata.periodEnd ?? Date.now() + 30 * 24 * 3600 * 1000),
        },
      });
    }

    // 2b. Nếu là coaching session payment
    if (payment.sessionId) {
      await tx.coachingSession.update({
        where: { id: payment.sessionId },
        data: { status: 'CONFIRMED' },
      });
    }

    // 3. Insert notification (client poll GET /api/notifications)
    await tx.notification.create({
      data: {
        userId: payment.userId,
        type: 'PAYMENT_SUCCESS',
        title: 'Thanh toán thành công',
        body: `Đã thanh toán $${(intent.amount / 100).toFixed(2)}`,
      },
    });
  });
}
```

**Tại sao phải $transaction?**

```
Không dùng transaction:
  1. UPDATE Payment → success
  2. UPDATE Subscription → crash
  → Payment SUCCEEDED nhưng Subscription vẫn PENDING ← inconsistent

Dùng $transaction:
  Nếu UPDATE Subscription fail → rollback cả UPDATE Payment
  → User thấy vẫn PENDING → retry → đồng nhất
```

---

## 5. Stripe Idempotency Key — phía ta gửi request

Khi ta gọi Stripe API, dùng idempotency key để tránh tạo double:

```typescript
// Tạo subscription — nếu request timeout và retry, không tạo 2 subscription
async createStripeSubscription(userId: number, plan: SubscriptionPlan) {
  const idempotencyKey = `sub-create-${userId}-${plan}-${new Date().toISOString().slice(0, 10)}`;
  //                                                     ↑ date-scoped: 1 lần/ngày/plan

  const subscription = await this.stripe.subscriptions.create(
    {
      customer: stripeCustomerId,
      items: [{ price: stripePriceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    },
    { idempotencyKey }  // ← Stripe dedup trong 24h
  );

  return subscription;
}

// Tạo PaymentIntent — dùng internal paymentId làm key
async createPaymentIntent(paymentId: number, amountCents: number) {
  const intent = await this.stripe.paymentIntents.create(
    { amount: amountCents, currency: 'usd' },
    { idempotencyKey: `pi-${paymentId}` }  // stable, unique key
  );
  return intent;
}
```

---

## 6. Refund flow — idempotent refund

```typescript
async refundPayment(paymentId: number, reason?: string) {
  const payment = await this.prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
  });

  // Không refund 2 lần
  if (payment.status === 'REFUNDED') {
    throw new ConflictException('Payment already refunded');
  }
  if (payment.status !== 'SUCCEEDED') {
    throw new BadRequestException(`Cannot refund payment with status ${payment.status}`);
  }
  if (!payment.stripePaymentIntentId) {
    throw new BadRequestException('No Stripe payment to refund');
  }

  // Idempotency key cho refund
  const refund = await this.stripe.refunds.create(
    {
      payment_intent: payment.stripePaymentIntentId,
      reason: reason === 'fraud' ? 'fraudulent' : 'requested_by_customer',
    },
    { idempotencyKey: `refund-${paymentId}` }
  );

  // Update local DB
  await this.prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'REFUNDED',
      stripeRefundId: refund.id,
      refundedAt: new Date(),
    },
  });

  return { refundId: refund.id, amount: refund.amount };
}
```

---

## 7. Reconciliation — đối soát cuối ngày

```typescript
// Chạy cron 00:00 hàng ngày
async dailyReconciliation(date: Date) {
  const startOfDay = startOfDay(date);
  const endOfDay = endOfDay(date);

  // Lấy tất cả payments SUCCEEDED trong ngày từ DB
  const dbPayments = await this.prisma.payment.findMany({
    where: {
      status: 'SUCCEEDED',
      paidAt: { gte: startOfDay, lte: endOfDay },
    },
  });

  // Lấy từ Stripe
  const stripeCharges = await this.stripe.charges.list({
    created: {
      gte: Math.floor(startOfDay.getTime() / 1000),
      lte: Math.floor(endOfDay.getTime() / 1000),
    },
    limit: 100,
  });

  const dbTotal = dbPayments.reduce((sum, p) => sum + p.amountCents, 0);
  const stripeTotal = stripeCharges.data.reduce((sum, c) => sum + c.amount, 0);

  if (dbTotal !== stripeTotal) {
    // Alert! Có discrepancy
    await this.alertService.send({
      message: `Reconciliation mismatch on ${date.toISOString()}`,
      dbTotal,
      stripeTotal,
      diff: stripeTotal - dbTotal,
    });

    // Tìm payments trong Stripe nhưng không có trong DB
    const dbIntentIds = new Set(dbPayments.map(p => p.stripePaymentIntentId));
    const missing = stripeCharges.data.filter(c => !dbIntentIds.has(c.payment_intent as string));

    for (const charge of missing) {
      console.error(`Missing payment for charge ${charge.id}`);
      // Manual investigation cần thiết
    }
  }
}
```

---

## 8. Stripe CLI — test webhook locally

```powershell
# Terminal riêng — forward events Stripe về local
npm run stripe:listen
# = stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger payment_intent.succeeded

# Trigger với specific amount
stripe trigger payment_intent.succeeded \
  --override payment_intent:amount=1999
```

**Test từng event type:**

```powershell
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

---

## 9. Những lỗi hay gặp và cách tránh

```
❌ Lỗi 1: Verify signature sau khi parse body
  app.use(express.json())  ← parse body TRƯỚC verify
  → Stripe signature fail vì body bị transform

  ✅ Fix: raw body cho webhook route
  app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
  app.use(express.json());  // các route khác dùng parsed json

❌ Lỗi 2: Respond 200 sau khi xử lý xong
  await processEvent(event);  ← nếu crash ở đây, Stripe timeout, retry
  return { received: true };  ← không bao giờ reach

  ✅ Fix: Respond 200 trước, xử lý async (qua Kafka hoặc background job)
  await this.saveEventIdForIdempotency(event.id);
  this.processEventAsync(event);  // không await
  return { received: true };

❌ Lỗi 3: Không verify signature trong dev
  if (process.env.NODE_ENV === 'development') skip verify  ← KHÔNG BAO GIỜ
  → Ai cũng có thể gửi fake webhook tới dev server

  ✅ Fix: Dùng Stripe CLI, luôn verify
```

---

## Bài tập thực hành

```
1. Test idempotency:
   → Dùng Stripe CLI gửi cùng 1 event 2 lần
   → Verify WebhookEvent chỉ có 1 record với status=PROCESSED
   → Verify Subscription chỉ được UPDATE 1 lần

2. Simulate crash:
   → Thêm throw new Error() sau UPDATE Payment nhưng trước UPDATE Subscription
   → Gửi webhook
   → Check: Payment SUCCEEDED, Subscription vẫn PENDING? (inconsistent!)
   → Fix: wrap trong $transaction

3. Reconciliation query:
   SELECT
     COUNT(*) FILTER (WHERE status = 'SUCCEEDED') as db_count,
     SUM("amountCents") FILTER (WHERE status = 'SUCCEEDED') as db_total
   FROM "Payment"
   WHERE "paidAt" >= CURRENT_DATE;
   → Compare với Stripe Dashboard numbers

4. Partial refund:
   → Implement refund chỉ 50% amount
   → status mới: PARTIALLY_REFUNDED
   → Đảm bảo không refund quá 100%
```

## Luyện phỏng vấn

Câu hỏi phỏng vấn kèm đáp án về bảo mật API, thanh toán chống trùng và các pattern chịu lỗi: [interview-backend-security.md](./interview-backend-security.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **3. Backend (NestJS)** — bài 7/8.

- Bài trước: [learn-reliability-patterns.md](./learn-reliability-patterns.md) — Outbox, timeout, retry, consumer idempotent, circuit breaker
- **Bài tiếp: [learn-security-backend.md](./learn-security-backend.md)** — Bảo mật API theo OWASP API Top 10

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
