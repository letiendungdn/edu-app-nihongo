# Học Terraform — từ hạ tầng thật của project

Terraform là công cụ **hạ tầng dạng code** (Infrastructure as Code, IaC): bạn viết file mô tả hạ tầng mong muốn, Terraform so với thực tế rồi tạo, sửa hoặc xóa cho khớp.

Bài này học trên hai bộ Terraform có sẵn trong repo:

| Thư mục | Tạo gì | Chạy được |
|---|---|---|
| [infra/aws-learn/terraform](../infra/aws-learn/terraform) | S3 + Lambda + IAM (serverless) | **Có, miễn phí trên LocalStack** — dùng xuyên suốt bài này |
| [infra/terraform](../infra/terraform) | Máy chủ, Postgres, Redis, firewall trên DigitalOcean | Chỉ đọc (cần tài khoản DigitalOcean, tốn tiền) |

Mọi kết quả trong bài là kết quả chạy thật ngày 09/11/2026 với Terraform 1.12.2 và provider `hashicorp/aws` 5.100.

Đọc kèm: [learn-aws-serverless.md](./learn-aws-serverless.md) (tài nguyên AWS trong bài này làm gì).

---

## 0. Chuẩn bị

Không cần cài Terraform: script chạy nó trong container `hashicorp/terraform:1.12.2`.

```bash
bash infra/aws-learn/run.sh up       # bật LocalStack (hoặc dùng LocalStack đang chạy sẵn ở cổng 4566)
bash infra/aws-learn/run.sh apply    # tạo hạ tầng
```

Kết quả thật:

```text
Apply complete! Resources: 8 added, 0 changed, 0 destroyed.
Outputs:
bucket = "edu-app-uploads-000000000000-ap-southeast-1"
lambda_function = "edu-thumbnail"
```

Muốn gõ lệnh Terraform tùy ý, chạy container giống script:

```bash
docker run --rm --network <mạng của LocalStack> -v "$PWD/infra/aws-learn:/work" -w /work/terraform \
  -e TF_VAR_localstack_url=http://localstack:4566 hashicorp/terraform:1.12.2 <lệnh>
```

---

## 1. Vòng đời: init → plan → apply → destroy

| Lệnh | Làm gì | Có đổi hạ tầng? |
|---|---|---|
| `terraform init` | Tải provider (plugin nói chuyện với AWS, DigitalOcean…), chuẩn bị nơi lưu state | Không |
| `terraform fmt` | Định dạng code chuẩn (căn lề `=`) | Không |
| `terraform validate` | Kiểm tra cú pháp và tham chiếu | Không |
| `terraform plan` | **So** code với thực tế, in ra sẽ thêm / sửa / xóa gì | Không |
| `terraform apply` | Thực hiện plan (hỏi `yes` trước khi làm) | **Có** |
| `terraform destroy` | Xóa mọi thứ code đã tạo | **Có** |

**Quy tắc vàng:** luôn đọc `plan` trước khi `apply`. Dòng cuối cho biết bao nhiêu tài nguyên bị **xóa** (`to destroy`); thấy số khác 0 mà không chủ đích thì dừng lại.

Thử ngay:

```bash
bash infra/aws-learn/run.sh plan
# No changes. Your infrastructure matches the configuration.
```

---

## 2. Các khối cơ bản

Đọc [main.tf](../infra/aws-learn/terraform/main.tf) và [variables.tf](../infra/aws-learn/terraform/variables.tf):

| Khối | Ví dụ trong repo | Ý nghĩa |
|---|---|---|
| `terraform { required_providers }` | `hashicorp/aws ~> 5.90` | Provider nào, phiên bản nào. `~> 5.90` = từ 5.90 tới dưới 6.0 |
| `provider` | `provider "aws"` | Cấu hình kết nối: vùng, khóa, endpoint |
| `resource` | `resource "aws_s3_bucket" "uploads"` | Thứ Terraform **tạo và quản lý** |
| `data` | `data "aws_caller_identity" "current"` | Thứ Terraform chỉ **đọc**, không quản lý |
| `variable` | `variable "log_retention_days"` | Tham số đầu vào, có `default`, `type`, `validation` |
| `locals` | `local.bucket_name` | Giá trị tính sẵn, dùng lại nhiều chỗ |
| `output` | `output "bucket"` | Giá trị in ra sau `apply`, script khác đọc được (`terraform output -raw bucket`) |

**Tham chiếu:** `aws_s3_bucket.uploads.arn` = thuộc tính `arn` của resource kiểu `aws_s3_bucket` tên `uploads`.

---

## 3. Phụ thuộc: Terraform tự biết làm gì trước

Bạn không viết thứ tự. Terraform đọc các **tham chiếu** để dựng đồ thị phụ thuộc:

```text
aws_iam_role.lambda ─────────────┐
aws_cloudwatch_log_group.lambda ─┤
                                 ├─▶ aws_lambda_function.thumbnail ─▶ aws_lambda_permission.s3
aws_s3_bucket.uploads ───────────┘                                         │
        └───────────────────────────────────────────────────────────────▶ aws_s3_bucket_notification.uploads
```

