# Airflow: pipeline `learner_insights`

Mỗi đêm (2:00 giờ VN), pipeline tính số liệu học tập của **ngày hôm trước**, tìm học viên **sắp bỏ học** và gửi email kéo họ quay lại. Admin xem kết quả ở `/admin/insights` trên web.

```
build_learner_day ─┐
score_churn_risk  ─┴─► build_daily_kpi ─► quality_check ─► send_reengagement
```

| Bước | Làm gì |
|---|---|
| `build_learner_day` | Gom hoạt động từng học viên trong ngày (`learner_daily_study` + `ExamResult`) → `insights.learner_day` |
| `score_churn_risk` | Học viên **đang học đều** (≥ 3 ngày có hoạt động trong 14 ngày trước) mà **nghỉ 3–14 ngày** → `insights.churn_risk` với điểm 0–100 và lý do |
| `build_daily_kpi` | Chỉ số toàn hệ thống trong ngày → `insights.daily_kpi` |
| `quality_check` | Dữ liệu không khớp thì **fail, không retry, không gửi email** |
| `send_reengagement` | Gọi gateway `POST /api/internal/insights/reengagement` gửi email (điểm ≥ 50, tôn trọng tùy chọn nhận email, mỗi người tối đa 1 lần / 7 ngày) |

Vì sao dùng Airflow thay vì `@Cron` trong gateway: có nhiều bước phụ thuộc nhau, retry riêng từng bước, kiểm tra chất lượng chặn bước gửi email, **chạy bù ngày cũ** (backfill), và xem lịch sử từng lần chạy trên UI.

## Chạy

```bash
docker compose up flyway                                # tạo schema insights (Flyway V2)
docker compose --profile airflow up -d airflow          # UI: http://localhost:8090 (dev: không cần đăng nhập)
docker exec edu-airflow airflow dags unpause learner_insights
```

Chạy thử một ngày mà không chờ lịch: `docker exec edu-airflow airflow dags test learner_insights 2026-10-22T02:00:00+07:00` (xử lý ngày 21/10).

Chạy bù (tính lại số liệu, **không gửi email** cho ngày cũ):

```bash
docker exec edu-airflow airflow backfill create --dag-id learner_insights \
  --from-date 2026-10-01 --to-date 2026-10-20
```

## Cấu hình

| Biến | Ở đâu | Ý nghĩa |
|---|---|---|
| `AIRFLOW_CONN_NIHONGO_DB` | Airflow | Postgres của app (đọc `public`, ghi `insights`) |
| `AIRFLOW_VAR_GATEWAY_URL` | Airflow | `http://api-gateway:3000` |
| `INTERNAL_API_TOKEN` | Airflow (`AIRFLOW_VAR_INTERNAL_API_TOKEN`) **và** gateway | Token dùng chung, ≥ 16 ký tự. **Đổi khi chạy thật** |

Chạy thật: bỏ `AIRFLOW__CORE__SIMPLE_AUTH_MANAGER_ALL_ADMINS` (UI đang mở không cần đăng nhập), và tách `standalone` thành scheduler / api-server / dag-processor riêng.

## Chống gửi trùng

Email là thứ không rút lại được, nên có hai lớp:
1. **Airflow giành dòng trước khi gọi gateway** (`insights.reengagement`, trạng thái `pending`), gọi xong mới đánh dấu `sent`. Retry thì gửi lại các dòng còn `pending`.
2. **Gateway chặn theo (học viên, ngày)** bằng bảng `CronRun`. Trường hợp gateway đã gửi nhưng Airflow lỗi trước khi kịp đánh dấu: lần retry nhận về `already_sent`, không gửi lại.

Đã thử thật: lần chạy đầu gateway gửi email xong thì Airflow lỗi; Airflow retry gọi lại gateway nhiều lần; học viên vẫn chỉ nhận **một** email.

## Test

Cần một DB riêng, đã chạy migration Prisma và Flyway (test xóa dữ liệu):

```bash
docker run --rm --network edu-app_default -v "$PWD/infra/airflow:/work" -w /work \
  -e PYTHONPATH=/work/dags -e INSIGHTS_TEST_DATABASE_URL=postgresql://nihongo:…@postgres-nihongo:5432/nihongo_insights_test \
  --entrypoint bash apache/airflow:3.3.2-python3.12 \
  -c "pip install -q --user pytest==8.4.2 && python -m pytest -q tests"
```

- `tests/test_queries.py`: SQL chạy trên Postgres thật, gồm điều kiện "sắp bỏ học", tùy chọn email, thời gian chờ 7 ngày, retry, backfill.
- `tests/test_dag.py`: DAG nạp được, đúng thứ tự, đúng retry, backfill không gửi email.

CI chạy cả hai ở job `backend`.

**Lưu ý khi viết thêm SQL:** đừng dùng `with conn:`. `PostgresHook` (provider postgres 7.x) trả về connection **psycopg 3**, và với psycopg 3 thì `with conn:` **đóng luôn connection** (psycopg2 chỉ commit). Dùng `_tx(conn)` trong `insights/queries.py`. Test chạy bằng psycopg 3 để bắt đúng lỗi này.

**Giới hạn:** cột `due_cards` lấy theo `nextReviewAt` hiện tại (DB không lưu lịch sử), nên khi backfill ngày cũ, giá trị này chỉ gần đúng.
