# Giao Tiếp Giữa Các Service — EDU APP

Tài liệu Q&A về **các service trong hệ thống giao tiếp với nhau bằng phương thức gì và
tại sao**. Mọi câu trả lời bám vào code thật trong repo.

---

## 1. Tổng quan — hệ thống dùng mấy cơ chế?

| Trục giao tiếp | Phương thức | Định dạng | Đồng bộ? | Code |
|---|---|---|---|---|
| Client (web/mobile) → backend | **HTTP/REST** qua Nginx → api-gateway | JSON | sync | `services/api-gateway/src/http/*.controller.ts` |
| api-gateway → content-service / exam-service | **gRPC** (HTTP/2 + Protobuf) | Protobuf bọc JSON | sync | `services/api-gateway/src/microservices/microservices.module.ts` |
| Trong 1 service (controller ↔ handler) | **CQRS bus** (`@nestjs/cqrs`, in-process) | object | sync | `services/exam-service/src/modules/mock-exams/commands/*` |
| Service → service (sự kiện nghiệp vụ) | **Kafka** (kafkajs) | JSON | async | `packages/nest-contracts/src/kafka-topics.ts` |
| Fan-out real-time nhẹ, nhiều instance | **Redis Pub/Sub** | JSON string | async, fire-and-forget | `services/exam-service/.../mock-exams.service.ts` |
| Job nền (email, cron nặng) | **BullMQ** (queue trên Redis) | JSON | async | `BullModule` trong `api-gateway/src/app.module.ts` |
| Server → browser (1 chiều) | **SSE** (`@Sse`) | text/event-stream | streaming | `api-gateway/src/http/community.controller.ts`, `support.controller.ts` |
| Browser ↔ server (2 chiều, WebRTC signaling) | **WebSocket** (Socket.IO) | JSON | streaming | `services/signaling-service/src/signaling/signaling.gateway.ts` |
| Media (audio/video call) | **LiveKit** (SFU, WebRTC) | RTP/SRTP | streaming | container `livekit` trong `docker-compose.yml` |
| Trace / metrics | **OpenTelemetry → Jaeger**, **Prometheus** | OTLP / scrape | async | `services/*/src/tracing.ts` |

Nguyên tắc: **sync + cần kết quả ngay → gRPC**; **async + fan-out + cần bền/replay → Kafka**;
**real-time cosmetic, mất được → Redis Pub/Sub**; **browser → SSE hoặc WebSocket**.

---

## 2. Sơ đồ luồng một request điển hình

```
Browser
  │  HTTPS/JSON
  ▼
Nginx (reverse proxy, TLS, routing theo host)
  │  HTTP/JSON
  ▼
api-gateway  ── chỉ đây expose HTTP; giữ Auth (Keycloak/JWT), Swagger,
  │              rate-limit (ThrottlerGuard), validation, audit
  │  gRPC (HTTP/2, Protobuf)  :50051 / :50052
  ▼
content-service / exam-service  ── KHÔNG có HTTP server. Chạy
  │                                 NestFactory.createMicroservice({ transport: GRPC })
  │  Prisma
  ▼
PostgreSQL (nihongo)          Redis (cache + session)

Sự kiện sau khi nộp bài:
exam-service ──(EventBus in-process)──► ExamSubmittedHandler
             ──(Kafka: edu.exam.submitted)──► [consumer: SRS / analytics / notification]
             ──(Redis PUBLISH exam:completed)──► [instance nào đang giữ SSE của user đó]
```

---

## 3. gRPC — giao tiếp nội bộ

**Q1: Tại sao gateway ↔ content/exam-service dùng gRPC chứ không REST?**

