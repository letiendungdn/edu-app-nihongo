# Học Google Cloud (GCP) — Từ Project Này

> Project hiện deploy lên **DigitalOcean** ([`infra/terraform`](../infra/terraform/main.tf)), image ở **ghcr.io**,
> và chỉ dùng GCP cho **đăng nhập Google** ([google-oauth-setup.md](./google-oauth-setup.md)).
> Tài liệu này học GCP bằng cách trả lời: *"Nếu chuyển cả stack EDU APP sang GCP thì làm thế nào?"*

## 1. Bản đồ: stack của project → dịch vụ GCP

```
                         ┌──────────── Cloud Load Balancing / Cloud Run URL ────────────┐
Browser ────────────────▶│                                                              │
                         │  nihongo-web (Next.js)      → Cloud Run                      │
                         │  api-gateway (NestJS)       → Cloud Run                      │
                         │  content / exam service     → Cloud Run (gRPC, HTTP/2)       │
                         │  keycloak                   → Cloud Run hoặc GKE             │
                         │  livekit (WebRTC, UDP)      → Compute Engine VM              │
                         └──────────────────────────────────────────────────────────────┘
                              │            │             │              │
                         Cloud SQL    Memorystore    Pub/Sub      Cloud Storage
                         (Postgres)    (Redis)     (thay Kafka)   (thay S3 upload)
```

| Trong project | Đang dùng | Trên GCP | Ghi chú |
|---------------|-----------|----------|---------|
| NestJS services, Next.js | Docker / K8s trên DO | **Cloud Run** (hoặc **GKE**) | Cloud Run: chạy container, tự scale, trả tiền theo request |
| PostgreSQL (nihongo, english, keycloak) | container `postgres:16` | **Cloud SQL for PostgreSQL** | backup, HA, patch do Google lo |
| Redis (cache, session thi) | container `redis` | **Memorystore for Redis** | cần kết nối qua VPC |
| Kafka (event thi, streak…) | container Kafka + ZooKeeper | **Pub/Sub** (hoặc Managed Service for Apache Kafka) | xem mục 7 |
| Upload file | AWS S3 presigned URL | **Cloud Storage** signed URL | xem mục 6 |
| MongoDB audit | container `mongodb` | MongoDB Atlas trên GCP / Firestore | |
| Image registry | ghcr.io | **Artifact Registry** | |
| Secrets (`secret.yaml`) | K8s Secret | **Secret Manager** | |
| CI build | GitHub Actions | **Cloud Build** (hoặc giữ GitHub Actions) | |
| Jaeger / Prometheus / Grafana | container | **Cloud Trace / Monitoring / Logging** | OpenTelemetry xuất thẳng sang được |
| Terraform provider | `digitalocean` | `google` | xem mục 10 |

---

## 2. Concepts cốt lõi

```
Organization (công ty, tuỳ chọn)
  └── Folder (tuỳ chọn)
       └── Project  "edu-app-dev"   ← đơn vị chứa MỌI tài nguyên + gắn billing
            ├── APIs đã bật: run, sqladmin, artifactregistry, secretmanager, …
            ├── IAM: ai được làm gì trong project
            └── Tài nguyên: Cloud Run service, Cloud SQL instance, bucket, …
Billing account ── trả tiền cho 1 hoặc nhiều project
```

| Khái niệm | Ý nghĩa | Ví dụ project |
|-----------|---------|---------------|
| **Project** | ranh giới tài nguyên, quyền, hoá đơn | `edu-app-dev`, `edu-app-prod` tách riêng |
| **Region / Zone** | nơi đặt tài nguyên | `asia-southeast1` (Singapore) — gần VN nhất |
| **API** | mỗi dịch vụ phải *bật* trước khi dùng | `gcloud services enable run.googleapis.com` |
| **Principal** | ai: user, group, **service account** | `api-gateway@edu-app-dev.iam.gserviceaccount.com` |
| **Role** | tập quyền | `roles/cloudsql.client`, `roles/storage.objectAdmin` |
| **Service account** | "danh tính" cho code chạy (không phải người) | mỗi service một SA riêng |

