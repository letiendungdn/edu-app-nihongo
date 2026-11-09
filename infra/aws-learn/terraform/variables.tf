variable "target" {
  description = "localstack (miễn phí, trên máy) hoặc aws (tài nguyên thật)"
  type        = string
  default     = "localstack"

  validation {
    condition     = contains(["localstack", "aws"], var.target)
    error_message = "target phải là localstack hoặc aws."
  }
}

variable "region" {
  type    = string
  default = "ap-southeast-1"
}

variable "aws_profile" {
  description = "Profile trong ~/.aws khi target = aws"
  type        = string
  default     = "edu-app"
}

variable "localstack_url" {
  description = "Địa chỉ LocalStack nhìn từ container Terraform (cùng mạng Docker edu-app_default)"
  type        = string
  default     = "http://localstack:4566"
}

variable "log_retention_days" {
  description = "Giữ log Lambda bao nhiêu ngày. Không đặt thì log giữ mãi mãi và tính tiền mãi mãi."
  type        = number
  default     = 7
}
