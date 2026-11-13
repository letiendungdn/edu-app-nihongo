# Lộ trình học DevOps — 16 tuần trên chính project này

Lộ trình nối các bài DevOps có sẵn trong `docs/` thành một đường đi có thứ tự. Mỗi tuần làm việc thật trên stack của EDU APP, không học lý thuyết suông.

- **Thời gian:** khoảng 1,5–2 giờ/ngày, 5 ngày/tuần. Có 1 giờ/ngày thì kéo thành 32 tuần.
- **Chi phí:** 0 đồng tới tuần 14. Chỉ tuần 16 có phần tùy chọn trên cloud thật.
- **Cần có:** máy Mac/Linux, Docker Desktop, Node 22, Git. Biết lập trình cơ bản.

Mỗi tuần có 4 phần: **Mục tiêu**, **Đọc**, **Làm** (trên repo), **Xong khi** (tự kiểm tra được). Chưa đạt "Xong khi" thì đừng sang tuần sau.

---

## Bản đồ

| Giai đoạn | Tuần | Chủ đề | Kết quả |
|---|---|---|---|
| **1. Nền tảng** | 1–2 | Linux, mạng, Git | Tự gỡ lỗi "không kết nối được" bằng lệnh |
| **2. Đóng gói & chạy** | 3–6 | Docker, Nginx, vận hành stack | Dựng, sửa, gỡ lỗi cả stack 20+ container |
| **3. Tự động hóa** | 7–8 | CI/CD, vận hành database | Thay đổi nào cũng được test và kiểm tra tự động |
| **4. Điều phối** | 9–10 | Kubernetes, Helm | App chạy trên cluster local, rolling update, rollback |
| **5. Vận hành** | 11–13 | Observability, hiệu năng, độ tin cậy, bảo mật | Biết hệ thống đang làm gì, chịu tải bao nhiêu |
| **6. Cloud & IaC** | 14–15 | AWS, Terraform, serverless, xử lý sự cố | Hạ tầng dạng code, chạy được trên LocalStack |
| **7. Tổng kết** | 16 | Dự án cuối khóa | Một pipeline từ commit tới chạy trên cluster |

---

## Giai đoạn 1 — Nền tảng

### Tuần 1: Linux và mạng

**Mục tiêu:** đọc được hệ thống đang chạy gì, nghe cổng nào, gọi nhau thế nào.

**Đọc:** repo **chưa có bài riêng** về Linux và mạng. Tự học: lệnh file và quyền (`ls -l`, `chmod`), tiến trình (`ps`, `kill`), mạng (`curl -v`, `dig`, `lsof -i`), mô hình TCP/IP, DNS, HTTP/HTTPS.

**Làm:**

```bash
lsof -nP -iTCP -sTCP:LISTEN | grep -E "3000|5433|8080"   # cổng nào đang mở, tiến trình nào giữ
curl -v http://localhost:8080/health                      # đọc từng dòng: kết nối, request, response
dig +short nihongo.localhost                              # tên miền trỏ đi đâu
docker exec edu-gateway sh -c 'cat /etc/resolv.conf; getent hosts postgres-nihongo'   # DNS bên trong Docker
```

**Xong khi:** giải thích được vì sao trong container gọi `api-gateway:3000` được mà gọi `localhost:3000` thì không.

### Tuần 2: Git và quy trình làm việc

**Mục tiêu:** làm việc an toàn với nhánh, commit, PR, giống trong team thật.

**Đọc:** repo chưa có bài Git riêng. Tự học: branch, rebase và merge, PR, review, conventional commit, `.gitignore`.

**Làm:**
1. `git log --oneline -20`, đọc cách repo viết commit.
2. Tạo nhánh, sửa một tài liệu nhỏ, mở PR bằng `gh pr create` trên repo của bạn.
3. Đọc [.gitignore](../.gitignore): vì sao `.env`, `*.tfstate`, `node_modules` không được commit.

**Xong khi:** tạo PR, giải quyết được một conflict, và hoàn tác được commit lỗi bằng `git revert`.

---

## Giai đoạn 2 — Đóng gói & chạy

