# Học Kubernetes — Từ Project Này

> Project có sẵn manifest [`infra/k8s/`](../infra/k8s) và Helm chart [`infra/helm/edu-app/`](../infra/helm/edu-app);
> `deploy.yml` apply chúng lên cluster. Tài liệu học K8s bằng cách **đọc hiểu từng file** rồi sửa những chỗ sai.
> Câu hỏi phỏng vấn: [interview-devops.md](./interview-devops.md) · Docker trước: [learn-docker.md](./learn-docker.md).

> **Cập nhật 2026-09-29 — đã sửa trong `infra/k8s` và Helm chart:** bỏ `replicas` của api-gateway (Helm: chỉ khi tắt HPA);
> probe `/health/live` + `/health/ready`; `maxUnavailable: 0`, `preStop sleep 5`, `terminationGracePeriodSeconds: 30` cho cả
> 5 Deployment; Ingress `/health` đổi sang `Prefix`; app bật `enableShutdownHooks`. **Chưa làm:** PodDisruptionBudget,
> NetworkPolicy, securityContext, gộp `infra/k8s` và Helm thành một nguồn.

## 1. Từ docker compose sang Kubernetes

| docker compose | Kubernetes | File trong project |
|----------------|------------|--------------------|
| cả file `docker-compose.yml` | **Namespace** gom tài nguyên | `namespace.yaml` (`edu-app`) |
| một service chạy container | **Deployment** → ReplicaSet → **Pod** | `api-gateway.yaml`, `content-service.yaml`… |
| tên service làm DNS (`content-service:50051`) | **Service** (ClusterIP) | phần `kind: Service` đầu mỗi file |
| `ports: 8080:80` + nginx | **Ingress** (+ ingress controller) | `ingress.yaml` |
| `environment:` | **ConfigMap** / **Secret** | `configmap.yaml`, `secret.yaml` |
| volume của Postgres | **StatefulSet** + PersistentVolumeClaim | `postgres.yaml` (5Gi) |
| `restart: unless-stopped` | K8s tự khởi động lại Pod, dời sang node khác | (mặc định) |
| — | **HPA** tự scale theo CPU | `api-gateway-hpa.yaml` (2–5 pod, 70% CPU) |

```
Internet ─▶ Ingress (nihongo.example.com)
              ├─ /api, /health ─▶ Service api-gateway:3000 ─▶ Pod ×2..5 ─┬─▶ Service content-service:50051 ─▶ Pod
              │                                                           ├─▶ Service exam-service:50052   ─▶ Pod
              │                                                           ├─▶ Service postgres:5432 ─▶ StatefulSet (PVC 5Gi)
              │                                                           └─▶ Service redis:6379    ─▶ Pod
              └─ /             ─▶ Service nihongo-web:8080 ─▶ Pod
```

---

## 2. Chạy thử trên máy

```powershell
# Docker Desktop: Settings → Kubernetes → Enable. Hoặc kind: kind create cluster --name edu
kubectl config current-context
kubectl apply -f infra/k8s/namespace.yaml
Copy-Item infra/k8s/secrets.yaml.example infra/k8s/secret.local.yaml   # điền giá trị, KHÔNG commit
kubectl apply -f infra/k8s/secret.local.yaml
kubectl apply -f infra/k8s/                                               # bỏ qua lỗi của file .example

kubectl get pods -n edu-app -w                  # theo dõi pod lên
kubectl port-forward -n edu-app svc/api-gateway 3000:3000
curl http://localhost:3000/health
```

Lệnh hằng ngày:

```powershell
kubectl get deploy,svc,pods,hpa -n edu-app
kubectl describe pod <pod> -n edu-app            # xem Events: vì sao Pending / CrashLoopBackOff
kubectl logs -f deploy/api-gateway -n edu-app    # log (nhiều pod: thêm --all-containers / chọn pod)
kubectl exec -it deploy/api-gateway -n edu-app -- sh
kubectl rollout status|history|undo deploy/api-gateway -n edu-app
kubectl top pods -n edu-app                      # cần metrics-server (HPA cũng cần)
```

