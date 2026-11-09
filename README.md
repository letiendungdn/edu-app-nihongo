# EDU APP Nihongo

Nền tảng học tiếng Nhật (nihongo-web) kết hợp coaching marketplace: learner mua subscription, đặt lịch học 1-on-1 với coach, chat real-time và thanh toán qua Stripe. App tiếng Anh nằm ở repo `edu-app-english`.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, React 19, TailwindCSS |
| Backend | NestJS 11, Node.js 22 |
| Inter-service | gRPC (Protocol Buffers) + in-process modules |
| Databases | PostgreSQL 16 (Prisma 6), MongoDB 7 (Mongoose) |
| Cache / Session | Redis 7 (ioredis + cache-manager) |
| Real-time | Socket.io (notifications, chat, presence, live scoring) |
| Payments | Stripe (Subscriptions + Connect payout) |
| Events | Kafka (confluent-cp 7.6) |
| File Storage | AWS S3 (pre-signed URL upload) |
| Auth | JWT Bearer + Keycloak OIDC + Google OAuth |
| Container | Docker Compose, Kubernetes (Helm) |
| CI/CD | GitHub Actions |

## Kiến trúc tổng quan

```
                              Internet
                                  │
                    ┌─────────────▼─────────────┐
                    │          Nginx             │
                    │    (reverse proxy / SSL)   │
                    └─────────────┬─────────────┘
                                  │
                         ┌────────▼───────┐
                         │  nihongo-web   │
                         │  Next.js :5173 │
                         └────────┬───────┘
                                  │ rewrite /api/*
                                  ▼
                    ┌────────────────────────────┐
                    │        api-gateway          │
                    │        NestJS :3000         │
                    │  REST + Socket.io /realtime │
                    │  Swagger: /api/docs         │
                    └──┬─────────────┬───────────┘
                       │ gRPC        │ in-process modules
           ┌───────────▼──┐    ┌─────▼──────────────────────────────┐
           │ content-svc  │    │ payment-service  (Stripe/marketplace)│
           │   :50051     │    │                                     │
           │ exam-svc     │    │ realtime-module  (Socket.io gateway) │
           │   :50052     │    └─────────────────────────────────────┘
           └──────────────┘

    ┌──────────────────────────────────────────────────────────┐
    │                      Data Layer                          │
    │  PostgreSQL :5433   │  MongoDB :27017   │  Redis :6379   │
    │  nihongo            │  nihongo_audit    │  cache         │
    │                     │  (TTL 90 ngày)    │  rate-limit    │
    │                     │                   │  presence      │
    └──────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────┐
    │               Async Layer (Kafka :9092)                  │
    │  edu.exam.submitted   │  edu.payment.succeeded           │
    │  edu.session.completed│  edu.vocab.reviewed              │
    └──────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────┐
    │              Real-time Layer (Socket.io /realtime)       │
    │  notification        │  chat:message    │  heartbeat     │
    │  coaches:online-list │  exam:scored     │  coach:busy    │
    └──────────────────────────────────────────────────────────┘
```

## Cấu trúc thư mục

```
edu-app-nihongo/
├── apps/
│   └── nihongo-web/           # Next.js — học tiếng Nhật (:5173)
├── services/
│   ├── api-gateway/           # HTTP :3000 + Socket.io /realtime
│   │   └── src/realtime/      # RealtimeGateway, NotificationService, ChatService
│   ├── content-service/       # gRPC :50051 (vocab, grammar, lesson)
│   ├── exam-service/          # gRPC :50052 (mock exam, SRS, progress)
│   └── payment-service/       # Stripe subscription + booking + payout
├── packages/
│   ├── nest-common/           # Guards, interceptors, audit, rate-limit
│   ├── nest-contracts/        # gRPC DTOs, Kafka topic constants
│   ├── nest-prisma/           # PrismaModule (nihongo)
│   └── prisma-nihongo/        # Schema + migrations (DB nihongo)
├── infra/                     # K8s, Helm, Nginx, k6, backups
│   └── backups/               # backup.ps1 + SQL dumps (restore DB)
├── docs/                      # Mục lục: docs/README.md
│   ├── system-design.md       # Kiến trúc chi tiết, request flows
│   ├── db-design.md           # Thiết kế DB, schema reference, backup
│   ├── db-erd.md              # Sơ đồ ER Mermaid DB nihongo (tự sinh)
│   ├── run-local.md           # Hướng dẫn chạy local
│   ├── google-oauth-setup.md  # Cấu hình Google Sign-In
│   ├── sql/chat-schema.sql    # DDL chat (gộp migrations)
│   └── senior-roadmap.md      # Lộ trình lên Senior + Q&A
├── docker-compose.yml
└── package.json
```

## Chạy development

Hướng dẫn đầy đủ: **[docs/run-local.md](docs/run-local.md)**

### Lần đầu

