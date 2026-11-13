# Phỏng vấn DevOps: Kubernetes, CI/CD, monitoring

> **Mục tiêu:** Trả lời được câu hỏi phỏng vấn DevOps về Kubernetes, pipeline CI/CD, monitoring và vận hành, mỗi câu dẫn manifest, workflow hoặc code thật trong repo.
>
> **Cần biết trước:** [learn-kubernetes.md](./learn-kubernetes.md), [learn-release-cicd.md](./learn-release-cicd.md), [learn-observability.md](./learn-observability.md), [learn-devops-roadmap.md](./learn-devops-roadmap.md). Docker: [interview-docker.md](./interview-docker.md). nginx, Terraform, cloud, đo tải, xử lý sự cố: [interview-infra-cloud.md](./interview-infra-cloud.md). Bảo mật API: [interview-backend-security.md](./interview-backend-security.md).

Cách dùng: tự trả lời thành tiếng 1–2 phút rồi mới mở đáp án. Mỗi đáp án có phần "Trong project" để bạn làm ví dụ.

Mức độ: 🟢 Junior · 🟡 Middle · 🔴 Senior.

---

## A. Container (tóm tắt)

Bộ đầy đủ 25 câu Docker nằm ở [interview-docker.md](./interview-docker.md). Ở đây chỉ giữ câu hay gặp nhất trong buổi phỏng vấn DevOps.

### 1. 🟢 Container khác máy ảo thế nào?

<details><summary>Đáp án</summary>

Máy ảo giả lập phần cứng, mỗi máy có hệ điều hành riêng, nặng (GB), khởi động tính bằng phút. Container dùng chung kernel của máy chủ, chỉ cô lập tiến trình, nhẹ (MB), khởi động tính bằng giây. Đổi lại, container cô lập kém hơn máy ảo: lỗ hổng kernel ảnh hưởng mọi container.

**Trong project:** cả stack (Postgres, Redis, MongoDB, Kafka, Keycloak, 4 service NestJS, web Next.js, nginx) chạy bằng một file `docker-compose.yml` trên laptop.

</details>

### 2. 🟡 Dockerfile của gateway có gì đáng nói?

<details><summary>Đáp án</summary>

**Trong project:** [services/api-gateway/Dockerfile](../services/api-gateway/Dockerfile), rút gọn:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY services ./services
RUN npm ci
WORKDIR /app/services
RUN npm run prisma:generate -w @edu/nihongo-services
RUN npm run build:all -w @edu/nihongo-services
WORKDIR /app
RUN npm prune --omit=dev          # bỏ thư viện dev (ts-jest kéo theo handlebars có CVE CRITICAL)