### Tuần 3–4: Docker

**Đọc:** [learn-docker.md](./learn-docker.md).

**Làm:** 7 bài tập ở mục 11 của learn-docker. Thêm:
- Đọc [Dockerfile của web](../apps/nihongo-web/Dockerfile): vì sao build 2 giai đoạn (multi-stage).
- `docker system df` trước và sau `docker builder prune`.

**Xong khi:** từ máy trống dựng được stack bằng `npm run docker:up:nihongo`, sửa code web rồi deploy lại container, và sao lưu/khôi phục được DB.

### Tuần 5: Nginx và reverse proxy

**Đọc:** [learn-nginx.md](./learn-nginx.md).

**Làm:** 6 bài tập ở mục 8. Quan trọng nhất là bài dừng gateway để thấy trang 503 "đang khởi động".

**Xong khi:** giải thích được đường đi của request `localhost:8080/api/...` tới gateway, và vì sao app dùng cổng 8080 dù backend ở 3000.

### Tuần 6: Vận hành stack và gỡ lỗi

**Đọc:** [learn-infra.md](./learn-infra.md), [media-storage.md](./media-storage.md).

**Làm:** đọc các case study sự cố thật ở mục 4, 6, 7 của learn-infra. Tự gây lại một lỗi, ví dụ dừng Postgres, rồi tìm nguyên nhân chỉ bằng `docker ps`, `docker logs`, `curl`.

**Xong khi:** gặp lỗi 502 hoặc "Đang tải…" mãi, bạn tìm ra service nào hỏng trong vòng 10 phút.

---

## Giai đoạn 3 — Tự động hóa

### Tuần 7: CI/CD

**Đọc:** [learn-release-cicd.md](./learn-release-cicd.md), [ci.yml](../.github/workflows/ci.yml), [deploy.yml](../.github/workflows/deploy.yml).

**Làm:**
1. Liệt kê các job CI: `security`, `backend`, `nihongo-web`, `android`, `flutter`, `ios`. Job nào chạy test, job nào chỉ build?
2. Đọc bước `bundle:report` trong job `nihongo-web` ([learn-webpack.md](./learn-webpack.md) mục 6): CI chặn lỗi tái diễn bằng một script.
3. Đọc `deploy.yml`: deploy chỉ chạy khi CI xanh, và bỏ qua khi chưa có `KUBE_CONFIG`.
4. Thêm một bước mới vào CI, ví dụ `bash -n infra/aws-learn/run.sh` (kiểm tra cú pháp script).

**Xong khi:** đẩy một commit làm test đỏ, thấy CI chặn; sửa xong CI xanh lại.

### Tuần 8: Vận hành database

**Đọc:** [learn-postgres.md](./learn-postgres.md), [ADR-0005](./adr/0005-commit-db-backups-to-repo.md).

**Làm:**
1. `bash infra/backups/backup.sh`, xóa một bảng trong DB **thử**, rồi khôi phục.
2. Đọc migration trong `packages/prisma-nihongo/migrations`. Chạy `prisma migrate status` và `migrate diff` để thấy DB có lệch schema không.

**Xong khi:** khôi phục được DB từ backup, và giải thích được vì sao phải sao lưu trước mỗi migration.

---

## Giai đoạn 4 — Điều phối

### Tuần 9–10: Kubernetes và Helm

**Đọc:** [learn-kubernetes.md](./learn-kubernetes.md), [infra/k8s](../infra/k8s), [infra/helm/edu-app](../infra/helm/edu-app).

**Chuẩn bị (miễn phí):** Docker Desktop → **Settings → Kubernetes → Enable Kubernetes**. `kubectl` đã có trên máy. Cài thêm `helm` (`brew install helm`).

**Làm:**
1. `kubectl apply -f infra/k8s/namespace.yaml`, rồi lần lượt các manifest. Xem pod lên bằng `kubectl get pods -n edu-app -w`.
2. Gây lỗi có chủ đích, đọc trạng thái pod:
   - image sai → `ImagePullBackOff`;
   - thiếu biến môi trường → `CrashLoopBackOff`;
   - probe sai cổng → pod không Ready.