> 4 lý do bám vào project:
> 1. **Tần suất cao.** Mỗi lần mở trang `/grammar`, `/vocab`, `/kanji` là gateway gọi content-service. gRPC dùng **HTTP/2**: 1 kết nối TCP giữ mãi, multiplex nhiều request song song, không tốn handshake/headers như HTTP/1.1.
> 2. **Payload nhỏ hơn.** Protobuf là binary, không phải JSON text — ít byte hơn, parse nhanh hơn. Với response từ vựng vài trăm dòng thì khác biệt thấy rõ.
> 3. **Contract có kiểu, tập trung 1 chỗ.** `packages/nest-contracts` giữ `.proto` + DTO. Gateway và service build từ cùng nguồn → sai contract là fail lúc compile chứ không phải lúc runtime.
> 4. **Load-balance sẵn ở client.** Khi content-service scale lên nhiều replica, gRPC client (`@grpc/grpc-js`) tự round-robin theo DNS. REST cần thêm LB ở giữa.
>
> Đổi lại: **browser không gọi thẳng gRPC được** (thiếu grpc-web proxy) → nên gateway vẫn phải là REST ở rìa.

**Q2: Vì sao content-service / exam-service không có cổng HTTP nào?**

> `services/exam-service/src/main.ts` dùng `NestFactory.createMicroservice()` với
> `transport: Transport.GRPC`, `url: 0.0.0.0:50052` — nó **chỉ** là gRPC server, không
> có `NestFactory.create()` (HTTP). content-service tương tự ở `:50051`
> (`GRPC_DEFAULT_PORTS` trong `packages/nest-contracts/src/grpc-paths.ts`).
>
> Lợi ích: bề mặt tấn công nhỏ (không expose ra ngoài Docker network), không cần cấu
> hình CORS/helmet/swagger cho service nội bộ, mọi thứ public đi qua đúng **một cửa** là
> gateway.

**Q3: Mô tả "Dispatch pattern" — cách project dùng gRPC.**

> Thay vì viết 1 `rpc` cho mỗi thao tác trong `.proto` (rồi phải regen code mỗi lần thêm
> endpoint), mỗi service chỉ expose **một** RPC duy nhất:
>
> ```proto
> // packages/nest-contracts/proto/exam.proto
> service ExamService {
>   rpc Dispatch (DispatchRequest) returns (DispatchResponse);
> }
> message DispatchRequest  { string pattern = 1; string payload = 2; }
> message DispatchResponse { string result = 1; string error = 2; }
> ```
>
> - **Client** (`packages/nest-common/src/grpc/grpc-dispatch.client.ts`):
>   `send(pattern, data)` → `dispatch({ pattern, payload: JSON.stringify(data) })`.
> - **Server** (`services/exam-service/src/exam.ms.controller.ts`): một `@GrpcMethod("ExamService", "Dispatch")`
>   gọi `handleGrpcDispatch(this.routes, data)`. `this.routes` là map
>   `{ [EXAM_PATTERNS.START_EXAM]: (d) => this.startExam(d), ... }`.
> - **Lỗi**: `handleGrpcDispatch` (`packages/nest-common/src/grpc/dispatch.util.ts`) bắt
>   exception, serialize `{ statusCode, message }` vào `DispatchResponse.error`; client
>   parse lại và `throw { statusCode, message }` → gateway map thành HTTP status đúng.
>
> Đây là bản "tự chế" của `@MessagePattern` trong NestJS microservice, nhưng đi trên gRPC.

**Q4: Đánh đổi của Dispatch pattern là gì?**

> **Mất**: schema Protobuf cho từng payload — `payload` chỉ là `string` JSON opaque, gRPC
> không validate cấu trúc, không có type an toàn ở tầng wire. Nếu client gửi sai field,
> chỉ vỡ ở runtime trong handler.
> **Được**: `.proto` **không bao giờ đổi** → không có bước codegen mỗi khi thêm endpoint,
> thêm route chỉ là thêm 1 dòng vào `routes` map. Với team nhỏ, tốc độ này đáng giá.
> Type-safety vẫn còn ở tầng TypeScript vì client/server cùng import DTO từ `@app/contracts`.

**Q5: gRPC ở đây có dùng streaming không?**

> Không. Tất cả RPC là **unary** (1 request → 1 response). Bài thi nộp xong trả full kết
> quả trong 1 lần. Streaming (server-stream / bi-di) chưa cần — phần real-time
> (điểm live, chat) đi qua Redis Pub/Sub + SSE/WebSocket chứ không qua gRPC stream.

