"""Pipeline hằng đêm: phát hiện học viên sắp bỏ học và gửi email kéo họ quay lại.

    build_learner_day ─┐
    score_churn_risk  ─┴─► build_daily_kpi ─► quality_check ─► send_reengagement

- Chạy 2:00 sáng giờ Việt Nam, xử lý NGÀY HÔM TRƯỚC (logical date của lần chạy).
- Mỗi bước idempotent theo ngày: retry hay chạy lại không nhân đôi dữ liệu.
- Backfill (`airflow backfill create --dag-id learner_insights --from-date ... --to-date ...`) tính
  lại số liệu các ngày cũ nhưng KHÔNG gửi email cho những ngày đó.
- quality_check lỗi thì không gửi email: gửi dựa trên số liệu sai còn tệ hơn không gửi.

Kết nối:
- Connection `nihongo_db` (env AIRFLOW_CONN_NIHONGO_DB): Postgres của app, đọc public, ghi schema insights.
- Variable `gateway_url`, `internal_api_token` (env AIRFLOW_VAR_*): gọi gateway để gửi email.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

import pendulum
import requests
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.sdk import Variable, dag, task
from airflow.sdk.exceptions import AirflowFailException, AirflowSkipException

from insights import queries

DB_CONN_ID = "nihongo_db"
#: Chỉ gửi email cho lần chạy của ngày gần đây (lần chạy thường lệ). Backfill ngày cũ thì bỏ qua.
SEND_EMAIL_MAX_AGE_DAYS = 2
VN = pendulum.timezone("Asia/Ho_Chi_Minh")


def _conn():
    return PostgresHook(postgres_conn_id=DB_CONN_ID).get_conn()


def _day(logical_date: datetime) -> date:
    """Ngày được xử lý, theo giờ Việt Nam."""
    return pendulum.instance(logical_date).in_timezone(VN).date()


@dag(
    dag_id="learner_insights",
    description="Phát hiện học viên sắp bỏ học + email kéo quay lại + KPI hằng ngày",
    schedule="0 2 * * *",
    start_date=pendulum.datetime(2026, 10, 1, tz=VN),
    catchup=False,
    max_active_runs=1,
    default_args={"retries": 3, "retry_delay": timedelta(minutes=5), "retry_exponential_backoff": True},
    tags=["insights", "email"],
)
def learner_insights():
    @task
    def build_learner_day(logical_date=None) -> int:
        conn = _conn()
        try:
            return queries.build_learner_day(conn, _day(logical_date) - timedelta(days=1))
        finally:
            conn.close()

    @task
    def score_churn_risk(logical_date=None) -> int:
        conn = _conn()
        try:
            return queries.score_churn_risk(conn, _day(logical_date) - timedelta(days=1))
        finally:
            conn.close()

    @task
    def build_daily_kpi(learners: int, at_risk: int, logical_date=None) -> dict:
        conn = _conn()
        try:
            queries.build_daily_kpi(conn, _day(logical_date) - timedelta(days=1))
        finally:
            conn.close()
        return {"learners": learners, "at_risk": at_risk}

    @task(retries=0)
    def quality_check(summary: dict, logical_date=None) -> dict:
        conn = _conn()
        try:
            problems = queries.check_quality(conn, _day(logical_date) - timedelta(days=1))
        finally:
            conn.close()
        if problems:
            # Fail ngay, không retry: dữ liệu sai không tự đúng lại sau 5 phút
            raise AirflowFailException("; ".join(problems))
        return summary

    @task
    def send_reengagement(summary: dict, logical_date=None) -> dict:
        day = _day(logical_date) - timedelta(days=1)
        today = pendulum.now(VN).date()
        if (today - day).days > SEND_EMAIL_MAX_AGE_DAYS:
            raise AirflowSkipException(f"Ngày {day} là ngày cũ (backfill): không gửi email")

        conn = _conn()
        try:
            learners = queries.claim_reengagement(conn, day)
            if not learners:
                return {"sent": 0, "skipped": 0}
            res = requests.post(
                f"{Variable.get('gateway_url').rstrip('/')}/api/internal/insights/reengagement",
                json={"day": day.isoformat(), "learners": learners},
                headers={"x-internal-token": Variable.get("internal_api_token")},
                timeout=60,
            )
            res.raise_for_status()  # lỗi → task retry, các dòng vẫn pending, gửi lại an toàn
            body = res.json()
            results = body.get("data", body)["results"]
            queries.mark_reengagement(conn, day, results)
        finally:
            conn.close()
        sent = sum(1 for r in results if r.get("status") == "sent")
        return {"sent": sent, "skipped": len(results) - sent}

    send_reengagement(quality_check(build_daily_kpi(build_learner_day(), score_churn_risk())))


learner_insights()
