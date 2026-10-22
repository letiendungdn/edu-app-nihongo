"""SQL của learner_insights chạy trên Postgres THẬT (đã chạy migration Prisma + Flyway V1, V2).

    INSIGHTS_TEST_DATABASE_URL=postgresql://… pytest infra/airflow/tests

DB RIÊNG cho test: test xóa dữ liệu. Xem infra/airflow/README.md.
"""

from __future__ import annotations

import os
from datetime import date, datetime, timedelta

import psycopg
import pytest

from insights import queries

DAY = date(2026, 10, 21)
TABLES = (
    'insights.reengagement, insights.churn_risk, insights.daily_kpi, insights.learner_day, '
    '"ExamResult", "SrsCard", "StudySession", "DailyActivity", "EmailPrefs", "CronRun", "User"'
)


@pytest.fixture()
def conn():
    url = os.environ.get("INSIGHTS_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Đặt INSIGHTS_TEST_DATABASE_URL (DB test riêng, đã migrate)")
    # psycopg 3: cùng driver với PostgresHook trong Airflow (nghĩa của `with conn:` khác psycopg2)
    c = psycopg.connect(url)
    with c.cursor() as cur:
        cur.execute(f"TRUNCATE {TABLES} RESTART IDENTITY CASCADE")
    c.commit()
    yield c
    assert not c.closed, "hàm trong queries.py không được đóng connection của người gọi"
    c.close()


def exec_(conn, sql, params=()):
    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall() if cur.description else None
    conn.commit()
    return rows


def user(conn, email: str, created: datetime | None = None, bounced=False, receive=True) -> int:
    uid = exec_(
        conn,
        'INSERT INTO "User"(email, "updatedAt", "createdAt", "emailBounced") VALUES (%s, now(), %s, %s) RETURNING id',
        (email, created or datetime(2026, 1, 1), bounced),
    )[0][0]
    exec_(
        conn,
        'INSERT INTO "EmailPrefs"("userId", "receiveProgress", "updatedAt") VALUES (%s, %s, now())',
        (uid, receive),
    )
    return uid


def studied(conn, uid: int, *days: date, seconds=600, cards=10):
    for d in days:
        exec_(
            conn,
            'INSERT INTO "StudySession"("userId", date, seconds, "cardsReviewed") VALUES (%s, %s, %s, %s)',
            (uid, d, seconds, cards),
        )


def due_cards(conn, uid: int, n: int):
    for i in range(n):
        exec_(
            conn,
            """INSERT INTO "SrsCard"("userId", "contentType", "contentId", "nextReviewAt", mastered, "updatedAt")
               VALUES (%s, 'VOCABULARY', %s, %s, false, now())""",
            (uid, i + 1, datetime(2026, 10, 1)),
        )


def ago(n: int) -> date:
    return DAY - timedelta(days=n)


def run_all(conn, day=DAY):
    queries.build_learner_day(conn, day)
    queries.score_churn_risk(conn, day)
    queries.build_daily_kpi(conn, day)


def risk(conn, day=DAY):
    return {
        r[0]: r[1:]
        for r in exec_(
            conn,
            "SELECT user_id, risk_score, days_inactive, active_days_prior, due_cards, reasons "
            "FROM insights.churn_risk WHERE day = %s",
            (day,),
        )
    }


def test_learner_day_gom_hoc_va_thi_va_chay_lai_khong_nhan_doi(conn):
    a = user(conn, "a@t")
    studied(conn, a, DAY, seconds=900, cards=30)
    # 23:30 UTC ngày 20 = 06:30 sáng ngày 21 giờ VN → tính cho ngày 21
    exec_(
        conn,
        """INSERT INTO "ExamResult"("userId", "examId", level, title, "correctCount", total, percent, passed, "submittedAt")
           VALUES (%s, 'e1', 'N5', 'Thi thử', 8, 10, 80, true, %s)""",
        (a, datetime(2026, 10, 20, 23, 30)),
    )

    assert queries.build_learner_day(conn, DAY) == 1
    assert queries.build_learner_day(conn, DAY) == 1  # chạy lại (retry/backfill)
    rows = exec_(conn, "SELECT seconds, cards_reviewed, exams_taken, exam_avg_percent FROM insights.learner_day")
    assert rows == [(900, 30, 1, 80)]