**Nguyên tắc:** quyền gán cho **service account của từng service**, ít nhất có thể (least privilege);
**không** tải file key JSON về máy/commit vào repo.

---

## 3. Bắt đầu: tài khoản, `gcloud`, chi phí

1. Tạo tài khoản tại console.cloud.google.com. Tài khoản mới thường có **credit dùng thử** — kiểm tra
   điều kiện hiện hành trên trang Google Cloud Free Program.
2. **Đặt ngân sách cảnh báo ngay** (Billing → Budgets & alerts), vd 10 USD, cảnh báo ở 50% / 90% / 100%.
3. Cài Google Cloud CLI rồi:

```powershell
gcloud init                                   # đăng nhập + chọn/tạo project
gcloud auth login
gcloud config set project edu-app-dev
gcloud config set run/region asia-southeast1

# Cho code chạy trên máy dùng quyền của bạn (thay cho file key JSON)
gcloud auth application-default login

gcloud services enable run.googleapis.com sqladmin.googleapis.com `
  artifactregistry.googleapis.com secretmanager.googleapis.com `
  storage.googleapis.com pubsub.googleapis.com
```

> Học xong một phần thì **dọn tài nguyên** (mục 11). Cloud SQL và Memorystore tính tiền **kể cả khi không
> có request** — quên tắt là mất tiền.

---

## 4. Deploy `api-gateway` lên Cloud Run

### 4.1. Đẩy image lên Artifact Registry

```powershell
gcloud artifacts repositories create edu --repository-format=docker --location=asia-southeast1
gcloud auth configure-docker asia-southeast1-docker.pkg.dev

$IMG = "asia-southeast1-docker.pkg.dev/edu-app-dev/edu/api-gateway:v1"
docker build -f services/api-gateway/Dockerfile -t $IMG .
docker push $IMG
```

### 4.2. Secret + service account riêng

```powershell
# Secret: giá trị nằm ở Secret Manager, không nằm trong lệnh deploy
"super-secret-jwt" | gcloud secrets create jwt-secret --data-file=-

gcloud iam service-accounts create api-gateway
$SA = "api-gateway@edu-app-dev.iam.gserviceaccount.com"
gcloud secrets add-iam-policy-binding jwt-secret `
  --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding edu-app-dev `
  --member="serviceAccount:$SA" --role="roles/cloudsql.client"
```

### 4.3. Deploy

```powershell
gcloud run deploy api-gateway `
  --image $IMG `
  --service-account $SA `
  --port 3000 `
  --allow-unauthenticated `
  --set-env-vars "NODE_ENV=production,AWS_REGION=ap-southeast-1" `
  --set-secrets "JWT_SECRET=jwt-secret:latest" `
  --add-cloudsql-instances edu-app-dev:asia-southeast1:edu-pg `
  --min-instances 0 --max-instances 3
```

Cloud Run trả về URL dạng `https://api-gateway-xxxx-as.a.run.app` — HTTPS có sẵn.

### 4.4. Những điểm Cloud Run khác Docker Compose

| Vấn đề | Trong compose | Trên Cloud Run |
|--------|---------------|----------------|
| Port | tự chọn | app phải nghe `PORT` (mặc định 8080) — hoặc khai báo `--port` |
| Gọi service khác | `http://content-service:50051` (DNS nội bộ) | URL `*.run.app`; muốn gRPC phải bật `--use-http2` ở service nhận |
| Service nội bộ | ai trong network cũng gọi được | `--no-allow-unauthenticated` + cấp `roles/run.invoker` cho SA gọi |
| Kafka consumer chạy nền | chạy mãi | hết request là CPU bị bóp, scale về 0 → consumer "chết". Cần `--no-cpu-throttling --min-instances 1`, hoặc đổi sang Pub/Sub **push** |
| Ổ đĩa | volume | không bền — file tạm mất khi instance tắt; lưu file lên Cloud Storage |
| Redis (Memorystore) | `redis:6379` | Memorystore chỉ có IP nội bộ VPC → bật Direct VPC egress (`--network`, `--subnet`) |