---

## 3. Đọc hiểu `api-gateway.yaml`

```yaml
spec:
  replicas: 2                                   # ⚠️ mục 5.1
  template:
    spec:
      containers:
        - name: api-gateway
          image: ghcr.io/letiendungdn/edu_app/api-gateway:latest   # ⚠️ mục 5.2
          imagePullPolicy: Always
          resources:
            requests: { cpu: 100m, memory: 128Mi }   # scheduler dùng để XẾP pod vào node; HPA tính % trên requests
            limits:   { cpu: 500m, memory: 512Mi }   # vượt memory → OOMKilled; vượt cpu → bị bóp (throttle)
          livenessProbe:  { httpGet: { path: /health, port: 3000 }, initialDelaySeconds: 20, periodSeconds: 15, failureThreshold: 3 }
          readinessProbe: { httpGet: { path: /health, port: 3000 }, initialDelaySeconds: 10, periodSeconds: 5,  failureThreshold: 3 }
```

**requests vs limits:**

```
requests.cpu 100m  = "tôi cần ít nhất 0.1 core"   → HPA 70% nghĩa là scale khi dùng > 70m CPU trung bình
limits.cpu   500m  = "không cho vượt 0.5 core"    → Node 1 luồng bị bóp ở 0.5 core → latency tăng khi tải cao
limits.memory 512Mi                                → Node vượt → bị kill (OOMKilled), không có cảnh báo trong app
```

Với Node.js nên đặt `--max-old-space-size` thấp hơn memory limit (vd 384 MB cho limit 512Mi) để GC chạy trước khi bị kill.

---

## 4. Probe — ba loại, ba mục đích

| Probe | Fail thì K8s làm gì | Nên kiểm tra |
|-------|---------------------|--------------|
| **startupProbe** | chưa khởi động xong → chưa chạy 2 probe kia | app đã listen chưa (cho app khởi động chậm) |
| **livenessProbe** | **restart** container | process còn phản hồi — **không** kiểm tra DB/service khác |
| **readinessProbe** | **rút pod khỏi Service** (không nhận traffic) | DB, content-service, exam-service sẵn sàng |

Hiện cả hai probe cùng gọi `/health`, và `/health`:

1. **luôn trả HTTP 200** (chỉ đổi `status: "degraded"` trong body) → probe **không bao giờ fail** → pod mất DB vẫn nhận
   traffic và trả 500;
2. mỗi lần gọi chạy `SELECT 1` + gọi `GET_LESSONS` sang content-service + `LIST_TEMPLATES` sang exam-service —
   với readiness 5s/lần × 5 pod = **2 request thật/giây** chỉ để kiểm tra sức khoẻ.

Sửa: `/health/live` (không gọi gì) cho liveness; `/health/ready` (kiểm tra phụ thuộc, trả **503** khi thiếu) cho
readiness. Chi tiết code: [learn-observability.md](./learn-observability.md) mục 6.

> Tại sao liveness **không** kiểm tra DB? DB chết → mọi pod fail liveness → K8s restart tất cả liên tục → khi DB sống lại,
> mọi pod khởi động cùng lúc, cùng mở kết nối → DB lại quá tải. Restart không chữa được lỗi của DB.

---

## 5. Những chỗ cần sửa trong manifest

### 5.1. `replicas` đánh nhau với HPA

HPA đặt số pod 2–5 theo CPU, nhưng mỗi lần deploy `kubectl apply` file có `replicas: 2` → **ép về 2** giữa lúc tải cao.
Khi có HPA: **xoá `replicas`** khỏi Deployment (chỉ để HPA `minReplicas`).

### 5.2. `:latest` không kích hoạt rollout

