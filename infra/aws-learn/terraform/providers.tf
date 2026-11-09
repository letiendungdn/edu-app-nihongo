terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.90"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }
}

locals {
  localstack = var.target == "localstack"
}

# Cùng một cấu hình cho hai đích:
# - localstack: khóa giả "test", mọi dịch vụ trỏ về LocalStack, không gọi AWS thật, không tốn tiền.
# - aws: dùng profile trong ~/.aws (mặc định edu-app), tạo tài nguyên thật.
provider "aws" {
  region  = var.region
  profile = local.localstack ? null : var.aws_profile

  access_key                  = local.localstack ? "test" : null
  secret_key                  = local.localstack ? "test" : null
  skip_credentials_validation = local.localstack
  skip_requesting_account_id  = local.localstack
  skip_metadata_api_check     = local.localstack
  s3_use_path_style           = local.localstack

  dynamic "endpoints" {
    for_each = local.localstack ? [var.localstack_url] : []
    content {
      s3         = endpoints.value
      lambda     = endpoints.value
      iam        = endpoints.value
      sts        = endpoints.value
      cloudwatch = endpoints.value
      logs       = endpoints.value
    }
  }

  default_tags {
    tags = {
      project = "edu-app"
      purpose = "learn-serverless"
    }
  }
}
