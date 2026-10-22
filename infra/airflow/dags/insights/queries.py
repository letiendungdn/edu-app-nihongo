"""SQL của pipeline learner_insights.

Mỗi hàm nhận một connection DB-API (psycopg2) và một ngày, chạy trong MỘT transaction, và
idempotent theo ngày: xóa kết quả cũ của ngày đó rồi ghi lại. Retry hay backfill đều không nhân đôi.

Tách khỏi file DAG để test chạy thẳng trên Postgres (tests/test_queries.py), không cần Airflow.
"""

from __future__ import annotations

from contextlib import contextmanager
from datetime import date
from typing import Any, Iterator

# Giờ trong DB là UTC (timestamp không múi giờ); "ngày" của học viên tính theo giờ Việt Nam
VN_DAY = "((%s AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh')::date"

#: Ngưỡng điểm rủi ro để gửi email kéo học viên quay lại
REENGAGE_MIN_SCORE = 50
#: Không gửi email kéo lại cho một học viên quá một lần trong chừng này ngày
REENGAGE_COOLDOWN_DAYS = 7


@contextmanager
def _tx(conn) -> Iterator[None]:
    """Một transaction: commit khi xong, rollback khi lỗi, KHÔNG đóng connection.

    Không dùng `with conn:` vì nghĩa của nó khác nhau giữa hai driver: psycopg2 chỉ commit/rollback,
    còn psycopg 3 (driver của PostgresHook từ provider postgres 6.x) ĐÓNG luôn connection. Bản đầu
    dùng `with conn:` nên chạy trong Airflow, bước gửi email lỗi "the connection is closed" ngay sau
    khi gateway đã gửi email.
    """
    try:
        yield
        conn.commit()
    except BaseException:
        conn.rollback()
        raise


def _run(conn, sql: str, params: dict[str, Any]) -> int:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.rowcount


def build_learner_day(conn, day: date) -> int:
    """Hoạt động từng học viên trong `day`. Trả số dòng ghi."""
    params = {"day": day}
    with _tx(conn):
        _run(conn, "DELETE FROM insights.learner_day WHERE day = %(day)s", params)
        return _run(
            conn,
            f"""
            WITH study AS (
              SELECT "userId" AS user_id,
                     SUM(seconds) AS seconds, SUM("cardsReviewed") AS cards,
                     SUM("vocabCount") AS vocab, SUM("kanjiCount") AS kanji
              FROM public.learner_daily_study
              WHERE "studyDate" = %(day)s
              GROUP BY 1
            ), exams AS (
              SELECT "userId" AS user_id, COUNT(*) AS n, ROUND(AVG(percent)::numeric, 2) AS avg
              FROM public."ExamResult"
              WHERE "userId" IS NOT NULL AND {VN_DAY % '"submittedAt"'} = %(day)s
              GROUP BY 1
            ), learners AS (
              SELECT user_id FROM study UNION SELECT user_id FROM exams
            )
            INSERT INTO insights.learner_day
              (day, user_id, seconds, cards_reviewed, vocab_count, kanji_count, exams_taken, exam_avg_percent)
            SELECT %(day)s, l.user_id,
                   COALESCE(s.seconds, 0), COALESCE(s.cards, 0), COALESCE(s.vocab, 0), COALESCE(s.kanji, 0),
                   COALESCE(e.n, 0), e.avg
            FROM learners l
            JOIN public."User" u ON u.id = l.user_id
            LEFT JOIN study s ON s.user_id = l.user_id
            LEFT JOIN exams e ON e.user_id = l.user_id
            """,
            params,
        )