Manifest không đổi → `apply` báo `unchanged` → pod cũ vẫn chạy code cũ. Dùng tag theo git sha
(`kubectl set image …:<sha>` hoặc Helm `--set image.tag=<sha>`). Chi tiết: [learn-release-cicd.md](./learn-release-cicd.md) mục 2.2.

### 5.3. Rolling update không được làm rớt request

```yaml
spec:
  strategy:
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }   # luôn đủ số pod cũ cho tới khi pod mới Ready
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - lifecycle:
            preStop: { exec: { command: ["sh", "-c", "sleep 5"] } }   # chờ Ingress/Service gỡ pod khỏi danh sách
```

Và trong NestJS: `app.enableShutdownHooks()` để khi nhận SIGTERM, server đóng kết nối, Prisma/Kafka ngắt gọn.

### 5.4. Postgres trong cluster

`postgres.yaml` là StatefulSet 1 replica, PVC 5Gi: **không** có backup tự động, không HA, nâng cấp phiên bản thủ công.
Hợp cho học/staging; production nên dùng DB được quản lý (RDS / Cloud SQL — [learn-aws.md](./learn-aws.md),
[learn-google-cloud.md](./learn-google-cloud.md)) và đặt `postgres.enabled: false` trong Helm values.

### 5.5. Chia nhỏ quyền và bảo vệ

```
□ PodDisruptionBudget (minAvailable: 1) cho api-gateway — nâng cấp node không tắt hết pod cùng lúc
□ securityContext: runAsNonRoot, readOnlyRootFilesystem, allowPrivilegeEscalation: false
□ NetworkPolicy: postgres chỉ nhận kết nối từ pod api-gateway/content/exam
□ Secret không commit (deploy.yml tạo từ GitHub Secrets ✅); cân nhắc External Secrets / Sealed Secrets
```

---

## 6. HPA hoạt động thế nào

```
mỗi 15s: CPU trung bình các pod / requests.cpu = 140%  (mục tiêu 70%)
          → số pod mong muốn = ceil(2 × 140 / 70) = 4   (giới hạn 2..5)
scale down chậm (mặc định chờ 5 phút ổn định) để không dao động lên xuống
```

- Cần **metrics-server** trong cluster, và **requests.cpu** phải có (HPA tính % trên requests).
- Node.js 1 luồng: CPU pod hiếm khi vượt 1 core → scale theo CPU vẫn hợp lý; với service chờ I/O nhiều, cân nhắc scale
  theo **request/s** hoặc độ trễ (custom metrics qua Prometheus Adapter / KEDA).
- Kafka consumer: scale theo **consumer lag** (KEDA) thay vì CPU; số pod consumer không nên vượt số partition.

---

## 7. Helm — manifest có tham số

`infra/helm/edu-app` sinh cùng các tài nguyên như `infra/k8s`, nhưng giá trị nằm ở `values.yaml`:

```powershell
helm template edu infra/helm/edu-app | less                       # xem YAML sinh ra (không cài)
helm install edu infra/helm/edu-app -n edu-app --create-namespace --set image.tag=<sha>
helm upgrade edu infra/helm/edu-app -n edu-app --set image.tag=<sha2>
helm rollback edu 1 -n edu-app
```

Hiện repo **duy trì song song** `infra/k8s` (dùng trong `deploy.yml`) và Helm chart → hai nơi phải sửa giống nhau, dễ lệch.
Nên chọn **một** nguồn (Helm) và cho `deploy.yml` dùng `helm upgrade --install`.

---

## 8. Gỡ lỗi Pod — bảng tra

| Trạng thái | Nguyên nhân hay gặp | Xem ở đâu |
|------------|---------------------|-----------|
| `Pending` | không node nào đủ CPU/RAM theo `requests`; PVC chưa bind | `kubectl describe pod` → Events |
| `ImagePullBackOff` | sai tên/tag image; thiếu `ghcr-pull-secret` | Events |
| `CrashLoopBackOff` | app crash khi khởi động (thiếu env, không kết nối được DB) | `kubectl logs <pod> --previous` |
| `OOMKilled` | vượt `limits.memory` | `describe` → Last State |
| Running nhưng không nhận traffic | readiness fail; Service selector sai label | `kubectl get endpoints api-gateway -n edu-app` |
| 502/504 từ Ingress | pod chưa Ready; timeout 60s (annotation) quá ngắn cho request dài | log ingress-nginx |

