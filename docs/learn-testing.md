# Học Testing — Từ Project Này

Cách dùng Jest cụ thể (mock, fake timers, NestJS testing module, supertest, coverage): xem [learn-jest.md](./learn-jest.md).

## 1. Triết lý testing của senior

```
Junior:  viết test để coverage đạt 80%
Senior:  test những gì có thể sai theo cách quan trọng

Không test:                          Nên test:
- Framework code (NestJS guards)     - Business logic (SM-2 algorithm)
- Prisma ORM internals               - Idempotency (webhook, booking)
- Third-party SDKs (Stripe SDK)      - Transaction correctness
- Getters/setters đơn giản           - Edge cases trong payment flow
- Config files                       - Auth logic
```

---

## 2. Phân loại test

```
Unit Test           Integration Test        E2E Test
─────────           ────────────────        ────────
Test 1 function     Test nhiều layers       Test full flow
No DB, No HTTP      Real DB, no HTTP        Real DB + HTTP
< 5ms               < 200ms                 < 2s
Nhiều nhất          Trung bình              Ít nhất

Ví dụ project:
SM-2 algorithm      WebhookService          POST /subscriptions
calculateNextReview BookingService          → Stripe → webhook
formatPrice()       với real PostgreSQL     → subscription active
```

---

## 3. Unit Test — SM-2 Algorithm

Đây là thuật toán quan trọng nhất trong project, pure function → dễ test nhất.

```typescript
// services/exam-service/src/srs/srs.algorithm.ts
export function calculateNextReview(card: SrsCardState, quality: number): SrsCardState {
  if (quality < 3) {
    return { ...card, interval: 0, repetitions: 0, nextReviewAt: addDays(new Date(), 0) };
  }

  let interval: number;
  if (card.repetitions === 0)      interval = 1;
  else if (card.repetitions === 1) interval = 6;
  else interval = Math.round(card.interval * card.easeFactor);

  const easeFactor = Math.max(1.3, card.easeFactor + 0.1 * (quality - 5));

  return {
    ...card,
    interval,
    repetitions: card.repetitions + 1,
    easeFactor,
    mastered: interval >= 21,
    nextReviewAt: addDays(new Date(), interval),
  };
}
```

```typescript
// services/exam-service/src/srs/srs.algorithm.spec.ts
describe('SM-2 calculateNextReview', () => {
  const baseCard: SrsCardState = {
    interval: 6,
    repetitions: 2,
    easeFactor: 2.5,
    mastered: false,
  };

  describe('quality < 3 (wrong answer)', () => {
    it('should reset interval to 0', () => {
      const result = calculateNextReview(baseCard, 2);
      expect(result.interval).toBe(0);
    });

    it('should reset repetitions to 0', () => {
      const result = calculateNextReview(baseCard, 0);
      expect(result.repetitions).toBe(0);
    });

    it('should not change easeFactor on wrong answer', () => {
      const result = calculateNextReview(baseCard, 2);
      expect(result.easeFactor).toBe(baseCard.easeFactor);
    });
  });

  describe('quality >= 3 (correct answer)', () => {
    it('should set interval=1 on first repetition', () => {
      const firstCard = { ...baseCard, repetitions: 0, interval: 0 };
      const result = calculateNextReview(firstCard, 5);
      expect(result.interval).toBe(1);
    });

    it('should set interval=6 on second repetition', () => {
      const secondCard = { ...baseCard, repetitions: 1, interval: 1 };
      const result = calculateNextReview(secondCard, 5);
      expect(result.interval).toBe(6);
    });

    it('should multiply interval by easeFactor after 2 reps', () => {
      // interval=6, easeFactor=2.5 → 6*2.5=15
      const result = calculateNextReview(baseCard, 5);
      expect(result.interval).toBe(15);
    });

    it('should increase easeFactor on quality 5', () => {
      const result = calculateNextReview(baseCard, 5);
      expect(result.easeFactor).toBeCloseTo(2.5);  // 2.5 + 0.1*(5-5) = 2.5
    });

    it('should decrease easeFactor on quality 3', () => {
      const result = calculateNextReview(baseCard, 3);
      // 2.5 + 0.1*(3-5) = 2.3
      expect(result.easeFactor).toBeCloseTo(2.3);
    });

    it('should never go below minimum easeFactor of 1.3', () => {
      const lowCard = { ...baseCard, easeFactor: 1.3 };
      const result = calculateNextReview(lowCard, 3);
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
    });
  });

  describe('mastered flag', () => {
    it('should mark as mastered when interval >= 21', () => {
      // interval=10, easeFactor=2.5 → next=25
      const almostMasteredCard = { ...baseCard, interval: 10, repetitions: 3 };
      const result = calculateNextReview(almostMasteredCard, 5);
      expect(result.mastered).toBe(true);
    });

    it('should not mark as mastered when interval < 21', () => {
      const result = calculateNextReview(baseCard, 5);
      // 6*2.5=15 < 21
      expect(result.mastered).toBe(false);
    });
  });

  describe('nextReviewAt', () => {
    it('should schedule review for today on wrong answer', () => {
      const result = calculateNextReview(baseCard, 1);
      const today = new Date();
      expect(result.nextReviewAt.toDateString()).toBe(today.toDateString());
    });

    it('should schedule review for correct interval days ahead', () => {
      const result = calculateNextReview(baseCard, 5);
      const expected = addDays(new Date(), result.interval);
      expect(result.nextReviewAt.toDateString()).toBe(expected.toDateString());
    });
  });
});
```

