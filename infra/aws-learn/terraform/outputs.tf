output "bucket" {
  value = aws_s3_bucket.uploads.bucket
}

output "lambda_function" {
  value = aws_lambda_function.thumbnail.function_name
}

output "log_group" {
  value = aws_cloudwatch_log_group.lambda.name
}

output "target" {
  value = var.target
}
