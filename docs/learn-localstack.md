# Học LocalStack — Từ Project Này

> LocalStack = một container Docker giả lập API của AWS (S3, SQS, SES, …) ngay trên máy.
> Code gọi AWS SDK y như thật, chỉ đổi **endpoint** sang `http://localhost:4566`.

> **Cập nhật 2026-09-29:** `UploadService` đã hỗ trợ sẵn `AWS_ENDPOINT_URL` (+ path-style) và `publicUrl` theo endpoint như
> mục 5.2 — chỉ cần chạy LocalStack và đặt biến môi trường ở mục 5.1.

## 1. Tại sao project cần LocalStack

Project đã dùng **S3** cho upload file (xem [`upload.service.ts`](../services/api-gateway/src/http/upload/upload.service.ts)):

```
Browser                      api-gateway                         S3
  │  POST /api/upload/presigned-url │                              │
  │ ───────────────────────────────▶│  getSignedUrl(PutObject)     │
  │ ◀─────────── { url, key } ──────│  (chỉ ký URL, không gọi S3)  │
  │                                  │                              │
  │  PUT url  (file đi thẳng lên S3, không qua server)             │
  │ ───────────────────────────────────────────────────────────────▶│
```

Vấn đề khi dev:

```
Không có LocalStack:
  AWS_ACCESS_KEY_ID= (trống trong services/.env)
    → getSignedUrl vẫn trả URL (ký bằng key rỗng)
    → browser PUT lên s3.amazonaws.com → 403 ❌
  Muốn chạy thật → cần tài khoản AWS, key thật, tốn tiền, dễ lộ key ⚠️

Có LocalStack:
  S3 chạy trong container edu-localstack (port 4566)
    → key giả "test"/"test", không tốn tiền, không cần mạng
    → xoá container là sạch, test tự động được ✅
```

**Nguyên tắc:** code **không biết** mình đang nói chuyện với AWS thật hay LocalStack —
chỉ khác biến môi trường. Đổi môi trường = đổi `.env`, không sửa code.

---

## 2. Concepts cốt lõi

```
                    ┌──────────────── edu-localstack ────────────────┐
AWS SDK / CLI ─────▶│  :4566  (một cổng duy nhất cho mọi dịch vụ)   │
  endpoint =        │   ├── S3        bucket, object, presigned URL  │
  localhost:4566    │   ├── SQS       queue                          │
                    │   ├── SNS       topic → fan-out                │
                    │   ├── SES       email (không gửi thật)         │
                    │   ├── DynamoDB, Lambda, Secrets Manager, …     │
                    │   └── /_localstack/health  (trạng thái)        │
                    └────────────────────────────────────────────────┘
```

| Khái niệm | Trên AWS thật | Trên LocalStack |
|-----------|---------------|-----------------|
| Endpoint | `s3.ap-southeast-1.amazonaws.com` | `http://localhost:4566` (mọi dịch vụ) |
| Credentials | IAM key thật | bất kỳ, quen dùng `test` / `test` |
| Account ID | 12 số của bạn | `000000000000` |
| IAM / quyền | luôn kiểm tra | mặc định **không** kiểm tra (cho qua hết) |
| Dữ liệu | bền vững | mất khi xoá/restart container (bản miễn phí) |
| DNS tiện dụng | — | `localhost.localstack.cloud` → trỏ về `127.0.0.1` |

**Path-style vs virtual-hosted (S3):**

```
virtual-hosted:  http://edu-app-dev.s3.amazonaws.com/uploads/a.png      (mặc định của SDK)
path-style:      http://localhost:4566/edu-app-dev/uploads/a.png         (dễ nhất với LocalStack)
```

Với LocalStack nên bật `forcePathStyle: true` — bucket nằm trong path, không cần DNS wildcard.

---

## 3. Chạy LocalStack

### 3.1. Chạy nhanh bằng `docker run`

```powershell
docker run -d --name edu-localstack -p 4566:4566 `
  -e SERVICES=s3,sqs,ses `
  localstack/localstack

# Kiểm tra: các dịch vụ phải ở trạng thái "available" / "running"
curl http://localhost:4566/_localstack/health
```