**Q6: Nếu content-service chết thì sao?**

> gRPC call từ gateway sẽ reject với `UNAVAILABLE`. `RpcHttpExceptionFilter` +
> `GrpcDispatchClient` biến nó thành lỗi HTTP 5xx cho client. Đây là **coupling đồng bộ**:
> gateway phụ thuộc content-service để trả trang học. Chấp nhận được vì nội dung học là
> chức năng lõi — không có nó thì trang cũng vô nghĩa. Chỗ **không** được coupling kiểu này
> là gửi email / cập nhật SRS sau khi thi → nên đẩy sang Kafka (câu Q9).
>
> Lưu ý vận hành: gRPC client cache địa chỉ; nếu rebuild service làm đổi IP container,
> **phải restart gateway** để nó resolve lại (đã gặp khi thêm mock exam N3/N2/N1).

**Q7: Cache đặt ở đâu trong luồng gRPC?**

> Trong **service**, không phải gateway. Ví dụ `LessonsService.findAll()` (content-service)
> đọc `cacheManager` (Redis) trước, `CacheTTL.medium` = 300s, key `CacheKeys.lessonList()`.
> Ghi/xoá nội dung sẽ `cacheManager.del(...)`. Hệ quả: **seed thẳng vào DB bằng script
> ngoài** (như `seed-jlpt-content.ts`) không bust được cache Redis của service đang chạy —
> phải đợi TTL hết hoặc restart service.

---

## 4. Kafka — sự kiện nghiệp vụ bất đồng bộ

**Q8: Những sự kiện nào đi qua Kafka? Định nghĩa ở đâu?**

> `packages/nest-contracts/src/kafka-topics.ts`:
>
> ```ts
> export const KafkaTopics = {
>   EXAM_SUBMITTED:    'edu.exam.submitted',
>   PAYMENT_SUCCEEDED: 'edu.payment.succeeded',
> } as const;
> ```
>
> (Ba topic `exam.scored`, `vocab.reviewed`, `session.completed` đã xóa vì chưa từng được gửi.)
>
> Producer hiện có: exam-service phát `edu.exam.submitted` (qua
> `ExamSubmittedHandler`), payment-service phát `edu.payment.succeeded`.

**Q9: Tại sao nộp bài xong lại phát Kafka event thay vì làm hết trong hàm submit?**

> `SubmitExamHandler` (`.../commands/submit-exam.handler.ts`) làm 2 việc:
> 1. Gọi `mockExamsService.submit()` → chấm điểm, lưu `ExamResult` vào Postgres, **trả kết
>    quả ngay cho user**.
> 2. `eventBus.publish(new ExamSubmittedEvent({...}))` → `ExamSubmittedHandler` phát
>    Kafka `edu.exam.submitted`.
>
> Việc "sau khi thi" (cập nhật SRS card, tính lại analytics, gửi thông báo, cập nhật
> streak) **không nằm trong request path**. Nếu làm sync: user bấm Nộp rồi ngồi chờ 2–3s.
> Nếu một bước lỗi (notification service sập) thì cả request 500 dù điểm đã lưu. Với Kafka:
> submit trả về ~vài chục ms, phần còn lại consumer xử lý riêng, retry riêng, scale riêng.

**Q10: Tại sao Kafka mà không phải Redis Queue / RabbitMQ cho loại việc này?**

> - **Bền + replay**: Kafka giữ message theo retention (mặc định ~7 ngày), có thể tua lại
>   từ offset bất kỳ. Bug ở consumer SRS? Reset offset, reprocess toàn bộ bài thi hôm đó.
>   Redis Queue xoá message sau khi consume — không tua được.
> - **Nhiều consumer group độc lập**: cùng topic `edu.exam.submitted`, sau này analytics,
>   notification, gamification mỗi cái là 1 group, đọc song song, không giẫm chân nhau.
> - **Audit trail**: `edu.payment.succeeded` là dữ liệu tiền — không được mất, cần lưu vết.
> - RabbitMQ làm được pub/sub nhưng thiên về "task queue + routing phức tạp"; ở đây cần
>   "commit log có thể replay" → Kafka hợp hơn. (BullMQ vẫn được dùng, nhưng cho **job nền
>   nội bộ gateway** như gửi email theo lịch, không phải sự kiện liên-service.)

