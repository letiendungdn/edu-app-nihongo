# Học AWS — Từ Project Này

> Project **đã dùng AWS S3** cho upload ([`upload.service.ts`](../services/api-gateway/src/http/upload/upload.service.ts),
> region mặc định `ap-southeast-1` — Singapore), còn lại deploy lên DigitalOcean ([`infra/terraform`](../infra/terraform/main.tf)).
> Tài liệu này học AWS bằng cách trả lời: *"Nếu chạy cả stack EDU APP trên AWS thì làm thế nào?"*
> Chạy thử không tốn tiền: xem [learn-localstack.md](./learn-localstack.md). So sánh với GCP: [learn-google-cloud.md](./learn-google-cloud.md).

> **Cập nhật 2026-09-29 — lỗi ở mục 4 và 5.2 đã sửa** ([`upload.service.ts`](../services/api-gateway/src/http/upload/upload.service.ts)):
> chỉ truyền `credentials` khi có key (còn lại SDK tự dùng IAM role); `publicUrl` theo `ASSET_BASE_URL` (CloudFront) →
> endpoint LocalStack → S3 mặc định; hỗ trợ `AWS_ENDPOINT_URL`.

## 1. Bản đồ: stack của project → dịch vụ AWS

```
                    Route 53 (DNS) ─▶ CloudFront (CDN, HTTPS) ─▶ ALB (Application Load Balancer)
                                                                   │
        ┌──────────────────────────── VPC ────────────────────────┼──────────────────────────┐
        │  public subnet :  ALB, NAT Gateway                       ▼                          │
        │  private subnet:  ECS Fargate ── nihongo-web, api-gateway, content, exam, keycloak │
        │                   RDS PostgreSQL · ElastiCache (Redis) · MSK / SQS                 │
        └────────────────────────────────────────────────────────────────────────────────────┘
        S3 (upload, backup)   ECR (image)   Secrets Manager   CloudWatch (log, metric)   SES (email)
```

| Trong project | Đang dùng | Trên AWS | Ghi chú |
|---------------|-----------|----------|---------|
| NestJS services, Next.js | Docker / K8s trên DO | **ECS on Fargate** (hoặc **EKS**) | Fargate: chạy container, không quản server |
| PostgreSQL | container `postgres:16` | **RDS for PostgreSQL** (hoặc Aurora) | backup tự động, Multi-AZ |
| Redis | container `redis` | **ElastiCache** (Redis OSS / Valkey) | chỉ truy cập trong VPC |
| Kafka | container Kafka | **MSK** (Kafka được quản lý) hoặc **SQS + SNS** | xem mục 8 |
| Upload file | **S3 presigned URL** ✅ đã có | S3 + CloudFront | xem mục 5 |
| MongoDB audit | container `mongodb` | DocumentDB / MongoDB Atlas trên AWS | |
| Keycloak | container | ECS (giữ nguyên) hoặc **Cognito** | |
| LiveKit (WebRTC, UDP) | container | EC2 + NLB (UDP) | |
| Image registry | ghcr.io | **ECR** | |
| Secrets | K8s Secret, `.env` | **Secrets Manager** / SSM Parameter Store | |
| Email | SMTP | **SES** | |
| Jaeger / Prometheus / Grafana | container | **CloudWatch** + X-Ray / Managed Prometheus & Grafana | |
| Terraform provider | `digitalocean` | `aws` | xem mục 10 |

---

## 2. Concepts cốt lõi

```
AWS Organization (tuỳ chọn)
  └── Account  (123456789012)   ← ranh giới hoá đơn + quyền, giống "project" của GCP
       ├── Region ap-southeast-1
       │    ├── AZ ap-southeast-1a / 1b / 1c   (các datacenter tách biệt)
       │    └── VPC → subnet (mỗi subnet nằm trong 1 AZ) → tài nguyên
       └── IAM (toàn cục): user, role, policy
```