def score_churn_risk(conn, day: date) -> int:
    """Học viên có nguy cơ bỏ học tại `day`.

    Có nguy cơ = trước đó học đều (≥ 3 ngày có hoạt động trong 14 ngày [day-16, day-3]) nhưng đã
    nghỉ 3–14 ngày. Nghỉ quá 14 ngày coi như đã rời đi, không tính vào đây.
    Điểm (0–100) cộng từ: số ngày nghỉ, mức học đều trước đó, số thẻ SRS đang dồn.

    Đọc thẳng nguồn (learner_daily_study), không đọc insights.learner_day: backfill một ngày cũ vẫn
    đúng dù các ngày trước đó chưa từng được chạy.
    Giới hạn: thẻ đến hạn lấy theo nextReviewAt hiện tại (không có lịch sử), nên backfill ngày cũ
    thì cột due_cards chỉ là gần đúng.
    """
    params = {"day": day}
    with _tx(conn):
        _run(conn, "DELETE FROM insights.churn_risk WHERE day = %(day)s", params)
        return _run(
            conn,
            """
            WITH activity AS (
              SELECT "userId" AS user_id, "studyDate" AS d
              FROM public.learner_daily_study
              WHERE "studyDate" BETWEEN %(day)s::date - 30 AND %(day)s::date
                AND (seconds > 0 OR "cardsReviewed" > 0 OR "vocabCount" > 0 OR "kanjiCount" > 0)
            ), per_user AS (
              SELECT user_id,
                     MAX(d) AS last_active,
                     COUNT(DISTINCT d) FILTER (
                       WHERE d BETWEEN %(day)s::date - 16 AND %(day)s::date - 3
                     ) AS active_prior
              FROM activity
              GROUP BY user_id
            ), due AS (
              SELECT "userId" AS user_id, COUNT(*) AS n
              FROM public."SrsCard"
              WHERE NOT mastered AND "nextReviewAt" < (%(day)s::date + 1)
              GROUP BY 1
            ), candidates AS (
              SELECT p.user_id, p.last_active, p.active_prior,
                     (%(day)s::date - p.last_active) AS days_inactive,
                     COALESCE(d.n, 0)::int AS due_cards
              FROM per_user p
              JOIN public."User" u ON u.id = p.user_id
              LEFT JOIN due d ON d.user_id = p.user_id
              WHERE (%(day)s::date - p.last_active) BETWEEN 3 AND 14
                AND p.active_prior >= 3
            )
            INSERT INTO insights.churn_risk
              (day, user_id, risk_score, days_inactive, active_days_prior, due_cards, last_active_day, reasons)
            SELECT %(day)s, user_id,
                   LEAST(100,
                         30
                         + LEAST(30, (days_inactive - 3) * 4)
                         + LEAST(25, active_prior * 3)
                         + LEAST(15, due_cards / 5)),
                   days_inactive, active_prior, due_cards, last_active,
                   ARRAY_REMOVE(ARRAY[
                     format('Nghỉ %%s ngày', days_inactive),
                     format('Trước đó học %%s/14 ngày', active_prior),
                     CASE WHEN due_cards > 0 THEN format('%%s thẻ đến hạn chưa ôn', due_cards) END
                   ], NULL)
            FROM candidates
            """,
            params,
        )


def build_daily_kpi(conn, day: date) -> None:
    params = {"day": day}
    with _tx(conn):
        _run(
            conn,
            f"""
            INSERT INTO insights.daily_kpi
              (day, active_learners, new_learners, at_risk, total_seconds, cards_reviewed, exams_taken, computed_at)
            SELECT %(day)s,
                   (SELECT COUNT(*) FROM insights.learner_day WHERE day = %(day)s),
                   (SELECT COUNT(*) FROM public."User" WHERE {VN_DAY % '"createdAt"'} = %(day)s),
                   (SELECT COUNT(*) FROM insights.churn_risk WHERE day = %(day)s),
                   COALESCE((SELECT SUM(seconds) FROM insights.learner_day WHERE day = %(day)s), 0),
                   COALESCE((SELECT SUM(cards_reviewed) FROM insights.learner_day WHERE day = %(day)s), 0),
                   COALESCE((SELECT SUM(exams_taken) FROM insights.learner_day WHERE day = %(day)s), 0),
                   now()
            ON CONFLICT (day) DO UPDATE SET
              active_learners = EXCLUDED.active_learners,
              new_learners = EXCLUDED.new_learners,
              at_risk = EXCLUDED.at_risk,
              total_seconds = EXCLUDED.total_seconds,
              cards_reviewed = EXCLUDED.cards_reviewed,
              exams_taken = EXCLUDED.exams_taken,
              computed_at = EXCLUDED.computed_at
            """,
            params,
        )


