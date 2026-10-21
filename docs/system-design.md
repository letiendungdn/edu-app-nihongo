# System Design — EDU APP Nihongo

## 1. Kiến trúc tổng thể

Frontend là **thin client** (Next.js, mobile). Không Route Handler gọi DB trực tiếp — mọi API đi qua `api-gateway`. Edge Docker: **nginx :8080** (web + Keycloak + `/api`).

```
                              Internet / Emulator (10.0.2.2)
                                  │
                    ┌─────────────▼──────────────┐
                    │     Nginx :8080 (Docker)    │
                    │  host/path → web|auth|api   │
                    └─────────────┬──────────────┘
                                  │
                         ┌────────▼───────┐
                         │  nihongo-web   │
                         │  Next.js       │
                         └────────┬───────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │        api-gateway :3000     │
                    │  REST + Swagger /api/docs    │
                    │  JWT + Keycloak OIDC verify  │
                    └──┬──────────┬──────────┬───┘
                       │ gRPC     │          │
           ┌───────────▼──┐  ┌────▼────┐ ┌───▼──────────┐
           │ content :50051│  │exam:50052│ │ in-process:  │
           │ exam :50052   │  │          │ │ payment,     │
           └───────────────┘  └──────────┘ │ chat REST    │
                                           └──────────────┘

   Auth: Keycloak (realm edu-app) ←→ postgres-keycloak
   Live: LiveKit :7880 (livestream) │ Signaling :3002 (1-1 WebRTC, tùy chọn)

   Data: PostgreSQL nihongo :5433
         MongoDB audit :27017 │ Redis :6379 │ Kafka
   External: Stripe │ Brevo │ AWS S3 │ Google OAuth
```

> Chat & notification: REST + React Query polling (5–8s). Chi tiết: [`cursor-chat.md`](./cursor-chat.md) *(archival prompt — API đã ship)*.  
> Nginx routing: [nginx.md](./nginx.md). Docker services: [docker.md](./docker.md).

---

## 2. Services

### api-gateway (NestJS :3000)

Entry point HTTP. Chat hỗ trợ/community là REST (không Socket.io gateway cho chat).

| Trách nhiệm | Chi tiết |
|-------------|----------|
| Auth | JWT Bearer + refresh + Google OAuth + **Keycloak OIDC** |
| gRPC dispatch | → content-service, exam-service |
| Payment | Stripe, marketplace, webhook |
| Live | LiveKit token / session (`/api/live/*`) |
| Upload | S3 pre-signed URL |
| Audit | `AuditInterceptor` → MongoDB |
| Rate limit | Redis sliding window trên auth |
| Chat | support, community, notifications (REST) |

#### Route map — Nihongo (`/api/*`)

| Route group | Mô tả |
|-------------|-------|
| `POST /api/auth/*` | Login, register, refresh, Google, OIDC |
| `GET /api/vocabularies/*` | content-service (gRPC) |
| `GET /api/grammars/*` | content-service (gRPC) |
| `GET /api/lessons/*` | content-service (gRPC) |
| `POST /api/mock-exams/*` | exam-service (gRPC) |
| `GET /api/progress/*` | Progress / SRS sync |
| `GET/POST /api/live/*` | LiveKit livestream sessions |
| `GET/POST /api/subscriptions/*` | Stripe subscription |
| `GET/POST /api/marketplace/*` | Booking, coach search |
| `GET/PATCH /api/notifications/*` | Notification history |
| `GET/POST /api/support/*` | Support chat user ↔ admin |
| `GET/POST /api/community/*` | Learner group / direct chat |
| `POST /api/push/*` | Đăng ký APNs/FCM device token |
| `POST /api/upload/presigned-url` | AWS S3 |
| `POST /api/webhooks/stripe` | Idempotent webhook |

### content-service (gRPC :50051)

Nội dung tiếng Nhật: Lesson, Vocabulary, Grammar, Kanji, Kana, JLPT, Reading, Listening.

### exam-service (gRPC :50052)

Mock exam JLPT, SRS, progress, study streak.

### payment-service (in-process)

Stripe subscription, marketplace booking, webhook idempotent, Stripe Connect payout.

### realtime-module (in-process)

Support / community / notifications — **REST + poll**, không Socket.io chat gateway.

### keycloak

OIDC IdP (`realm edu-app`). Public URL: `http://auth.localhost:8080`. Clients: `nihongo-web`, `nihongo-mobile`.

### livekit

SFU livestream (`edu-livekit :7880`). Gateway cấp token; mobile/web join room.

### signaling-service (:3002)

WebSocket WebRTC **1-1 call** (tùy chọn) — khác livestream LiveKit.

### Clients

| App | Stack | Ghi chú |
|-----|-------|---------|
| `nihongo-web` | Next.js | App chính. Canvas Tools (`/tools`, `/kanji-practice`, `/whiteboard`, `/worksheet`, `/japan-map`); Admin (`/admin/*`). |
| 4 mobile | Expo / Android / Flutter / iOS | [mobile-tech-stacks.md](./mobile-tech-stacks.md) |

---

## 3. Request Flows

> Bản tóm tắt. Luồng chi tiết theo code (sơ đồ sequence, file chính, rủi ro đã thấy): [core-flows.md](./core-flows.md).

### 3.1 Học vocab (nihongo-web)

```
Browser → GET /api/vocabularies?lessonNumber=1  (Bearer token)
        → JwtAuthGuard → gRPC content-service
        → PostgreSQL nihongo + Redis cache (TTL 5 phút)
        → AuditInterceptor → MongoDB
```

### 3.2 Thanh toán subscription