---

## 5. Cloud SQL (PostgreSQL) + Prisma

```powershell
gcloud sql instances create edu-pg --database-version=POSTGRES_16 `
  --edition=ENTERPRISE --tier=db-f1-micro --region=asia-southeast1
gcloud sql databases create nihongo --instance=edu-pg
gcloud sql users create nihongo --instance=edu-pg --password="<mật khẩu>"
```

**Chạy migrate từ máy bạn** qua Cloud SQL Auth Proxy (không cần mở IP public cho DB):

```powershell
cloud-sql-proxy edu-app-dev:asia-southeast1:edu-pg --port 5434
# terminal khác:
$env:DATABASE_URL="postgresql://nihongo:<mật khẩu>@localhost:5434/nihongo"
npm run migrate:deploy -w @edu/prisma-nihongo
```

**Trên Cloud Run** (đã có `--add-cloudsql-instances`), kết nối qua **Unix socket**:

```env
DATABASE_URL=postgresql://nihongo:<mật khẩu>@localhost/nihongo?host=/cloudsql/edu-app-dev:asia-southeast1:edu-pg
```

Nạp dữ liệu có sẵn: dùng seed nội dung `infra/postgres/nihongo-content-seed.sql` (hoặc backup trên máy, `infra/backups/nihongo_*.sql`) — `psql` qua proxy, hoặc
đẩy file lên Cloud Storage rồi `gcloud sql import sql edu-pg gs://<bucket>/nihongo.sql --database=nihongo`.

> Cloud Run scale nhiều instance × mỗi instance một pool Prisma → dễ vượt giới hạn kết nối của
> `db-f1-micro`. Giới hạn `connection_limit` trong `DATABASE_URL` và `--max-instances`.

---

## 6. Cloud Storage — thay S3 cho upload

Luồng giống hệt S3 presigned URL của [`upload.service.ts`](../services/api-gateway/src/http/upload/upload.service.ts)
(xem thêm [learn-localstack.md](./learn-localstack.md)):

```ts
// npm i @google-cloud/storage
import { Storage } from "@google-cloud/storage";

const storage = new Storage(); // trên Cloud Run tự dùng service account, không cần key
const bucket = storage.bucket("edu-app-uploads");

async function getSignedUploadUrl(contentType: string, folder = "uploads") {
  const key = `${folder}/${crypto.randomUUID()}.${contentType.split("/")[1] ?? "jpg"}`;
  const [url] = await bucket.file(key).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 5 * 60 * 1000,
    contentType, // browser PUT phải gửi đúng Content-Type này
  });
  return { url, key, publicUrl: `https://storage.googleapis.com/edu-app-uploads/${key}` };
}
```

```powershell
gcloud storage buckets create gs://edu-app-uploads --location=asia-southeast1 --uniform-bucket-level-access
# cors.json: [{"origin":["https://<web>.run.app"],"method":["PUT","GET"],"responseHeader":["Content-Type"],"maxAgeSeconds":3600}]
gcloud storage buckets update gs://edu-app-uploads --cors-file=cors.json
```

> Ký URL trên Cloud Run cần SA có quyền `roles/iam.serviceAccountTokenCreator` **trên chính nó**
> (ký qua IAM API vì không có private key). Thiếu quyền này → lỗi `signBlob` khi gọi `getSignedUrl`.

**So với S3:** bucket ↔ bucket, object ↔ object, presigned URL ↔ signed URL, IAM policy ↔ IAM role.
Cloud Storage còn có chế độ tương thích S3 (HMAC key) — đổi `endpoint` của AWS SDK sang
`https://storage.googleapis.com` là chạy được phần lớn lệnh, không phải viết lại code ngay.

---

## 7. Pub/Sub — so với Kafka của project

