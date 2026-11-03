# Tài liệu EDU APP

Mọi tài liệu ở đây đều học trên **chính code và stack của project này**.
Đi theo các nhóm 1 → 10 theo thứ tự; cuối mỗi bài có mục **Đi tiếp** dẫn sang bài kế tiếp, hết nhóm thì sang nhóm sau.
Nhóm 11 → 14 là tài liệu tham khảo, đọc khi cần.

Mới bắt đầu: mở [run-local.md](./run-local.md), rồi bấm "Bài tiếp" ở cuối mỗi bài.

## Lộ trình chính

1. [Bắt đầu: chạy được project](#1-bắt-đầu-chạy-được-project) — Dựng stack trên máy, đăng nhập, kết nối DB, rồi xem lộ trình tổng.
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống) — Hệ thống gồm những gì, request chạy ra sao, vì sao thiết kế như vậy.
3. [Backend (NestJS)](#3-backend-nestjs) — Gateway, message queue, cache và các pattern backend.
4. [Cơ sở dữ liệu](#4-cơ-sở-dữ-liệu) — Từ câu SQL đầu tiên đến thiết kế và đọc sơ đồ DB thật.
5. [Kiểm thử](#5-kiểm-thử) — Viết test, đọc test có sẵn, đo tải.
6. [DevOps và hạ tầng](#6-devops-và-hạ-tầng) — Đóng gói, định tuyến, triển khai, theo dõi và xử lý sự cố.
7. [Cloud](#7-cloud) — Đưa project lên cloud, giả lập cloud trên máy.
8. [Frontend web và desktop](#8-frontend-web-và-desktop) — Next.js, các công cụ trên web, AI local và app desktop.
9. [Mobile](#9-mobile) — Các app mobile của project, từ nền tảng đến tính năng và bảo mật.
10. [Tích hợp: đăng nhập, mail, thanh toán](#10-tích-hợp-đăng-nhập-mail-thanh-toán) — Cài đặt và thực hành các dịch vụ bên ngoài.

## Tham khảo

- [Lộ trình theo framework mobile](#11-lộ-trình-theo-framework-mobile) — Lộ trình dài theo từng framework, dùng project làm ví dụ. Chọn framework mình theo.
- [Báo cáo phân tích thiết kế](#12-báo-cáo-phân-tích-thiết-kế) — Tài liệu kiểu đồ án: BFD/DFD/ERD, Use Case/UML.
- [Phỏng vấn](#13-phỏng-vấn) — Câu hỏi và đáp án phỏng vấn, trả lời bằng code của project.
- [Định hướng lên Senior](#14-định-hướng-lên-senior) — Ghi chú định hướng nghề nghiệp dựa trên project.

---

## 1. Bắt đầu: chạy được project

Dựng stack trên máy, đăng nhập, kết nối DB, rồi xem lộ trình tổng.

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 1 | [run-local.md](./run-local.md) | Chạy EDU APP Nihongo trên máy từng bước |
| 2 | [docker.md](./docker.md) | Chạy full stack bằng Docker, danh sách container, chuyển sang máy khác |
| 3 | [accounts.md](./accounts.md) | Tài khoản dev đang dùng |
| 4 | [dev-tools-connect.md](./dev-tools-connect.md) | Kết nối DB, Redis, Mongo, Kafka từ máy host |
| 5 | [learn-edu-app.md](./learn-edu-app.md) | Lộ trình 10 tuần học cả project |

---

## 2. Kiến trúc hệ thống

Hệ thống gồm những gì, request chạy ra sao, vì sao thiết kế như vậy.

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 1 | [system-design.md](./system-design.md) | Kiến trúc tổng thể, các service, route map |
| 2 | [core-flows.md](./core-flows.md) | Luồng từng tính năng: đăng nhập, thanh toán, video call, livestream, chat, SRS, thi thử, dự đoán đề, phát âm… |
| 3 | [microservices-communication.md](./microservices-communication.md) | Các service nói chuyện với nhau bằng gì, vì sao |
| 4 | [media-storage.md](./media-storage.md) | Ảnh và file media lưu ở đâu: repo, S3, DB, thư mục gắn container |
| 5 | [learn-system-design.md](./learn-system-design.md) | Tư duy system design qua các quyết định của project |
| 6 | [learn-adr-design-docs.md](./learn-adr-design-docs.md) | Viết ADR và design doc (ví dụ: thư mục adr/) |

Quyết định kiến trúc đã ghi lại (ADR): [adr/](./adr/) — ví dụ [0006 Transactional outbox](./adr/0006-transactional-outbox-exam-events.md). SQL tham khảo: [sql/chat-schema.sql](./sql/chat-schema.sql).

---

## 3. Backend (NestJS)

Gateway, message queue, cache và các pattern backend.

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 1 | [learn-nestjs.md](./learn-nestjs.md) | NestJS: thứ tự pipeline, guard, interceptor, DI, rate limit, pipe |
| 2 | [redis.md](./redis.md) | Redis dùng vào việc gì trong project |
| 3 | [mongodb.md](./mongodb.md) | MongoDB chỉ dùng cho audit log |
| 4 | [learn-kafka.md](./learn-kafka.md) | Kafka: vì sao dùng, producer/consumer |
| 5 | [learn-mqtt-flyway-ddd.md](./learn-mqtt-flyway-ddd.md) | MQTT, RxJS, Flyway, view và DDD |
| 6 | [learn-reliability-patterns.md](./learn-reliability-patterns.md) | Outbox, timeout, retry, consumer idempotent, circuit breaker |
| 7 | [learn-stripe-idempotency.md](./learn-stripe-idempotency.md) | Thanh toán Stripe không trừ tiền hai lần |
| 8 | [learn-security-backend.md](./learn-security-backend.md) | Bảo mật API theo OWASP API Top 10 |

---

## 4. Cơ sở dữ liệu

Từ câu SQL đầu tiên đến thiết kế và đọc sơ đồ DB thật.

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 1 | [learn-sql.md](./learn-sql.md) | SQL trên DB thật: SELECT → JOIN → CTE → window → UPSERT → JSONB |
| 2 | [learn-postgres.md](./learn-postgres.md) | Query plan, index, tối ưu truy vấn |
| 3 | [learn-pgadmin.md](./learn-pgadmin.md) | Dùng pgAdmin với DB của project |
| 4 | [learn-db-design.md](./learn-db-design.md) | Thiết kế CSDL: yêu cầu → ERD → chuẩn hoá → ràng buộc → index → migration |
| 5 | [db-design.md](./db-design.md) | Thiết kế DB Nihongo: bảng, quan hệ, quyết định |
| 6 | [db-erd.md](./db-erd.md) | Sơ đồ ER của DB nihongo |

---

## 5. Kiểm thử

Viết test, đọc test có sẵn, đo tải.

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 1 | [learn-testing.md](./learn-testing.md) | Phân loại test, unit và integration test trên code thật |
| 2 | [learn-jest.md](./learn-jest.md) | Jest qua các test thật của repo |
| 3 | [learn-performance-k6.md](./learn-performance-k6.md) | Load test bằng k6, đọc kết quả |

---

## 6. DevOps và hạ tầng

Đóng gói, định tuyến, triển khai, theo dõi và xử lý sự cố.

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 1 | [learn-docker.md](./learn-docker.md) | Docker: image, container, volume, compose |
| 2 | [learn-nginx.md](./learn-nginx.md) | Nginx: reverse proxy cổng 8080, HTTPS, triển khai |
| 3 | [learn-infra.md](./learn-infra.md) | Thư mục infra/, cổng, healthcheck và các sự cố thật |
| 4 | [learn-kubernetes.md](./learn-kubernetes.md) | Kubernetes qua infra/k8s + Helm: probe, HPA, rolling update |
| 5 | [learn-release-cicd.md](./learn-release-cicd.md) | CI/CD: migrate khi deploy, canary, feature flag, rollback |
| 6 | [learn-observability.md](./learn-observability.md) | Log, metric, trace với Prometheus, Grafana, Jaeger |
| 7 | [learn-incident-postmortem.md](./learn-incident-postmortem.md) | Xử lý sự cố, runbook, postmortem (có postmortem thật) |

---

## 7. Cloud

Đưa project lên cloud, giả lập cloud trên máy.

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 1 | [learn-localstack.md](./learn-localstack.md) | Giả lập AWS trên máy bằng LocalStack |
| 2 | [learn-aws.md](./learn-aws.md) | AWS: S3 (đang dùng), ECS Fargate, RDS, SQS/SNS, IAM |
| 3 | [learn-google-cloud.md](./learn-google-cloud.md) | Google Cloud: Cloud Run, Cloud SQL, GCS, Pub/Sub, GKE |

---

## 8. Frontend web và desktop

Next.js, các công cụ trên web, AI local và app desktop.

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 1 | [roadmap-reactjs.md](./roadmap-reactjs.md) | React + Next.js qua apps/nihongo-web |
| 2 | [canvas-tools.md](./canvas-tools.md) | Luyện viết kanji, bảng trắng, worksheet, flashcard editor trên web |
| 3 | [learn-ollama-local.md](./learn-ollama-local.md) | Chạy AI local bằng Ollama |
| 4 | [learn-electron.md](./learn-electron.md) | Electron: app desktop Nihongo |

---

## 9. Mobile

Các app mobile của project, từ nền tảng đến tính năng và bảo mật.

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 1 | [mobile-tech-stacks.md](./mobile-tech-stacks.md) | Tech stack từng app mobile |
| 2 | [run-mobile.md](./run-mobile.md) | Chạy các app mobile |
| 3 | [learn-android-fundamentals.md](./learn-android-fundamentals.md) | Nền tảng Android qua code nihongo-android |
| 4 | [learn-android-kotlin.md](./learn-android-kotlin.md) | Android Kotlin từ code thật, lộ trình 8 tuần |
| 5 | [learn-android-features.md](./learn-android-features.md) | 9 tính năng Android mới và bài học |
| 6 | [learn-swift-ios.md](./learn-swift-ios.md) | Swift/SwiftUI qua nihongo-ios |
| 7 | [learn-ml-mobile.md](./learn-ml-mobile.md) | Machine learning trong app mobile: on-device, LLM, SRS thông minh |
| 8 | [security-owasp-mobile.md](./security-owasp-mobile.md) | Bảo mật mobile theo OWASP |

---

## 10. Tích hợp: đăng nhập, mail, thanh toán

Cài đặt và thực hành các dịch vụ bên ngoài.

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 1 | [keycloak-setup.md](./keycloak-setup.md) | Cài Keycloak (local/Docker) |
| 2 | [keycloak-lab-30m.md](./keycloak-lab-30m.md) | Lab Keycloak 30 phút |
| 3 | [keycloak-lab-refresh-roles.md](./keycloak-lab-refresh-roles.md) | Lab refresh token, logout, roles |
| 4 | [google-oauth-setup.md](./google-oauth-setup.md) | Đăng nhập bằng Google |
| 5 | [brevo-mail.md](./brevo-mail.md) | Gửi mail qua Brevo |
| 6 | [payment-wallets.md](./payment-wallets.md) | Apple Pay / Google Pay: cách hoạt động |
| 7 | [payment-checklist.md](./payment-checklist.md) | Việc cần làm để thanh toán chạy được |

---

## 11. Lộ trình theo framework mobile

Lộ trình dài theo từng framework, dùng project làm ví dụ. Chọn framework mình theo.

| Tài liệu | Nội dung |
|----------|----------|
| [roadmap-android.md](./roadmap-android.md) | Android (Kotlin + Jetpack) |
| [roadmap-swift.md](./roadmap-swift.md) | Swift / iOS |
| [roadmap-flutter.md](./roadmap-flutter.md) | Flutter |
| [roadmap-react-native.md](./roadmap-react-native.md) | React Native |

---

## 12. Báo cáo phân tích thiết kế

Tài liệu kiểu đồ án: BFD/DFD/ERD, Use Case/UML.

| Tài liệu | Nội dung |
|----------|----------|
| [analysis-design.md](./analysis-design.md) | Sơ đồ phân tích và thiết kế |
| [bao-cao-phan-tich-thiet-ke.md](./bao-cao-phan-tich-thiet-ke.md) | Báo cáo đầy đủ (hướng cấu trúc + hướng đối tượng) |

---

## 13. Phỏng vấn

Câu hỏi và đáp án phỏng vấn, trả lời bằng code của project.

| Tài liệu | Nội dung |
|----------|----------|
| [interview-questions.md](./interview-questions.md) | Bộ câu hỏi Senior chung |
| [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md) | Backend NestJS, MQTT, DB |
| [interview-devops.md](./interview-devops.md) | DevOps |
| [interview-backend-android-rn-swift.md](./interview-backend-android-rn-swift.md) | Backend, Android, React Native, Swift |
| [interview-mobile.md](./interview-mobile.md) | Senior Mobile |
| [interview-react-native-senior.md](./interview-react-native-senior.md) | Senior React Native |

---

## 14. Định hướng lên Senior

Ghi chú định hướng nghề nghiệp dựa trên project.

| Tài liệu | Nội dung |
|----------|----------|
| [senior-roadmap.md](./senior-roadmap.md) | Lộ trình lên Senior (backend, system design) |
| [notes-senior-study.md](./notes-senior-study.md) | Ghi chú cá nhân: học gì để lên Senior |
| [learn-mobile-senior.md](./learn-mobile-senior.md) | Checklist kỹ năng Senior Mobile |