def test_nguy_co_bo_hoc_chi_tinh_nguoi_dang_hoc_deu_roi_nghi_3_den_14_ngay(conn):
    at_risk = user(conn, "risk@t")
    studied(conn, at_risk, ago(12), ago(10), ago(8), ago(6), ago(5))  # nghỉ 5 ngày
    due_cards(conn, at_risk, 40)
    active = user(conn, "active@t")
    studied(conn, active, ago(10), ago(8), ago(6), ago(1))  # hôm qua vẫn học
    churned = user(conn, "gone@t")
    studied(conn, churned, ago(28), ago(26), ago(24), ago(20))  # nghỉ 20 ngày: đã rời đi
    casual = user(conn, "casual@t")
    studied(conn, casual, ago(6))  # chỉ học 1 ngày: chưa có thói quen

    run_all(conn)
    found = risk(conn)

    assert set(found) == {at_risk}
    score, inactive, prior, due, reasons = found[at_risk]
    assert (inactive, prior, due) == (5, 5, 40)
    assert 0 < score <= 100
    assert reasons == ["Nghỉ 5 ngày", "Trước đó học 5/14 ngày", "40 thẻ đến hạn chưa ôn"]


def test_nghi_lau_hon_va_nhieu_the_hon_thi_diem_cao_hon(conn):
    mild = user(conn, "mild@t")
    studied(conn, mild, ago(9), ago(7), ago(5), ago(3))  # nghỉ 3 ngày
    severe = user(conn, "severe@t")
    studied(conn, severe, ago(16), ago(14), ago(12), ago(10))  # nghỉ 10 ngày
    due_cards(conn, severe, 60)

    run_all(conn)
    found = risk(conn)

    assert found[severe][0] > found[mild][0]


def test_kpi_va_kiem_tra_chat_luong(conn):
    a = user(conn, "a@t", created=datetime(2026, 10, 21, 3, 0))  # đăng ký ngày 21 (giờ VN)
    studied(conn, a, DAY)
    b = user(conn, "b@t")
    studied(conn, b, ago(10), ago(8), ago(6), ago(4))

    run_all(conn)

    kpi = exec_(conn, "SELECT active_learners, new_learners, at_risk, total_seconds FROM insights.daily_kpi WHERE day = %s", (DAY,))
    assert kpi == [(1, 1, 1, 600)]
    assert queries.check_quality(conn, DAY) == []


def test_kiem_tra_chat_luong_bat_duoc_du_lieu_thieu(conn):
    a = user(conn, "a@t")
    run_all(conn)
    studied(conn, a, DAY)  # nguồn có thêm dữ liệu SAU khi đã tính → learner_day thiếu

    problems = queries.check_quality(conn, DAY)

    assert any("thiếu trong learner_day" in p for p in problems)


def test_chon_nguoi_gui_email_ton_trong_tuy_chon_va_khong_gui_lai_trong_7_ngay(conn):
    ids = {}
    for name, kw in [("ok", {}), ("optout", {"receive": False}), ("bounced", {"bounced": True}), ("recent", {})]:
        ids[name] = user(conn, f"{name}@t", **kw)
        studied(conn, ids[name], ago(14), ago(12), ago(10), ago(8), ago(6))
        due_cards(conn, ids[name], 30)
    # "recent" đã được gửi email 3 ngày trước
    exec_(
        conn,
        "INSERT INTO insights.reengagement(user_id, day, status, sent_at) VALUES (%s, %s, 'sent', now())",
        (ids["recent"], ago(3)),
    )
    run_all(conn)

    picked = queries.claim_reengagement(conn, DAY, min_score=0)

    assert [p["userId"] for p in picked] == [ids["ok"]]
    assert picked[0]["daysInactive"] == 6 and picked[0]["dueCards"] == 30


def test_task_chay_lai_nhan_lai_dung_cac_dong_dang_cho_va_danh_dau_xong(conn):
    a = user(conn, "a@t")
    studied(conn, a, ago(14), ago(12), ago(10), ago(8), ago(6))
    run_all(conn)

    first = queries.claim_reengagement(conn, DAY, min_score=0)
    # Gọi gateway lỗi → chưa đánh dấu; task retry
    retry = queries.claim_reengagement(conn, DAY, min_score=0)
    assert [p["userId"] for p in first] == [p["userId"] for p in retry] == [a]

    queries.mark_reengagement(conn, DAY, [{"userId": a, "status": "sent"}])
    assert queries.claim_reengagement(conn, DAY, min_score=0) == []
    assert exec_(conn, "SELECT status FROM insights.reengagement") == [("sent",)]


def test_backfill_ngay_cu_tinh_dung_doc_lap_voi_cac_ngay_khac(conn):
    a = user(conn, "a@t")
    old_day = date(2026, 10, 1)
    studied(conn, a, old_day - timedelta(days=10), old_day - timedelta(days=8),
            old_day - timedelta(days=6), old_day - timedelta(days=4))
    studied(conn, a, DAY)  # sau đó quay lại học

    run_all(conn, old_day)  # backfill ngày 1/10
    run_all(conn, DAY)

    assert set(risk(conn, old_day)) == {a}  # ngày 1/10: đang nghỉ 4 ngày
    assert risk(conn, DAY) == {}  # ngày 21/10: đã quay lại