Đúng thứ tự trong log `apply` thật: role, log group, bucket được tạo song song trước; Lambda sau; permission và notification cuối cùng.

- **Phụ thuộc ngầm:** `role = aws_iam_role.lambda.arn` → Lambda chờ role.
- **Phụ thuộc tường minh** (`depends_on`): dùng khi không có tham chiếu nhưng vẫn phải chờ. Trong repo: notification phải chờ `aws_lambda_permission`, nếu không S3 từ chối gắn trigger vì chưa được phép gọi Lambda.

Xem đồ thị: `terraform graph | dot -Tpng > graph.png` (cần Graphviz).

---

## 4. State: Terraform nhớ những gì đã tạo

Sau `apply`, Terraform ghi **state**: danh sách tài nguyên đã tạo kèm id thật. Lần `plan` sau, nó so code ↔ state ↔ thực tế.

- File mặc định: `terraform.tfstate`. Repo dùng **workspace** nên state nằm ở `terraform.tfstate.d/localstack/` và `terraform.tfstate.d/aws/`, tách riêng từng đích.
- State **có thể chứa bí mật** (mật khẩu DB, khóa). Không bao giờ commit: [.gitignore](../infra/aws-learn/.gitignore) đã chặn `*.tfstate`.
- Mất state = Terraform quên mình đã tạo gì → lần `apply` sau tạo trùng, hoặc không xóa được.

**Làm việc nhóm** thì không để state trên máy: dùng **remote backend** có khóa để hai người không `apply` cùng lúc.

```hcl
terraform {
  backend "s3" {
    bucket       = "edu-app-tfstate"
    key          = "aws-learn/terraform.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true   # khóa bằng file trên S3 (Terraform 1.10+); bản cũ dùng bảng DynamoDB
  }
}
```

Repo chưa dùng backend từ xa vì đây là bài học một người.

### Lệnh với state

```bash
terraform state list                        # 12 dòng: 8 resource + 4 data source
terraform state show aws_lambda_function.thumbnail
terraform workspace list                    # localstack, aws
```

---

## 5. Đọc plan cho đúng

Thử đổi một biến **mà không apply**:

```bash
bash infra/aws-learn/run.sh plan -var log_retention_days=14
```

Kết quả thật:

```text
  ~ resource "aws_cloudwatch_log_group" "lambda" {
      ~ retention_in_days = 7 -> 14
  ~ resource "aws_iam_role_policy" "lambda" {
Plan: 0 to add, 2 to change, 0 to destroy.
```

| Ký hiệu | Nghĩa |
|---|---|
| `+` | Tạo mới |
| `~` | Sửa tại chỗ (giữ nguyên tài nguyên) |
| `-/+` | **Xóa rồi tạo lại**: nguy hiểm với DB, bucket có dữ liệu |
| `-` | Xóa |
| `(known after apply)` | Giá trị chỉ biết sau khi tạo/sửa xong |

**Vì sao đổi thời hạn log mà IAM policy cũng "đổi"?** Policy tham chiếu ARN của log group. Khi log group đang được sửa, Terraform coi ARN là `(known after apply)` nên tính lại cả policy. Nội dung thật sau `apply` vẫn y nguyên. Đây là chỗ người mới hay hoảng: thấy policy bảo mật "thay đổi" thì hãy đọc kỹ, đừng `apply` mù cũng đừng sợ mù.

**Thuộc tính buộc tạo lại:** đổi `bucket` (tên bucket) hay `function_name` sẽ ra `-/+`. Với bucket có dữ liệu thật, đó là mất dữ liệu. Muốn đổi tên an toàn thì dùng khối `moved` hoặc `terraform state mv`.

---

## 6. Một code, nhiều môi trường

[providers.tf](../infra/aws-learn/terraform/providers.tf) chạy được cả LocalStack lẫn AWS thật nhờ biến `target`:

```hcl
locals {
  localstack = var.target == "localstack"
}

provider "aws" {
  profile    = local.localstack ? null : var.aws_profile
  access_key = local.localstack ? "test" : null   # khóa giả cho LocalStack

  dynamic "endpoints" {                            # chỉ có khối endpoints khi chạy LocalStack
    for_each = local.localstack ? [var.localstack_url] : []
    content {
      s3     = endpoints.value
      lambda = endpoints.value
    }
  }
}
```

- **Biểu thức điều kiện** `a ? b : c`: `null` nghĩa là "không đặt thuộc tính này".
- **`dynamic`**: sinh khối lặp lại theo danh sách; danh sách rỗng thì không sinh khối nào.
- **Workspace** `localstack` / `aws`: cùng code, state riêng.

Truyền biến theo thứ tự ưu tiên tăng dần: `default` → file `*.tfvars` → biến môi trường `TF_VAR_tên` → `-var tên=giá_trị`. Script dùng `TF_VAR_target` và `TF_VAR_localstack_url`.

---

## 7. Đóng gói code: `archive_file` và `source_code_hash`

