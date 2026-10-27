# Database Design — EDU APP Nihongo

## Tổng quan

| DB | Engine | Port | Dùng bởi |
|----|--------|------|----------|
| `nihongo` | PostgreSQL 16 (`edu-postgres-nihongo`) | 5433 | api-gateway, content-service, exam-service |
| `nihongo_audit` | MongoDB 7 | 27017 | api-gateway (`AuditInterceptor`) |

PostgreSQL: DB `nihongo`, credentials `nihongo:nihongo`.
MongoDB: TTL index 90 ngày trên audit_logs — tự dọn sạch, không cần cron.

---

## DB nihongo

### Sơ đồ quan hệ

Sơ đồ ER đầy đủ (107 bảng, chia 8 phân hệ, kèm cột/khóa) nằm ở **[db-erd.md](db-erd.md)** — tự sinh từ
`schema.prisma`: `npm run db:erd` ở root (chạy lại mỗi khi đổi schema).

Tổng quan liên kết giữa các phân hệ (mũi tên: bảng cha → bảng con, quan hệ 1–n):

```mermaid
flowchart LR
  subgraph CONTENT[Nội dung học]
    Lesson --> Vocabulary & Grammar & Exercise & ReadingPassage
    Grammar --> Example
    Exercise --> ExerciseOption
    KanjiLesson --> KanjiEntry --> KanjiVocab
    Vocabulary -.-> VocabularyKanjiLink -.-> KanjiEntry
    Vocabulary --> VocabularyExample
    TextbookSeries --> TextbookBook
    MindMapLevel
  end
  subgraph USER[Người dùng]
    User
  end
  subgraph PROGRESS[Tiến độ học]
    SrsCard & ExamResult & StudySession & DailyGoal & ReadingAttempt & DictationAttempt
  end
  subgraph PAY[Thanh toán & coach]
    Subscription & CoachProfile & CoachingSession & Payment & Payout
  end
  subgraph COMM[Giao tiếp]
    ChatMessage & Notification & SupportThread & LearnerChatRoom
  end
  subgraph JLPT[JLPT]
    JlptExamSession & JlptRoadmapLevel & MockExamTemplate
  end
  subgraph STATIC[Tham chiếu & trang tĩnh]
    Kana[Kana / đếm số / phát âm / katakana] & Pages[Trang chủ / giao tiếp / nghe / audio sách / banner]
  end
  USER --> PROGRESS
  ReadingPassage --> ReadingAttempt
  Vocabulary --> DictationAttempt
  USER --> PAY
  USER --> COMM
  CoachProfile --> CoachingSession
```

- `Lesson.textbook` (enum `Textbook`: MINNA/KLL/SOUMATOME/SHINKANZEN/TRY) tách bài theo giáo trình; bài giáo trình đánh số
  `base + cấp×1000 + phần×100 + bài` (SM 20000, SK 30000, TRY 40000) và bị loại khỏi truy vấn "theo cấp" (`@app/prisma/level-pool`).
- `TextbookSeries`/`TextbookBook`: danh mục giáo trình tham khảo (menu, lộ trình học) — seed từ `infra/postgres/nihongo-content-seed.sql`.
- `MindMapLevel`: sơ đồ tư duy chủ đề (kind × level), nhánh lưu JSON — seed từ `infra/postgres/nihongo-content-seed.sql`, sửa ở trang admin.

### Chi tiết bảng quan trọng

#### `SrsCard` — Spaced Repetition SM-2

```
userId      → User.id
contentType → VOCABULARY | GRAMMAR | KANJI
contentId   → Vocabulary.id | Grammar.id | KanjiEntry.id

SM-2 fields:
  easeFactor     Float   default 2.5
  interval       Int     default 0       (ngày)
  repetitions    Int     default 0
  nextReviewAt   DateTime?
  lastReviewedAt DateTime?

Stats:
  correctCount  Int     default 0
  wrongCount    Int     default 0
  reviewStreak  Int     default 0
  mastered      Boolean default false   (true khi interval >= 21)

Unique: (userId, contentType, contentId)
Index:  (userId, nextReviewAt)           — lấy cards cần review hôm nay
Index:  (userId, contentType, mastered)  — lọc theo loại + trạng thái
```

**SM-2 Algorithm:**
```
quality 0-2 (sai/quên):
  interval = 0
  repetitions = 0
  easeFactor không thay đổi

quality 3-5 (đúng):
  if repetitions == 0: interval = 1
  if repetitions == 1: interval = 6
  else: interval = round(interval * easeFactor)
  repetitions += 1
  easeFactor = max(1.3, easeFactor + 0.1 * (quality - 5))

nextReviewAt = now + interval days
mastered = (interval >= 21)
```