**Q11: Kafka "at least once" — xử lý trùng lặp thế nào?**

> Consumer đọc → xử lý → commit offset. Crash giữa "xử lý" và "commit" → message chạy lại
> → **có thể xử lý 2 lần**. Cách chống: **consumer idempotent** — mỗi event có khoá duy
> nhất (vd `examId + questionIndex`), consumer check bảng `processedMessage` (hoặc
> `INSERT ... ON CONFLICT DO NOTHING`) trước khi ghi tác dụng phụ. Ví dụ consumer SRS: cùng
> `edu.exam.submitted` chạy 2 lần vẫn chỉ cộng SRS một lần.

**Q12: Producer degrade thế nào khi Kafka không kết nối được?**

> `KafkaProducerService.onModuleInit()` bọc `producer.connect()` trong try/catch (payment
> có thêm timeout 8s). Fail → `this.producer = null` + log `warn`. `emit()` khi
> `producer === null` là **no-op**. Nghĩa là: mất Kafka → **event bị bỏ**, nhưng luồng
> chính (nộp bài, thanh toán) vẫn chạy. Đây là lựa chọn "graceful degradation" — chấp nhận
> mất event phụ để giữ chức năng chính sống. Trade-off: cần alert khi producer = null lâu.

**Q13: Message key trong Kafka để làm gì (nếu dùng)?**

> Key quyết định partition. Cùng key → cùng partition → **giữ thứ tự** cho các event của
> cùng một thực thể (vd mọi event của 1 `userId` vào 1 partition, xử lý tuần tự). Không set
> key → phân bổ round-robin, mất đảm bảo thứ tự nhưng phân tải đều. Với
> `edu.payment.succeeded`, nên key theo `userId` để nâng/hạ subscription của cùng user
> không bị đảo.

---

## 5. Redis — cache, session, pub/sub, queue

**Q14: Redis trong hệ thống này gánh mấy vai trò?**

> 1. **Cache** đọc: `@nestjs/cache-manager` + `CacheKeys` / `CacheTTL` trong content-service
>    (danh sách bài, grammar theo bài…).
> 2. **Session đề thi**: `mock-exams.service.ts` lưu cả phiên thi (câu hỏi + đáp án đúng)
>    tại key `mock-exam:${examId}` với TTL 3 giờ (`SESSION_TTL_MS`). Đáp án đúng **không**
>    gửi cho client; submit xong `cacheManager.del(...)`.
> 3. **Pub/Sub real-time**: `redis.publish("exam:question-scored" | "exam:completed", ...)`.
> 4. **Presence**: `video-presence.service.ts` + signaling dùng Redis set để biết ai online.
> 5. **BullMQ**: `BullModule.forRootAsync` trong gateway — hàng đợi job (mail scheduler…).

**Q15: `exam:question-scored` / `exam:completed` — tại sao Redis Pub/Sub chứ không Kafka?**

> Đây là **bộ đếm điểm live** hiển thị trong lúc chấm — cosmetic. Yêu cầu: độ trễ cực thấp,
> fan-out tới đúng instance gateway đang giữ kết nối SSE của user đó. Đặc điểm: **mất một
> message cũng không sao** (user vẫn thấy kết quả cuối qua HTTP response). Redis Pub/Sub:
> nhanh, fire-and-forget, không lưu, không ack — vừa đủ. Dùng Kafka ở đây là "overkill":
> tốn partition, tốn retention cho dữ liệu vứt đi sau 2 giây.
>
> Khác biệt cốt lõi: **Kafka = "chuyện đã xảy ra, phải xử lý cho bằng được"**; **Redis
> Pub/Sub = "thông báo thoáng qua, ai nghe được thì nghe"**.

**Q16: Pub/Sub của Redis khác Kafka ở điểm nào cần nhớ?**

