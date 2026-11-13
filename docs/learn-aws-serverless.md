# Học AWS Serverless — S3 + Lambda + IAM bằng Terraform

Bài thực hành **serverless theo sự kiện**: có ảnh mới trong S3 thì AWS tự gọi một hàm Lambda tạo ảnh thu nhỏ. Không có server nào phải bật sẵn, chạy và tính tiền theo từng lần gọi.

Chạy được ở hai nơi bằng **cùng một bộ file Terraform**:

| Đích | Chi phí | Dùng khi |
|---|---|---|
| **LocalStack** (trên máy) | 0 đồng, không cần tài khoản AWS | Học, thử, làm lại bao nhiêu lần cũng được |
| **AWS thật** | Gần 0 nếu trong mức miễn phí (xem mục 6) | Sau khi đã chạy được trên LocalStack |

Đọc trước: [learn-localstack.md](./learn-localstack.md) (LocalStack là gì), [learn-aws.md](./learn-aws.md) mục 2–3 (khái niệm, IAM, chi phí).

> **Đã chạy thật end-to-end trên LocalStack (09/11/2026):** `apply` tạo 8 tài nguyên; `demo` tải ảnh 1280×960, sau khoảng 4 giây Lambda ghi ảnh thu nhỏ 320×240 (JPEG, 2,7 KB) vào `thumbnails/`; Lambda chạy đúng một lần (không lặp), log JSON nằm trong CloudWatch Logs, giữ 7 ngày. Học Terraform trên chính bộ này: [learn-terraform.md](./learn-terraform.md).

---

## 1. Kiến trúc

```text
Người dùng / app
   │  PUT ảnh
   ▼
S3 bucket  edu-app-uploads-<tài khoản>-<vùng>
   ├── uploads/…      ← ảnh gốc
   │      │ sự kiện s3:ObjectCreated (chỉ prefix uploads/)
   │      ▼
   │   Lambda edu-thumbnail (Node.js 22, arm64, 512 MB)
   │      │ đọc ảnh gốc, thu nhỏ về 320 px, xuất JPEG
   │      ▼
   └── thumbnails/…   ← ảnh thu nhỏ
              │
              ▼
   CloudWatch Logs  /aws/lambda/edu-thumbnail (giữ 7 ngày)
```

| Thành phần | File | Ghi chú |
|---|---|---|
| Logic thu nhỏ ảnh | [core.mjs](../infra/aws-learn/lambda/thumbnail/core.mjs) | Hàm thuần, không gọi AWS |
| Hàm Lambda | [index.mjs](../infra/aws-learn/lambda/thumbnail/index.mjs) | Đọc sự kiện S3, gọi S3 bằng AWS SDK v3 |
| Test | [core.test.mjs](../infra/aws-learn/lambda/thumbnail/core.test.mjs) | `npm test`, chạy trên máy |
| Hạ tầng | [terraform/](../infra/aws-learn/terraform) | Bucket, IAM role, Lambda, trigger, log group |
| Điều khiển | [run.sh](../infra/aws-learn/run.sh) | `up`, `apply`, `demo`, `destroy`, `down` |
| LocalStack | service `localstack` trong [docker-compose.yml](../docker-compose.yml) | Profile `aws-learn`, không chạy cùng stack thường |

---

## 2. Chạy trên LocalStack (miễn phí)

Cần Docker và Node. Terraform chạy trong container `hashicorp/terraform:1.12.2`, **không cần cài**.

```bash
# 0. Test logic Lambda (không cần LocalStack)
cd infra/aws-learn/lambda/thumbnail && npm install && npm test && cd -

# 1. Bật LocalStack (đã có LocalStack khác giữ cổng 4566 thì script dùng luôn cái đó)
bash infra/aws-learn/run.sh up

# 2. Tạo bucket, IAM role, Lambda, trigger
bash infra/aws-learn/run.sh apply

# 3. Thử: tải ảnh 1280x960 vào uploads/, chờ Lambda tạo ảnh thu nhỏ
bash infra/aws-learn/run.sh demo

# 4. Xóa sạch, tắt LocalStack
bash infra/aws-learn/run.sh destroy
bash infra/aws-learn/run.sh down
```

Xem tận mắt bằng AWS CLI (khóa giả `test`):

