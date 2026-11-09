# Serverless theo sự kiện: ảnh được tải vào s3://<bucket>/uploads/ → S3 gọi Lambda → Lambda ghi ảnh thu nhỏ
# vào s3://<bucket>/thumbnails/. Xem docs/learn-aws-serverless.md.

data "aws_caller_identity" "current" {}

locals {
  name = "edu-thumbnail"
  # Tên bucket là duy nhất trên TOÀN AWS: gắn số tài khoản và vùng để không đụng tên người khác.
  bucket_name = "edu-app-uploads-${data.aws_caller_identity.current.account_id}-${var.region}"
}

# ── S3 ──────────────────────────────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "uploads" {
  bucket = local.bucket_name
  # Chỉ để học: cho phép `terraform destroy` xóa bucket dù còn file. Dữ liệu thật thì bỏ dòng này.
  force_destroy = true
}

# Chặn mọi đường công khai: file chỉ đọc được qua quyền IAM hoặc URL ký sẵn (presigned).
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── IAM: quyền tối thiểu cho Lambda ─────────────────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "assume_lambda" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${local.name}-role"
  assume_role_policy = data.aws_iam_policy_document.assume_lambda.json
}

# Chỉ ĐỌC uploads/ và chỉ GHI thumbnails/: Lambda có lỗi cũng không xóa hay ghi đè được ảnh gốc.
data "aws_iam_policy_document" "lambda" {
  statement {
    sid       = "ReadOriginals"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.uploads.arn}/uploads/*"]
  }
  statement {
    sid       = "WriteThumbnails"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.uploads.arn}/thumbnails/*"]
  }
  statement {
    sid       = "Logs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }
}

resource "aws_iam_role_policy" "lambda" {
  name   = "${local.name}-policy"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda.json
}

# ── Lambda ──────────────────────────────────────────────────────────────────────────────────────────────────

# Log bài học vẫn được CloudWatch mã hóa mặc định; khóa KMS riêng tốn phí (giống AWS-0132 trong .trivyignore.yaml)
# nosemgrep: aws-cloudwatch-log-group-unencrypted
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = var.log_retention_days
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/thumbnail"
  output_path = "${path.module}/.build/thumbnail.zip"
  excludes    = ["core.test.mjs", "package-lock.json"]
}

resource "aws_lambda_function" "thumbnail" {
  function_name    = local.name
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  memory_size      = 512
  timeout          = 30
  architectures    = ["arm64"]

  depends_on = [aws_cloudwatch_log_group.lambda, aws_iam_role_policy.lambda]
}

# ── S3 gọi Lambda khi có ảnh mới ────────────────────────────────────────────────────────────────────────────

resource "aws_lambda_permission" "s3" {
  statement_id   = "AllowS3Invoke"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.thumbnail.function_name
  principal      = "s3.amazonaws.com"
  source_arn     = aws_s3_bucket.uploads.arn
  source_account = data.aws_caller_identity.current.account_id
}

resource "aws_s3_bucket_notification" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.thumbnail.arn
    events              = ["s3:ObjectCreated:*"]
    # Chỉ uploads/: ảnh thu nhỏ ghi vào thumbnails/ không kích hoạt lại Lambda (tránh vòng lặp vô hạn).
    filter_prefix = "uploads/"
  }

  depends_on = [aws_lambda_permission.s3]
}