> ⚠️ Chính sách image của LocalStack (bản miễn phí / bản cần tài khoản) thay đổi qua các năm.
> Nếu log container báo cần `LOCALSTACK_AUTH_TOKEN`, tạo tài khoản miễn phí trên trang LocalStack
> rồi truyền token qua biến môi trường. Nên **ghim tag** (vd `localstack/localstack:<phiên bản>`)
> sau khi chạy ổn, đừng để `latest` tự nâng cấp.

### 3.2. Thêm vào `docker-compose.yml` của project

```yaml
  localstack:
    image: localstack/localstack
    container_name: edu-localstack
    ports:
      - "4566:4566"
    environment:
      SERVICES: s3,sqs,ses
      AWS_DEFAULT_REGION: ap-southeast-1
    volumes:
      # script chạy khi LocalStack sẵn sàng → tạo bucket, CORS, queue
      - ./infra/localstack/init:/etc/localstack/init/ready.d:ro
    networks:
      default:
        aliases:
          # để container khác (api-gateway) gọi được bằng CÙNG hostname với browser — xem mục 5.3
          - localhost.localstack.cloud
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:4566/_localstack/health"]
      interval: 10s
      retries: 10
```

### 3.3. Init hook — tạo tài nguyên mỗi lần khởi động

Bản miễn phí **mất dữ liệu khi restart**, nên tạo lại bucket bằng script trong
`/etc/localstack/init/ready.d/` (chạy theo thứ tự tên file). Ví dụ `infra/localstack/init/01-s3.sh`:

```bash
#!/bin/bash
set -e
# awslocal = aws CLI đã trỏ sẵn endpoint LocalStack (có sẵn trong image)
awslocal s3 mb s3://edu-app-dev

# Browser PUT thẳng lên S3 → bucket phải cho phép CORS từ web
awslocal s3api put-bucket-cors --bucket edu-app-dev --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:5173", "http://localhost:8080"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"]
  }]
}'
echo "S3 bucket edu-app-dev ready"
```

> Lưu file với xuống dòng **LF** (không phải CRLF của Windows), nếu không bash trong container báo
> `$'\r': command not found`.

---

## 4. Thao tác bằng CLI

Cài `awslocal` trên máy (tuỳ chọn): `pip install awscli-local`. Hoặc dùng `aws` thường + `--endpoint-url`:

```powershell
$env:AWS_ACCESS_KEY_ID="test"; $env:AWS_SECRET_ACCESS_KEY="test"; $env:AWS_DEFAULT_REGION="ap-southeast-1"
$ep = "--endpoint-url=http://localhost:4566"

aws $ep s3 ls                                       # liệt kê bucket
aws $ep s3 cp .\hinh.png s3://edu-app-dev/test/     # upload
aws $ep s3 ls s3://edu-app-dev --recursive          # xem object
aws $ep s3 presign s3://edu-app-dev/test/hinh.png   # tạo URL đọc có hạn
aws $ep s3 rm s3://edu-app-dev/test/hinh.png        # xoá
```

Không muốn cài gì: chạy ngay trong container — `docker exec edu-localstack awslocal s3 ls`.

---

## 5. Nối project vào LocalStack

### 5.1. Biến môi trường (`services/.env`)

```env
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=edu-app-dev
# Chỉ đặt khi dev với LocalStack. Production: bỏ trống → SDK dùng AWS thật.
AWS_ENDPOINT_URL=http://localhost.localstack.cloud:4566
```

### 5.2. Sửa `UploadService` — chỉ thêm endpoint khi có cấu hình

```ts
constructor(private readonly config: ConfigService) {
  const endpoint = config.get<string>("AWS_ENDPOINT_URL"); // undefined ở production
  this.s3 = new S3Client({
    region: config.get("AWS_REGION") ?? "ap-southeast-1",
    credentials: { /* như cũ */ },
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  });
  this.bucket = config.get("AWS_S3_BUCKET") ?? "edu-app-dev";
  // URL public để hiển thị file sau khi upload
  this.publicBase = endpoint
    ? `${endpoint}/${this.bucket}`                    // http://localhost.localstack.cloud:4566/edu-app-dev
    : `https://${this.bucket}.s3.amazonaws.com`;
}
```

Hiện `publicUrl` đang **viết cứng** `https://${bucket}.s3.amazonaws.com/...` → với LocalStack sẽ sai,
nên tách ra `publicBase` như trên.