#### `Subscription` — Stripe subscription lifecycle

```
userId               → User.id (unique — 1 user 1 subscription)
plan                 → FREE | BASIC | PRO | PRO_ANNUAL
status               → ACTIVE | PAST_DUE | CANCELED | TRIALING | PAUSED
stripeCustomerId     → Stripe Customer ID
stripeSubscriptionId → Stripe Subscription ID (unique)

Index: (stripeCustomerId)  — lookup khi xử lý webhook
Index: (status)            — query active subscribers

Status transitions (via Stripe webhook):
  TRIALING → ACTIVE (sau trial kết thúc + payment success)
  ACTIVE   → PAST_DUE (payment thất bại)
  PAST_DUE → ACTIVE (payment retry thành công)
  ACTIVE   → CANCELED (user cancel hoặc max retry fail)
```

#### `CoachProfile` — Coach marketplace listing

```
userId          → User.id (unique — 1 user 1 coach profile)
hourlyRateUsd   Int (cents: 5000 = $50/hr)
isActive        Boolean default false  — admin approve trước khi hiển thị
avgRating       Float?  — denormalized, cập nhật sau mỗi review
totalSessions   Int     — denormalized, cập nhật sau mỗi COMPLETED session
stripeAccountId String? — Stripe Connect Express account
payoutEnabled   Boolean — true sau khi coach complete Stripe onboarding

Index: (isActive, avgRating)      — search + sort theo rating
Index: (isActive, hourlyRateUsd)  — filter theo giá
```

#### `CoachingSession` — Booking

```
learnerId          → User.id
coachId            → CoachProfile.id
status             → PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELED | NO_SHOW
scheduledAt        DateTime
priceUsdCents      Int  — snapshot tại thời điểm book (tránh thay đổi sau)
platformFeePercent Int  default 20

Conflict check: findFirst WHERE coachId=? AND scheduledAt=? AND status != CANCELED

Index: (learnerId, scheduledAt)  — lịch học của learner
Index: (coachId, scheduledAt)    — lịch dạy của coach
Index: (status, scheduledAt)     — admin overview
```

#### `Payment` — Mọi giao dịch

```
Liên kết với một trong hai (không đồng thời):
  subscriptionId → Subscription.id  (recurring billing)
  sessionId      → CoachingSession.id (unique — 1 session 1 payment)

stripePaymentIntentId String? unique  — idempotency key với Stripe

Status flow:
  PENDING → SUCCEEDED (webhook: payment_intent.succeeded)
  PENDING → FAILED    (webhook: payment_intent.payment_failed)
  SUCCEEDED → REFUNDED (webhook: charge.refunded)
```

#### `Payout` — Coach nhận tiền (Stripe Connect)

```
grossAmountCents = tổng priceUsdCents các sessions trong period
feeAmountCents   = grossAmountCents * platformFeePercent / 100
amountCents      = grossAmountCents - feeAmountCents

stripeTransferId String? unique  — Stripe Transfer ID

Reconciliation:
  platform_profit = SUM(payment.amountCents WHERE SUCCEEDED)
                  - SUM(payout.amountCents WHERE PAID)
```

#### `SubscriptionPlanConfig` — Cấu hình gói (seeded)

```
id              Int      auto-increment
plan            SubscriptionPlan  unique
displayName     String
priceUsdCents   Int
intervalMonths  Int
trialDays       Int
stripePriceId   String?  — Stripe Price ID thực tế (sau khi seed)
features        Json     — mảng String
isActive        Boolean  default true

Dữ liệu seed (sau khi chạy seed-plans.ts):
  FREE       $0          stripePriceId: null
  BASIC      $9.99/mo    stripePriceId: price_1TmsXHR9EzTwyHww08aPARlc  (trial 7d)
  PRO        $19.99/mo   stripePriceId: price_1TmsXIR9EzTwyHwwq8rmK0NB  (trial 7d)
  PRO_ANNUAL $99/yr      stripePriceId: price_1TmsXIR9EzTwyHwwzL0JNQ7e  (trial 14d)
```

#### `ChatMessage` — Tin nhắn coaching session (learner ↔ coach)

```
id          Int        auto-increment
sessionId   → CoachingSession.id  ON DELETE CASCADE
senderId    → User.id
content     String
readAt      DateTime?  — null = chưa đọc
createdAt   DateTime   default now()

Index: (sessionId, createdAt)
```