def check_quality(conn, day: date) -> list[str]:
    """Kiểm tra trước khi gửi email. Trả danh sách lỗi (rỗng = ổn).

    Gửi email dựa trên số liệu sai còn tệ hơn không gửi: lỗi ở đây chặn bước gửi.
    """
    params = {"day": day}
    problems: list[str] = []
    with _tx(conn), conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) FROM (
              SELECT DISTINCT s."userId" FROM public.learner_daily_study s
              JOIN public."User" u ON u.id = s."userId"
              WHERE s."studyDate" = %(day)s
            ) src
            WHERE NOT EXISTS (
              SELECT 1 FROM insights.learner_day d WHERE d.day = %(day)s AND d.user_id = src."userId"
            )
            """,
            params,
        )
        missing = cur.fetchone()[0]
        if missing:
            problems.append(f"{missing} học viên có hoạt động ngày {day} nhưng thiếu trong learner_day")

        cur.execute("SELECT at_risk FROM insights.daily_kpi WHERE day = %(day)s", params)
        row = cur.fetchone()
        if row is None:
            problems.append(f"Chưa có daily_kpi cho ngày {day}")
        else:
            cur.execute("SELECT COUNT(*) FROM insights.churn_risk WHERE day = %(day)s", params)
            if cur.fetchone()[0] != row[0]:
                problems.append("daily_kpi.at_risk lệch với số dòng churn_risk")

        cur.execute(
            """
            SELECT COUNT(*) FROM insights.churn_risk c
            WHERE c.day = %(day)s AND EXISTS (
              SELECT 1 FROM insights.learner_day d
              WHERE d.user_id = c.user_id AND d.day > c.day - 3 AND d.day <= c.day
                AND (d.seconds > 0 OR d.cards_reviewed > 0 OR d.vocab_count > 0 OR d.kanji_count > 0)
            )
            """,
            params,
        )
        contradictory = cur.fetchone()[0]
        if contradictory:
            problems.append(f"{contradictory} học viên bị coi là nghỉ nhưng vẫn có hoạt động trong 3 ngày qua")
    return problems


def claim_reengagement(conn, day: date, min_score: int = REENGAGE_MIN_SCORE) -> list[dict[str, Any]]:
    """Giành các học viên cần email kéo lại, trả danh sách đang chờ gửi (pending) của ngày `day`.

    Bỏ qua: tắt nhận email tiến độ, email bị trả về, đã được gửi trong 7 ngày gần nhất.
    Task chạy lại: các dòng pending của lần trước được trả lại để gửi tiếp (gateway chặn trùng).
    """
    params = {"day": day, "min_score": min_score, "cooldown": REENGAGE_COOLDOWN_DAYS}
    with _tx(conn), conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO insights.reengagement (user_id, day)
            SELECT c.user_id, c.day
            FROM insights.churn_risk c
            JOIN public."User" u ON u.id = c.user_id
            LEFT JOIN public."EmailPrefs" p ON p."userId" = u.id
            WHERE c.day = %(day)s
              AND c.risk_score >= %(min_score)s
              AND u."emailBounced" = false
              AND COALESCE(p."receiveProgress", true)
              AND NOT EXISTS (
                SELECT 1 FROM insights.reengagement r
                WHERE r.user_id = c.user_id AND r.status = 'sent'
                  AND r.day > %(day)s::date - %(cooldown)s AND r.day < %(day)s::date
              )
            ON CONFLICT (user_id, day) DO NOTHING
            """,
            params,
        )
        cur.execute(
            """
            SELECT r.user_id, c.days_inactive, c.due_cards, c.risk_score
            FROM insights.reengagement r
            JOIN insights.churn_risk c ON c.day = r.day AND c.user_id = r.user_id
            WHERE r.day = %(day)s AND r.status = 'pending'
            ORDER BY c.risk_score DESC, r.user_id
            """,
            params,
        )
        return [
            {"userId": uid, "daysInactive": inactive, "dueCards": due, "riskScore": score}
            for uid, inactive, due, score in cur.fetchall()
        ]


def mark_reengagement(conn, day: date, results: list[dict[str, Any]]) -> None:
    """Ghi kết quả gateway trả về: sent / skipped."""
    with _tx(conn), conn.cursor() as cur:
        for r in results:
            status = "sent" if r.get("status") == "sent" else "skipped"
            cur.execute(
                """
                UPDATE insights.reengagement
                SET status = %(status)s, sent_at = CASE WHEN %(status)s = 'sent' THEN now() END
                WHERE user_id = %(user_id)s AND day = %(day)s
                """,
                {"status": status, "user_id": r["userId"], "day": day},
            )