```
Browser → POST /api/subscriptions { plan: 'PRO' }
        → JwtAuthGuard
        → SubscriptionService.createOrUpgrade()
           ├── check SubscriptionPlanConfig.stripePriceId
           ├── Stripe.createCustomer (nếu chưa có)
           └── Stripe.createSubscription → trả clientSecret
        → Browser: Stripe Elements nhập card → confirmPayment()
        → Stripe → POST /api/webhooks/stripe (payment_intent.succeeded)
        → WebhookService (idempotent) → UPDATE Payment, Subscription
        → NotificationService.send() → INSERT Notification (client poll GET /api/notifications)
```

### 3.3 Book coaching session

```
Browser → POST /api/marketplace/sessions { coachId, scheduledAt }
        → JwtAuthGuard
        → BookingService:
           ├── check coach.isActive
           ├── check conflict slot
           ├── $transaction: CREATE CoachingSession + Payment
           └── Stripe.createPaymentIntent() → clientSecret
        → Return { session, clientSecret }
```

### 3.4 Support chat (user ↔ admin)

```
Browser → GET /api/support
        → JwtAuthGuard → SupportChatService.getOrCreateThread()
        → PostgreSQL SupportThread + SupportMessage

Browser → POST /api/support/messages { content }
        → saveMessage() → UPDATE lastMessageAt
        → NotificationService (admin nhận SUPPORT_MESSAGE)

Frontend → SSE GET /api/support/stream (MQTT làm bus giữa các pod), poll dự phòng
```

### 3.5 Community chat (học viên)

```
Browser → GET /api/community/rooms
Browser → POST /api/community/rooms/:id/messages { content }
        → GroupChatService → LearnerChatMessage
        → notify members (GROUP_MESSAGE notification)

Direct: POST /api/community/rooms/direct { userId } — tái sử dụng room DIRECT nếu đã có
```

### 3.6 Auth — Nihongo

```
POST /api/auth/login → access_token (15m) + refresh_token (cookie 7d, DB)
POST /api/auth/google → verify Google ID token → upsert User → tokens
GET  /api/*           → Authorization: Bearer <access_token>
POST /api/auth/refresh → rotate refresh token
```

---

## 4. Authentication Design

| | nihongo-web / mobile |
|---|---|
| Token | Bearer access_token |
| JWT `aud` | (không có) / OIDC từ Keycloak |
| Refresh | Rotation (DB) |
| Guard | JwtAuthGuard (+ OIDC verify) |
| User DB | `nihongo.User` |
| Google OAuth | Có |
| Keycloak OIDC | Có (`oidc-client-ts` trên web) |

---

## 5. Rate Limiting

Redis sliding window (`SlidingWindowRateLimitGuard`):

```
POST /api/auth/login     → 5 req / 60s   (key: rl:{ip}:auth:login)
POST /api/auth/register  → 3 req / 3600s
```

---

## 6. Audit Logging

`AuditInterceptor` — mọi authenticated nihongo request:

```javascript
// MongoDB collection: audit_logs (TTL 90 ngày)
{ userId, action, resource, metadata, ip, success, durationMs, createdAt }
```

---

## 7. Caching Strategy

| Data | TTL | Store |
|------|-----|-------|
| Nihongo vocab by lesson | 5 phút | Redis |
| Coach search | 1 phút | Redis |

---

## 8. Kafka Topics

| Topic | Producer | Mục đích |
|-------|----------|----------|
| `edu.exam.submitted` | exam-service (transactional outbox) | Consumer `progress-updater` cập nhật tiến độ; lỗi 3 lần → `edu.exam.submitted.dlq` |
| `edu.payment.succeeded` | payment-service (webhook, transactional outbox) | Chưa có consumer; event không mất (ghi cùng transaction với Payment, relay của exam-service đẩy lên) |
| `edu.session.completed` | — | Chỉ khai báo trong `kafka-topics.ts`, chưa ai gửi |
| `edu.vocab.reviewed` | — | Chỉ khai báo trong `kafka-topics.ts`, chưa ai gửi |

---

## 9. Infrastructure

Docker Compose (Nihongo full ≈13 container): `postgres-nihongo`, `postgres-keycloak`, `keycloak`, `redis`, `mongodb`, `kafka`, `zookeeper`, `livekit`, `api-gateway`, `content-service`, `exam-service`, `nihongo-web`, `nginx`. Chi tiết: [docker.md](./docker.md).

Kubernetes: `infra/k8s/`, `infra/helm/edu-app/`

CI/CD: `.github/workflows/`

---

## 10. Điểm mạnh / hạn chế

| | Nhận xét |
|---|---|
| ✅ Unified gateway | Web + mobile qua 1 entry (nginx/API) |
| ✅ gRPC + in-process | Microservices content/exam; payment in-process |
| ✅ Stripe + Connect | Subscription; coach payout hằng tuần (mỗi buổi gắn `payoutId`, không trả trùng; xem [core-flows.md](./core-flows.md) 2e) |
| ✅ LiveKit + Keycloak | Livestream SFU + OIDC IdP |
| ✅ REST chat | Support + community, polling nhẹ |
| ✅ Google OAuth + OIDC | Gmail + Keycloak |
| ✅ Audit + rate limit | MongoDB audit, Redis sliding window |
| ✅ Chat hỗ trợ file/image | Presign S3 upload → `fileUrl`/`fileType` trong `SupportMessage`, `LearnerChatMessage`, `ChatMessage` |
| ✅ Realtime chat | SSE (`/api/support/stream`, `/api/community/rooms/:id/stream`) — poll fallback 30s |
| ✅ Coaching session chat | `GET/POST /api/marketplace/sessions/:id/messages` + `SessionChatPanel` floating button |