```powershell
npm install
copy services\.env.example services\.env
copy apps\nihongo-web\.env.example apps\nihongo-web\.env
docker compose up -d postgres redis mongodb kafka zookeeper
npm run prisma:generate

# DB trống: migrate + seed nội dung (khuyên dùng) — xem docs/run-local.md
# Có file backup đầy đủ trên máy (không nằm trong git, ADR-0009) thì restore:
docker cp infra\backups\nihongo_<ngày_giờ>.sql edu-postgres-nihongo:/tmp/restore.sql
docker exec edu-postgres-nihongo psql -U nihongo -d nihongo -f /tmp/restore.sql

```

### Mỗi lần dev (5 terminal)

```powershell
docker compose up -d postgres redis mongodb kafka zookeeper

npm run dev:gateway      # http://localhost:3000  — Swagger /api/docs
npm run dev:content      # gRPC :50051
npm run dev:exam         # gRPC :50052
npm run dev:nihongo-web  # http://localhost:5173
```

Stripe webhook (khi test thanh toán): `npm run stripe:listen`

## Tính năng chính

### Nihongo (tiếng Nhật)
- Từ vựng, ngữ pháp, kanji theo bài Minna no Nihongo
- SRS flashcard (SM-2 algorithm)
- Thi thử JLPT N5–N1, quiz, đọc hiểu, nghe chép
- Streak học tập, analytics

### Subscription & Marketplace
| Plan | Giá | Nội dung |
|------|-----|----------|
| Free | $0 | Bài 1–10, Kana, Quiz |
| Basic | $9.99/tháng | Bài 1–25, Kanji N5–N4, SRS, thi thử N5–N4 |
| Pro | $19.99/tháng | Toàn bộ + coach 1-on-1 |
| Pro Annual | $99/năm | Pro + ưu tiên booking |

Thanh toán qua Stripe Elements (card). Coach nhận payout qua Stripe Connect.

### Chat & Notification (REST)
- **Support**: user ↔ admin tại `/support`, `/admin/messages`
- **Community**: nhóm & chat 1:1 học viên tại `/community`
- **Notification**: lưu DB, client poll `GET /api/notifications`

## API Docs

Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

## Database

**Restore từ backup** (file `npm run db:backup` tạo trên máy bạn, **không có trong git** — [ADR-0009](docs/adr/0009-db-backups-out-of-git.md)):

```powershell
docker cp infra\backups\nihongo_<ngày_giờ>.sql edu-postgres-nihongo:/tmp/restore.sql
docker exec edu-postgres-nihongo psql -U nihongo -d nihongo -f /tmp/restore.sql
```

**Hoặc DB trống** — migrate + seed:

```powershell
docker compose up -d postgres
npm run prisma:generate
npm run migrate:deploy -w @edu/prisma-nihongo
npm run seed -w @edu/prisma-nihongo
```

Nội dung học (vocab, kanji, grammar): `infra/postgres/nihongo-content-seed.sql` — xem [infra/postgres/README.md](infra/postgres/README.md).

### Backup

```powershell
npm run db:backup
# hoặc: bash infra/backups/backup.sh
```

Dump vào `infra/backups/` — xem [infra/backups/README.md](infra/backups/README.md).

### Sơ đồ DB (ERD)

```powershell
npm run db:erd
```

Đọc schema Prisma của DB nihongo → ghi lại [docs/db-erd.md](docs/db-erd.md), Mermaid chia theo phân hệ. Mô hình khái niệm cho báo cáo: mục B.3 trong
[docs/bao-cao-phan-tich-thiet-ke.md](docs/bao-cao-phan-tich-thiet-ke.md).
**Chạy lại mỗi khi đổi schema** (sau khi thêm migration). Bảng mới chưa xếp phân hệ sẽ bị cảnh báo và vào mục "Khác" —
thêm tên bảng vào `NIHONGO_DOMAINS` trong `packages/prisma-nihongo/scripts/gen-erd.ts`.

## Environment Variables

**`services/.env`**:
```env
DATABASE_URL=postgresql://nihongo:nihongo@localhost:5433/nihongo
MONGODB_URL=mongodb://localhost:27017/nihongo_audit
KAFKA_BROKERS=localhost:9092
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=edu-app-dev
```

**`apps/nihongo-web/.env`**:
```env
API_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Tests

```bash
npm test -w @edu/nihongo-services
npm test -- --coverage -w @edu/nihongo-services
```

## Tài liệu

Toàn bộ tài liệu đã chia nhóm theo lộ trình học trong **[docs/README.md](docs/README.md)**: bắt đầu → kiến trúc → backend → cơ sở dữ liệu → kiểm thử → DevOps → cloud → frontend → mobile → tích hợp, cùng các nhóm tham khảo (phỏng vấn, báo cáo phân tích thiết kế, định hướng Senior).

Cuối mỗi tài liệu có mục **Đi tiếp** dẫn sang bài kế tiếp. Mới bắt đầu: mở [docs/run-local.md](docs/run-local.md).