| Khái niệm | Ý nghĩa | Ví dụ project |
|-----------|---------|---------------|
| **Region / AZ** | nơi đặt tài nguyên; chạy ≥ 2 AZ để chịu lỗi | `ap-southeast-1`, RDS Multi-AZ |
| **VPC / subnet** | mạng riêng; public subnet có đường ra Internet, private thì không | DB & service ở private subnet |
| **Security Group** | firewall gắn vào tài nguyên, cho phép theo *nguồn* | RDS chỉ nhận 5432 từ SG của ECS task |
| **IAM user** | người (tránh dùng key dài hạn) | tài khoản dev của bạn qua IAM Identity Center |
| **IAM role** | danh tính *tạm thời* cho code / dịch vụ | task role của `api-gateway` |
| **Policy** | JSON liệt kê quyền `Allow/Deny` trên `Resource` | cho phép `s3:PutObject` vào bucket upload |
| **ARN** | "địa chỉ" duy nhất của tài nguyên | `arn:aws:s3:::edu-app-uploads/*` |

**Nguyên tắc:** code chạy trên AWS lấy quyền từ **IAM role**, không từ access key trong `.env`.
Key dài hạn chỉ dùng khi thật cần, và không bao giờ commit.

---

## 3. Bắt đầu: tài khoản, CLI, chi phí

1. Tạo tài khoản AWS. Chính sách **Free Tier** của AWS đã thay đổi qua các năm (tài khoản mới có thể nhận
   credit thay vì hạn mức miễn phí theo dịch vụ) — kiểm tra điều kiện hiện hành trên trang AWS Free Tier.
2. **Bảo vệ tài khoản root:** bật MFA, không tạo access key cho root, dùng user riêng để làm việc hằng ngày.
3. **Đặt ngân sách** (Billing → Budgets): vd 10 USD, cảnh báo email ở 50% / 90% / 100%.
4. Cài AWS CLI v2:

```powershell
aws configure sso            # khuyến nghị: đăng nhập qua IAM Identity Center, key tạm thời
# hoặc: aws configure        # nhập access key (chỉ khi học, nhớ xoá key khi xong)
aws sts get-caller-identity  # "tôi đang là ai, ở account nào?"
aws configure set region ap-southeast-1
```

---

## 4. Code của project trên AWS: credentials

`UploadService` hiện luôn truyền `credentials` lấy từ env, mặc định chuỗi rỗng:

```ts
credentials: {
  accessKeyId: config.get("AWS_ACCESS_KEY_ID") ?? "",
  secretAccessKey: config.get("AWS_SECRET_ACCESS_KEY") ?? "",
},
```

Trên ECS/EC2 **không nên** đặt key vào env — SDK tự lấy quyền tạm thời của IAM role qua
**default credential provider chain** (env → file `~/.aws` → SSO → role của ECS task / EC2).
Nhưng vì code luôn truyền `credentials`, chain bị bỏ qua → ký bằng key rỗng → `403`. Sửa:

```ts
const accessKeyId = config.get<string>("AWS_ACCESS_KEY_ID");
const secretAccessKey = config.get<string>("AWS_SECRET_ACCESS_KEY");
this.s3 = new S3Client({
  region: config.get("AWS_REGION") ?? "ap-southeast-1",
  // Chỉ dùng key tĩnh khi được cấu hình (dev); còn lại để SDK tự lấy role
  ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
});
```

> Presigned URL ký bằng **credentials tạm** của role hết hạn khi phiên role hết hạn — với `expiresIn: 300`
> (5 phút) như project thì không sao, nhưng đừng tạo URL sống nhiều giờ bằng role.

---

## 5. S3 — dịch vụ project đang dùng

### 5.1. Tạo bucket đúng cách

```powershell
$B = "edu-app-uploads-<hậu-tố-duy-nhất>"   # tên bucket là duy nhất TOÀN CẦU
aws s3api create-bucket --bucket $B --region ap-southeast-1 `
  --create-bucket-configuration LocationConstraint=ap-southeast-1

# Browser PUT thẳng lên S3 → cần CORS
aws s3api put-bucket-cors --bucket $B --cors-configuration file://cors.json
# cors.json: {"CORSRules":[{"AllowedOrigins":["https://edu.example.com"],"AllowedMethods":["PUT","GET"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"]}]}
```

Bucket mới mặc định **chặn public access** — giữ nguyên. Muốn hiển thị ảnh công khai thì đặt
**CloudFront** phía trước (Origin Access Control), không mở bucket ra public.

### 5.2. `publicUrl` của project

Code đang trả `https://${bucket}.s3.amazonaws.com/${key}` — URL này **không đọc được** khi bucket chặn public.
Nên cấu hình một biến kiểu `ASSET_BASE_URL=https://d1234.cloudfront.net` và ghép `${ASSET_BASE_URL}/${key}`.

