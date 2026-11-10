# Microservices

Backend gRPC microservices.

| Service | Folder | Port | Mô tả |
|---------|--------|------|--------|
| **api-gateway** | `api-gateway/` | 3000 | HTTP entry, JWT auth |
| **content-service** | `content-service/` | 50051 | Lessons, vocab, grammar, kanji… |
| **exam-service** | `exam-service/` | 50052 | Mock exam, progress, SRS |
| **signaling-service** | `signaling-service/` | 3002 | WebSocket cho gọi video 1-1, presence (Redis, không dùng Postgres) |
| payment-service | `payment-service/` | — | **Không chạy riêng**: gateway import thẳng code (Stripe, gói học, coach, payout) |

Vì sao tách như vậy, và kiến trúc còn thiếu gì: [docs/learn-microservices.md](../docs/learn-microservices.md).

Shared libs nằm trong `packages/` — xem `packages/README.md`.

## Chạy local

```bash
npm run dev:gateway
npm run dev:content
npm run dev:exam
```

## gRPC

Proto: `packages/nest-contracts/proto/`
