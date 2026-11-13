# Học PostgreSQL — Từ Project Này

## 1. EXPLAIN ANALYZE — đọc query plan

Kỹ năng số 1. Chạy thử ngay:

```sql
EXPLAIN ANALYZE
SELECT * FROM "SrsCard"
WHERE "userId" = 1
  AND "nextReviewAt" <= NOW()
ORDER BY "nextReviewAt" ASC
LIMIT 20;
```

Kết quả cần đọc được:
```
Bitmap Heap Scan on "SrsCard"
  Recheck Cond: ("userId"=1 AND "nextReviewAt" <= now())
  ->  Bitmap Index Scan on "SrsCard_userId_nextReviewAt_idx"
Planning time: 0.3 ms
Execution time: 0.8 ms   ← mục tiêu < 5ms
```

Phân biệt:
- `Seq Scan` → không dùng index → nguy hiểm khi data lớn
- `Index Scan` → tốt
- `Bitmap Heap Scan` → tốt với nhiều rows
- `Nested Loop` vs `Hash Join` → khi nào cái nào nhanh hơn

---

## 2. Index — hiểu tại sao project chọn thế này

```sql
CREATE INDEX ON "SrsCard" ("userId", "nextReviewAt");
CREATE INDEX ON "SrsCard" ("userId", "contentType", "mastered");
CREATE INDEX ON "CoachProfile" ("isActive", "avgRating");
CREATE INDEX ON "CoachingSession" ("coachId", "scheduledAt");
```

**Partial index — khi chỉ query subset:**

```sql
-- Chỉ index coach đang active (isActive=true chiếm 10% rows)
CREATE INDEX ON "CoachProfile" ("avgRating") WHERE "isActive" = true;
```

**Covering index — tránh heap fetch:**

```sql
-- Query coach search thường dùng
SELECT id, "hourlyRateUsd", "avgRating", "totalSessions"
FROM "CoachProfile"
WHERE "isActive" = true
ORDER BY "avgRating" DESC LIMIT 10;

-- Include đủ cột SELECT → không cần đọc heap
CREATE INDEX ON "CoachProfile" ("isActive", "avgRating" DESC)
  INCLUDE ("hourlyRateUsd", "totalSessions");
```

---

## 3. Transaction + Isolation Level

```sql
-- Double booking: 2 user cùng book coach lúc 8:00
-- Fix bằng SELECT FOR UPDATE
BEGIN;
SELECT id FROM "CoachProfile" WHERE id = 5 FOR UPDATE;
SELECT COUNT(*) FROM "CoachingSession"
WHERE "coachId" = 5 AND "scheduledAt" = '2026-07-10 08:00'
  AND status != 'CANCELED';
-- Nếu 0 → INSERT
INSERT INTO "CoachingSession" ...;
COMMIT;
```

**4 isolation levels:**

```
READ COMMITTED (default): thấy data đã COMMIT → đủ cho hầu hết cases
REPEATABLE READ: snapshot tại BEGIN → dùng cho report/analytics
SERIALIZABLE: chạy như tuần tự → dùng cho financial reconciliation
```

---

## 4. Window Functions

```sql
-- Rank coaches theo rating trong từng price range
SELECT id, "hourlyRateUsd", "avgRating",
  RANK() OVER (
    PARTITION BY ("hourlyRateUsd" / 2000) * 2000
    ORDER BY "avgRating" DESC
  ) AS rank_in_range,
  AVG("avgRating") OVER () AS platform_avg
FROM "CoachProfile" WHERE "isActive" = true;

-- Running total revenue theo tháng
SELECT DATE_TRUNC('month', "createdAt") AS month,
  SUM("amountCents") AS monthly,
  SUM(SUM("amountCents")) OVER (ORDER BY DATE_TRUNC('month', "createdAt")) AS cumulative
FROM "Payment" WHERE status = 'SUCCEEDED'
GROUP BY 1 ORDER BY 1;

-- LAG: phát hiện break trong study streak
SELECT "userId", "date",
  LAG("date") OVER (PARTITION BY "userId" ORDER BY "date") AS prev_date,
  CASE WHEN "date" - LAG("date") OVER (PARTITION BY "userId" ORDER BY "date") = 1
    THEN 'consecutive' ELSE 'break'
  END AS streak_status
FROM "StudySession";
```

---

## 5. JSONB — SubscriptionPlanConfig.features

```sql
-- features là JSONB: ["Bài 1-25", "Kanji N5", "SRS"]
SELECT plan FROM "SubscriptionPlanConfig"
WHERE features @> '["SRS"]'::jsonb;

CREATE INDEX ON "SubscriptionPlanConfig" USING GIN (features);

-- Append feature mà không ghi lại cả mảng
UPDATE "SubscriptionPlanConfig"
SET features = features || '["Video call"]'::jsonb
WHERE plan = 'PRO';
```

---

## 6. CTE — Reconciliation

