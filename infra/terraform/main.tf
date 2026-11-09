terraform {
  required_version = ">= 1.5.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "app" {
  name   = var.droplet_name
  region = var.region
  size   = var.droplet_size
  image  = var.droplet_image

  # Đăng nhập bằng SSH key; DigitalOcean tắt đăng nhập root bằng mật khẩu khi có key.
  ssh_keys = var.ssh_key_ids

  tags = var.tags
}

resource "digitalocean_database_cluster" "postgres" {
  name       = var.postgres_cluster_name
  engine     = "pg"
  version    = var.postgres_version
  size       = var.postgres_size
  region     = var.region
  node_count = var.postgres_node_count
}

resource "digitalocean_database_cluster" "redis" {
  name       = var.redis_cluster_name
  engine     = "redis"
  version    = var.redis_version
  size       = var.redis_size
  region     = var.region
  node_count = var.redis_node_count
}

resource "digitalocean_database_db" "nihongo" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "nihongo"
}

resource "digitalocean_database_db" "english_learning" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "english_learning"
}

resource "digitalocean_database_user" "app" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = var.postgres_app_user
}

resource "digitalocean_firewall" "app" {
  name = "${var.droplet_name}-fw"

  droplet_ids = [digitalocean_droplet.app.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.ssh_allowed_cidrs
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
