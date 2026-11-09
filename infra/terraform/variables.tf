variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "sgp1"
}

variable "droplet_name" {
  description = "Name of the application droplet"
  type        = string
  default     = "edu-app-prod"
}

variable "droplet_size" {
  description = "Droplet size slug"
  type        = string
  default     = "s-2vcpu-4gb"
}

variable "droplet_image" {
  description = "Droplet OS image slug"
  type        = string
  default     = "ubuntu-22-04-x64"
}

variable "tags" {
  description = "Tags applied to droplet"
  type        = list(string)
  default     = ["edu-app", "production"]
}

variable "postgres_cluster_name" {
  description = "Managed PostgreSQL cluster name"
  type        = string
  default     = "edu-app-db"
}

variable "postgres_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16"
}

variable "postgres_size" {
  description = "Managed PostgreSQL cluster size"
  type        = string
  default     = "db-s-1vcpu-1gb"
}

variable "postgres_node_count" {
  description = "Number of PostgreSQL nodes"
  type        = number
  default     = 1
}

variable "postgres_app_user" {
  description = "Application database user"
  type        = string
  default     = "nihongo"
}

variable "redis_cluster_name" {
  description = "Managed Redis cluster name"
  type        = string
  default     = "edu-app-redis"
}

variable "redis_version" {
  description = "Redis engine version"
  type        = string
  default     = "7"
}

variable "redis_size" {
  description = "Managed Redis cluster size"
  type        = string
  default     = "db-s-1vcpu-1gb"
}

variable "redis_node_count" {
  description = "Number of Redis nodes"
  type        = number
  default     = 1
}

# Bảo mật: KHÔNG có giá trị mặc định. Bản cũ mặc định 0.0.0.0/0 (cả Internet SSH được vào máy chủ,
# Trivy DIG-0001). Nhập IP của bạn, ví dụ ["203.0.113.7/32"].
variable "ssh_allowed_cidrs" {
  description = "Dải IP được phép SSH vào droplet (ví dụ IP nhà / VPN của bạn, dạng /32)"
  type        = list(string)

  validation {
    condition     = length(var.ssh_allowed_cidrs) > 0 && !contains(var.ssh_allowed_cidrs, "0.0.0.0/0") && !contains(var.ssh_allowed_cidrs, "::/0")
    error_message = "ssh_allowed_cidrs phải liệt kê IP cụ thể; không được mở SSH cho mọi địa chỉ (0.0.0.0/0, ::/0)."
  }
}

# Bảo mật: đăng nhập droplet bằng SSH key, không bằng mật khẩu (Trivy DIG-0004).
# Lấy id/fingerprint: doctl compute ssh-key list
variable "ssh_key_ids" {
  description = "Id hoặc fingerprint SSH key đã thêm vào tài khoản DigitalOcean"
  type        = list(string)

  validation {
    condition     = length(var.ssh_key_ids) > 0
    error_message = "Cần ít nhất một SSH key để đăng nhập droplet."
  }
}
