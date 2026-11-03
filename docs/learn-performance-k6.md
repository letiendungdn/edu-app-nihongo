# Học Performance & Load Test (k6) — Từ Project Này

> Project đã có 2 script [`infra/k6/load-test.js`](../infra/k6/load-test.js) và [`stress-test.js`](../infra/k6/stress-test.js).
> Tài liệu dạy cách chạy, **đọc kết quả cho đúng**, tìm nút thắt và ước lượng sức chịu tải — bắt đầu bằng một lần
> chạy thật đã cho ra kết quả **sai lệch hoàn toàn** vì một lý do không liên quan tới hiệu năng.

> **Cập nhật 2026-09-29:** rate limit 120 req/phút/IP vẫn giữ nguyên (có chủ đích) — kết quả ở mục 2 vẫn đúng. Riêng
> `/health/*` và `/metrics` giờ bỏ qua rate limit (probe và Prometheus không bị 429).

## 1. Các loại test

| Loại | Câu hỏi | Script của project |
|------|---------|--------------------|
| **Smoke** | "chạy được không?" — 1–2 user, 30s | (nên thêm) |
| **Load** | "tải bình thường có đạt SLO không?" | `load-test.js`: 20 user, 1m30s, p95 < 500ms, lỗi < 1% |
| **Stress** | "tăng tới đâu thì gãy, gãy thế nào?" | `stress-test.js`: lên 100 user, p95 < 1s, lỗi < 5% |
| **Spike** | "tăng vọt đột ngột (mở đăng ký JLPT) thì sao?" | (nên thêm) |
| **Soak** | "chạy vài giờ có rò rỉ bộ nhớ/kết nối không?" | (nên thêm) |

---

## 2. Chạy k6 không cần cài đặt

```powershell
# Trỏ vào api-gateway đang chạy trên máy (từ trong container dùng host.docker.internal)
docker run --rm -i -e BASE_URL=http://host.docker.internal:3000 grafana/k6 run - < infra/k6/stress-test.js
```

Kết quả thật khi chạy một kịch bản đơn giản (10 user ảo, 20 giây, gọi `GET /api/vocabularies?lessonNumber=1`):

```
✗ 200   ↳ 31% — ✓ 120 / ✗ 260
✗ 429   ↳ 68% — ✓ 260 / ✗ 120
http_req_duration: avg=32.9ms  med=8.53ms  p(90)=88.04ms  p(95)=123.22ms  max=353ms
http_req_failed  : 68.42%  260 out of 380
http_reqs        : 380  18.6/s
```

**Đúng 120 request thành công**, 260 request còn lại nhận **429 Too Many Requests**. Đó không phải hệ thống quá tải —
đó là `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])`: mọi request của k6 đến từ **một IP** nên chung một hạn
mức 120/phút. Nếu chỉ nhìn `http_req_failed: 68%` sẽ kết luận sai "API chịu không nổi 18 req/s".

**Bài học 1: trước khi đọc số liệu, kiểm tra lỗi là loại gì** (429? 401? 5xx? timeout?). Luôn tách check theo status.

Cách chạy load test đúng:

```ts
// app.module.ts — bỏ qua rate limit cho IP/Header của môi trường load test (không bao giờ bật ở production công khai)
ThrottlerModule.forRoot({
  throttlers: [{ ttl: 60_000, limit: 120 }],
  skipIf: (ctx) => process.env.LOADTEST_BYPASS_TOKEN != null &&
    ctx.switchToHttp().getRequest().headers["x-loadtest-token"] === process.env.LOADTEST_BYPASS_TOKEN,
}),
```

Hoặc chạy trên môi trường staging tách riêng với hạn mức nới rộng. Mục đích của load test là đo **ứng dụng**, còn rate
limit thì test riêng (một test khẳng định request thứ 121 nhận 429).

> Script `load-test.js` có `setup()` đăng nhập lấy token bằng `admin@nihongo.local` — cũng bị đếm vào hạn mức, và route
> login chỉ cho **5 lần/phút**: chạy k6 liên tục vài lần là login bị chặn, `token` rỗng, mọi request sau đó 401.

---