### 5.3. Policy tối thiểu cho `api-gateway`

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:DeleteObject"],
    "Resource": "arn:aws:s3:::edu-app-uploads-xyz/uploads/*"
  }]
}
```

Chỉ đúng 2 hành động mà `UploadService` dùng (`PutObjectCommand`, `DeleteObjectCommand`), chỉ trong thư mục upload.

### 5.4. Tính năng S3 nên biết

- **Lifecycle rule:** tự xoá file tạm sau N ngày, chuyển file cũ sang lớp lưu trữ rẻ (S3 Glacier).
- **Versioning:** giữ phiên bản cũ khi ghi đè/xoá — hợp cho bucket chứa backup `infra/backups/*.sql`.
- **Event notification:** upload xong → gửi sự kiện tới SQS / Lambda (vd tạo thumbnail).

---

## 6. Deploy `api-gateway` lên ECS Fargate

### 6.1. ECR — đẩy image

```powershell
$ACC = (aws sts get-caller-identity --query Account --output text)
$REG = "$ACC.dkr.ecr.ap-southeast-1.amazonaws.com"
aws ecr create-repository --repository-name edu/api-gateway
aws ecr get-login-password | docker login --username AWS --password-stdin $REG

docker build -f services/api-gateway/Dockerfile -t "$REG/edu/api-gateway:v1" .
docker push "$REG/edu/api-gateway:v1"
```

### 6.2. Hai role khác nhau — dễ nhầm nhất khi học ECS

```
Execution role  ─ ECS AGENT dùng để: kéo image từ ECR, đọc secret, ghi log CloudWatch
Task role       ─ CODE CỦA BẠN dùng để: gọi S3, SQS, SES… (policy mục 5.3 gắn vào đây)
```

### 6.3. Task definition (rút gọn)

```json
{
  "family": "api-gateway",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<ACC>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<ACC>:role/api-gateway-task",
  "containerDefinitions": [{
    "name": "api-gateway",
    "image": "<ACC>.dkr.ecr.ap-southeast-1.amazonaws.com/edu/api-gateway:v1",
    "portMappings": [{ "containerPort": 3000 }],
    "environment": [
      { "name": "NODE_ENV", "value": "production" },
      { "name": "AWS_S3_BUCKET", "value": "edu-app-uploads-xyz" }
    ],
    "secrets": [
      { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:<ACC>:secret:edu/jwt-secret" },
      { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:<ACC>:secret:edu/database-url" }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/api-gateway",
        "awslogs-region": "ap-southeast-1",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"]
    }
  }]
}
```

```powershell
aws ecs create-cluster --cluster-name edu
aws ecs register-task-definition --cli-input-json file://api-gateway-task.json
aws ecs create-service --cluster edu --service-name api-gateway `
  --task-definition api-gateway --desired-count 2 --launch-type FARGATE `
  --network-configuration "awsvpcConfiguration={subnets=[subnet-priv-a,subnet-priv-b],securityGroups=[sg-api],assignPublicIp=DISABLED}" `
  --load-balancers "targetGroupArn=<TG_ARN>,containerName=api-gateway,containerPort=3000"
```

ALB gọi `/health` của target group để biết task còn sống (project đã có `HealthController`).
Image của project dựa trên `node:22-alpine`: có sẵn `wget` (busybox) nhưng **không có `curl`** — nên healthCheck dùng `wget`.

### 6.4. Các service gọi nhau thế nào

| Trong compose | Trên ECS |
|---------------|----------|
| `content-service:50051` qua DNS của Docker network | **Service Connect** / Cloud Map: gọi bằng tên `content-service.edu.local` |
| mọi container thấy nhau | Security Group: SG của `content-service` chỉ cho phép port gRPC từ SG của `api-gateway` |
| Kafka consumer chạy nền | Fargate task chạy liên tục → consumer chạy bình thường (khác Cloud Run) |

---

## 7. RDS PostgreSQL + Prisma

```powershell
aws rds create-db-instance --db-instance-identifier edu-pg `
  --engine postgres --db-instance-class db.t4g.micro --allocated-storage 20 `
  --master-username nihongo --manage-master-user-password `
  --no-publicly-accessible --vpc-security-group-ids sg-rds --db-subnet-group-name edu-private
```

- `--manage-master-user-password`: mật khẩu do RDS tạo và lưu ở **Secrets Manager**, tự xoay vòng.
- `--no-publicly-accessible`: DB không có IP public. Từ máy bạn muốn chạy `migrate:deploy` thì đi qua
  **SSM port forwarding** (không cần mở port, không cần bastion có SSH):

```powershell
aws ssm start-session --target i-<ec2-trong-vpc> `
  --document-name AWS-StartPortForwardingSessionToRemoteHost `
  --parameters "host=edu-pg.xxxx.ap-southeast-1.rds.amazonaws.com,portNumber=5432,localPortNumber=5434"
# terminal khác:
$env:DATABASE_URL="postgresql://nihongo:<mật khẩu>@localhost:5434/nihongo"
npm run migrate:deploy -w @edu/prisma-nihongo
```

Nạp dữ liệu: dùng seed nội dung `infra/postgres/nihongo-content-seed.sql` (hoặc file backup trên máy bạn, `infra/backups/nihongo_*.sql`) qua cùng đường hầm đó.

> Nhiều task × pool Prisma dễ cạn kết nối trên instance nhỏ → giới hạn `connection_limit`, hoặc dùng **RDS Proxy**.

---

## 8. Kafka trên AWS: MSK hay SQS/SNS?

Project dùng Kafka cho `edu.exam.submitted` → cập nhật SRS, streak, gửi email (xem [learn-kafka.md](./learn-kafka.md)).

| | MSK (Kafka) | SNS + SQS |
|---|-------------|-----------|
| Đổi code | gần như không (vẫn là Kafka) | phải đổi producer/consumer |
| Chi phí tối thiểu | cao (broker chạy liên tục) | trả theo request, gần 0 khi ít dùng |
| Nhiều consumer đọc cùng event | consumer group | SNS topic → **mỗi consumer một SQS queue** (fan-out) |
| Đọc lại lịch sử | ✅ | ❌ |
| Message lỗi | tự làm DLQ | **Dead-letter queue** + `maxReceiveCount` có sẵn |

```
exam-service ──publish──▶ SNS topic edu-exam-submitted
                             ├──▶ SQS srs-updater     ──▶ consumer cập nhật SrsCard
                             ├──▶ SQS streak-updater  ──▶ consumer cập nhật StudyStreak
                             └──▶ SQS result-email    ──▶ consumer gửi email qua SES
```

Với project học/demo: SNS + SQS rẻ và đơn giản hơn nhiều. Dù chọn gì, consumer vẫn phải **idempotent**
(SQS standard giao *ít nhất một lần*).

---

## 9. Mạng: VPC — phần hay làm tốn tiền nhất

```
Internet ─▶ Internet Gateway ─▶ public subnet  (ALB, NAT Gateway)
                                    │
                                    ▼
                               private subnet (ECS tasks, RDS, ElastiCache)
                                    │ ra Internet (gọi Stripe, Google OAuth…) qua NAT Gateway
```

- **NAT Gateway** tính tiền theo giờ + theo GB dữ liệu đi qua — thường là khoản bất ngờ nhất khi học.
  Kéo image từ ECR / đọc S3 đi qua NAT cũng bị tính → dùng **VPC endpoint** (S3 gateway endpoint miễn phí).
- **IPv4 public** (Elastic IP, task có public IP) có tính phí.
- Mọi tài nguyên đặt ở **≥ 2 AZ** (ALB, RDS subnet group đều yêu cầu).

---

## 10. Terraform với provider `aws`

[`infra/terraform/main.tf`](../infra/terraform/main.tf) đang dùng DigitalOcean. Tương đương trên AWS:

```hcl
terraform {
  backend "s3" {                    # state lưu trên S3, không để file trên máy
    bucket = "edu-tfstate-xyz"
    key    = "edu-app/terraform.tfstate"
    region = "ap-southeast-1"
  }
}

provider "aws" { region = "ap-southeast-1" }

module "vpc" {                      # module cộng đồng, đỡ tự viết subnet/route table
  source             = "terraform-aws-modules/vpc/aws"
  name               = "edu"
  cidr               = "10.0.0.0/16"
  azs                = ["ap-southeast-1a", "ap-southeast-1b"]
  public_subnets     = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets    = ["10.0.11.0/24", "10.0.12.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = true         # 1 NAT cho rẻ khi học
}

resource "aws_s3_bucket" "uploads" { bucket = "edu-app-uploads-xyz" }

resource "aws_ecr_repository" "api_gateway" { name = "edu/api-gateway" }

resource "aws_db_instance" "pg" {
  identifier                  = "edu-pg"
  engine                      = "postgres"
  instance_class              = "db.t4g.micro"
  allocated_storage           = 20
  username                    = "nihongo"
  manage_master_user_password = true
  skip_final_snapshot         = true  # chỉ cho môi trường học
}
```

---

## 11. Chi phí & dọn dẹp

| Tài nguyên | Tính tiền khi không dùng? | Khi học xong |
|------------|---------------------------|--------------|
| NAT Gateway | **có** (theo giờ) | xoá |
| ALB | **có** (theo giờ) | xoá |
| RDS | **có** | `aws rds stop-db-instance` (tự bật lại sau ~7 ngày!) hoặc xoá |
| ElastiCache, MSK | **có** | xoá |
| ECS Fargate | theo task đang chạy | `desired-count 0` hoặc xoá service |
| Elastic IP / IPv4 public | **có** | release |
| S3, ECR | theo dung lượng | xoá object / image cũ |

Dùng **Cost Explorer** xem khoản nào tốn nhất; dùng Terraform thì `terraform destroy` dọn sạch.
Kiểm tra tài nguyên còn sót ở **mọi region** (dễ lỡ tay tạo ở `us-east-1`).

---

## 12. AWS ↔ GCP ↔ project (tra nhanh)

| Việc | AWS | GCP |
|------|-----|-----|
| Chạy container | ECS Fargate / EKS | Cloud Run / GKE |
| Postgres | RDS / Aurora | Cloud SQL / AlloyDB |
| Redis | ElastiCache | Memorystore |
| Lưu file | S3 | Cloud Storage |
| Hàng đợi / pub-sub | SQS + SNS | Pub/Sub |
| Kafka được quản lý | MSK | Managed Service for Apache Kafka |
| Registry | ECR | Artifact Registry |
| Secret | Secrets Manager | Secret Manager |
| Danh tính cho code | IAM role (task role) | Service account |
| Log / metric | CloudWatch | Cloud Logging / Monitoring |
| Giả lập local | LocalStack | emulator từng dịch vụ |

---

## Bài tập thực hành

1. Tạo tài khoản, bật MFA cho root, tạo user làm việc qua IAM Identity Center, đặt Budget alert.
2. Sửa `UploadService` theo mục 4 (chỉ truyền `credentials` khi có key). Chạy thử với LocalStack
   ([learn-localstack.md](./learn-localstack.md)) rồi với bucket S3 thật.
3. Tạo bucket S3 + CORS, upload ảnh từ trang admin bằng presigned URL. Đặt CloudFront phía trước và sửa
   `publicUrl` dùng `ASSET_BASE_URL`.
4. Viết policy mục 5.3, gắn vào một role; thử gọi `s3:GetObject` → quan sát `AccessDenied` (đúng như mong đợi).
5. Đẩy image `api-gateway` lên ECR, chạy trên ECS Fargate sau ALB, mở `/health` qua URL của ALB.
6. Tạo RDS, chạy `migrate:deploy` qua SSM port forwarding, import file backup, nối `api-gateway` +
   `content-service` vào RDS.
7. Dựng SNS topic `edu-exam-submitted` + 2 SQS queue (fan-out) + DLQ; nộp bài thi thử → 2 consumer đều nhận.
8. (Nâng cao) Viết lại mục 10 thành Terraform chạy được, `terraform apply` rồi `terraform destroy`.
9. Dọn toàn bộ theo mục 11, xem Cost Explorer vài ngày sau để chắc không còn phát sinh.

## Luyện phỏng vấn

Câu hỏi phỏng vấn kèm đáp án về nginx, Terraform, AWS, GCP, đo tải và xử lý sự cố: [interview-infra-cloud.md](./interview-infra-cloud.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **7. Cloud** — bài 2/5.

- Bài trước: [learn-localstack.md](./learn-localstack.md) — Giả lập AWS trên máy bằng LocalStack
- **Bài tiếp: [learn-terraform.md](./learn-terraform.md)** — Terraform: plan/apply, state, phụ thuộc, drift — học trên bộ S3 + Lambda chạy thật

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