#### `Notification` — Thông báo in-app (poll REST)

```
id        Int
userId    → User.id  ON DELETE CASCADE
type      NotificationType
title     String
body      String
readAt    DateTime?
metadata  Json?
createdAt DateTime

Index: (userId, readAt, createdAt)
```

#### `SupportThread` + `SupportMessage` — Hỗ trợ user ↔ admin

```
SupportThread:
  id, userId (unique → User), lastMessageAt, createdAt, updatedAt
  Index: (lastMessageAt)

SupportMessage:
  id, threadId → SupportThread, senderId → User
  content, readAt, createdAt
  Index: (threadId, createdAt)
```

#### `LearnerChatRoom` + `LearnerChatMember` + `LearnerChatMessage` — Cộng đồng

```
LearnerChatRoom:
  id, name?, type (DIRECT | GROUP), createdById → User
  lastMessageAt, createdAt, updatedAt
  Index: (lastMessageAt), (type)

LearnerChatMember:
  id, roomId → LearnerChatRoom, userId → User
  role (MEMBER | ADMIN), joinedAt
  Unique: (roomId, userId)
  Index: (userId)

LearnerChatMessage:
  id, roomId, senderId, content, readAt, createdAt
  Index: (roomId, createdAt)
```

SQL đầy đủ: [`docs/sql/chat-schema.sql`](./sql/chat-schema.sql)

#### `WebhookEvent` — Idempotency

```
eventId String unique  — Stripe event ID (e.g. "evt_1ABC...")
Khi nhận webhook:
  1. Check eventId tồn tại với status=PROCESSED → skip
  2. Upsert với status=RECEIVED
  3. Process event
  4. Update status=PROCESSED hoặc FAILED
```

#### `StudyStreak` — Tránh recompute

```
currentStreak  — streak ngày học liên tiếp hiện tại
longestStreak  — kỷ lục từ trước
lastStudyDate  YYYY-MM-DD — so sánh với hôm qua khi update

Logic khi upsert StudySession:
  if lastStudyDate == yesterday: currentStreak += 1
  if lastStudyDate == today: không thay đổi
  else: currentStreak = 1  (reset)
  longestStreak = max(longestStreak, currentStreak)
```

#### `DailyGoal` + `DailyGoalItem`

```
Phiên bản cũ: DailyGoal.items Json  → không query/update từng item
Phiên bản mới:
  DailyGoal ──< DailyGoalItem
                  text      String
                  done      Boolean
                  sortOrder Int

PATCH /daily-goal/:id/items/:itemId chỉ UPDATE 1 row thay vì ghi lại cả mảng JSON.
```

### Enums (nihongo DB)