## 3. Đọc kết quả k6

```
http_req_duration ... avg=32.9ms  med=8.53ms  p(90)=88ms  p(95)=123ms  max=353ms
```

- **Nhìn p95/p99**, không nhìn avg. Ở trên: phần lớn request 8ms (trúng cache Redis), nhưng 5% chậm hơn 123ms.
  Khoảng cách med ↔ p95 lớn = có **hai đường đi khác nhau** (cache hit / cache miss, hoặc lần đầu JIT/kết nối).
- `http_reqs` = throughput thực đạt được. Tăng user mà throughput **không tăng** nữa → đã chạm trần.
- `iteration_duration` = thời gian một vòng kịch bản (kể cả `sleep`).
- **Thresholds** biến test thành cổng kiểm tra: không đạt → k6 thoát mã lỗi → dùng được trong CI.

Tăng dần tải và vẽ **đường cong latency–throughput**:

```
p95 (ms)
  │                                    ╱  ← gãy: hàng đợi tăng, latency vọt, lỗi xuất hiện
  │                                 ╱
  │                            __╱
  │ ___________________________      ← vùng tuyến tính: thêm tải, latency gần như không đổi
  └─────────────────────────────────────────▶ req/s
                         ↑ "knee" — sức chịu tải thực tế (vận hành ở ~70% điểm này)
```

---

## 4. Tìm nút thắt: tải đi qua những đâu

```
k6 → nginx → api-gateway (Node, 1 thread) → gRPC → content-service → Redis (cache) → Postgres
                 │                                         │                          │
            CPU event loop                           pool Prisma               connections, query plan
```

Trong lúc chạy stress test, quan sát **đồng thời**:

| Nơi | Xem gì | Dấu hiệu nút thắt |
|-----|--------|-------------------|
| `docker stats` | CPU/RAM từng container | container nào chạm ~100% CPU (Node 1 luồng: 100% của **1 core**) |
| Jaeger | span dài nhất trong request chậm | span DB / gRPC chiếm phần lớn thời gian |
| Postgres | `SELECT * FROM pg_stat_activity WHERE state <> 'idle'` | nhiều truy vấn chờ; `wait_event` = Lock |
| Postgres | `pg_stat_statements` (top query theo total_time) | 1 query chiếm phần lớn thời gian DB |
| Prisma | lỗi `Timed out fetching a new connection from the pool` | pool quá nhỏ so với số request đồng thời |
| Node | event loop lag (`perf_hooks.monitorEventLoopDelay`) | > 100ms = code đồng bộ nặng chặn event loop |

Nguyên nhân hay gặp và hướng xử lý:

```
N+1 query (vòng lặp gọi DB)          → include/JOIN một lần; xem span lặp trong Jaeger
Thiếu index                           → EXPLAIN ANALYZE thấy Seq Scan (learn-postgres mục 1–2)
ILIKE '%x%' quét toàn bảng (tra từ)   → pg_trgm + index GIN
Trả quá nhiều dữ liệu                 → phân trang, chọn cột (select)
JSON.stringify/parse khối lớn         → cache kết quả đã serialize; giảm payload
Cache stampede (cache hết hạn đồng loạt, 100 request cùng miss) → khoá khi làm mới cache / TTL ngẫu nhiên
```

---

## 5. Profile Node khi CPU là nút thắt

```powershell
# Chạy api-gateway ngoài Docker với profiler
node --cpu-prof dist/apps/api-gateway/services/api-gateway/src/main.js
# chạy k6 30 giây rồi dừng server (Ctrl+C) → sinh file .cpuprofile
# mở bằng Chrome DevTools → Performance → Load profile, hoặc: npx speedscope <file>.cpuprofile
```

Tìm hàm có **self time** lớn nhất. Nếu là thư viện (bcrypt, JSON, regex) → xem có đang gọi thừa không; nếu là code
mình → tối ưu thuật toán hoặc chuyển sang worker thread.

---

## 6. Ước lượng sức chịu tải (capacity planning)