> - Redis Pub/Sub **không lưu** — subscriber offline lúc publish thì mất luôn, không replay.
> - Không có consumer group / partition / offset.
> - Delivery là "at most once".
> - Bù lại: latency ~sub-millisecond, không cần Zookeeper/broker cluster.
> (Redis Streams thì có lưu + group, nhưng project đang dùng Pub/Sub thuần.)

**Q17: Vì sao lưu phiên thi trên Redis mà không phải Postgres?**

> Phiên thi sống ngắn (≤ 3h), ghi/đọc theo `examId`, không cần query phức tạp, và **chứa
> đáp án đúng** — không muốn để lẫn trong bảng nghiệp vụ. Redis: key-value + TTL tự hết
> hạn, không cần cron dọn rác. Postgres chỉ lưu `ExamResult` sau khi đã chấm xong.

---

## 6. Real-time tới browser — SSE vs WebSocket

**Q18: Khi nào SSE, khi nào WebSocket trong project?**

> - **SSE** (`@Sse("rooms/:id/stream")`, `@Sse("stream")` ở community/support controller):
>   luồng **một chiều** server → client (tin nhắn mới trong phòng chat, hỗ trợ). Chạy trên
>   HTTP thường, trình duyệt tự reconnect, không cần thư viện. Nguồn dữ liệu là RxJS
>   `Subject` in-process trong `ChatEventsService` (`realtime/chat-events.service.ts`).
> - **WebSocket** (Socket.IO, `@WebSocketGateway({ namespace: '/signal' })` ở
>   signaling-service): **hai chiều, độ trễ thấp** — cần cho trao đổi qua lại SDP/ICE
>   candidate của WebRTC và `presence-ping`. Auth qua `client.handshake.auth.token` →
>   `verifyWsToken`, sai token thì `client.disconnect()`.

**Q19: Vì sao signaling tách thành service riêng, không nằm trong gateway?**

> WebSocket là **stateful** — mỗi kết nối gắn với 1 process. Tách ra để: (1) scale độc lập
> theo số phòng gọi, không kéo theo gateway; (2) gateway giữ được tính "gần như
> stateless" dễ scale ngang; (3) sự cố ở signaling (rò rỉ kết nối) không làm sập REST API.
> Media thật thì không đi qua service này — đi thẳng LiveKit (SFU).

**Q20: Nhiều instance gateway giữ SSE, làm sao event tới đúng instance?**

> Đây chính là lý do cần **Redis Pub/Sub** ở giữa: exam-service `PUBLISH exam:completed`,
> mọi instance gateway `SUBSCRIBE`, instance nào đang giữ SSE của `userId` đó thì đẩy
> xuống, còn lại bỏ qua. Nếu chỉ dùng RxJS `Subject` in-process thì event kẹt ở 1 process.

---

## 7. Những lựa chọn "tại sao KHÔNG"

**Q21: Sao không REST luôn cho nội bộ cho đơn giản?**

> Được về mặt chức năng, nhưng: mỗi service phải chạy HTTP server + CORS + middleware; mất
> HTTP/2 multiplexing; JSON text nặng hơn Protobuf; không có contract enforced lúc build;
> load-balancing phải tự lo. Với call nội bộ tần suất cao thì gRPC lãi hơn.

**Q22: Sao không GraphQL federation ở gateway?**

> Client hiện tại (Next.js, mobile) tiêu thụ REST đơn giản, không có nhu cầu
> query lồng nhiều nguồn trong 1 request. GraphQL thêm tầng schema + resolver + phòng
> N+1 mà chưa đổi lại lợi ích tương xứng. Gateway kiểu **BFF REST** là đủ.

**Q23: Sao không dùng một message broker duy nhất cho tất cả (chỉ Kafka, hoặc chỉ Redis)?**

> Vì hai nhu cầu khác bản chất:
> - "Sự kiện nghiệp vụ phải xử lý, cần bền/replay/nhiều consumer" → **Kafka**.
> - "Tín hiệu real-time thoáng qua, ưu tiên latency, mất được" → **Redis Pub/Sub**.
> Ép tất cả vào Kafka: real-time bị thêm độ trễ + rác retention. Ép tất cả vào Redis
> Pub/Sub: mất event tiền/điểm khi consumer offline — không chấp nhận được.