### 5.3. Cái bẫy lớn nhất: **hostname trong presigned URL**

Presigned URL được **ký kèm hostname**. Server ký, nhưng **browser** mới là bên gọi URL đó:

```
api-gateway (trong Docker)            browser (trên máy bạn)
endpoint = http://localstack:4566  →  URL ký cho host "localstack:4566"
                                      → browser không phân giải được "localstack" ❌

endpoint = http://localhost:4566   →  api-gateway gọi localhost = chính container của nó ❌
                                      (chỉ ký URL thì không sao, nhưng deleteObject sẽ lỗi)
```

Cách giải: dùng **một hostname cả hai phía đều hiểu** — `localhost.localstack.cloud`:

```
browser    : localhost.localstack.cloud → DNS công cộng → 127.0.0.1:4566 → port map → LocalStack ✅
api-gateway: localhost.localstack.cloud → network alias (mục 3.2)        → LocalStack ✅
chữ ký     : cùng host "localhost.localstack.cloud:4566" ở cả hai phía   ✅
```

> Nếu chỉ chạy `api-gateway` bằng `npm run start:dev` trên máy (không trong Docker) thì
> `http://localhost:4566` là đủ — cả server lẫn browser đều ở trên máy bạn.

### 5.4. Thử luồng upload end-to-end

```powershell
# 1. Đăng nhập lấy token (tài khoản dev xem docs/accounts.md), rồi xin URL
$token = "<JWT>"
$r = Invoke-RestMethod -Method Post http://localhost:3000/api/upload/presigned-url `
  -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" `
  -Body '{"contentType":"image/png","folder":"test"}'
$r   # { url, key, publicUrl }

# 2. PUT file lên đúng URL đó (Content-Type phải khớp lúc ký, nếu không → 403 SignatureDoesNotMatch)
Invoke-RestMethod -Method Put -Uri $r.url -InFile .\hinh.png -ContentType "image/png"

# 3. Kiểm tra object đã có
docker exec edu-localstack awslocal s3 ls s3://edu-app-dev/test/
```

---

## 6. Các dịch vụ khác nên học với project này

### 6.1. SQS — so sánh với Kafka

Project dùng Kafka cho event (xem [learn-kafka.md](./learn-kafka.md)). SQS là hàng đợi đơn giản hơn:

| | Kafka | SQS |
|---|-------|-----|
| Mô hình | log, nhiều consumer group đọc lại được | queue, message bị xoá sau khi xử lý |
| Đọc lại lịch sử | ✅ theo offset | ❌ |
| Vận hành | tự quản (hoặc MSK) | AWS lo hết |
| Hợp với | event sourcing, fan-out nhiều service | job nền: gửi email, resize ảnh |

```powershell
docker exec edu-localstack awslocal sqs create-queue --queue-name edu-image-resize
docker exec edu-localstack awslocal sqs send-message `
  --queue-url http://sqs.ap-southeast-1.localhost.localstack.cloud:4566/000000000000/edu-image-resize `
  --message-body '{"key":"uploads/a.png"}'
docker exec edu-localstack awslocal sqs receive-message `
  --queue-url http://sqs.ap-southeast-1.localhost.localstack.cloud:4566/000000000000/edu-image-resize
```

Nhớ **visibility timeout**: message nhận rồi mà không `delete-message` trong thời hạn → quay lại hàng đợi
(giống Kafka không commit offset) → consumer phải **idempotent**.

### 6.2. SES — email không gửi thật

```powershell
docker exec edu-localstack awslocal ses verify-email-identity --email-address no-reply@edu.local
docker exec edu-localstack awslocal ses send-email --from no-reply@edu.local `
  --destination ToAddresses=hv@test.local `
  --message "Subject={Data=Chao},Body={Text={Data=Xin chao}}"

# Xem hộp thư giả: mọi email đã "gửi"
curl http://localhost:4566/_aws/ses
```

Tiện để test email xác thực / quên mật khẩu mà không spam hộp thư thật.

---

## 7. Test tự động với LocalStack (Testcontainers)

Mỗi lần chạy test dựng một LocalStack riêng, test xong tự xoá:

```ts
// npm i -D @testcontainers/localstack
import { LocalstackContainer, type StartedLocalStackContainer } from "@testcontainers/localstack";
import { S3Client, CreateBucketCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

let ls: StartedLocalStackContainer;
let s3: S3Client;

beforeAll(async () => {
  ls = await new LocalstackContainer("localstack/localstack").start();
  s3 = new S3Client({
    endpoint: ls.getConnectionUri(),
    region: "ap-southeast-1",
    forcePathStyle: true,
    credentials: { accessKeyId: "test", secretAccessKey: "test" },
  });
  await s3.send(new CreateBucketCommand({ Bucket: "edu-app-dev" }));
}, 120_000);

afterAll(() => ls?.stop());

it("upload qua presigned URL thì object xuất hiện trong bucket", async () => {
  // ...gọi UploadService.getPresignedUploadUrl, fetch(url, { method: "PUT", body })...
  const out = await s3.send(new ListObjectsV2Command({ Bucket: "edu-app-dev" }));
  expect(out.KeyCount).toBe(1);
});
```

Unit test thường (mock `S3Client`) vẫn nhanh hơn — dùng LocalStack cho **integration test**:
chữ ký, CORS, Content-Type… những thứ mock không bắt được.

---

## 8. Khi nào LocalStack KHÔNG thay được AWS thật

- **IAM/policy**: mặc định không kiểm tra quyền → code chạy ở local nhưng production báo `AccessDenied`.
  Luôn thử lại trên môi trường staging có IAM thật.
- **Hành vi khác biệt nhỏ**: mã lỗi, giới hạn kích thước, độ trễ, eventual consistency.
- **Tính năng trả phí**: lưu dữ liệu qua restart, một số dịch vụ nâng cao chỉ có ở bản Pro.
- **Không đo được hiệu năng/chi phí** — số liệu local không phản ánh AWS.

**Nguyên tắc:** LocalStack cho vòng dev nhanh + test tích hợp; trước khi release vẫn cần staging AWS thật.

---

## 9. Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|-------------|-------------|----------|
| `403 SignatureDoesNotMatch` khi PUT | `Content-Type` lúc PUT khác lúc ký, hoặc host khác | gửi đúng `Content-Type`; dùng cùng hostname (mục 5.3) |
| Browser báo CORS error | bucket chưa có CORS | `put-bucket-cors` trong init hook (mục 3.3) |
| `NoSuchBucket` sau khi restart | bản miễn phí không lưu dữ liệu | tạo bucket trong init hook |
| `getaddrinfo ENOTFOUND edu-app-dev.localhost` | SDK dùng virtual-hosted style | `forcePathStyle: true` |
| Init script không chạy | file CRLF hoặc thiếu quyền chạy | lưu LF; script `.sh` trong `ready.d` |
| Gọi `localhost:4566` từ container lỗi | `localhost` trong container là chính nó | dùng `localhost.localstack.cloud` + network alias |

---

## Bài tập thực hành

1. Chạy LocalStack bằng `docker run`, tạo bucket `edu-app-dev`, upload một file bằng CLI, rồi mở URL từ
   `s3 presign` trên trình duyệt.
2. Thêm service `localstack` vào `docker-compose.yml` + init hook tạo bucket và CORS. Restart container,
   kiểm tra bucket tự có lại.
3. Sửa `UploadService` theo mục 5.2 (thêm `AWS_ENDPOINT_URL`, `forcePathStyle`, `publicBase`).
   Chạy luồng mục 5.4 thành công từ browser (trang admin có upload ảnh).
4. Cố tình PUT với `Content-Type` sai → quan sát lỗi 403, đọc XML lỗi trả về để hiểu vì sao.
5. Tạo queue SQS `edu-image-resize`; khi upload xong thì gửi message `{ key }`. Viết một script đọc
   queue, in key ra rồi `delete-message`. Thử không xoá → message quay lại sau visibility timeout.
6. Viết integration test mục 7 cho `UploadService` (Testcontainers), chạy trong `npm test` của `services`.
7. (Nâng cao) Gửi email xác thực tài khoản qua SES LocalStack thay vì SMTP, xem nội dung ở `/_aws/ses`.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **7. Cloud** — bài 1/5.

- **Bài tiếp: [learn-aws.md](./learn-aws.md)** — AWS: S3 (đang dùng), ECS Fargate, RDS, SQS/SNS, IAM

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