Project publish `edu.exam.submitted` rồi consumer cập nhật SRS / streak / email (xem [learn-kafka.md](./learn-kafka.md)).

| | Kafka | Pub/Sub |
|---|-------|---------|
| Vận hành | tự chạy broker, ZooKeeper/KRaft | serverless, không có broker để quản |
| Đơn vị đọc | consumer group + partition + offset | **subscription** (mỗi subscription nhận đủ mọi message) |
| Thứ tự | theo partition | chỉ khi bật **ordering key** |
| Đọc lại | theo offset | `seek` về thời điểm / snapshot (giữ message có hạn) |
| Kiểu nhận | pull | **pull** hoặc **push** (Pub/Sub gọi HTTP vào Cloud Run) |
| Message lỗi | tự làm DLQ topic | **dead-letter topic** cấu hình sẵn |

```powershell
gcloud pubsub topics create edu.exam.submitted
gcloud pubsub subscriptions create srs-updater --topic=edu.exam.submitted `
  --push-endpoint=https://exam-worker-xxxx-as.a.run.app/pubsub `
  --push-auth-service-account=pubsub-invoker@edu-app-dev.iam.gserviceaccount.com
```

Push hợp với Cloud Run: không có request thì scale về 0; message tới → Pub/Sub gọi HTTP → xử lý.
Giống Kafka: Pub/Sub giao **ít nhất một lần** → consumer vẫn phải **idempotent** (mục 6 của learn-kafka).

---

## 8. Chạy thử trên máy: emulator (tương tự LocalStack)

GCP không có một công cụ "giả lập tất cả" như LocalStack, mà có emulator riêng từng dịch vụ:

| Dịch vụ | Emulator | Cách trỏ SDK |
|---------|----------|--------------|
| Pub/Sub | `gcloud beta emulators pubsub start` | `PUBSUB_EMULATOR_HOST=localhost:8085` |
| Firestore / Datastore | `gcloud emulators firestore start` | `FIRESTORE_EMULATOR_HOST=...` |
| Cloud Storage | *fake-gcs-server* (cộng đồng, chạy Docker) | `apiEndpoint` trong `new Storage({...})` |

```powershell
gcloud beta emulators pubsub start --project=edu-local
# terminal khác:
$env:PUBSUB_EMULATOR_HOST="localhost:8085"   # SDK @google-cloud/pubsub tự dùng emulator
```

---

## 9. GKE — dùng lại `infra/k8s` và Helm của project

Project đã có manifest ([`infra/k8s`](../infra/k8s)) và chart ([`infra/helm/edu-app`](../infra/helm/edu-app)).
Trên GKE **Autopilot** (Google quản node, trả theo Pod):

```powershell
gcloud container clusters create-auto edu-gke --region asia-southeast1
gcloud container clusters get-credentials edu-gke --region asia-southeast1
kubectl get nodes

# đổi image sang Artifact Registry rồi cài chart
helm install edu ./infra/helm/edu-app `
  --set image.registry=asia-southeast1-docker.pkg.dev `
  --set image.repository=edu-app-dev/edu
```

Những điểm cần đổi so với chạy K8s tự quản:

- **Postgres trong cluster** (`infra/k8s/postgres.yaml`) → nên chuyển sang Cloud SQL; tắt `postgres.enabled` trong values.
- **Secret** → Secret Manager + CSI driver, hoặc giữ K8s Secret nhưng không commit giá trị.
- **Quyền của Pod** → **Workload Identity**: gắn K8s ServiceAccount với GCP service account, không dùng key JSON.
- **Ingress** → GKE Ingress tạo Cloud Load Balancer + chứng chỉ HTTPS do Google quản.

**Cloud Run hay GKE?**

```
Cloud Run: ít việc vận hành, scale về 0, rẻ khi ít người dùng → hợp project học / demo
GKE      : kiểm soát nhiều, service chạy nền lâu dài (Kafka consumer, LiveKit…), nhiều service phức tạp
```

---

## 10. Terraform với provider `google`

[`infra/terraform/main.tf`](../infra/terraform/main.tf) đang tạo tài nguyên DigitalOcean. Tương đương trên GCP:

```hcl
provider "google" {
  project = var.project_id
  region  = "asia-southeast1"
}