```sql
WITH revenue AS (
  SELECT COALESCE(SUM("amountCents"), 0) AS total
  FROM "Payment" WHERE status = 'SUCCEEDED'
),
payouts AS (
  SELECT COALESCE(SUM("amountCents"), 0) AS total
  FROM "Payout" WHERE status = 'PAID'
)
SELECT r.total AS gross, p.total AS payouts,
       r.total - p.total AS net_profit
FROM revenue r, payouts p;
```

---

## 7. Phân trang 1 triệu records

### Vấn đề — OFFSET chậm ở trang cuối

```sql
-- Trang 50,000 với OFFSET: PostgreSQL quét 1,000,000 rows để bỏ đi
SELECT * FROM "Vocabulary" ORDER BY id LIMIT 20 OFFSET 1000000;
-- Execution time: 850ms ← không chấp nhận được

EXPLAIN ANALYZE:
  Index Scan on "Vocabulary"
    rows removed by filter: 1,000,000
    Execution time: 850ms
```

### Giải pháp — Keyset Pagination (Cursor)

```sql
-- Trang đầu
SELECT * FROM "Vocabulary"
WHERE "lessonNumber" = 5
ORDER BY id ASC LIMIT 20;
-- row cuối có id = 234

-- Trang tiếp — seek trực tiếp, không scan
SELECT * FROM "Vocabulary"
WHERE "lessonNumber" = 5
  AND id > 234          -- cursor
ORDER BY id ASC LIMIT 20;
-- Execution time: 0.3ms — trang 1 hay trang 50,000 đều như nhau
```

**Implementation trong NestJS:**

```typescript
async findVocab(lessonNumber: number, cursor?: number, limit = 20) {
  const rows = await this.prisma.vocabulary.findMany({
    where: {
      lessonNumber,
      ...(cursor ? { id: { gt: cursor } } : {}),
    },
    orderBy: { id: 'asc' },
    take: limit + 1,  // lấy thêm 1 để check hasMore
  });

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  return {
    data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}
```

### Composite cursor (sort theo nhiều cột)

```sql
-- Payment sort theo createdAt DESC, id DESC
-- row cuối: createdAt='2026-06-01', id=5500

SELECT id, "amountCents", "createdAt"
FROM "Payment"
WHERE "userId" = 1
  AND ("createdAt", id) < ('2026-06-01 10:00', 5500)
ORDER BY "createdAt" DESC, id DESC
LIMIT 20;
```

```typescript
// Encode cursor thành base64
function encodeCursor(row: { id: number; createdAt: Date }): string {
  return Buffer.from(JSON.stringify(row)).toString('base64');
}

function decodeCursor(cursor: string) {
  return JSON.parse(Buffer.from(cursor, 'base64').toString());
}
```

### COUNT(*) trên bảng lớn

```sql
-- ❌ Chậm — quét toàn bảng
SELECT COUNT(*) FROM "Vocabulary";  -- 850ms trên 1M rows

-- ✅ Estimate từ statistics (< 1ms, sai lệch ~1-5%)
SELECT reltuples::bigint AS estimate
FROM pg_class WHERE relname = 'Vocabulary';
```

### So sánh

| | OFFSET page 1 | OFFSET page 50,000 | Cursor page 50,000 |
|---|---|---|---|
| Rows scanned | 20 | 1,000,020 | 20 |
| Execution time | 0.3ms | 850ms | 0.3ms |
| Jump to page N | ✅ | ✅ | ❌ |
| Stable khi data thay đổi | ✅ | ❌ | ✅ |

**Dùng OFFSET khi:** dataset nhỏ, cần jump to page N, admin report
**Dùng Cursor khi:** infinite scroll, dataset lớn, real-time data

---

## Bài tập thực hành

```
1. EXPLAIN ANALYZE 5 query trong project
   → Tìm 1 Seq Scan → thêm index → đo lại

2. Reproduce double booking:
   → 2 psql session, cùng INSERT CoachingSession
   → Fix bằng SELECT FOR UPDATE

3. Implement cursor pagination cho Payment history
   → Sort theo createdAt DESC
   → Encode cursor thành base64

4. So sánh COUNT(*) vs reltuples:
   SELECT COUNT(*) FROM "Vocabulary";
   SELECT reltuples::bigint FROM pg_class WHERE relname = 'Vocabulary';
   → Kết quả sai lệch bao nhiêu?
```

## Luyện phỏng vấn

Câu hỏi phỏng vấn kèm đáp án: NestJS, Kafka, PostgreSQL, thiết kế bảng trong [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md); câu hỏi Senior chung (race condition, thanh toán, system design) trong [interview-questions.md](./interview-questions.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **4. Cơ sở dữ liệu** — bài 2/6.

- Bài trước: [learn-sql.md](./learn-sql.md) — SQL trên DB thật: SELECT → JOIN → CTE → window → UPSERT → JSONB
- **Bài tiếp: [learn-pgadmin.md](./learn-pgadmin.md)** — Dùng pgAdmin với DB của project

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