```bash
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=ap-southeast-1
aws --endpoint-url http://localhost:4566 s3 ls s3://edu-app-uploads-000000000000-ap-southeast-1 --recursive
aws --endpoint-url http://localhost:4566 lambda list-functions --query 'Functions[].FunctionName'
aws --endpoint-url http://localhost:4566 logs filter-log-events \
  --log-group-name /aws/lambda/edu-thumbnail --filter-pattern thumbnail --query 'events[].message'   # log của Lambda
```

**Lưu ý:** LocalStack bản miễn phí **mất hết** dữ liệu khi restart. Bật lại thì chạy lại `apply`.

---

## 3. Đọc Terraform

| Khối | Học được gì |
|---|---|
| `provider "aws"` trong [providers.tf](../infra/aws-learn/terraform/providers.tf) | Cùng code cho hai đích: `target = localstack` đổi endpoint và dùng khóa giả |
| `aws_s3_bucket` + `aws_s3_bucket_public_access_block` | Tên bucket là duy nhất trên toàn AWS; chặn mọi đường công khai |
| `aws_iam_role` + `aws_iam_policy_document` | **Quyền tối thiểu**: Lambda chỉ đọc `uploads/*`, chỉ ghi `thumbnails/*`, chỉ ghi log vào đúng log group |
| `aws_cloudwatch_log_group` | Đặt thời hạn giữ log; không đặt thì log giữ mãi và tính tiền mãi |
| `archive_file` + `aws_lambda_function` | Đóng gói code thành zip; `source_code_hash` đổi khi code đổi → Terraform tự cập nhật Lambda |
| `aws_lambda_permission` | Cho phép **S3 gọi Lambda**; thiếu cái này trigger không chạy |
| `aws_s3_bucket_notification` | Gắn trigger, lọc `filter_prefix = "uploads/"` |

**State riêng cho từng đích:** `run.sh` dùng workspace Terraform `localstack` và `aws`. Xóa LocalStack không làm lệch state của AWS thật.

---

## 4. Những điều serverless dạy (hay hỏi khi phỏng vấn)

1. **Vòng lặp vô hạn:** Lambda ghi ảnh vào chính bucket kích hoạt nó. Nếu trigger bắt mọi file, mỗi ảnh thu nhỏ lại kích hoạt Lambda → gọi mãi, hóa đơn tăng vọt. Chặn bằng **hai lớp**: `filter_prefix = "uploads/"` ở trigger, và `shouldProcess()` trong code bỏ qua file ngoài `uploads/`.
2. **Quyền tối thiểu:** role chỉ có `GetObject` trên `uploads/*` và `PutObject` trên `thumbnails/*`. Lambda có lỗi cũng không xóa hay ghi đè được ảnh gốc.
3. **Tên file trong sự kiện bị mã hóa URL:** khoảng trắng thành `+`, chữ có dấu thành `%E1%BA%A3`. Quên giải mã thì `GetObject` báo không tìm thấy file (`decodeS3Key`).
4. **Giới hạn tài nguyên:** Lambda có giới hạn RAM và thời gian chạy (ở đây 512 MB, 30 giây). Ảnh quá 10 MB bị bỏ qua thay vì làm hàm chết giữa chừng.
5. **Gọi lại khi lỗi:** S3 gọi Lambda bất đồng bộ; lỗi thì AWS tự **thử lại 2 lần**. Vì vậy hàm phải **idempotent**: chạy lại cùng ảnh vẫn ra cùng kết quả (ở đây ghi đè cùng tên file thu nhỏ nên an toàn).
6. **Cold start:** lần gọi đầu sau một lúc không dùng phải khởi tạo môi trường (nạp code, thư viện). Gói càng nặng càng chậm; `jimp` thuần JS nên không cần build riêng cho Linux như `sharp`, đổi lại xử lý chậm hơn.
7. **Log có cấu trúc:** mỗi lần chạy in một dòng JSON `{ event: "thumbnail", results }`, dễ lọc trong CloudWatch Logs Insights.

---

## 5. Lên AWS thật

### Quyền cần có

User `edu-app-deploy` (profile `edu-app`) phải được:

1. **Gỡ permissions boundary** (IAM → Users → edu-app-deploy → Permissions boundary → Remove). Boundary đang chặn mọi quyền.
2. Gắn policy: `AmazonS3FullAccess`, `AWSLambda_FullAccess`, `IAMFullAccess`. Khi đã quen, nên thay bằng policy hẹp chỉ cho đúng các tài nguyên `edu-*`.