Danh sách đầy đủ 17 enum (tự sinh): xem [db-erd.md#enum](db-erd.md#enum). Hai enum mới nhất:

```
Textbook:     MINNA | KLL | SOUMATOME | SHINKANZEN | TRY      (Lesson.textbook, KanjiLesson.textbook)
MindMapKind:  GRAMMAR | VOCAB | KANJI                         (MindMapLevel.kind, TextbookBook.kinds[])
```

### Migration history (nihongo)

Migrations đã được gộp (squash) thành một baseline ngày 2026-09-26 — project học tập, không có production.
Các migration cũ trước đó được giữ trong `packages/prisma-nihongo/migrations-archive/` (chỉ để tham khảo, Prisma không chạy).

| Tên | Thay đổi chính |
|-----|----------------|
| `20260926130000_baseline` | Toàn bộ schema tại thời điểm squash (user, nội dung, JLPT, thanh toán, chat, email, mind map…) |
| `20260926140000_textbook_lessons` | Enum `Textbook`; cột `Lesson.textbook`, `KanjiLesson.textbook` |
| `20260926160000_textbook_catalog` | Bảng `TextbookSeries`, `TextbookBook` (danh mục giáo trình) |
| `20260929120000_outbox_drop_redundant_indexes` | Bảng `OutboxEvent` (transactional outbox, ADR-0006); xoá 6 index trùng với UNIQUE |
| `20260929180000_processed_event_feature_flag` | `ProcessedEvent` (consumer idempotent), `FeatureFlag` + cờ mặc định `vocab-search-all-lessons` |

Seed dữ liệu: `seed.ts` nạp nội dung học từ `infra/postgres/nihongo-content-seed.sql` (xem [ADR-0007](adr/0007-content-seed-sql-only.md)), rồi gọi các seed con còn lại (`seed:textbooks`, `seed-plans.ts`…).

---

## DB nihongo_audit (MongoDB)

```javascript
// Collection: audit_logs
{
  _id:       ObjectId,
  userId:    Number,      // index
  action:    String,      // index — "marketplace.bookSession"
  resource:  String,      // "marketplace"
  metadata:  Object,      // { method, path, ... }
  ip:        String,
  userAgent: String,
  success:   Boolean,
  durationMs: Number,     // index — performance tracking
  errorMessage: String?,
  createdAt: Date,        // TTL index: 90 ngày (7,776,000 seconds)
}

// Compound indexes:
{ userId: 1, action: 1, createdAt: -1 }
{ createdAt: 1 } expireAfterSeconds: 7776000  // TTL
```

---

## Nguyên tắc thiết kế

### 1. Không dùng Json cho structured data

```
❌ GrammarLesson.examples Json   → ✅ GrammarExample table
❌ GrammarExercise.options Json  → ✅ GrammarExOption table
❌ DailyGoal.items Json          → ✅ DailyGoalItem table
❌ SrsCard.kana/kanji/meaning    → ✅ JOIN sang Vocabulary khi cần
```

Json phù hợp cho: `SubscriptionPlanConfig.features` (unstructured config list), `WebhookEvent.payload` (raw Stripe payload), `Payment.metadata` (optional extra info).

### 2. Denormalization có kiểm soát

```
CoachProfile.avgRating      — tránh AVG(rating) GROUP BY coachId mỗi lần search
CoachProfile.totalSessions  — tránh COUNT(*) mỗi lần hiển thị
SrsCard.mastered            — cache interval >= 21, cập nhật khi review
StudyStreak                 — tránh recompute từ StudySession
```

Chỉ denormalize khi query cost thực sự cao và data đủ ổn định.

### 3. sortOrder trên mọi ordered list

Không dùng `id` hay `createdAt` để sort content. `sortOrder Int default 0` cho phép admin sắp xếp nội dung không phụ thuộc thứ tự insert.

### 4. Composite indexes theo query pattern thực tế

```
(userId, nextReviewAt)           — SRS review queue
(userId, contentType, mastered)  — lọc theo loại + mastery
(lessonId, sortOrder)            — vocab/grammar theo lesson
(isActive, avgRating)            — coach search + sort
(coachId, scheduledAt)           — lịch dạy của coach
(provider, status, createdAt)    — webhook retry queue
```

### 5. Nullable userId = guest mode

`DictationAttempt.userId`, `ReadingAttempt.userId`, `ListeningAttempt.userId` đều nullable. User chưa đăng nhập vẫn luyện tập được, kết quả lưu tạm không gắn account.

### 6. Price in cents (Integer)

Tất cả giá tiền lưu dưới dạng cents (Integer): `hourlyRateUsd: 5000 = $50.00`. Tránh floating point errors khi tính toán tài chính.

### 7. Snapshot pattern cho booking

`CoachingSession.priceUsdCents` lưu giá tại thời điểm book. Khi coach thay đổi giá, các session cũ không bị ảnh hưởng. Tương tự `platformFeePercent` — lưu % tại thời điểm tạo session để reconciliation chính xác.

### 8. Webhook idempotency

`WebhookEvent.eventId` là Stripe event ID (`evt_...`), có UNIQUE constraint. Nếu Stripe gửi lại cùng event (retry), service skip xử lý khi thấy `status = PROCESSED`. Đây là pattern bắt buộc với payment systems.

---

## Backup

Docker phải đang chạy:

```powershell
# Windows (khuyến nghị)
npm run db:backup

# Hoặc thủ công
powershell -NoProfile -ExecutionPolicy Bypass -File infra/backups/backup.ps1
```

```bash
# Linux / macOS / Git Bash
bash infra/backups/backup.sh
```

Script dump vào [`infra/backups/`](../infra/backups/). Snapshot `nihongo_*.sql` / `nihongo_schema_*.sql` **được commit** trong repo (restore nhanh).

| File | Nội dung |
|------|----------|
| `nihongo_YYYYMMDD_HHMMSS.sql` | Full data + schema |
| `nihongo_schema_YYYYMMDD_HHMMSS.sql` | Schema only |

Chi tiết: [`infra/backups/README.md`](../infra/backups/README.md)

## Apply Migration / Schema

```bash
# Nihongo DB
docker compose up -d postgres-nihongo
npm run migrate:deploy -w @edu/prisma-nihongo
npm run generate -w @edu/prisma-nihongo
```