---

## Bài tập thực hành

1. Dựng cluster local (Docker Desktop hoặc kind), apply toàn bộ `infra/k8s`, port-forward và gọi `/health`.
2. Xoá `replicas` khỏi Deployment api-gateway; tạo tải (k6) để HPA scale lên 4; apply lại manifest; xác nhận vẫn 4.
3. Tách probe `/health/live` và `/health/ready`; xoá pod Postgres và quan sát: pod api-gateway **NotReady** nhưng **không restart**.
4. Thêm `maxUnavailable: 0`, `preStop` và `enableShutdownHooks()`; chạy k6 liên tục trong lúc `kubectl rollout restart` —
   có request nào lỗi không?
5. Đặt `limits.memory: 128Mi` cho api-gateway để cố tình gây `OOMKilled`, tìm dấu vết bằng `describe`.
6. Viết NetworkPolicy chỉ cho các pod backend kết nối Postgres; thử `exec` vào pod nihongo-web và `nc -z postgres 5432`.
7. Chuyển `deploy.yml` sang `helm upgrade --install … --set image.tag=${{ github.sha }}`.

<details>
<summary>Gợi ý đáp án</summary>

1. Pod lỗi ngay thường do Secret thiếu khoá (`CrashLoopBackOff`, log báo thiếu `DATABASE_URL`) hoặc image private
   (`ImagePullBackOff`) — tạo `ghcr-pull-secret` như trong `deploy.yml`, hoặc build image local và `kind load docker-image`.
2. Cần metrics-server (`kubectl top` chạy được). Kiểm tra: `kubectl get hpa -n edu-app -w`. Trước khi xoá `replicas`,
   apply lại sẽ thấy số pod tụt về 2 rồi HPA tăng lại sau vài chục giây.
3. `kubectl get pods` cột READY `0/1` nhưng RESTARTS không tăng; `kubectl get endpoints api-gateway` rỗng →
   Ingress trả 503 thay vì để pod trả 500 cho từng request.
4. Không có `preStop`: vài request 502 trong khoảng Service vẫn trỏ vào pod đang tắt. Có `preStop sleep 5` +
   graceful shutdown: 0 lỗi (hoặc gần 0).
5. `kubectl describe pod` → `Last State: Terminated, Reason: OOMKilled, Exit Code: 137`. Log app **không** có dòng lỗi nào
   — đó là lý do phải theo dõi restart count bằng metric (`kube_pod_container_status_restarts_total`).
6. ```yaml
   kind: NetworkPolicy
   spec:
     podSelector: { matchLabels: { app: postgres } }
     ingress:
       - from: [{ podSelector: { matchExpressions: [{ key: app, operator: In, values: [api-gateway, content-service, exam-service] }] } }]
         ports: [{ port: 5432 }]
   ```
   Cần CNI hỗ trợ NetworkPolicy (Calico/Cilium); kind mặc định (kindnet) **không** thực thi policy.
7. Thay bước "Deploy workloads" bằng `helm upgrade --install edu infra/helm/edu-app -n edu-app --set image.tag=${{ github.sha }} --wait --timeout 5m`;
   `--wait` thay cho `rollout status`; lỗi → `helm rollback`.

</details>

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **6. DevOps và hạ tầng** — bài 4/7.

- Bài trước: [learn-infra.md](./learn-infra.md) — Thư mục infra/, cổng, healthcheck và các sự cố thật
- **Bài tiếp: [learn-release-cicd.md](./learn-release-cicd.md)** — CI/CD: migrate khi deploy, canary, feature flag, rollback

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