```hcl
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/thumbnail"
  output_path = "${path.module}/.build/thumbnail.zip"
}

resource "aws_lambda_function" "thumbnail" {
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
}
```

Sửa code Lambda → file zip đổi → hash đổi → `plan` báo `~ source_code_hash` và cập nhật Lambda. Không có `source_code_hash`, Terraform không biết code đã đổi và **không deploy code mới**.

---

## 8. Đọc bộ DigitalOcean của project

[infra/terraform/main.tf](../infra/terraform/main.tf) dựng môi trường production cũ: một droplet (máy ảo), cụm Postgres, cụm Redis, database, user, firewall.

Bài tập đọc:

1. Tài nguyên nào phụ thuộc tài nguyên nào? Vẽ đồ thị như mục 3.
2. Biến nào là bí mật (`do_token`)? Nó được đánh dấu `sensitive = true` chưa? Nó có lọt vào state không?
3. Đổi `droplet_size` thì plan ra `~` hay `-/+`? (Đọc tài liệu resource `digitalocean_droplet`.)
4. Bộ này chưa có backend từ xa: nếu hai người cùng `apply` thì chuyện gì xảy ra?

---

## 9. Hay nhầm

| Nhầm | Thực tế |
|---|---|
| Sửa tay trên Console rồi quên | Lần `plan` sau Terraform đòi đổi lại theo code (**drift**). Mọi thay đổi phải qua code |
| Commit `terraform.tfstate` | State có thể chứa mật khẩu; và hai người sửa cùng file state sẽ hỏng |
| `apply` không đọc plan | Một dòng `-/+` trên DB là mất dữ liệu |
| Ghim provider lỏng (`>= 5.0`) | Lên bản lớn mới có thể đổi hành vi. Dùng `~>` và commit `.terraform.lock.hcl` |
| Nhét khóa AWS vào file `.tf` | Dùng profile, biến môi trường hoặc IAM role. Code Terraform được commit |
| Tài nguyên tạo ngoài Terraform | Dùng `terraform import` (hoặc khối `import`) để đưa vào quản lý, đừng tạo trùng |
| Quên `destroy` khi học | Tài nguyên thật vẫn tính tiền. LocalStack thì restart là mất |

---

## 10. Bài tập (làm trên LocalStack, miễn phí)

1. **Plan không đổi:** `bash infra/aws-learn/run.sh plan` phải ra `No changes`. Nếu không, tìm xem cái gì lệch.
2. **Sửa tại chỗ:** đổi `memory_size` của Lambda 512 → 256 trong `main.tf`, chạy `plan`, rồi `apply`. Ký hiệu là `~` hay `-/+`?
3. **Buộc tạo lại:** đổi `local.name` thành `edu-thumbnail-v2`, chạy `plan`. Đếm bao nhiêu tài nguyên `-/+`, vì sao. Trả lại tên cũ.
4. **Drift:** xóa trigger bằng AWS CLI (`aws --endpoint-url http://localhost:4566 s3api put-bucket-notification-configuration --bucket <bucket> --notification-configuration '{}'`), rồi `plan`. Kết quả thật: `aws_s3_bucket_notification.uploads will be updated in-place`, `+ lambda_function {`, `Plan: 0 to add, 1 to change`. Chạy `apply` để gắn lại, rồi `plan` lần nữa phải về `No changes`.
5. **Biến có kiểm tra:** chạy `plan -var target=gcp`. Đọc thông báo lỗi của khối `validation`.
6. **Thêm tài nguyên:** thêm một hàng đợi `aws_sqs_queue` làm nơi chứa lỗi (DLQ) cho Lambda, nối bằng `aws_lambda_function_event_invoke_config`. Chạy `plan`, `apply`, rồi `state list` để thấy tài nguyên mới.
7. **Dọn:** `bash infra/aws-learn/run.sh destroy`. Dòng cuối phải là `Destroy complete! Resources: 8 destroyed.` (hoặc 9 nếu đã làm bài 6).

---

## 11. Cheat sheet

```bash
terraform init                 # tải provider
terraform fmt -recursive       # định dạng
terraform validate             # kiểm tra cú pháp
terraform plan                 # xem sẽ đổi gì
terraform apply                # làm (hỏi yes)
terraform destroy              # xóa hết
terraform output -raw bucket   # đọc output
terraform state list           # tài nguyên đang quản lý
terraform workspace select -or-create localstack
```

```text
+ tạo   ~ sửa tại chỗ   -/+ xóa rồi tạo lại (cẩn thận)   - xóa
(known after apply) = giá trị chỉ biết sau khi apply
```

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **7. Cloud** — bài 3/5.

- Bài trước: [learn-aws.md](./learn-aws.md) — AWS: S3 (đang dùng), ECS Fargate, RDS, SQS/SNS, IAM
- **Bài tiếp: [learn-aws-serverless.md](./learn-aws-serverless.md)** — Thực hành serverless: S3 + Lambda + IAM bằng Terraform, chạy trên LocalStack hoặc AWS

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
