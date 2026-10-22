-- Read model của pipeline Airflow "learner_insights" (infra/airflow/dags/learner_insights.py).
-- Airflow GHI các bảng này mỗi đêm; gateway chỉ ĐỌC (trang admin) và nhận yêu cầu gửi email.
-- Schema riêng `insights`: Prisma chỉ quản public nên không coi là drift.
-- Mọi bảng khóa theo ngày: chạy lại một ngày (retry, backfill) là ghi đè đúng ngày đó, không nhân đôi.

CREATE SCHEMA IF NOT EXISTS insights;

-- Hoạt động của từng học viên trong một ngày (gom từ learner_daily_study + ExamResult)
CREATE TABLE IF NOT EXISTS insights.learner_day (
  day               date        NOT NULL,
  user_id           integer     NOT NULL,
  seconds           integer     NOT NULL DEFAULT 0 CHECK (seconds >= 0),
  cards_reviewed    integer     NOT NULL DEFAULT 0 CHECK (cards_reviewed >= 0),
  vocab_count       integer     NOT NULL DEFAULT 0 CHECK (vocab_count >= 0),
  kanji_count       integer     NOT NULL DEFAULT 0 CHECK (kanji_count >= 0),
  exams_taken       integer     NOT NULL DEFAULT 0 CHECK (exams_taken >= 0),
  exam_avg_percent  numeric(5, 2),
  computed_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, user_id)
);

-- Học viên có nguy cơ bỏ học tính tại ngày `day`
CREATE TABLE IF NOT EXISTS insights.churn_risk (
  day                date        NOT NULL,
  user_id            integer     NOT NULL,
  risk_score         integer     NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  days_inactive      integer     NOT NULL,
  active_days_prior  integer     NOT NULL,
  due_cards          integer     NOT NULL DEFAULT 0,
  last_active_day    date        NOT NULL,
  reasons            text[]      NOT NULL DEFAULT '{}',
  computed_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, user_id)
);
CREATE INDEX IF NOT EXISTS churn_risk_day_score_idx ON insights.churn_risk (day, risk_score DESC);

-- Chỉ số toàn hệ thống mỗi ngày (trang admin)
CREATE TABLE IF NOT EXISTS insights.daily_kpi (
  day              date        PRIMARY KEY,
  active_learners  integer     NOT NULL,
  new_learners     integer     NOT NULL,
  at_risk          integer     NOT NULL,
  total_seconds    bigint      NOT NULL,
  cards_reviewed   bigint      NOT NULL,
  exams_taken      integer     NOT NULL,
  computed_at      timestamptz NOT NULL DEFAULT now()
);

-- Email kéo học viên quay lại: mỗi học viên tối đa một lần / 7 ngày.
-- Airflow GIÀNH dòng (pending) trước khi gọi gateway; gọi xong mới đánh dấu sent. Task chạy lại
-- sau khi gateway đã gửi nhưng chưa kịp đánh dấu → gửi lại batch pending, gateway chặn trùng theo
-- (user, ngày) bằng bảng CronRun.
CREATE TABLE IF NOT EXISTS insights.reengagement (
  user_id     integer     NOT NULL,
  day         date        NOT NULL,
  status      text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped')),
  claimed_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz,
  PRIMARY KEY (user_id, day)
);
CREATE INDEX IF NOT EXISTS reengagement_user_day_idx ON insights.reengagement (user_id, day DESC);