```
Giả định: 5.000 người học hoạt động/ngày, giờ cao điểm 20h–22h chiếm 40% lượt dùng
Mỗi phiên học: ~60 request trong ~15 phút
→ Request giờ cao điểm: 5.000 × 40% × 60 / (2 × 3600 s) ≈ 17 req/s trung bình
→ Hệ số đột biến ×3                                      ≈ 50 req/s cần chịu được

Đo được (sau khi bỏ rate limit): 1 pod api-gateway đạt knee ở ~X req/s với p95 < 500ms
→ Số pod = 50 / (0.7 × X)   (chỉ vận hành 70% knee)  → cấu hình HPA minReplicas/maxReplicas
```

Luôn ghi **giả định** kèm con số — giả định sai thì biết sửa chỗ nào.

---

## Bài tập thực hành

1. Tái hiện kết quả mục 2 (120 × 200, còn lại 429). Sau đó cài `skipIf` theo header và chạy lại — tỷ lệ lỗi còn bao nhiêu?
2. Thêm vào `stress-test.js` check tách theo mã (`2xx`, `429`, `5xx`) và in ra số lượng từng loại.
3. Viết `smoke-test.js` (1 user, 30s, mọi endpoint chính) và thêm vào CI chạy trên môi trường docker compose.
4. Tăng dần tải 10 → 200 user (bỏ rate limit), ghi p95 và req/s ở mỗi mức, vẽ đường cong mục 3, xác định knee.
5. Trong lúc stress test, dùng `pg_stat_activity` và Jaeger tìm truy vấn chậm nhất; thử tối ưu và đo lại.
6. So sánh `GET /api/vocabularies?lessonNumber=1` khi cache Redis nóng và khi vừa xoá cache
   (`docker exec edu-redis redis-cli FLUSHALL`) — chênh lệch p95 bao nhiêu?
7. Hoàn thành phép tính capacity ở mục 6 với số X đo được ở bài 4.

<details>
<summary>Gợi ý đáp án</summary>

1. Với 10 user × ~2 req/s trong 20s ≈ 380 request; 120 thành công đúng bằng hạn mức 1 phút. Sau khi bypass, lỗi phải
   về ~0% (nếu không → lỗi thật của ứng dụng, đọc status để phân loại). Kiểm tra lại rằng **không** gửi header thì vẫn bị 429.
2. ```js
   check(res, {
     "2xx": (r) => r.status >= 200 && r.status < 300,
     "429": (r) => r.status === 429,
     "5xx": (r) => r.status >= 500,
   });
   ```
   Hoặc dùng `Counter` tuỳ biến: `new Counter("status_429")` và `.add(1)` khi gặp.
3. Job CI: `docker compose up -d` các service cần thiết → chờ `/health` → `docker run grafana/k6 run - < infra/k6/smoke-test.js`.
   Threshold `http_req_failed: ['rate==0']`.
4. Dùng `stages` tăng bậc (mỗi bậc 1 phút) và `--summary-trend-stats "p(95),p(99)"`; hoặc xuất `--out json=result.json`
   rồi vẽ. Knee thường xuất hiện khi CPU api-gateway (1 core) hoặc pool Prisma bão hoà.
5. Bật extension `pg_stat_statements`; `SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5;`.
   Ứng viên thường gặp: truy vấn tra từ `ILIKE` và danh sách bài có đếm từ.
6. Cache nóng: phần lớn request vài ms (như med 8.5ms ở trên); cache lạnh: request đầu mỗi bài chạm DB + gRPC → p95
   tăng rõ. Đây là lý do khi deploy/restart Redis nên có bước "làm nóng cache".
7. Ví dụ đo được X = 150 req/s/pod: 50 / (0.7 × 150) ≈ 0.5 → 1 pod đủ, nhưng giữ `minReplicas: 2` để chịu lỗi một pod
   (sẵn sàng cao), không phải vì tải.

</details>

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **5. Kiểm thử** — bài 3/3.

- Bài trước: [learn-jest.md](./learn-jest.md) — Jest qua các test thật của repo
- Xong nhóm này. **Nhóm tiếp: 6. DevOps và hạ tầng** — bắt đầu bằng [learn-docker.md](./learn-docker.md) (Docker: image, container, volume, compose)

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