resource "google_artifact_registry_repository" "edu" {
  repository_id = "edu"
  format        = "DOCKER"
  location      = "asia-southeast1"
}

resource "google_sql_database_instance" "pg" {
  name             = "edu-pg"
  database_version = "POSTGRES_16"
  region           = "asia-southeast1"
  settings {
    tier    = "db-f1-micro"
    edition = "ENTERPRISE"
  }
  deletion_protection = false # chỉ cho môi trường học
}

resource "google_cloud_run_v2_service" "api_gateway" {
  name     = "api-gateway"
  location = "asia-southeast1"
  template {
    service_account = google_service_account.api_gateway.email
    containers {
      image = "asia-southeast1-docker.pkg.dev/${var.project_id}/edu/api-gateway:v1"
      ports { container_port = 3000 }
    }
  }
}
```

State nên lưu ở bucket Cloud Storage (`backend "gcs"`), không để file `terraform.tfstate` trên máy.

---

## 11. Chi phí & dọn dẹp

| Tài nguyên | Tính tiền khi không dùng? | Khi học xong |
|------------|---------------------------|--------------|
| Cloud Run (`min-instances 0`) | gần như không | để nguyên được |
| Cloud SQL | **có** (theo giờ chạy + ổ đĩa) | `gcloud sql instances patch edu-pg --activation-policy=NEVER` (tắt) hoặc xoá |
| Memorystore | **có** | xoá |
| GKE Autopilot | có (theo Pod đang chạy) | xoá cluster |
| Artifact Registry, Cloud Storage | theo dung lượng | xoá image/object cũ |
| IP tĩnh, Load Balancer | **có** | xoá |

Cách dọn sạch nhất: **xoá cả project** — `gcloud projects delete edu-app-dev` (có thời gian khôi phục vài tuần).

---

## Bài tập thực hành

1. Tạo project `edu-app-dev`, đặt budget alert, bật các API ở mục 3.
2. Build và đẩy image `api-gateway` lên Artifact Registry; deploy lên Cloud Run chỉ với endpoint `/health`
   (chưa cần DB). Mở URL `*.run.app` thành công.
3. Tạo Cloud SQL, chạy `migrate:deploy` qua Cloud SQL Auth Proxy, import seed nội dung `infra/postgres/nihongo-content-seed.sql`.
   Deploy lại `api-gateway` + `content-service` nối vào Cloud SQL, mở trang từ vựng qua API.
4. Chuyển `JWT_SECRET` và mật khẩu DB sang Secret Manager; kiểm tra lệnh deploy không còn chứa giá trị bí mật.
5. Viết `getSignedUploadUrl` bằng Cloud Storage (mục 6), cấu hình CORS, upload ảnh từ trang admin.
6. Tạo topic `edu.exam.submitted` + push subscription vào một Cloud Run "worker"; nộp bài thi thử →
   worker nhận message. Cho worker trả lỗi 500 → quan sát retry và dead-letter topic.
7. Chạy Pub/Sub emulator trên máy, viết test publish/subscribe không cần internet.
8. (Nâng cao) Tạo GKE Autopilot, cài chart `infra/helm/edu-app` với Cloud SQL + Workload Identity.
9. Dọn toàn bộ tài nguyên theo mục 11, kiểm tra trang Billing không còn phát sinh.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **7. Cloud** — bài 5/5.

- Bài trước: [learn-aws-serverless.md](./learn-aws-serverless.md) — Thực hành serverless: S3 + Lambda + IAM bằng Terraform, chạy trên LocalStack hoặc AWS
- Xong nhóm này. **Nhóm tiếp: 8. Frontend web và desktop** — bắt đầu bằng [learn-react.md](./learn-react.md) (React qua web Nihongo: component, state, effect, custom hook, React Query, test)

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