3. Rolling update và rollback: `kubectl rollout status`, `kubectl rollout undo`.
4. Cài bằng Helm: `helm install edu infra/helm/edu-app -n edu-app`, đổi `values.yaml`, `helm upgrade`, `helm rollback`.

**Lưu ý:** cổng của web trong manifest đã sửa sang 8080 ngày 03/11/2026 ([learn-nginx.md](./learn-nginx.md) mục 6). Image phải build và đẩy lên registry trước, hoặc dùng image build local.

**Xong khi:** app chạy trên cluster local, cập nhật phiên bản không gián đoạn, và rollback được trong 1 lệnh.

---

## Giai đoạn 5 — Vận hành

### Tuần 11: Observability

**Đọc:** [learn-observability.md](./learn-observability.md).

**Làm:** stack đã có Prometheus (`:9090`), Grafana (`:4000`), Jaeger (`:16686`).
1. Tìm metric request của gateway trong Prometheus, viết truy vấn tỷ lệ lỗi 5xx.
2. Theo dõi một request trong Jaeger: gateway → content-service → DB.
3. Đọc [alerts.yml](../infra/prometheus/alerts.yml), tự gây điều kiện báo động, xem cảnh báo về Mailpit (`:8025`).

**Xong khi:** trả lời được "endpoint nào chậm nhất, chậm ở bước nào" mà không cần đọc code.

### Tuần 12: Hiệu năng và độ tin cậy

**Đọc:** [learn-performance-k6.md](./learn-performance-k6.md), [learn-reliability-patterns.md](./learn-reliability-patterns.md).

**Làm:**
1. Chạy [load-test.js](../infra/k6/load-test.js), đọc p95 và tỷ lệ lỗi; xem Grafana trong lúc chạy.
2. Đọc transactional outbox ([core-flows.md](./core-flows.md) mục 7): vì sao không mất event khi Kafka chết.

**Xong khi:** nói được hệ thống chịu bao nhiêu request/giây trước khi p95 vượt 500 ms, và nút thắt nằm ở đâu.

### Tuần 13: Bảo mật vận hành

**Đọc:** [learn-security-backend.md](./learn-security-backend.md).

**Làm:**
1. Rà bí mật: `.env` không bị commit, khóa nằm ở đâu trong compose, K8s secret.
2. Đọc job `security` trong CI (quét lỗ hổng thư viện bằng `audit-ci`).
3. Kiểm tra giới hạn tốc độ: gửi 65 request liên tiếp tới `/api/tts`, thấy 429 từ request thứ 61 ([core-flows.md](./core-flows.md) mục 12).

**Xong khi:** liệt kê được mọi bí mật hệ thống dùng, mỗi cái nằm ở đâu, và cách xoay vòng khi bị lộ.

Đi sâu hơn (quét image, hạ tầng, SAST/DAST, kết quả quét thật của repo): [learn-devsecops.md](./learn-devsecops.md), lộ trình 4 tuần học sau lộ trình này.

---

## Giai đoạn 6 — Cloud & IaC

### Tuần 14: AWS, Terraform, serverless

**Đọc:** [learn-localstack.md](./learn-localstack.md), [learn-aws.md](./learn-aws.md), [learn-terraform.md](./learn-terraform.md), [learn-aws-serverless.md](./learn-aws-serverless.md).

**Làm (miễn phí trên LocalStack):**

```bash
bash infra/aws-learn/run.sh up
bash infra/aws-learn/run.sh apply     # 8 tài nguyên
bash infra/aws-learn/run.sh demo      # Lambda tạo ảnh thu nhỏ
bash infra/aws-learn/run.sh plan -var log_retention_days=14
bash infra/aws-learn/run.sh destroy
```

Làm 7 bài tập của learn-terraform: drift, buộc tạo lại, thêm hàng đợi lỗi (DLQ).

**Xong khi:** dựng và xóa hạ tầng bằng một lệnh, đọc được `plan` và biết dòng nào nguy hiểm.

### Tuần 15: Xử lý sự cố

**Đọc:** [learn-incident-postmortem.md](./learn-incident-postmortem.md).