FROM node:22-alpine AS runner
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
WORKDIR /app/services
ENV NODE_ENV=production
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/services/dist ./dist
COPY --from=builder /app/packages /app/packages
USER node
CMD ["node", "dist/apps/api-gateway/services/api-gateway/src/main.js"]
```

Ba điểm để kể:
- **Multi-stage, không root, không npm:** `npm prune` và xóa npm là hai bản sửa sau khi Trivy quét ra 22 lỗ hổng HIGH/CRITICAL mà `npm audit` không thấy ([learn-devsecops.md](./learn-devsecops.md) mục 3).
- **Điểm yếu còn lại:** chép toàn bộ `packages` và `services` trước `npm ci`, nên sửa một dòng code là cài lại toàn bộ thư viện. Cách tối ưu: chép riêng các `package.json` của workspace, `npm ci`, rồi mới chép mã nguồn (bài tập 4 trong [learn-docker.md](./learn-docker.md)).
- **CMD dạng mảng:** `node` là PID 1, nhận SIGTERM để tắt êm (`enableShutdownHooks`).

</details>

---

## B. Kubernetes

### 3. 🟢 Pod, Deployment, Service, Ingress — giải thích qua project.

<details><summary>Đáp án</summary>

- **Pod:** một bản chạy của container api-gateway.
- **Deployment:** giữ đủ số pod, rolling update, rollback.
- **Service:** tên và IP ổn định trong cluster (`api-gateway:3000`); IP pod đổi mỗi lần tạo lại.
- **Ingress:** nhận traffic từ ngoài và định tuyến theo host/đường dẫn tới Service.

**Trong project:** [infra/k8s/api-gateway.yaml](../infra/k8s/api-gateway.yaml) gồm Service `ClusterIP` + Deployment trong namespace `edu-app`; [ingress.yaml](../infra/k8s/ingress.yaml) định tuyến từ ngoài vào. Chart Helm tương đương ở [infra/helm/edu-app](../infra/helm/edu-app).

</details>

### 4. 🟡 Liveness và readiness probe khác nhau thế nào? Project làm sao?

<details><summary>Đáp án</summary>

- **Liveness** fail → Kubernetes **khởi động lại** container. Chỉ được kiểm "tiến trình còn sống", không gọi DB: DB chết mà liveness gọi DB thì mọi pod bị restart liên tục, làm sự cố tệ hơn.
- **Readiness** fail → pod bị **rút khỏi Service** (không nhận traffic) nhưng không restart. Đây là chỗ kiểm phụ thuộc.

**Trong project:** [health.controller.ts](../services/api-gateway/src/health/health.controller.ts) có ba endpoint:
- `/health/live`: không gọi gì bên ngoài.
- `/health/ready`: kiểm DB (`SELECT 1`), content-service, exam-service (timeout 3 giây mỗi cái), thiếu thì trả 503.
- `/health`: luôn 200 kèm chi tiết, cho người xem.

Manifest: liveness `initialDelaySeconds: 20`, readiness `periodSeconds: 5`, `failureThreshold: 3`.

</details>

### 5. 🟡 Làm sao rolling update không rớt request nào?

<details><summary>Đáp án</summary>

Bốn thứ phải cùng có:
1. `maxUnavailable: 0`, `maxSurge: 1`: pod mới phải Ready rồi mới gỡ pod cũ.
2. Readiness probe đúng nghĩa (câu 4).
3. `preStop: sleep 5`: khi pod bị xóa, Service/Ingress cần vài giây để gỡ nó khỏi danh sách; không chờ thì vài request vẫn bay vào pod đang tắt.
4. App xử lý SIGTERM: làm xong request đang chạy rồi mới thoát; `terminationGracePeriodSeconds: 30`.

**Trong project:** cả bốn có trong [api-gateway.yaml](../infra/k8s/api-gateway.yaml). Deployment **không đặt `replicas`**, vì HPA quyết định số pod — đặt cứng thì mỗi lần `kubectl apply` ép số pod về giá trị đó.

</details>

### 6. 🟡 HPA hoạt động thế nào? Project đặt thông số gì?

<details><summary>Đáp án</summary>

HPA đọc metric (thường là CPU so với `requests`) và tăng giảm số pod để giữ mức mục tiêu. Bắt buộc phải khai `resources.requests`, không thì không có gốc để tính phần trăm.

**Trong project:** [api-gateway-hpa.yaml](../infra/k8s/api-gateway-hpa.yaml): 2–5 pod, CPU mục tiêu 70%. Pod đặt `requests: cpu 100m, memory 128Mi`, `limits: cpu 500m, memory 512Mi`. Các service gRPC có HPA và PodDisruptionBudget riêng ([grpc-services-autoscaling.yaml](../infra/k8s/grpc-services-autoscaling.yaml)) để khi bảo trì node, Kubernetes không gỡ cùng lúc mọi pod. Muốn biết nên đặt bao nhiêu pod thì đo bằng k6 ([interview-infra-cloud.md](./interview-infra-cloud.md) câu 19).

</details>

### 7. 🟡 Secret trong Kubernetes quản lý thế nào?

<details><summary>Đáp án</summary>

Không commit secret. K8s Secret chỉ là base64, không phải mã hóa — phải hạn chế quyền đọc (RBAC) và bật mã hóa etcd. Mức cao hơn: External Secrets Operator lấy từ Vault/AWS Secrets Manager, hoặc Sealed Secrets để commit bản đã mã hóa.

**Trong project:** GitHub Secrets → bước "Sync secrets" trong [deploy.yml](../.github/workflows/deploy.yml) ghi ra file tạm (`umask 077`, xóa bằng `trap`) rồi `kubectl create secret generic edu-app-secrets --dry-run=client -o yaml | kubectl apply -f -` (tạo hoặc cập nhật, không lỗi khi đã tồn tại). Pod đọc qua `secretKeyRef`. Lab Vault cấp mật khẩu DB động: [learn-devsecops.md](./learn-devsecops.md) mục 12.

</details>

### 8. 🔴 Pod chạy với `securityContext` nào? Vì sao?

<details><summary>Đáp án</summary>

**Trong project:** `runAsNonRoot`, `runAsUser: 1000`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, bỏ mọi capability, `seccompProfile: RuntimeDefault`, `automountServiceAccountToken: false` (app không gọi Kubernetes API, lọt container cũng không có token để dò cluster). Vì hệ thống file chỉ đọc, `/tmp` gắn `emptyDir`.

Cái giá: mọi chỗ app ghi file (cache, file tạm, `$HOME` của Prisma) phải trỏ vào volume ghi được; volume cũ do root tạo sẽ báo `EACCES`. Kyverno trong cluster bắt buộc các chính sách này ([learn-devsecops.md](./learn-devsecops.md) mục 13).

</details>

### 9. 🟡 Deployment lỗi: bạn debug theo thứ tự nào?

<details><summary>Đáp án</summary>

```bash
kubectl get pods -n edu-app -l app=api-gateway        # trạng thái
kubectl describe pod <tên-pod> -n edu-app             # Events: lý do thật nằm ở đây
kubectl logs <tên-pod> -n edu-app --previous          # log của lần chạy vừa chết
kubectl rollout undo deployment/api-gateway -n edu-app
```

Đọc trạng thái:
- `ImagePullBackOff`: sai tag hoặc thiếu quyền kéo image (project dùng `ghcr-pull-secret`; workflow cảnh báo khi phải dùng tạm `GITHUB_TOKEN` vì token đó hết hạn khi job xong).
- `CrashLoopBackOff`: app chết ngay khi chạy — thường do thiếu env (gateway cố ý không khởi động khi thiếu `JWT_SECRET`).
- `Pending`: không node nào đủ `requests`.
- `Running` nhưng `0/1 Ready`: readiness fail — gọi thử `/health/ready` xem phụ thuộc nào `down`.
- `OOMKilled`: vượt `limits.memory`.

</details>

### 10. 🟡 Container bị OOMKilled: xử lý thế nào?

<details><summary>Đáp án</summary>

Xác nhận bằng `kubectl describe pod` (Last State: `OOMKilled`, exit code 137). Tăng limit chỉ là chữa cháy; phải tìm xem bộ nhớ tăng đều (rò rỉ) hay nhảy vọt (một request lớn). Với Node, đo heap bằng `--inspect` / heap snapshot, xem metric bộ nhớ theo thời gian.

**Trong project:** `AiService` chỉ gửi 10 tin gần nhất của lịch sử hội thoại (`history.slice(-10)` trong [ai.service.ts](../services/api-gateway/src/ai/ai.service.ts)) — vừa giới hạn bộ nhớ vừa giới hạn kích thước request tới model.

</details>

---

## C. CI/CD

### 11. 🟢 Pipeline của project gồm những bước nào?

<details><summary>Đáp án</summary>

**Trong project:**
- [ci.yml](../.github/workflows/ci.yml) chạy trên mọi push/PR, gồm các job:
  - `security`: gitleaks, audit-ci, Semgrep, `trivy config`.
  - `image-scan`: Trivy quét image đã build.
  - `backend`: Postgres 16 + Redis làm service container, migrate, test.
  - `nihongo-web`, `android` (test JVM + build release qua R8), `flutter` (kiểm code Drift sinh ra có khớp schema không), `ios`.
- [deploy.yml](../.github/workflows/deploy.yml) chạy **sau khi CI trên main xanh** (`workflow_run`). Trước đây deploy chạy song song với CI nên test đỏ vẫn lên production.
- [dast.yml](../.github/workflows/dast.yml): OWASP ZAP quét app đang chạy.

</details>

### 12. 🟡 Vì sao gắn tag image theo commit SHA, không dùng `latest`?

<details><summary>Đáp án</summary>

`latest` không cho biết đang chạy code nào, không rollback chính xác được, và hai node có thể kéo hai bản khác nhau. Tag theo SHA: bất biến, truy được về commit, rollback là đổi tag.

**Trong project:** manifest trong repo ghi `:latest` cho dễ chạy tay, còn bước deploy thay bằng SHA đã qua CI trước khi apply:

```bash
sed "s#\(${IMAGE_PREFIX}/[a-z-]*\):latest#\1:${DEPLOY_SHA}#g" "$f" | kubectl apply -f -
```

`DEPLOY_SHA` là `head_sha` của lần CI vừa xanh, và job build cũng checkout đúng SHA đó — build đúng commit đã được test.

</details>

### 13. 🔴 Mô tả luồng deploy từ lúc merge tới lúc chạy trên cluster.

<details><summary>Đáp án</summary>

**Trong project** ([deploy.yml](../.github/workflows/deploy.yml)):
1. CI trên main xanh → kích hoạt deploy; `concurrency: deploy-production` để hai lần deploy không chồng nhau.
2. `build-and-push`: build 5 image (gateway, content, exam, web, migrator), đẩy lên GHCR, **ký bằng cosign keyless** (token OIDC của GitHub, không giữ khóa riêng).
3. `deploy` (environment `production`): `cosign verify` mọi image — image bị thay trên registry thì dừng.
4. Đồng bộ secret, apply Postgres/Redis/Mosquitto, chờ Postgres sẵn sàng.
5. **Migrate DB bằng Job riêng** gắn SHA (`prisma-migrate-<sha>`), chờ hoàn tất; lỗi thì in log và dừng trước khi đụng vào app.
6. Apply workload với tag SHA, `rollout status` từng Deployment; quá 300 giây không xong → `rollout undo` tự động.
7. Smoke test: chạy pod curl gọi `/health/ready`.
8. Thiếu secret `KUBE_CONFIG` → bỏ qua phần cluster kèm thông báo, thay vì fail khó hiểu.

Các Action được ghim theo SHA (không theo `@v5`) để tránh tag bị chiếm quyền sửa.

</details>

### 14. 🔴 Migration DB trong production không downtime thế nào?

<details><summary>Đáp án</summary>

Expand–contract: (1) thêm cột nullable hoặc có default — app cũ vẫn chạy; (2) deploy code đọc/ghi cả cũ và mới; (3) backfill dữ liệu theo lô; (4) thêm ràng buộc, bỏ cột cũ khi chắc không còn code cũ dùng. Mỗi migration phải chạy được khi bản app **trước** vẫn đang phục vụ, vì rolling update có lúc hai bản cùng chạy.

```sql
-- ❌ bảng có dữ liệu: lỗi hoặc khóa bảng lâu
ALTER TABLE "User" ADD COLUMN "displayName" TEXT NOT NULL;
-- ✅ nullable trước, backfill, rồi mới SET NOT NULL
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
```

**Trong project:** migration chạy bằng Job trước khi rollout app (câu 13). Cột `en` cho câu ví dụ được thêm dạng nullable (`VocabularyExample.en`), nên app cũ không biết cột này vẫn chạy bình thường.

</details>

---

## D. Monitoring và vận hành

### 15. 🟢 Metrics, logs, traces khác nhau thế nào?

<details><summary>Đáp án</summary>

- **Metrics:** con số theo thời gian, rẻ, dùng để alert ("tỉ lệ 5xx tăng").
- **Logs:** từng sự kiện chi tiết, dùng để tìm nguyên nhân ("lỗi gì, request nào").
- **Traces:** đường đi của một request qua nhiều service, dùng để biết chậm ở đâu.

**Trong project:** Prometheus + Grafana + Alertmanager và Jaeger có trong `docker-compose.yml`; log JSON bằng pino; trace bằng OpenTelemetry ([tracing.ts](../services/api-gateway/src/tracing.ts)); lỗi gửi Sentry ([instrument.ts](../services/api-gateway/src/instrument.ts)).

</details>

### 16. 🟡 Gateway xuất metric HTTP thế nào? Query nào bạn hay dùng?

<details><summary>Đáp án</summary>

**Trong project:** [http-metrics.middleware.ts](../services/api-gateway/src/metrics/http-metrics.middleware.ts) ghi `http_requests_total` (counter) và `http_request_duration_seconds` (histogram) theo method, route, status.

```promql
# tỉ lệ lỗi 5xx
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
# p95 độ trễ
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```

Nhãn phải là **mẫu route** (`/api/vocab/:id`), không phải URL thật; nếu không mỗi id tạo một chuỗi metric mới và Prometheus nổ bộ nhớ (cardinality).

</details>

### 17. 🟡 SLI, SLO, SLA và error budget?

<details><summary>Đáp án</summary>

- **SLI:** số đo, ví dụ tỉ lệ request không lỗi 5xx và nhanh hơn 500 ms.
- **SLO:** mục tiêu nội bộ cho SLI, ví dụ 99,9% mỗi 30 ngày.
- **SLA:** cam kết với khách, vi phạm thì đền bù; luôn lỏng hơn SLO.
- **Error budget:** 99,9% trong 30 ngày = khoảng 43 phút được phép lỗi. Còn budget thì deploy nhanh; hết budget thì dừng tính năng mới, tập trung độ ổn định.

Alert nên theo tốc độ đốt budget (burn rate), không theo từng lần CPU vọt lên.

</details>

### 18. 🟡 Vì sao log JSON (pino) tốt hơn `console.log`?

<details><summary>Đáp án</summary>

Máy đọc được: lọc theo trường (`level`, `requestId`, `userId`) trong Loki/ELK thay vì grep chuỗi. Xuống dòng trong input người dùng không giả được dòng log mới. Có mức log để production bớt ồn.

**Trong project:** `LoggerModule.forRoot(pinoConfig)` trong [app.module.ts](../services/api-gateway/src/app.module.ts), cấu hình chung ở `@app/common/logger/pino.config`. Chỉ log method/url/id, **không log header** để không lộ token. Mỗi service đặt `SERVICE_NAME` để phân biệt log và trace.

</details>

### 19. 🔴 Một service NestJS khởi động mất 30 giây và bị restart liên tục trên Kubernetes. Vì sao?

<details><summary>Đáp án</summary>

Liveness probe bắt đầu kiểm tra trước khi app sẵn sàng (initialDelay quá ngắn), fail 3 lần → restart → lại khởi động 30 giây → vòng lặp. Hoặc liveness gọi DB, DB chậm thì app bị giết oan.

Sửa: liveness chỉ kiểm tiến trình (`/health/live`); dùng `startupProbe` cho app khởi động chậm (liveness chỉ bắt đầu khi startup thành công); kiểm phụ thuộc ở readiness. Đồng thời tìm vì sao chậm: chờ kết nối Kafka, generate Prisma lúc chạy, nạp dữ liệu lớn khi khởi động.

</details>

---

## E. Lộ trình

Lộ trình học DevOps chi tiết theo tuần, nối với code thật của repo: [learn-devops-roadmap.md](./learn-devops-roadmap.md). Chứng chỉ hay được hỏi: AWS Solutions Architect Associate, CKA, Terraform Associate.

## Câu hỏi mở để tự luyện

1. Viết `startupProbe` cho exam-service và giải thích chọn `failureThreshold × periodSeconds` bao nhiêu.
2. Workflow deploy apply cả Postgres trong cluster. Khi chuyển sang RDS/Cloud SQL, bước nào đổi, bước nào bỏ?
3. Viết một alert Prometheus cho tỉ lệ 5xx của gateway, kèm runbook ba dòng: kiểm gì trước, rollback khi nào.

<!-- nav:start -->

---

## Đi tiếp

Tài liệu tham khảo thuộc **13. Phỏng vấn**. Cùng nhóm:

- [interview-questions.md](./interview-questions.md) — Bộ câu hỏi Senior chung
- [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md) — Backend NestJS, MQTT, DB
- [interview-docker.md](./interview-docker.md) — Docker: 25 câu từ Junior tới Senior, đáp án bằng compose/Dockerfile của project (có sự cố `.env` trong image)
- [interview-web.md](./interview-web.md) — Web: React, Next.js, JavaScript/TypeScript, HTTP, webpack — 25 câu, đáp án theo code nihongo-web
- [interview-infra-cloud.md](./interview-infra-cloud.md) — Hạ tầng và cloud: nginx, Terraform, AWS/LocalStack/serverless, GCP, k6, xử lý sự cố
- [interview-backend-security.md](./interview-backend-security.md) — Bảo mật API (OWASP), thanh toán chống trùng, outbox, timeout, retry, circuit breaker
- [interview-backend-android-rn-swift.md](./interview-backend-android-rn-swift.md) — Backend, Android, React Native, Swift
- [interview-mobile.md](./interview-mobile.md) — Senior Mobile
- [interview-android.md](./interview-android.md) — Android: câu hỏi theo code nihongo-android, gồm cả Framework, Binder, Automotive
- [interview-java-dsa.md](./interview-java-dsa.md) — Java, OOP và 10 bài thuật toán gắn với app (lời giải Java đã chạy), kế hoạch luyện bài test lập trình
- [interview-react-native-senior.md](./interview-react-native-senior.md) — Senior React Native

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
