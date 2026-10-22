"""Cấu trúc DAG: nạp được, đúng thứ tự, đúng chính sách retry. Chạy trong image Airflow."""

from __future__ import annotations

import os
from datetime import timedelta

import pytest

os.environ.setdefault("AIRFLOW__CORE__LOAD_EXAMPLES", "False")
airflow = pytest.importorskip("airflow")
from airflow.models import DagBag  # noqa: E402

DAGS = os.path.join(os.path.dirname(__file__), "..", "dags")


@pytest.fixture(scope="module")
def dag():
    bag = DagBag(dag_folder=DAGS)
    assert bag.import_errors == {}
    return bag.dags["learner_insights"]  # get_dag() đọc DB metadata của Airflow, test không cần


def test_thu_tu_cac_buoc(dag):
    up = {t.task_id: set(t.upstream_task_ids) for t in dag.tasks}
    assert up == {
        "build_learner_day": set(),
        "score_churn_risk": set(),
        "build_daily_kpi": {"build_learner_day", "score_churn_risk"},
        "quality_check": {"build_daily_kpi"},
        "send_reengagement": {"quality_check"},
    }


def test_lich_chay_va_retry(dag):
    assert dag.max_active_runs == 1
    assert dag.task_dict["build_learner_day"].retries == 3
    assert dag.task_dict["build_learner_day"].retry_delay == timedelta(minutes=5)
    # Kiểm tra chất lượng lỗi thì fail ngay: dữ liệu sai không tự đúng lại sau 5 phút
    assert dag.task_dict["quality_check"].retries == 0


def test_backfill_ngay_cu_khong_gui_email(monkeypatch):
    import pendulum
    from airflow.sdk.exceptions import AirflowSkipException

    import learner_insights as mod

    called = []
    monkeypatch.setattr(mod.queries, "claim_reengagement", lambda *a, **k: called.append(1) or [])
    task = mod.learner_insights().task_dict["send_reengagement"]
    old_run = pendulum.now(mod.VN).subtract(days=30)

    with pytest.raises(AirflowSkipException):
        task.python_callable({"learners": 0, "at_risk": 0}, logical_date=old_run)
    assert called == []  # không đụng tới DB, không gọi gateway