**Làm:** chọn một sự cố thật đã gặp (ví dụ "AI trả lời rỗng do model qwen3", hay "video Mori không phát vì Google Drive"), viết postmortem không đổ lỗi: dòng thời gian, nguyên nhân gốc, cách phát hiện, việc cần làm để không lặp lại.

**Xong khi:** có 1 bản postmortem đủ các mục, và 1 runbook cho lỗi hay gặp nhất.

---

## Giai đoạn 7 — Dự án cuối khóa (tuần 16)

Chọn một:

| Dự án | Chi phí | Kết quả |
|---|---|---|
| **A. GitOps local** | 0 | Cài ArgoCD trên cluster Docker Desktop, trỏ vào `infra/helm/edu-app`. Đẩy commit đổi `values.yaml` → cluster tự cập nhật |
| **B. Pipeline đầy đủ** | 0 | CI build image → đẩy lên GitHub Container Registry → `deploy.yml` deploy vào cluster local (dùng self-hosted runner) |
| **C. Lên cloud thật** | Có thể tốn | Chạy `infra/aws-learn` với `TARGET=aws` (gần 0 đồng). Hoặc deploy app lên DigitalOcean bằng [infra/terraform](../infra/terraform) (tốn tiền theo giờ). **Đặt budget trước**, học xong `destroy` |

**Xong khi:** trình bày được trong 10 phút, có sơ đồ: một commit đi qua những bước nào để thành phiên bản chạy thật, mỗi bước có gì bảo vệ.

---

## Kỹ năng → bằng chứng trong project

Dùng khi viết CV hoặc trả lời phỏng vấn:

| Kỹ năng | Bằng chứng có thể kể |
|---|---|
| Container | Dockerfile multi-stage, stack 20+ container, healthcheck, shutdown hooks |
| Reverse proxy | Nginx route theo host/path, trang 503 khi upstream chưa lên, `resolver` để không chết khi khởi động |
| CI/CD | CI nhiều nền tảng, kiểm tra bundle chặn lỗi tái diễn, deploy chỉ khi CI xanh |
| Kubernetes | Manifest + Helm chart, probe, HPA, bắt được lỗi `PORT` của ConfigMap đè lên image |
| Observability | Prometheus, Grafana, Jaeger, log JSON có cấu trúc |
| IaC | Terraform một code hai môi trường, phát hiện drift |
| Serverless | Lambda theo sự kiện S3, quyền tối thiểu, chống vòng lặp |
| Độ tin cậy | Outbox, idempotency, retry, throttle theo IP thật (`trust proxy`) |
| Sự cố | Postmortem và runbook từ lỗi thật |

---

## Repo còn thiếu gì

Những phần lộ trình phải học ngoài repo, vì chưa có bài hoặc chưa có code:

- **Linux, mạng, Git** (tuần 1–2): chưa có bài riêng.
- **GitOps** (ArgoCD, Flux): chưa có trong repo; dự án cuối khóa A là lần làm đầu tiên.
- **Quản lý bí mật chuyên dụng** (Vault, AWS Secrets Manager): repo mới dùng `.env` và K8s Secret.
- **Logging tập trung** (Loki, ELK): log mới xem bằng `docker logs` và Jaeger.
- **Cluster cloud thật** (EKS, GKE): cần tài khoản và tốn tiền; học qua đọc [learn-aws.md](./learn-aws.md) và [learn-google-cloud.md](./learn-google-cloud.md) trước.

## Chứng chỉ (khi đã xong lộ trình)

- **AWS Certified Cloud Practitioner**, rồi **Solutions Architect – Associate**.
- **Terraform Associate**, sau tuần 14.
- **CKA** (Certified Kubernetes Administrator), nếu muốn đi sâu Kubernetes.

Câu hỏi phỏng vấn DevOps: [interview-devops.md](./interview-devops.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **6. DevOps và hạ tầng** — bài 1/8.

- **Bài tiếp: [learn-nginx.md](./learn-nginx.md)** — Nginx: reverse proxy cổng 8080, HTTPS, triển khai

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