---

## 4. Unit Test — formatPrice utility

```typescript
// apps/nihongo-web/src/utils/format.spec.ts
describe('formatPrice', () => {
  it('returns "Miễn phí" for 0 cents', () => {
    expect(formatPrice(0, 1)).toBe('Miễn phí');
  });

  it('formats monthly price', () => {
    expect(formatPrice(999, 1)).toBe('$9.99/tháng');
  });

  it('formats annual price when intervalMonths >= 12', () => {
    expect(formatPrice(9900, 12)).toBe('$99.00/năm');
  });

  it('handles cents that need rounding', () => {
    expect(formatPrice(1999, 1)).toBe('$19.99/tháng');
  });
});
```

---

## 5. Integration Test — WebhookService với real DB

```typescript
// services/payment-service/src/webhook/webhook.service.integration.spec.ts
describe('WebhookService Integration', () => {
  let service: WebhookService;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Dùng test DB riêng — không mock Prisma
    const module = await Test.createTestingModule({
      imports: [
        PrismaModule,  // kết nối real test DB
        StripeModule,
      ],
      providers: [WebhookService, NotificationService],
    }).compile();

    service = module.get(WebhookService);
    prisma = module.get(PrismaService);
  });

  beforeEach(async () => {
    // Clean slate trước mỗi test
    await prisma.$executeRaw`TRUNCATE "WebhookEvent", "Payment", "Subscription" CASCADE`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('idempotency', () => {
    it('should process event only once on duplicate delivery', async () => {
      // Setup: user + subscription + payment
      const user = await prisma.user.create({ data: { email: 'test@test.com', passwordHash: 'x' } });
      const sub = await prisma.subscription.create({
        data: { userId: user.id, plan: 'PRO', status: 'TRIALING', stripeCustomerId: 'cus_test' },
      });
      const payment = await prisma.payment.create({
        data: {
          userId: user.id,
          subscriptionId: sub.id,
          amountCents: 1999,
          status: 'PENDING',
          stripePaymentIntentId: 'pi_test_123',
        },
      });

      const fakeEvent = {
        id: 'evt_test_001',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123', amount: 1999 } },
      } as unknown as Stripe.Event;

      // Process lần 1
      await service.processEvent(fakeEvent);

      // Process lần 2 (Stripe retry)
      await service.processEvent(fakeEvent);

      // Verify: chỉ 1 WebhookEvent
      const webhookEvents = await prisma.webhookEvent.findMany({
        where: { eventId: 'evt_test_001' },
      });
      expect(webhookEvents).toHaveLength(1);
      expect(webhookEvents[0].status).toBe('PROCESSED');

      // Verify: Payment chỉ SUCCEEDED 1 lần (không tạo thêm record)
      const payments = await prisma.payment.findMany({
        where: { stripePaymentIntentId: 'pi_test_123' },
      });
      expect(payments).toHaveLength(1);
      expect(payments[0].status).toBe('SUCCEEDED');
    });

    it('should rollback if subscription update fails', async () => {
      // Simulate crash sau UPDATE Payment nhưng trước UPDATE Subscription
      jest.spyOn(prisma.subscription, 'update').mockRejectedValueOnce(new Error('DB error'));

      const fakeEvent = { /* ... */ } as Stripe.Event;

      await expect(service.processEvent(fakeEvent)).rejects.toThrow('DB error');

      // Verify: Payment vẫn PENDING (transaction rolled back)
      const payment = await prisma.payment.findFirst({ where: { stripePaymentIntentId: 'pi_test_123' } });
      expect(payment?.status).toBe('PENDING');  // không phải SUCCEEDED
    });
  });
});
```

---

## 6. Integration Test — BookingService double-book prevention

```typescript
describe('BookingService', () => {
  it('should prevent double booking same slot', async () => {
    const coachId = 1;
    const scheduledAt = new Date('2026-08-01T09:00:00Z');

    // Simulate concurrent requests
    const [result1, result2] = await Promise.allSettled([
      service.bookSession({ learnerId: 10, coachId, scheduledAt }),
      service.bookSession({ learnerId: 11, coachId, scheduledAt }),
    ]);

    // Một cái thành công, một cái fail
    const succeeded = [result1, result2].filter(r => r.status === 'fulfilled');
    const failed = [result1, result2].filter(r => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason.message)
      .toMatch(/slot.*taken|conflict/i);

    // Chỉ 1 CoachingSession trong DB
    const sessions = await prisma.coachingSession.findMany({
      where: { coachId, scheduledAt },
    });
    expect(sessions).toHaveLength(1);
  });
});
```

