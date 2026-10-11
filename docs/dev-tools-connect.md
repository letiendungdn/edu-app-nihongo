# Kết nối DB / Redis / Mongo / Kafka từ máy host

Hướng dẫn cấu hình **pgAdmin**, **Redis Insight**, **MongoDB Compass**, v.v. để xem data của stack EDU APP đang chạy trong Docker.

> Mọi kết nối từ máy bạn dùng **`localhost` + port đã map**.  
> Không dùng hostname Docker (`postgres-nihongo`, `redis`, …) — những tên đó chỉ resolve **giữa các container**.

## 1. Bật infra

```powershell
# Tối thiểu (DB + cache + queue)
npm run docker:up:infra

# Full nihongo (có thêm API + web)
npm run docker:up:nihongo
```

Kiểm tra port đang mở:

```powershell
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

---

## 2. Bảng port (máy host)

### Database & cache

| Dịch vụ | Container | Host | User / Password | Database / ghi chú |
|---------|-----------|------|-----------------|--------------------|
| PostgreSQL **Nihongo** | `edu-postgres-nihongo` | `localhost:5433` | `nihongo` / `nihongo` | `nihongo` — app chính |
| PostgreSQL **Keycloak** | `edu-postgres-keycloak` | `localhost:5435` | `keycloak` / `keycloak` | `keycloak` |
| Redis | `edu-redis` | `localhost:6379` | *(không auth)* | cache, session, rate-limit |
| MongoDB | `edu-mongodb` | `localhost:27017` | *(không auth)* | `nihongo_audit` |
| Kafka | `edu-kafka` | `localhost:9092` | — | bootstrap brokers |
| Zookeeper | `edu-zookeeper` | `localhost:2181` | — | Kafka ZK |

Password Postgres đọc từ `.env` (`POSTGRES_PASSWORD`, `KEYCLOAK_DB_PASSWORD`). Mặc định như bảng trên nếu không đổi.

### App & tooling

| Dịch vụ | Host | Ghi chú |
|---------|------|---------|
| Nginx (entry) | `http://localhost:8080` | App qua reverse proxy |
| API Gateway | `http://localhost:3000` | Swagger: `/api/docs` |
| nihongo-web (trực tiếp) | `http://localhost:5173` | Bỏ qua nginx |
| Signaling (WebRTC) | `http://localhost:3002` | |
| Keycloak (trực tiếp) | `http://localhost:8081` | Admin: `admin` / `admin`. Production-like: `http://auth.localhost:8080` qua nginx |
| LiveKit | `ws://localhost:7880` | |
| content-service gRPC | `localhost:50051` | |
| exam-service gRPC | `localhost:50052` | |
| Jaeger UI | `http://localhost:16686` | Traces |
| Prometheus | `http://localhost:9090` | Metrics |
| Grafana | `http://localhost:4000` | `admin` / `admin` |

Tài khoản app: [accounts.md](./accounts.md).

---

## 3. pgAdmin — PostgreSQL

Học từng thao tác trên DB `nihongo`: [learn-pgadmin.md](./learn-pgadmin.md).

1. Cài [pgAdmin 4](https://www.pgadmin.org/download/).
2. **Object → Register → Server…**

### Server Nihongo (chính)

| Tab | Field | Giá trị |
|-----|-------|---------|
| General | Name | `edu-app nihongo` |
| Connection | Host name/address | `localhost` |
| Connection | Port | `5433` |
| Connection | Maintenance database | `nihongo` |
| Connection | Username | `nihongo` |
| Connection | Password | `nihongo` |

Bật **Save password**.

### Server Keycloak

| Field | Giá trị |
|-------|---------|
| Host | `localhost` |
| Port | `5435` |
| Maintenance database | `keycloak` |
| Username / Password | `keycloak` / `keycloak` |

### Xem bảng

`Servers → edu-app nihongo → Databases → nihongo → Schemas → public → Tables`

Ví dụ: `Vocabulary`, `Lesson`, `User`, `MockExamTemplate`, …

**Query Tool:** chuột phải database → Query Tool:

```sql
SELECT COUNT(*) FROM "Vocabulary";
SELECT id, email, role FROM "User" LIMIT 20;
```

---

## 4. Redis Insight — Redis

1. Cài [Redis Insight](https://redis.io/insight/).
2. **Add Redis Database**:

| Field | Giá trị |
|-------|---------|
| Host | `localhost` |
| Port | `6379` |
| Database Alias | `edu-app redis` |

Không password.

CLI nhanh:

```powershell
docker exec -it edu-redis redis-cli
PING
KEYS *
```

---

## 5. MongoDB Compass — Mongo

1. Cài [MongoDB Compass](https://www.mongodb.com/products/compass).
2. URI:

```
mongodb://localhost:27017/nihongo_audit
```

Không user/password (dev).

CLI:

```powershell
docker exec -it edu-mongodb mongosh nihongo_audit
show collections
```

---

## 6. Kafka (tuỳ chọn)

Từ máy host bootstrap: `localhost:9092`.

Liệt kê topic qua container:

```powershell
docker exec edu-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

UI gợi ý (không có sẵn trong compose): [Redpanda Console](https://github.com/redpanda-data/console) / AKHQ — trỏ broker `host.docker.internal:9092` nếu chạy tool trong Docker.

---

## 7. Connection string copy-paste

```text
# Postgres Nihongo
postgresql://nihongo:nihongo@localhost:5433/nihongo

# Postgres Keycloak
postgresql://keycloak:keycloak@localhost:5435/keycloak

# Redis
redis://localhost:6379

# Mongo
mongodb://localhost:27017/nihongo_audit

# Kafka
localhost:9092
```

---

## 8. Lỗi thường gặp

| Triệu chứng | Cách xử lý |
|-------------|------------|
| pgAdmin `connection refused` | `docker ps` xem `edu-postgres-nihongo` Up; port **5433** không bị app khác chiếm |
| Sai port 5432 | Host map là **5433** (Nihongo), không phải 5432 |
| Redis Insight timeout | Container `edu-redis` chưa chạy → `docker compose up -d redis` |
| Đổi password trong `.env` nhưng tool cũ | Dùng password mới; hoặc restart container sau khi sửa `.env` |

---

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [accounts.md](./accounts.md) | User/password app + Keycloak |
| [run-local.md](./run-local.md) | Chạy stack local |
| [docker.md](./docker.md) | Compose chi tiết |
| [db-design.md](./db-design.md) | Schema / ER |
