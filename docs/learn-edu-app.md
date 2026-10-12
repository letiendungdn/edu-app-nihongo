# Lộ trình học EDU APP — từ chạy được đến hiểu và tự phát triển

Lộ trình dành cho người học **2 giờ/ngày, 5 ngày/tuần, trong 10 tuần**. Nếu chỉ có 1 giờ/ngày, kéo dài thành 20 tuần. Mục tiêu không phải đọc hết code mà là đi theo **luồng request thật**, sửa được một chức năng và giải thích được kiến trúc.

**Hướng Mobile:** Tuần 7 chọn 1 stack; muốn đi sâu thì làm thêm [Phụ lục M](#phụ-lục-m--lộ-trình-mobile-chuyên-sâu-34-tuần) (+3–4 tuần: offline, auth, camera OCR, LiveKit, test).

**Tech từng framework:** [mobile-tech-stacks.md](./mobile-tech-stacks.md) (Expo, Kotlin, Flutter, SwiftUI + so sánh).

## Nguyên tắc học

1. **Chạy trước, đọc sau:** mỗi khái niệm phải gắn với một request hoặc màn hình đang hoạt động.
2. **Đi dọc một luồng:** Client → Nginx → Gateway → Service → Redis/DB → response.
3. **Mỗi tuần có sản phẩm:** note, sơ đồ, test hoặc một thay đổi nhỏ.
4. **Không học đồng thời cả 4 mobile stack:** chọn một stack chính; các app còn lại dùng để so sánh.
5. **Không sửa trực tiếp dữ liệu quan trọng:** backup trước bằng `npm run db:backup`.

---



## Bản đồ codebase cần thuộc


| Khu vực                    | Vai trò                                | Đọc đầu tiên                        |
| -------------------------- | -------------------------------------- | ----------------------------------- |
| `apps/nihongo-web`         | Web Next.js tiếng Nhật                 | routes/views, API client            |
| `apps/nihongo-mobile`      | React Native / Expo                    | `app/`, repository, config          |
| `apps/nihongo-android`     | Kotlin + Compose                       | presentation/domain/data            |
| `apps/nihongo_flutter`     | Flutter                                | presentation/domain/data            |
| `services/api-gateway`     | HTTP entry, auth, admin, external APIs | `app.module.ts`, controllers        |
| `services/content-service` | Lesson/vocab/grammar/kanji             | `content.module.ts`, services       |
| `services/exam-service`    | SRS, mock exam, progress               | `exam.module.ts`, services          |
| `services/payment-service` | Stripe, subscription, coaching         | Stripe + marketplace modules        |
| `packages/nest-common`     | Guard, cache, Redis, audit, mail       | `src/index.ts`                      |
| `packages/nest-contracts`  | gRPC/protobuf contracts                | proto + DTO                         |
| `packages/prisma-nihongo`  | Schema/migrations                      | `schema.prisma`                     |
| `infra`                    | Docker/K8s/Nginx/monitoring/backup     | `docker-compose.yml`, `infra/nginx` |


---



# Giai đoạn 0 — Chuẩn bị (1–2 ngày)



## Mục tiêu

- Chạy được full Nihongo stack.
- Đăng nhập bằng tài khoản demo.
- Biết xem log, health và database.



## Thực hành

```powershell
cd C:\Users\dungle\Desktop\edu_app
npm install
npm run docker:up:nihongo

curl.exe http://localhost:8080/health
start http://localhost:8080
```

Tài khoản: xem [accounts.md](./accounts.md). Cách chạy chi tiết: [run-local.md](./run-local.md), [docker.md](./docker.md).

## Hoàn thành khi

- Mở được web `:8080`.
- `GET /health` trả thành công.
- Biết dùng `docker compose ps` và `docker compose logs`.
- Restore được backup trên môi trường thử nghiệm.

---



# Tuần 1 — Kiến trúc tổng thể và luồng request



## Học

- Monorepo, workspace, app/service/package/infra.
- Nginx reverse proxy, API Gateway, gRPC.
- PostgreSQL, Redis, MongoDB, Kafka dùng cho việc gì.
- Hướng cấu trúc: BFD/DFD/ERD; hướng đối tượng: Use Case/UML.



## Đọc theo thứ tự

1. `README.md`
2. [nginx.md](./nginx.md)
3. [system-design.md](./system-design.md)
4. [bao-cao-phan-tich-thiet-ke.md](./bao-cao-phan-tich-thiet-ke.md)



## Bài thực hành

Theo request `GET /api/vocabularies?lessonNumber=1` và ghi lại:

```text
Client → Nginx → api-gateway → gRPC → content-service → Redis → PostgreSQL
```



## Sản phẩm tuần

- Một sơ đồ request flow tự vẽ.
- Giải thích được mỗi container trong `docker compose`.

---



# Tuần 2 — TypeScript, Node.js và NestJS



## Học

- TypeScript type/interface/generic/decorator/async.
- NestJS Module → Controller → Service.
- Dependency Injection, provider token, `useFactory`, `forwardRef`.
- Middleware, Guard, Pipe, Interceptor, Exception Filter.
- REST DTO validation và Swagger.



## Code cần đọc

- `services/api-gateway/src/app.module.ts`
- Một controller auth hoặc lessons.
- `packages/nest-common/src/audit/audit.interceptor.ts`
- `packages/nest-common/src/auth/`



## Bài thực hành

- Thêm một endpoint health/info đơn giản.
- Viết DTO có validation.
- Viết unit test cho service vừa thêm.



## Hoàn thành khi

- Giải thích đúng lifecycle một request NestJS.
- Controller không chứa business logic.
- Phân biệt Guard với Interceptor.

---



# Tuần 3 — PostgreSQL, Prisma và mô hình dữ liệu



## Học

- PK/FK, 1–N, 1–1, N–N, index, unique constraint.
- Transaction, isolation, race condition.
- Prisma model, relation, migration, query.
- ERD các phân hệ Content, Progress, Payment.



## Code cần đọc

- `packages/prisma-nihongo/schema.prisma`
- `Lesson`, `Vocabulary`, `User`, `SrsCard`
- `Subscription`, `CoachingSession`, `Payment`
- [db-design.md](./db-design.md)



## Bài thực hành

```powershell
npm run prisma:generate
npx prisma studio --schema packages/prisma-nihongo/schema.prisma
```

- Query vocab theo bài bằng Prisma. Xem cùng dữ liệu đó trong pgAdmin: [learn-pgadmin.md](./learn-pgadmin.md).
- Giải thích index `(userId, nextReviewAt)` của SRS.
- Tạo migration nhỏ trên DB thử nghiệm, sau đó rollback bằng backup.



## Hoàn thành khi

- Đọc được ERD và ánh xạ sang Prisma.
- Biết khi nào cần transaction.
- Không dùng `db push` tùy tiện trên production.

---



# Tuần 4 — Microservices, gRPC, Redis và Kafka



## Học

- Gateway/BFF và bounded context.
- gRPC/protobuf: request, response, client/server stub.
- Cache-aside, TTL, invalidation.
- Kafka producer/consumer, at-least-once, idempotency.



## Luồng cần đọc

1. Lessons/vocab: gateway → content-service.
2. Mock exam: gateway → exam-service → Redis.
3. Payment event: payment-service → Kafka.



## Bài thực hành

- Dùng Redis CLI xem `lessons:all`, `vocab:lesson:*`.
- Gọi API hai lần và quan sát cache hit/miss.
- Sửa cache key vocab để chứa `page` và `limit`, thêm test.
- Mô tả cách tránh xử lý Kafka event hai lần.



## Hoàn thành khi

- Giải thích được Redis không phải DB nghiệp vụ.
- Biết khi nào xóa cache.
- Phân biệt REST, gRPC và event Kafka.

---



# Tuần 5 — Auth, bảo mật và audit



## Học

- Password hash, JWT access/refresh, refresh rotation.
- Google OAuth và Keycloak OIDC + PKCE.
- RBAC: USER / TEACHER / ADMIN.
- Rate limit, CORS, Helmet, secret management.
- Audit log MongoDB TTL 90 ngày.



## Đọc

- [keycloak-setup.md](./keycloak-setup.md)
- [google-oauth-setup.md](./google-oauth-setup.md)
- [mongodb.md](./mongodb.md)
- Auth controller/service, guards và role decorators.



## Bài thực hành

- Login email rồi xem access/refresh flow.
- Login Keycloak và giải thích vì sao gateway cấp JWT local.
- Thử endpoint admin bằng USER, xác nhận nhận 403.
- Xem audit gần nhất trong `audit_logs`.



## Hoàn thành khi

- Phân biệt 401 và 403.
- Không lưu token nhạy cảm ở nơi không an toàn.
- Giải thích được OIDC code + PKCE.

---



# Tuần 6 — Frontend Web (Next.js)



## Học

- App Router, server/client component.
- State, form, API client, auth state.
- Loading/error/empty state.
- Responsive UI và accessibility.



## Luồng thực hành

Chọn **một màn hình** (Vocab hoặc SRS):

1. Tìm route/view.
2. Theo API request sang backend.
3. Thêm loading skeleton và error retry.
4. Viết component test.



## Hoàn thành khi

- Tự thêm được một trang gọi API.
- Xử lý đầy đủ loading/error/success.
- Không để business rule quan trọng chỉ ở frontend.

---



# Tuần 7 — Mobile: chọn một stack chính

> Tuần này chỉ **chọn 1 stack**. Nếu muốn đi sâu mobile (offline, camera, LiveKit, test), làm thêm **Phụ lục M** bên dưới (thêm 3–4 tuần) thay vì nhồi cả bốn app trong 7 ngày.



## 7.0. Chọn stack (ngày 1)


| Nền tảng của bạn          | Chọn                    | Folder                 |
| ------------------------- | ----------------------- | ---------------------- |
| Biết React / TypeScript   | **Expo / React Native** | `apps/nihongo-mobile`  |
| Muốn Android native       | **Kotlin + Compose**    | `apps/nihongo-android` |
| Muốn cross-platform typed | **Flutter + Riverpod**  | `apps/nihongo_flutter` |
| Có macOS, theo iOS        | **SwiftUI**             | `apps/nihongo-ios`     |


Chạy app: [run-mobile.md](./run-mobile.md). Backend phải lên (`npm run docker:up:nihongo` hoặc hybrid theo [run-local.md](./run-local.md)).

### API base URL — nhớ thuộc


| Môi trường       | Base URL thường dùng                                               |
| ---------------- | ------------------------------------------------------------------ |
| Android emulator | `http://10.0.2.2:8080/api/` (qua nginx) hoặc `:3000/api` (gateway) |
| iOS simulator    | `http://localhost:3000/api`                                        |
| Máy thật         | IP LAN máy host, cùng Wi‑Fi                                        |




## 7.1. Kiến thức chung mọi stack (ngày 1–2)

Học **một lần**, áp dụng cho app đã chọn:


| Chủ đề           | Việc cần làm                                                                |
| ---------------- | --------------------------------------------------------------------------- |
| Kiến trúc lớp    | Vẽ `presentation → domain → data` của app mình                              |
| Offline-first    | Vocab đọc từ local DB; sync khi có mạng                                     |
| Auth token       | Secure storage (Keychain / Keystore / SecureStore / flutter_secure_storage) |
| Network          | Monitor online/offline; queue sync `pending`                                |
| SRS              | Đọc thuật toán SM-2 local; chạy unit test                                   |
| Camera translate | OCR on-device → `POST /api/translate` → overlay                             |


**Đọc chung:** [interview-mobile.md](./interview-mobile.md), [learn-ml-mobile.md](./learn-ml-mobile.md) (OCR/ML Kit).

**Unit test đã có (chạy ngay ngày 2):**

```powershell
# Expo
cd apps\nihongo-mobile; npm run test:run

# Android
cd apps\nihongo-android; .\gradlew.bat testDebugUnitTest

# Flutter
cd apps\nihongo_flutter; flutter test test/srs_algorithm_test.dart
```



## 7.2. Lộ trình theo stack (ngày 2–5)



### A. Expo / React Native (`nihongo-mobile`)


| Ngày | Học                                                  | File / lệnh                        |
| ---- | ---------------------------------------------------- | ---------------------------------- |
| 2    | Expo Router, `app.json` extra (apiBaseUrl, Keycloak) | `app/`, `src/config/`              |
| 3    | SQLite + repository + sync                           | `src/data/`                        |
| 4    | Login JWT / Keycloak; SRS screen                     | `app/srs.tsx`, `src/utils/srs.ts`  |
| 5    | Camera + ML Kit + overlay map                        | `src/utils/overlay.ts`, màn camera |


**Đọc thêm:** [roadmap-react-native.md](./roadmap-react-native.md)

**Sản phẩm tuần:** sửa UI vocab + thêm 1 case test cho `overlay` hoặc `srs`.

---



### B. Android Kotlin (`nihongo-android`)


| Ngày | Học                         | File / lệnh                       |
| ---- | --------------------------- | --------------------------------- |
| 2    | Compose navigation, Hilt DI | `presentation/`, `di/`            |
| 3    | Room DAO + repository       | `data/local/`, `data/repository/` |
| 4    | ViewModel + Flow; SRS       | `SrsViewModel`, `SrsAlgorithm`    |
| 5    | CameraX + ML Kit Japanese   | `presentation/camera/`            |


**Đọc thêm:** [learn-android-kotlin.md](./learn-android-kotlin.md) (lộ trình học tuần + bài tập), [roadmap-android.md](./roadmap-android.md), [cursor-android-offline.md](./cursor-android-offline.md)

**Sản phẩm tuần:** thêm field UI + chạy `SrsAlgorithmTest` xanh.

---



### C. Flutter (`nihongo_flutter`)


| Ngày | Học                           | File / lệnh                                   |
| ---- | ----------------------------- | --------------------------------------------- |
| 2    | go_router, Riverpod providers | `lib/presentation/`, `providers.dart`         |
| 3    | Drift DB + repository         | `lib/data/local/`, `lib/data/repository/`     |
| 4    | Use case SRS; sync status     | `lib/domain/`, `lib/utils/srs_algorithm.dart` |
| 5    | camera + google_mlkit         | màn translate                                 |


**Đọc thêm:** [roadmap-flutter.md](./roadmap-flutter.md), [cursor-flutter-offline.md](./cursor-flutter-offline.md)

**Sản phẩm tuần:** `flutter test` xanh; sửa một widget vocab.

---



### D. iOS SwiftUI (`nihongo-ios`) — cần macOS


| Ngày | Học                    | File / lệnh                                   |
| ---- | ---------------------- | --------------------------------------------- |
| 2    | XcodeGen → mở project  | `xcodegen generate`                           |
| 3    | SwiftUI + MVVM         | `Presentation/`                               |
| 4    | Local store + API      | `Data/`, `Core/APIConfig.swift`               |
| 5    | SRS algorithm + XCTest | `Core/SRSAlgorithm.swift`, `NihongoEDUTests/` |


**Đọc thêm:** [learn-swift-ios.md](./learn-swift-ios.md) (18 lỗi đã sửa, 9 tính năng, sơ đồ, câu hỏi phỏng vấn), [roadmap-swift.md](./roadmap-swift.md)

**Sản phẩm tuần:** chạy XCTest `SRSAlgorithmTests` trên simulator.

## 7.3. Checklist hoàn thành Tuần 7

- [ ] Chạy được app trên emulator/simulator.
- [ ] Login và tải vocab khi online.
- [ ] Tắt mạng vẫn đọc được vocab đã sync.
- [ ] Giải thích được `10.0.2.2` vs `localhost`.
- [ ] Chạy được unit test SM-2 của stack đã chọn.
- [ ] Theo được 1 luồng: UI → repository → API/local DB.



## 7.4. So sánh nhanh 4 app (đọc để đối chiếu, không code cả 4)


|            | Expo                      | Android                    | Flutter         | iOS                                   |
| ---------- | ------------------------- | -------------------------- | --------------- | ------------------------------------- |
| Local DB   | expo-sqlite               | Room                       | Drift           | (local / Core Data pattern trong app) |
| State      | hooks                     | ViewModel + Flow           | Riverpod        | Observable / ViewModel                |
| Camera OCR | expo-camera + ML Kit      | CameraX + ML Kit           | camera + ML Kit | (tùy implement)                       |
| Unit test  | Vitest (`srs`, `overlay`) | JUnit (`SrsAlgorithmTest`) | `flutter_test`  | XCTest                                |


---



# Tuần 8 — Stripe, Coaching, Email và Realtime



## Học

- Stripe Checkout/PaymentIntent/Subscription/Webhook.
- Webhook signature và idempotency.
- Coaching session state machine, double-booking.
- Brevo transactional/broadcast email.
- LiveKit token/room, signaling, presence Redis.



## Đọc

- `services/payment-service`
- [brevo-mail.md](./brevo-mail.md)
- Tài liệu video/chat trong `docs/`



## Bài thực hành

- Chạy Stripe CLI test webhook.
- Theo event `invoice.paid` tới DB.
- Mô phỏng webhook gửi lặp và kiểm tra idempotency.
- Vẽ state machine CoachingSession.



## Hoàn thành khi

- Không tin redirect client là bằng chứng thanh toán.
- Biết webhook là nguồn sự thật.
- Giải thích được race condition double-booking.

---



# Tuần 9 — Infra, Docker, quan sát và vận hành



## Học

- Docker image/container/network/volume/healthcheck.
- Compose dependency và startup order.
- Nginx routing.
- Kubernetes Deployment/Service/Ingress/ConfigMap/Secret/HPA.
- Prometheus, Grafana, Jaeger; backup/restore.



## Đọc

- `docker-compose.yml`
- `infra/nginx/nginx.conf`
- `infra/k8s/`, `infra/helm/`, `infra/terraform/`
- [docker.md](./docker.md)



## Bài thực hành

- Rebuild một service.
- Gây lỗi gateway rồi đọc log tìm nguyên nhân.
- Chạy k6 smoke/load test.
- Backup DB và kiểm tra kích thước dump.



## Hoàn thành khi

- Phân biệt Docker Compose và Kubernetes.
- Biết debug 502 từ Nginx.
- Không commit secret thật.

---



# Tuần 10 — Testing, system design và capstone



## Học

- Unit, integration, contract, E2E.
- Mock external service; test database isolation.
- Load test; metrics, log, trace.
- Trade-off monolith/microservice, consistency/availability.



## Capstone — chọn một

1. **SRS:** thêm filter content type + test + analytics.
2. **Content:** cursor pagination vocab + cache key đúng.
3. **Coaching:** khóa chống double-booking + concurrency test.
4. **Mobile:** offline review queue + retry/backoff.
5. **Admin:** dashboard audit/payment có phân trang.



## Definition of Done

- Có yêu cầu + sơ đồ nhỏ.
- Migration (nếu cần) an toàn.
- Unit/integration tests.
- Lint/typecheck/build pass.
- Log/metrics hợp lý.
- Cập nhật docs.
- Tự demo và trả lời “vì sao thiết kế như vậy?”.

---



# Phụ lục M — Lộ trình Mobile chuyên sâu (+3–4 tuần)

Dành cho người chọn **hướng Mobile** sau Tuần 1–5 (hoặc sau Tuần 7). Vẫn chỉ **một stack chính**; stack khác chỉ đọc để so sánh.

## M0. Điều kiện tiên quyết

- Backend chạy được; login API OK.
- Đã hoàn thành Tuần 7 checklist (app chạy + offline vocab + SM-2 test).
- Đã đọc [run-mobile.md](./run-mobile.md).



## M1 — Offline-first & sync (1 tuần)


| Ngày | Việc                                                                   |
| ---- | ---------------------------------------------------------------------- |
| 1    | Vẽ sơ đồ: fetch remote → map entity → upsert local → UI đọc local      |
| 2    | Theo `syncStatus`: `synced` / `pending` / `conflict`                   |
| 3    | Tắt mạng: review SRS ghi local queue; bật mạng: flush queue            |
| 4    | Xử lý conflict (last-write / server-win — ghi rõ policy app đang dùng) |
| 5    | Viết unit/integration test cho sync helper hoặc repository (mock API)  |


**Đọc:** [cursor-android-offline.md](./cursor-android-offline.md) hoặc [cursor-flutter-offline.md](./cursor-flutter-offline.md) (tùy stack).

**Đầu ra:** note “offline queue hoạt động thế nào” + 1 test.

## M2 — Auth mobile & bảo mật token (3–4 ngày)


| Việc               | Chi tiết                                                    |
| ------------------ | ----------------------------------------------------------- |
| Secure storage     | Không lưu JWT plain SharedPreferences / AsyncStorage thường |
| Refresh            | Hết access → refresh; 401 → logout sạch                     |
| Keycloak / AppAuth | Redirect URI scheme (`com.edu.nihongo:/…`)                  |
| Deep link          | So sánh Expo scheme `nihongo://` vs Android/iOS             |


**Đầu ra:** login → kill app → mở lại vẫn còn session (hoặc refresh đúng).

## M3 — Camera OCR + translate + overlay (1 tuần)


| Ngày | Việc                                                                   |
| ---- | ---------------------------------------------------------------------- |
| 1    | Quyền camera; preview stream                                           |
| 2    | ML Kit Japanese OCR → text + bounding box                              |
| 3    | Gọi `/api/translate`; debounce ~1 frame/s                              |
| 4    | Map tọa độ ảnh → view (cover scale + offset) — xem test `overlay` Expo |
| 5    | Edge cases: nghiêng máy, text nhỏ, offline (chỉ OCR, không dịch)       |


**Đọc:** [learn-ml-mobile.md](./learn-ml-mobile.md)

**Đầu ra:** demo dịch camera + giải thích mapOcrFrameToView / tương đương.

## M4 — Live / realtime trên mobile (3–5 ngày, tùy chọn)

- Join livestream LiveKit; token từ gateway.
- Presence / reconnect.
- Đọc [cursor-mobile-livestream.md](./cursor-mobile-livestream.md).

**Đầu ra:** join một room test; note lỗi thường gặp (cleartext HTTP, URL `10.0.2.2`).

## M5 — Testing & chất lượng mobile (3–4 ngày)


| Loại        | Việc                                    |
| ----------- | --------------------------------------- |
| Unit        | SM-2, mapper, overlay (đã có skeleton)  |
| Widget / UI | 1 smoke màn Home hoặc Vocab             |
| Repository  | Mock API + fake DB                      |
| Manual QA   | Online/offline, rotate, permission deny |


**Đầu ra:** CI local: một lệnh test xanh cho stack đã chọn.

## Capstone mobile (chọn 1)

1. Offline SRS queue + retry/backoff + test.
2. Cải thiện overlay OCR (min size, clamp trong viewport) + test.
3. Màn analytics streak đọc từ local + sync.
4. Cờ feature: đổi API base URL trong debug settings.



## Roadmap stack dài hạn (sau phụ lục)


| Stack         | File                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------- |
| React Native  | [roadmap-react-native.md](./roadmap-react-native.md)                                              |
| Android       | [learn-android-kotlin.md](./learn-android-kotlin.md) · [roadmap-android.md](./roadmap-android.md) |
| Flutter       | [roadmap-flutter.md](./roadmap-flutter.md)                                                        |
| Swift         | [learn-swift-ios.md](./learn-swift-ios.md) · [roadmap-swift.md](./roadmap-swift.md)               |
| ReactJS (web) | [roadmap-reactjs.md](./roadmap-reactjs.md)                                                        |
| Senior mobile | [learn-mobile-senior.md](./learn-mobile-senior.md)                                                |


---



# Nhịp học mỗi ngày (2 giờ)


| Thời gian | Hoạt động                                          |
| --------- | -------------------------------------------------- |
| 15 phút   | Đọc mục tiêu + ôn lại request flow                 |
| 35 phút   | Đọc code có chủ đích                               |
| 50 phút   | Chạy/debug/sửa một việc nhỏ                        |
| 15 phút   | Viết note hoặc sơ đồ                               |
| 5 phút    | Commit/checkpoint cá nhân (chỉ commit khi phù hợp) |




## Checklist cuối mỗi tuần

- [ ] Tôi chạy lại được luồng chính mà không nhìn hướng dẫn.
- [ ] Tôi giải thích được dữ liệu nằm ở đâu.
- [ ] Tôi biết failure mode chính của phần vừa học.
- [ ] Tôi có ít nhất một test hoặc bằng chứng chạy.
- [ ] Tôi ghi lại 5 câu hỏi phỏng vấn và tự trả lời.

---



# Thứ tự tài liệu nên đọc

1. [run-local.md](./run-local.md)
2. [system-design.md](./system-design.md)
3. [bao-cao-phan-tich-thiet-ke.md](./bao-cao-phan-tich-thiet-ke.md)
4. [db-design.md](./db-design.md)
5. [keycloak-setup.md](./keycloak-setup.md)
6. [run-mobile.md](./run-mobile.md) ← chạy 4 app mobile + unit test
7. Roadmap stack đã chọn: [roadmap-react-native.md](./roadmap-react-native.md) / [roadmap-android.md](./roadmap-android.md) / [roadmap-flutter.md](./roadmap-flutter.md) / [roadmap-swift.md](./roadmap-swift.md) / [roadmap-reactjs.md](./roadmap-reactjs.md)
8. [canvas-tools.md](./canvas-tools.md) ← Canvas Tools + Japan Map (tùy chọn, sau Tuần 6)
9. [learn-testing.md](./learn-testing.md)
10. [learn-kafka.md](./learn-kafka.md)
11. [learn-mqtt-flyway-ddd.md](./learn-mqtt-flyway-ddd.md) ← MQTT, RxJS, Flyway, view, DDD
12. [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md) ← câu hỏi phỏng vấn theo JD backend NestJS
13. [interview-questions.md](./interview-questions.md) + [interview-mobile.md](./interview-mobile.md)



# Sau 10 tuần phải làm được

- Chạy và debug full stack.
- Theo được request qua Nginx/gateway/gRPC/cache/DB.
- Sửa một tính năng end-to-end web hoặc mobile.
- Viết migration, cache invalidation và test đúng.
- Giải thích auth, payment webhook, SRS, audit và state machine.
- Đọc log/metric/trace để tìm lỗi.
- Trình bày kiến trúc bằng BFD/DFD/ERD/UML và bảo vệ trade-off.

