-- Prisma sở hữu bảng (packages/prisma-nihongo/migrations).
-- Flyway sở hữu read model: view và materialized view.
-- Chạy sau khi bảng "User", "StudySession", "StudyStreak", "DailyActivity" đã có
-- (docker-compose: service flyway chờ prisma-migrate xong).
--
-- Flyway chạy với defaultSchema=flyway: bảng flyway_schema_history nằm ngoài
-- public để `prisma migrate dev` không coi nó là drift. Lúc migrate, search_path
-- bắt đầu bằng schema flyway, nên mọi tên dưới đây đều ghi rõ public.
--
-- DailyActivity là một dòng cho mỗi (user, ngày, loại hoạt động) thay vì
-- nhồi vocabCount/kanjiCount vào StudySession. Đó là dạng chuẩn hóa.
-- View dưới đây JOIN các bảng đó lại khi cần đọc theo ngày.
-- Materialized view là bản gom sẵn, có unique index theo userId, để khỏi
-- SUM cả lịch sử mỗi lần mở trang tiến độ.

DROP MATERIALIZED VIEW IF EXISTS public.learner_progress_summary;
DROP VIEW IF EXISTS public.learner_daily_study;

-- Một ngày có thể chỉ có StudySession, chỉ có DailyActivity, hoặc cả hai.
-- Lấy tập ngày từ cả hai bảng trước rồi mới LEFT JOIN, để không ngày nào bị rơi.
-- DailyActivity.date là chuỗi 'YYYY-MM-DD' còn StudySession.date là kiểu date,
-- nên phải ép kiểu mới so được.
CREATE VIEW public.learner_daily_study AS
WITH days AS (
  SELECT "userId", date AS "studyDate" FROM public."StudySession"
  UNION
  SELECT "userId", date::date FROM public."DailyActivity"
)
SELECT
  d."userId",
  d."studyDate",
  COALESCE(s.seconds, 0)::int AS seconds,
  COALESCE(s."cardsReviewed", 0)::int AS "cardsReviewed",
  COALESCE(v.count, 0)::int AS "vocabCount",
  COALESCE(k.count, 0)::int AS "kanjiCount"
FROM days d
LEFT JOIN public."StudySession" s
  ON s."userId" = d."userId"
 AND s.date = d."studyDate"
LEFT JOIN public."DailyActivity" v
  ON v."userId" = d."userId"
 AND v.date = to_char(d."studyDate", 'YYYY-MM-DD')
 AND v.kind = 'vocab'
LEFT JOIN public."DailyActivity" k
  ON k."userId" = d."userId"
 AND k.date = to_char(d."studyDate", 'YYYY-MM-DD')
 AND k.kind = 'kanji';

CREATE MATERIALIZED VIEW public.learner_progress_summary AS
SELECT
  u.id AS "userId",
  COALESCE(st."currentStreak", 0)::int AS "currentStreak",
  COALESCE(st."longestStreak", 0)::int AS "longestStreak",
  COALESCE(sess.total_seconds, 0)::int AS "totalSeconds",
  COALESCE(sess.total_cards, 0)::int AS "totalCards",
  COALESCE(act.vocab_total, 0)::int AS "vocabTotal",
  COALESCE(act.kanji_total, 0)::int AS "kanjiTotal"
FROM public."User" u
LEFT JOIN public."StudyStreak" st ON st."userId" = u.id
LEFT JOIN (
  SELECT "userId", SUM(seconds) AS total_seconds, SUM("cardsReviewed") AS total_cards
  FROM public."StudySession"
  GROUP BY "userId"
) sess ON sess."userId" = u.id
LEFT JOIN (
  SELECT
    "userId",
    SUM(count) FILTER (WHERE kind = 'vocab') AS vocab_total,
    SUM(count) FILTER (WHERE kind = 'kanji') AS kanji_total
  FROM public."DailyActivity"
  GROUP BY "userId"
) act ON act."userId" = u.id
WHERE st."userId" IS NOT NULL
   OR sess."userId" IS NOT NULL
   OR act."userId" IS NOT NULL;

-- REFRESH ... CONCURRENTLY bắt buộc có unique index.
CREATE UNIQUE INDEX learner_progress_summary_user_idx
  ON public.learner_progress_summary ("userId");