---

## 7. E2E Test — full subscription flow

```typescript
// test/subscription.e2e.spec.ts
describe('Subscription Flow (E2E)', () => {
  let app: INestApplication;
  let authToken: string;
  let stripeClient: Stripe;

  beforeAll(async () => {
    // Boot full app
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Login để lấy token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@edu.app', password: 'password123' });

    authToken = loginRes.body.accessToken;
  });

  it('should complete PRO subscription purchase', async () => {
    // Step 1: Tạo subscription → nhận clientSecret
    const createRes = await request(app.getHttpServer())
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ plan: 'PRO' })
      .expect(201);

    expect(createRes.body.clientSecret).toBeTruthy();
    expect(createRes.body.clientSecret).toMatch(/^pi_.*_secret_/);

    // Step 2: Confirm payment bằng Stripe test card
    const intentId = createRes.body.paymentIntentId;
    await stripeClient.paymentIntents.confirm(intentId, {
      payment_method: 'pm_card_visa',  // Stripe test card
    });

    // Step 3: Simulate webhook (hoặc đợi Stripe CLI forward)
    await triggerStripeWebhook('payment_intent.succeeded', intentId);

    // Step 4: Verify subscription active
    await waitFor(async () => {
      const statusRes = await request(app.getHttpServer())
        .get('/api/subscriptions/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusRes.body.status).toBe('ACTIVE');
      expect(statusRes.body.plan).toBe('PRO');
    }, { timeout: 5000 });
  });
});

async function waitFor(fn: () => Promise<void>, opts: { timeout: number }) {
  const start = Date.now();
  while (Date.now() - start < opts.timeout) {
    try {
      await fn();
      return;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error(`waitFor timeout after ${opts.timeout}ms`);
}
```

---

## 8. Cấu hình test environment

```typescript
// jest.config.ts (root)
export default {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/*.spec.ts'],
      testPathIgnorePatterns: ['**/*.integration.spec.ts', '**/*.e2e.spec.ts'],
    },
    {
      displayName: 'integration',
      testMatch: ['**/*.integration.spec.ts'],
      globalSetup: './test/setup-integration.ts',
      globalTeardown: './test/teardown-integration.ts',
    },
    {
      displayName: 'e2e',
      testMatch: ['**/*.e2e.spec.ts'],
      globalSetup: './test/setup-e2e.ts',
    },
  ],
};
```

```typescript
// test/setup-integration.ts
export default async function setup() {
  // Start test DB nếu chưa chạy
  process.env.DATABASE_URL = 'postgresql://nihongo:nihongo@localhost:5433/nihongo_test';
  // Run migrations
  execSync('npm run migrate:deploy -w @edu/prisma-nihongo');
}
```

**Scripts trong package.json:**

```json
{
  "scripts": {
    "test": "jest --selectProjects unit",
    "test:integration": "jest --selectProjects integration",
    "test:e2e": "jest --selectProjects e2e",
    "test:all": "jest",
    "test:coverage": "jest --selectProjects unit --coverage"
  }
}
```

---

## 9. Những gì KHÔNG nên test

```typescript
// ❌ Không test Prisma CRUD đơn giản
it('should create user', async () => {
  const user = await prisma.user.create({ data: { email: 'x@x.com' } });
  expect(user.email).toBe('x@x.com');  // test Prisma, không phải logic
});

// ❌ Không mock DB trong integration test
jest.mock('@prisma/client');  // BAO GIỜ mock Prisma trong integration
// → Pass test nhưng production fail vì query sai

// ❌ Không test implementation details
it('should call prisma.payment.update once', () => {
  expect(prisma.payment.update).toHaveBeenCalledTimes(1);  // fragile
});

// ✅ Test behavior, không phải implementation
it('should mark payment as succeeded', async () => {
  await service.onPaymentSucceeded(intent);
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  expect(payment?.status).toBe('SUCCEEDED');  // test outcome
});
```

---

## Bài tập thực hành

```
1. Unit test SM-2: thêm 10 test cases edge case
   → quality=0 sau đó quality=5 nhiều lần → easeFactor tăng đúng không?
   → interval có bao giờ âm không?

2. Integration test idempotency:
   → Gửi cùng 1 webhook event 5 lần
   → Assert WebhookEvent.count = 1
   → Assert Payment.status = 'SUCCEEDED' (không phải 5 lần SUCCEEDED)

3. Integration test booking conflict:
   → 10 concurrent requests book cùng 1 slot
   → Assert chỉ 1 CoachingSession được tạo
   → Assert 9 requests nhận lỗi conflict

4. E2E test cancel subscription:
   → Create subscription → cancel → verify status=CANCELED
   → Cancel lần 2 → verify nhận lỗi 409 (không cancel lần 2)
```