Kiểm tra: `aws s3 ls --profile edu-app` không còn báo `AccessDenied`.

### Chạy

```bash
TARGET=aws bash infra/aws-learn/run.sh apply      # Terraform in plan, bạn gõ yes mới tạo
TARGET=aws bash infra/aws-learn/run.sh demo
TARGET=aws bash infra/aws-learn/run.sh destroy    # học xong NHỚ xóa
```

Xem log thật: `aws logs tail /aws/lambda/edu-thumbnail --follow --profile edu-app`.

---

## 6. Chi phí

| Tài nguyên | Chi phí khi học (vài chục lần chạy) |
|---|---|
| Lambda | Miễn phí lâu dài 1 triệu lần gọi/tháng → **0** |
| S3 | Vài ảnh nhỏ → dưới 0,01 USD/tháng |
| CloudWatch Logs | Vài KB, giữ 7 ngày → **0** |
| IAM | Miễn phí |

Chính sách miễn phí của AWS thay đổi theo thời gian và theo loại tài khoản: kiểm tra trên trang Billing → Free Tier. Luôn đặt **Zero spend budget** trước (hướng dẫn ở [learn-aws.md](./learn-aws.md) mục 3) và chạy `destroy` khi học xong.

---

## 7. Vì sao LocalStack cần `docker.sock`

LocalStack chạy mỗi lần gọi Lambda trong **một container riêng** (image `public.ecr.aws/lambda/nodejs:22`), nên nó phải điều khiển được Docker trên máy. Gắn `/var/run/docker.sock` vào container là trao quyền đó: một container có `docker.sock` có thể tạo container khác với quyền của máy.

- Chấp nhận được khi học trên máy cá nhân, với image chính thức của LocalStack.
- **Không** làm vậy trên server dùng chung hay production.
- Muốn học mà không gắn: bỏ dòng `docker.sock` trong compose. S3 và IAM vẫn chạy được, nhưng Lambda sẽ không thực thi.

---

## 8. Bài tập

1. **Phá vòng lặp:** xóa `filter_prefix` trong `aws_s3_bucket_notification`, `apply`, chạy `demo`, xem log. Lambda có bị gọi lại vì ảnh thu nhỏ không? Lớp chặn thứ hai (`shouldProcess`) có cứu được không?
2. **Quyền tối thiểu:** đổi `thumbnails/*` thành `uploads/*` trong policy, chạy trên **AWS thật** (LocalStack bản miễn phí không kiểm tra quyền IAM). Lambda báo lỗi gì?
3. **Xử lý lỗi:** thêm `aws_lambda_function_event_invoke_config` với `on_failure` đẩy vào một hàng đợi SQS (DLQ). Tải một file `.png` hỏng, xem sự kiện lỗi nằm trong SQS.
4. **Nối vào app:** đổi `AWS_ENDPOINT_URL` của gateway sang LocalStack và bucket sang bucket vừa tạo (xem [media-storage.md](./media-storage.md)), gửi ảnh trong chat, xem ảnh thu nhỏ xuất hiện.
5. **So sánh:** viết lại bằng `sharp` (nhanh hơn nhưng cần build cho Linux arm64). So thời gian chạy và cold start.

---

## 9. Câu hỏi tự kiểm tra

1. Serverless khác chạy một server Node luôn bật ở điểm nào về chi phí và vận hành?
2. Vì sao cần cả `aws_lambda_permission` lẫn `aws_s3_bucket_notification`?
3. Làm sao tránh Lambda tự kích hoạt chính nó?
4. S3 gọi Lambda bất đồng bộ thì lỗi được xử lý thế nào? Vì sao hàm phải idempotent?
5. Cold start là gì, làm sao giảm?
6. Vì sao không dùng khóa truy cập (access key) trong code Lambda?

## Luyện phỏng vấn

Câu hỏi phỏng vấn kèm đáp án về nginx, Terraform, AWS, GCP, đo tải và xử lý sự cố: [interview-infra-cloud.md](./interview-infra-cloud.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **7. Cloud** — bài 4/5.

- Bài trước: [learn-terraform.md](./learn-terraform.md) — Terraform: plan/apply, state, phụ thuộc, drift — học trên bộ S3 + Lambda chạy thật
- **Bài tiếp: [learn-google-cloud.md](./learn-google-cloud.md)** — Google Cloud: Cloud Run, Cloud SQL, GCS, Pub/Sub, GKE

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