**Q24: Sao không gọi gRPC trực tiếp từ mobile/web cho nhanh?**

> Browser không nói gRPC thuần (cần grpc-web + proxy). Mobile thì được nhưng sẽ phải phơi
> service nội bộ ra Internet, tự làm auth/rate-limit/versioning ở từng service. Giữ **một
> cửa** (gateway) để tập trung Auth (Keycloak), throttling, audit, Swagger, và để service
> nội bộ được tự do đổi contract.

---

## 8. Cheat-sheet — chọn phương thức

| Tình huống | Dùng | Vì |
|---|---|---|
| Client cần dữ liệu để render | REST qua gateway | universal, cache được, có Swagger |
| Gateway cần data từ domain service, cần ngay | gRPC unary | nhanh, typed, HTTP/2, LB sẵn |
| "X vừa xảy ra", nhiều bên quan tâm, phải xử lý | Kafka event | bền, replay, multi-consumer, tách request path |
| Tín hiệu real-time, mất được, cần latency thấp | Redis Pub/Sub | fire-and-forget, fan-out đa instance |
| Job nền nội bộ (email theo lịch, cron nặng) | BullMQ | retry/delay/priority trên Redis |
| Server đẩy 1 chiều xuống browser | SSE | HTTP thường, auto-reconnect, không cần lib |
| Browser ↔ server 2 chiều (signaling, game) | WebSocket (Socket.IO) | bi-directional, low-latency |
| Trạng thái tạm, TTL, tra theo khoá | Redis key-value | tự hết hạn, không cần cron dọn |
| Nguồn sự thật nghiệp vụ | PostgreSQL (Prisma) | ACID, quan hệ, query |

---

## 9. File tham chiếu nhanh

| Chủ đề | Đường dẫn |
|---|---|
| Đăng ký gRPC client ở gateway | `services/api-gateway/src/microservices/microservices.module.ts` |
| Wrapper client Dispatch | `packages/nest-common/src/grpc/grpc-dispatch.client.ts` |
| Xử lý Dispatch phía server | `packages/nest-common/src/grpc/dispatch.util.ts` |
| Proto (nhỏ, cố định) | `packages/nest-contracts/proto/{content,exam}.proto` |
| Bootstrap gRPC server | `services/{content,exam}-service/src/main.ts` |
| Route map theo pattern | `services/exam-service/src/exam.ms.controller.ts` |
| Kafka topics | `packages/nest-contracts/src/kafka-topics.ts` |
| Kafka producer + degrade | `services/{exam,payment}-service/src/kafka/kafka*.ts` |
| Event → Kafka (CQRS) | `services/exam-service/src/modules/mock-exams/commands/submit-exam.handler.ts` + `events/exam-submitted.handler.ts` |
| Redis pub/sub + session | `services/exam-service/src/modules/mock-exams/mock-exams.service.ts` |
| SSE chat | `services/api-gateway/src/http/{community,support}.controller.ts` + `realtime/chat-events.service.ts` |
| WebSocket signaling | `services/signaling-service/src/signaling/signaling.gateway.ts` |
| Hạ tầng (kafka, redis, jaeger…) | `docker-compose.yml` |

Xem thêm: `docs/interview-questions.md` (Q11–Q14, Q27 về Kafka; phần "gRPC vs REST"),
`docs/learn-kafka.md`, `docs/learn-edu-app.md` (Tuần 4 — Microservices).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **2. Kiến trúc hệ thống** — bài 4/7.

- Bài trước: [core-flows.md](./core-flows.md) — Luồng từng tính năng: đăng nhập, thanh toán, video call, livestream, chat, SRS, thi thử, dự đoán đề, phát âm…
- **Bài tiếp: [media-storage.md](./media-storage.md)** — Ảnh và file media lưu ở đâu: repo, S3, DB, thư mục gắn container

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
