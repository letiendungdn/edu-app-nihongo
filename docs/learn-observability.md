# Học Observability — Từ Project Này

> Observability = trả lời được **"hệ thống đang làm gì, vì sao chậm/lỗi"** mà không phải đoán hay sửa code để in log.
> Project đã có đủ 3 trụ cột: **log** (pino), **metric** (Prometheus + Grafana), **trace** (OpenTelemetry → Jaeger)
> — nhưng như phần 2 sẽ chỉ ra, cả ba đều đang **có lỗ hổng thật**. Học bằng cách tìm và sửa chúng.

> **Cập nhật 2026-09-29 — đã sửa trong code** (phần phân tích bên dưới giữ nguyên để học):
> - `/metrics` public + không rate limit + **trả text thô**: ngoài lỗi 401, khi mở ra còn lộ thêm lỗi thứ hai —
>   `ResponseInterceptor` bọc kết quả thành JSON `{success, data}` mà Prometheus không đọc được → thêm `@RawResponse()`
>   ([`metrics.controller.ts`](../services/api-gateway/src/metrics/metrics.controller.ts)). Target Prometheus `api-gateway`: **up**.
> - Nhãn `route` theo mẫu (`/api/vocabularies/:id`) + histogram `http_request_duration_seconds` ([`http-metrics.interceptor.ts`](../services/api-gateway/src/metrics/http-metrics.interceptor.ts)).
> - `/health/live` và `/health/ready` (503 khi thiếu phụ thuộc); `/health` giữ như cũ ([`health.controller.ts`](../services/api-gateway/src/health/health.controller.ts)).
> - 5 alert ([`infra/prometheus/alerts.yml`](../infra/prometheus/alerts.yml), `promtool` hợp lệ) — đã thử: tắt gateway →
>   `ApiGatewayTargetDown` inactive → pending → **firing** sau 2 phút.
> - Dashboard Grafana "API Gateway — RED & runtime" tự nạp khi khởi động ([`infra/grafana/dashboards/api-gateway.json`](../infra/grafana/dashboards/api-gateway.json)).
> - **Alertmanager** gửi alert qua **email** tới chủ project (gom theo tên alert, mail RESOLVED khi hết sự cố, chặn alert hệ quả khi
>   gateway đã down). Local gửi vào Mailpit (http://localhost:8025); gửi thật qua SMTP relay — [`infra/alertmanager/README.md`](../infra/alertmanager/README.md).
> - **Trace tới Jaeger**: trước đây Jaeger chỉ thấy `unknown_service` vì `Sentry.init` đăng ký TracerProvider toàn cục trước
>   NodeSDK ("duplicate registration") → Sentry dùng `skipOpenTelemetrySetup: true` và chỉ bật khi có `SENTRY_DSN`
>   ([`instrument.ts`](../services/api-gateway/src/instrument.ts)); `serviceName` lấy từ `SERVICE_NAME`. Một request giờ cho trace
>   api-gateway → content-service (~30 span).
> - **Chưa làm:** kiểm tra `trace_id` trong log (bài tập 6).

## 1. Ba trụ cột — mỗi cái trả lời một câu hỏi

```
            Câu hỏi                          Công cụ trong project
Metric  →  "CÓ vấn đề không? Bao nhiêu?"     prom-client → /metrics → Prometheus :9090 → Grafana :4000
Trace   →  "Chậm/lỗi ở ĐÂU trong chuỗi gọi?" OpenTelemetry (tracing.ts) → Jaeger :16686
Log     →  "CHUYỆN GÌ đã xảy ra, chi tiết?"   nestjs-pino (JSON) → stdout container
```

Quy trình điều tra chuẩn: **metric báo động → trace khoanh vùng → log đọc chi tiết**.

```
Grafana: p95 /api/vocabularies tăng từ 80ms lên 2s   (metric: có vấn đề)
   ↓
Jaeger: span gRPC content-service GET_VOCABULARIES chiếm 1.9s   (trace: nằm ở content-service)
   ↓
Log content-service lọc theo trace_id: "prisma query 1.8s, cache miss"   (log: vì sao)
```

---

## 2. Hiện trạng project — soát bằng chính công cụ

### 2.1. Metric: Prometheus **không lấy được** số liệu

```powershell
curl http://localhost:3000/metrics
# {"success":false,"error":{"code":"UNAUTHORIZED","message":"Unauthorized"},"path":"/metrics"}
```

Trang Prometheus → *Status → Targets* (hoặc API):

```
api-gateway   down   server returned HTTP status 401 Unauthorized
```

Nguyên nhân: `app.module.ts` gắn `JwtAuthGuard` cho **mọi route** (`APP_GUARD`), kể cả `/metrics` do
`PrometheusModule` tạo — Prometheus không có token → 401 → **dashboard Grafana trống từ trước tới giờ**.
Đây là lỗi observability kinh điển: *hệ thống giám sát hỏng mà không ai biết, vì không có gì giám sát nó*.

Sửa: controller metrics riêng, đánh dấu `@Public()` và bỏ qua rate limit:

```ts
// metrics/metrics.controller.ts
import { Controller, Get, Res } from "@nestjs/common";
import { PrometheusController } from "@willsoto/nestjs-prometheus";
import { SkipThrottle } from "@nestjs/throttler";
import { Response } from "express";
import { Public } from "@app/common";

@Controller()
export class MetricsController extends PrometheusController {
  @Get()
  @Public()
  @SkipThrottle()
  async index(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }
}

// app.module.ts
PrometheusModule.register({ path: "/metrics", controller: MetricsController, defaultMetrics: { enabled: true } }),
```

> `/metrics` public thì **không được** mở ra Internet: chặn ở Nginx/Ingress (chỉ cho mạng nội bộ), hoặc dùng
> Basic Auth cho Prometheus. Metric lộ tên route, số lượng user, phiên bản thư viện.

### 2.2. Metric: nhãn `path` gây **bùng nổ cardinality**

`http-metrics.interceptor.ts` dùng `req.path` làm nhãn:

```
http_requests_total{method="GET", path="/api/vocabularies/101", status="200"}
http_requests_total{method="GET", path="/api/vocabularies/102", status="200"}
http_requests_total{method="GET", path="/api/vocabularies/103", status="200"}   ← mỗi id một time series
```

Mỗi tổ hợp nhãn = một time series trong RAM Prometheus. 14.000 từ vựng × method × status → hàng chục nghìn series
cho **một** route → Prometheus chậm, tốn RAM, có khi sập. Quy tắc: **nhãn chỉ chứa giá trị có tập hữu hạn nhỏ**.

```ts
// dùng mẫu route thay vì URL thật: "/api/vocabularies/:id"
const path = (req.route?.path as string | undefined) ?? "unmatched";
```

Không bao giờ đặt `userId`, `email`, `requestId`, URL đầy đủ làm nhãn — những thứ đó thuộc về **log/trace**.

### 2.3. Metric: chỉ có Counter → không biết **độ trễ**

Chỉ đếm request thì trả lời được "bao nhiêu lỗi" nhưng không trả lời được "chậm không". Cần **Histogram**:

```ts
makeHistogramProvider({
  name: "http_request_duration_seconds",
  help: "HTTP latency",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
}),
```

```ts
// trong interceptor
const end = this.histogram.startTimer({ method, route });
return next.handle().pipe(tap({
  next: () => end({ status: String(res.statusCode) }),
  error: (e) => end({ status: String(e?.status ?? 500) }),
}));
```

### 2.4. Trace: đã có, cần biết đọc

`import "./tracing"` là **dòng đầu tiên** của `main.ts` ở cả 3 service (bắt buộc: auto-instrumentation phải patch
`http`, `pg`, `grpc`, `ioredis`… **trước** khi chúng được import). Mở http://localhost:16686 → chọn service
`api-gateway` → một trace nộp bài thi trông như:

```
POST /api/mock-exams/:id/submit          ███████████████████████████  420ms
 ├─ grpc exam-service SubmitExam          ██████████████████████      380ms
 │   ├─ pg SELECT MockExamQuestion        ███                          35ms
 │   ├─ pg INSERT ExamResult              ██                           22ms
 │   └─ kafka send edu.exam.submitted     ███████████████             260ms   ← thủ phạm
 └─ redis GET                             ▏                             1ms
```

Đọc trace: tìm span **dài nhất** và span **lặp nhiều lần** (N+1 query: 50 span `pg SELECT` giống nhau liên tiếp).

### 2.5. Log: có request id, thiếu 2 thứ

`pinoConfig` đã tốt: JSON, `genReqId` lấy `x-request-id` hoặc tạo UUID, `customProps` gắn tên service,
serializer `req` chỉ log `method/url/id` (**không** log header → không lộ token). Thiếu:

- **Liên kết log ↔ trace:** auto-instrumentation có instrumentation cho pino tự chèn `trace_id`, `span_id` vào log.
  Kiểm tra một dòng log có 2 trường này; nếu có → từ Jaeger copy `trace_id` là lọc ra đúng log của request đó.
- **Truyền request id sang service con:** gateway nên gửi `x-request-id` theo metadata gRPC để log của
  content/exam-service mang cùng id.

---

## 3. Chọn metric nào: RED và USE

| Phương pháp | Áp cho | Ba chỉ số |
|-------------|--------|-----------|
| **RED** | service nhận request (api-gateway, content, exam) | **R**ate (req/s) · **E**rrors (% lỗi) · **D**uration (p50/p95/p99) |
| **USE** | tài nguyên (CPU, RAM, pool kết nối DB, Kafka) | **U**tilization · **S**aturation (hàng đợi) · **E**rrors |

PromQL tương ứng (sau khi sửa mục 2.2–2.3):

```promql
# Rate
sum(rate(http_requests_total[5m])) by (route)
# Errors (%)
100 * sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
# Duration p95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
```

**Luôn nhìn p95/p99, không nhìn trung bình**: avg 50ms có thể che giấu 5% user chờ 3 giây.

---

## 4. SLI · SLO · Error budget

```
SLI (chỉ số)   : tỷ lệ request /api/vocabularies trả < 500ms và không lỗi 5xx
SLO (mục tiêu) : 99% trong 30 ngày
Error budget   : 1% = ~7 giờ "được phép tệ" mỗi tháng
```

Error budget biến tranh cãi "làm tính năng hay làm ổn định" thành số liệu: còn budget → ship tính năng; hết budget →
dừng tính năng, sửa độ ổn định. Chọn SLO từ **trải nghiệm người học** (tra từ phải nhanh; gửi email kết quả chậm vài
phút không sao), không phải "càng nhiều số 9 càng tốt".

---

## 5. Cảnh báo (alerting) — báo **triệu chứng**, không báo nguyên nhân

```
❌ CPU > 80%            → có thể không ai bị ảnh hưởng; đánh thức người trực vô ích
✅ Lỗi 5xx > 2% trong 5 phút trên /api/*           → user đang bị ảnh hưởng
✅ p95 > 1s trong 10 phút
✅ Prometheus target down > 5 phút                  → đúng lỗi của mục 2.1
```

```yaml
# infra/prometheus/alerts.yml
groups:
  - name: edu-api
    rules:
      - alert: ApiHighErrorRate
        expr: 100 * sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 2
        for: 5m
        labels: { severity: page }
        annotations:
          summary: "api-gateway 5xx > 2%"
          runbook: "docs/learn-incident-postmortem.md#runbook-api-5xx"
      - alert: TargetDown
        expr: up == 0
        for: 5m
        labels: { severity: ticket }
```

Mỗi alert phải có **runbook** (làm gì khi nó kêu) — xem [learn-incident-postmortem.md](./learn-incident-postmortem.md).

---

## 6. Health check đúng cách

`/health` hiện luôn trả **HTTP 200**, chỉ ghi `"status": "degraded"` trong body khi DB/service con chết →
Kubernetes và load balancer chỉ nhìn **mã HTTP** nên **không bao giờ biết** pod đang hỏng. Tách thành hai:

| Endpoint | Trả lời | Kiểm tra | Dùng cho |
|----------|---------|----------|----------|
| `/health/live` | "process còn sống?" | không gọi gì bên ngoài | `livenessProbe` — fail → K8s restart pod |
| `/health/ready` | "nhận request được chưa?" | DB, content, exam; **503** nếu thiếu | `readinessProbe` — fail → rút pod khỏi load balancer |

Liveness **không được** phụ thuộc DB: DB chết → mọi pod fail liveness → K8s restart hàng loạt → khi DB sống lại, mọi
pod cùng khởi động cùng lúc (thundering herd). Chi tiết: [learn-kubernetes.md](./learn-kubernetes.md).

---

## 7. Chạy thử trên máy

```powershell
docker compose up -d jaeger prometheus grafana api-gateway content-service exam-service
start http://localhost:16686     # Jaeger: chọn service api-gateway → Find Traces
start http://localhost:9090      # Prometheus: Status → Targets, thử query `up`
start http://localhost:4000      # Grafana (tài khoản: xem docs/dev-tools-connect.md)
```

Tắt trace khi chỉ dev nhanh: `OTEL_SDK_DISABLED=true` (tracing.ts đã hỗ trợ).

---

## Bài tập thực hành

1. Sửa lỗi 401 của `/metrics` (mục 2.1). Kiểm tra target `api-gateway` chuyển sang **UP** trong Prometheus.
2. Đổi nhãn `path` sang mẫu route (2.2). Gọi `/api/vocabularies/1`, `/2`, `/3` rồi đếm series:
   `count(http_requests_total)` trước và sau khi sửa.
3. Thêm histogram (2.3), viết 3 query RED (mục 3), dựng một dashboard Grafana 3 panel.
4. Tách `/health/live` và `/health/ready` (mục 6), cho ready trả 503 khi DB down; tắt Postgres để kiểm tra.
5. Mở Jaeger, nộp một bài thi thử, tìm span chậm nhất. Tắt Kafka rồi nộp lại — trace thay đổi thế nào?
6. Kiểm tra log có `trace_id` chưa; nếu có, lấy một trace trong Jaeger và tìm đúng các dòng log của nó.
7. Viết file alert (mục 5), nạp vào Prometheus, cố tình tắt api-gateway để `TargetDown` chuyển sang *firing*.

<details>
<summary>Gợi ý đáp án</summary>

1. Code ở mục 2.1. Kiểm tra: `curl http://localhost:3000/metrics` trả văn bản dạng `# HELP …` thay vì JSON 401;
   Prometheus → Targets: `api-gateway up`. Nhớ rebuild container `api-gateway`.
2. `req.route?.path` chỉ có **sau** khi Express đã khớp route — trong interceptor của Nest là có. Request không khớp
   route nào (404) → dùng nhãn cố định `"unmatched"` để không sinh series mới theo URL rác của bot.
3. Panel Rate: query Rate theo `route`; panel Errors: query % lỗi, đặt ngưỡng đỏ 2%; panel Duration: p95 và p99
   cùng một biểu đồ.
4. Readiness trả 503: `throw new ServiceUnavailableException(body)` khi có thành phần `down`. Liveness chỉ
   `return { status: "ok" }`. Sửa `infra/k8s/api-gateway.yaml` cho 2 probe trỏ 2 path khác nhau.
5. Kafka down lúc khởi động: `kafka.producer.ts` đặt `producer = null` → span kafka **biến mất** và event bị bỏ
   im lặng. Trace "sạch" nhưng dữ liệu đã mất — ví dụ cho việc cần **metric cho event bị bỏ**
   (`kafka_events_dropped_total`). Xem [learn-reliability-patterns.md](./learn-reliability-patterns.md).
6. Nếu thiếu `trace_id`: kiểm tra `@opentelemetry/instrumentation-pino` có trong auto-instrumentations và
   `tracing.ts` được import **trước** `nestjs-pino`.
7. Thêm vào `prometheus.yml`: `rule_files: ["/etc/prometheus/alerts.yml"]` và mount file. `for: 5m` nghĩa là phải
   down liên tục 5 phút — trạng thái đi *inactive → pending → firing*.

</details>

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **6. DevOps và hạ tầng** — bài 7/9.

- Bài trước: [learn-release-cicd.md](./learn-release-cicd.md) — CI/CD: migrate khi deploy, canary, feature flag, rollback
- **Bài tiếp: [learn-incident-postmortem.md](./learn-incident-postmortem.md)** — Xử lý sự cố, runbook, postmortem (có postmortem thật)

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
