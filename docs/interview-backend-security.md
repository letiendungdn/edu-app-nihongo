# Phỏng vấn bảo mật API và độ tin cậy backend

> **Mục tiêu:** Trả lời được câu hỏi phỏng vấn về OWASP API Top 10, xác thực, chống trùng khi thanh toán và các pattern chịu lỗi (outbox, timeout, retry, circuit breaker), mỗi câu dẫn code thật trong project.
>
> **Cần biết trước:** [learn-security-backend.md](./learn-security-backend.md), [learn-reliability-patterns.md](./learn-reliability-patterns.md), [learn-stripe-idempotency.md](./learn-stripe-idempotency.md), [learn-devsecops.md](./learn-devsecops.md). Kafka cơ bản: [learn-kafka.md](./learn-kafka.md).

Cách dùng: tự trả lời thành tiếng 1–2 phút rồi mới mở đáp án. Mỗi đáp án có phần "Trong project" để bạn làm ví dụ.

Mức độ: 🟢 Junior · 🟡 Middle · 🔴 Senior.

---

## A. Bảo mật API (OWASP API Top 10)

### 1. 🟢 IDOR là gì? Chặn thế nào?

<details><summary>Đáp án</summary>

Insecure Direct Object Reference (OWASP API1): API kiểm tra *đã đăng nhập* nhưng quên kiểm tra *bản ghi có phải của người này không*. User A đổi id trên URL là sửa được dữ liệu của user B.

Chặn: luôn lọc theo chủ sở hữu lấy từ **token**, không lấy `userId` từ body/query; không thấy thì trả 404 (không lộ "bản ghi có tồn tại"). Viết test "user B gọi vào dữ liệu của A → 404" để lỗi không quay lại.

**Trong project:** soát 32 chỗ truy vấn chỉ theo `id` trên 26 bảng có chủ sở hữu; 31 chỗ hợp lệ, 1 lỗi thật: `DELETE /api/push/unregister` gỡ được token thiết bị của bất kỳ ai → đã giới hạn theo user. Test: [ownership.idor.spec.ts](../services/payment-service/src/ownership.idor.spec.ts).

</details>

### 2. 🟢 Mass assignment là gì?

<details><summary>Đáp án</summary>

Client gửi thêm trường không được phép (`{"name":"An","role":"ADMIN"}`) và server ghi nguyên body vào DB → tự nâng quyền. Chiều đọc tương tự: trả nguyên bản ghi DB làm lộ `passwordHash`.

**Trong project:** `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` ở gateway — trường không khai báo trong DTO bị trả 400. Quy tắc: không bao giờ `prisma.user.update({ data: req.body })`, luôn map từ DTO và dùng `select` khi trả về.

</details>

### 3. 🟡 Route admin chỉ ẩn nút trên web có đủ không?

<details><summary>Đáp án</summary>

Không (OWASP API5). Ai cũng gọi thẳng API bằng curl được. Phải kiểm vai trò ở server: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`, test bằng token USER phải ra 403.

**Trong project:** xác thực **mặc định đóng** — `JwtAuthGuard` đăng ký làm `APP_GUARD` toàn cục, route công khai phải ghi rõ `@Public()`. Quên gắn decorator thì route bị khóa chứ không bị mở.

</details>

### 4. 🟡 Bạn thiết kế access token và refresh token thế nào?

<details><summary>Đáp án</summary>

Access token ngắn (15 phút), gửi qua header `Authorization`. Refresh token dài hơn, lưu **hash** trong DB, xoay vòng mỗi lần dùng, thu hồi khi đăng xuất hoặc đổi mật khẩu. Ký bằng thuật toán cố định, kiểm `exp`. Mật khẩu hash bằng bcrypt/argon2. Đăng nhập sai trả thông báo chung, không lộ email nào đã đăng ký.

**Trong project:** web giữ access token trong localStorage, refresh token trong cookie HttpOnly `Path=/api/auth` 7 ngày (JavaScript không đọc được → XSS không lấy được refresh token). Nhiều request cùng gặp 401 thì chỉ gọi refresh một lần (`refreshInFlight` trong [api-client.ts](../apps/nihongo-web/src/lib/api-client.ts)). Bảng `RefreshToken` và `PasswordResetToken` lưu hash.

</details>

### 5. 🟡 Quên đặt `JWT_SECRET` ở production thì sao?

<details><summary>Đáp án</summary>

Trước đây code có fallback `'change-me-in-production'` — repo công khai nên ai cũng tự ký được token admin. Nguyên tắc: **thiếu bí mật thì không khởi động**.

**Trong project:** [jwt-secret.ts](../services/api-gateway/src/auth/jwt-secret.ts) chặn khởi động khi production thiếu secret hoặc dùng giá trị mặc định. Kiểm tra này bắt được ngay stack Docker local đang chạy secret mặc định; compose giờ bắt buộc có `JWT_SECRET` (`${JWT_SECRET:?}`).

</details>

### 6. 🟡 CORS có phải là cơ chế bảo mật không?

<details><summary>Đáp án</summary>

CORS chỉ quyết định **trình duyệt** có cho trang ở origin khác đọc response hay không. Nó không chặn curl/Postman và không thay xác thực. Sai cấu hình vẫn nguy hiểm: cho mọi origin kèm `credentials: true` thì trang lạ gọi API bằng cookie của nạn nhân.

**Trong project:** trước đây cho mọi `http://localhost:*` kể cả production → giờ nhánh này chỉ bật ở dev, danh sách `allowedOrigins` trong [configure-app.ts](../services/api-gateway/src/configure-app.ts). Origin lạ không nhận header CORS (trước đây gây 500).

</details>

### 7. 🟡 Kể các cách chặn "tiêu tốn tài nguyên không giới hạn".

<details><summary>Đáp án</summary>

OWASP API4: kẻ tấn công không cần hack, chỉ cần làm server tốn tài nguyên.

- Rate limit toàn cục + chặt hơn cho route đăng nhập (thêm khóa theo email vì IP đổi được).
- Giới hạn kích thước body, giới hạn `limit` phân trang.
- Tìm kiếm: độ dài tối thiểu cho `q`, index trigram thay vì `ILIKE` quét cả bảng.
- Tính năng tốn tiền (AI, email): hạn mức theo user mỗi ngày.

**Trong project:** `ThrottlerModule` 120 request/phút/IP, đăng nhập 5/phút. Body > 1 MB → 413, trừ route soạn nội dung 8 MB ([body-limit.middleware.ts](../services/api-gateway/src/body-limit.middleware.ts)). Gateway đặt `trust proxy` vì đứng sau nginx; không đặt thì mọi request trông như cùng một IP và rate limit chặn cả hệ thống.

</details>

### 8. 🟡 Prisma có chống SQL injection không?

<details><summary>Đáp án</summary>

Có với query builder và `` $queryRaw`…${x}` `` dạng template tag (Prisma tách tham số). Không với `$queryRawUnsafe` nối chuỗi từ input. Tương tự với Mongo: không đưa object từ request thẳng vào query (`{ "$gt": "" }`). XSS: React tự escape; cấm `dangerouslySetInnerHTML` với dữ liệu người dùng, cần HTML thì sanitize bằng DOMPurify.

**Trong project:** quy tắc này có trong [learn-security-backend.md](./learn-security-backend.md) mục 8; Semgrep trong CI bắt các mẫu nguy hiểm.

</details>

### 9. 🔴 Upload file và SSRF: rủi ro và cách chặn?

<details><summary>Đáp án</summary>

- **Upload qua presigned URL:** server chỉ ký, file đi thẳng lên S3. Nhưng `contentType` do client gửi → giới hạn danh sách cho phép, giới hạn dung lượng trong điều kiện ký. SVG là ảnh chứa được script → không cho.
- **SSRF:** server tự tải URL người dùng đưa → kẻ tấn công đưa `http://169.254.169.254/` (metadata cloud chứa credentials) hoặc `http://postgres:5432`. Chặn IP nội bộ, chỉ cho `https`, đặt timeout.

**Trong project:** [upload.dto.ts](../services/api-gateway/src/http/dto/upload.dto.ts) chỉ cho ảnh (không SVG), PDF, âm thanh, thư mục theo danh sách.

</details>

### 10. 🔴 Lộ secret trong một commit đã đẩy lên: làm gì?

<details><summary>Đáp án</summary>

1. **Vô hiệu hóa / xoay khóa ngay** — xóa khỏi lịch sử không làm khóa hết hiệu lực; repo công khai có thể đã bị quét trong vài phút.
2. Xem log của nhà cung cấp xem khóa đã bị dùng chưa.
3. Sau đó mới dọn lịch sử (và chấp nhận các bản clone/fork vẫn còn).
4. Phòng lại: gitleaks trong CI, `.gitignore`, `.dockerignore`, secret ở GitHub Secrets → K8s Secret.

**Trong project:** CI job `security` chạy gitleaks ([.gitleaks.toml](../.gitleaks.toml)) và `audit-ci` chặn HIGH/CRITICAL ([audit-ci.jsonc](../audit-ci.jsonc)). Một bài học thật: build Docker từng chép `.env` vào image web vì thiếu `.dockerignore` ([learn-docker.md](./learn-docker.md) mục 8).

</details>

### 11. 🟡 Vì sao `npm audit` sạch mà image vẫn có lỗ hổng?

<details><summary>Đáp án</summary>

Hai nguyên nhân: lỗ hổng nằm trong **image gốc** (npm CLI đi kèm `node:22-alpine`) chứ không phải thư viện của project; và **thư viện dev** (ts-jest kéo theo handlebars có CVE CRITICAL) lọt vào image vì chép nguyên `node_modules` sau `npm ci`, trong khi `audit-ci` đặt `skip-dev`.

**Trong project:** sửa bằng `npm prune --omit=dev` ở bước build và xóa npm ở bước `runner`; Trivy quét image trong CI. Quét thư viện (SCA) và quét image là hai việc khác nhau, cần cả hai ([learn-devsecops.md](./learn-devsecops.md) mục 3).

</details>

---

## B. Thanh toán và chống trùng

### 12. 🟢 Idempotent là gì? Vì sao webhook bắt buộc phải idempotent?

<details><summary>Đáp án</summary>

Gọi một lần hay nhiều lần cho cùng kết quả. Stripe gửi webhook **ít nhất một lần**: server xử lý xong nhưng chết trước khi trả 200 → Stripe gửi lại → không chống trùng thì tạo hai bản ghi thanh toán, cộng hai lần quyền lợi.

</details>

### 13. 🟡 Mô tả luồng xử lý webhook Stripe trong project.

<details><summary>Đáp án</summary>

**Trong project:** [webhook.service.ts](../services/payment-service/src/webhook/webhook.service.ts):

1. Kiểm chữ ký bằng `stripe.webhooks.constructEvent(rawBody, signature, secret)` trên **body gốc** — parse JSON trước thì chữ ký sai. Gateway bật `rawBody: true` trong `main.ts`.
2. Tra bảng `WebhookEvent` theo `eventId` (UNIQUE). Đã `PROCESSED` → trả 200, không làm lại.
3. Upsert trạng thái `RECEIVED`, xử lý, rồi đánh `PROCESSED`; lỗi thì `FAILED` và ném lỗi để Stripe gửi lại. Loại event không quan tâm → `IGNORED`.
4. Việc cập nhật thanh toán và buổi học nằm trong transaction; event gửi đi kèm `eventId` dạng `payment-<id>-<intentId>` để consumer phía sau cũng bỏ được bản trùng.

Không bao giờ bỏ kiểm chữ ký ở môi trường dev — dùng Stripe CLI để chuyển webhook về máy.

</details>

### 14. 🟡 Idempotency key khi *ta* gọi Stripe dùng để làm gì?

<details><summary>Đáp án</summary>

Request tạo thanh toán bị timeout: không biết Stripe đã tạo hay chưa. Gửi lại với cùng `idempotencyKey` → Stripe trả lại kết quả lần trước thay vì tạo cái thứ hai. Key phải ổn định theo thao tác nghiệp vụ (`pi-${paymentId}`), không phải ngẫu nhiên mỗi lần gọi.

Cùng ý tưởng cho API của mình: client gửi header `Idempotency-Key`, server lưu kết quả theo key và trả lại khi gặp lại.

</details>

### 15. 🔴 Đặt buổi học có thu tiền trải qua nhiều hệ thống. Làm sao nhất quán khi không có transaction chung?

<details><summary>Đáp án</summary>

Saga: chia thành các bước, mỗi bước có **hành động bù**. Giữ slot (`PENDING`) → bù bằng giải phóng slot; thu tiền → bù bằng hoàn tiền; xác nhận (`CONFIRMED`). Mỗi bước lưu trạng thái vào DB; job định kỳ tìm bản ghi kẹt ở `PENDING` quá hạn để bù. Webhook Stripe là tin nhắn đẩy saga đi tiếp nên phải idempotent. Cuối ngày đối soát (reconciliation) với Stripe để bắt lệch.

**Trong project:** khi thanh toán thành công, `Session` chỉ chuyển `PENDING → CONFIRMED` (`where: { id, status: PENDING }`), nên webhook đến lần hai không làm gì thêm.

</details>

---

## C. Độ tin cậy khi có lỗi

### 16. 🟡 Dual write là gì? Transactional outbox sửa nó thế nào?

<details><summary>Đáp án</summary>

Ghi vào hai hệ thống (Postgres và Kafka) không có transaction chung: DB commit xong, service chết hoặc Kafka lỗi → event mất vĩnh viễn; try/catch không giải được.

Outbox: trong **cùng transaction** với dữ liệu nghiệp vụ, chèn một dòng vào bảng `OutboxEvent`. Một relay đọc các dòng chưa gửi (`FOR UPDATE SKIP LOCKED` để nhiều pod không lấy trùng), gửi lên Kafka, rồi đánh dấu đã gửi. Đổi lại: event đến chậm khoảng 1 giây và có thể bị gửi **hơn một lần** → consumer phải idempotent.

**Trong project:** `edu.exam.submitted` của exam-service ([ADR-0006](./adr/0006-transactional-outbox-exam-events.md), [outbox-relay.service.ts](../services/exam-service/src/kafka/outbox-relay.service.ts)). Đã kiểm chứng: tắt Kafka, nộp bài vẫn thành công, event chờ trong outbox và tự lên Kafka khi Kafka sống lại.

</details>

### 17. 🟡 Consumer idempotent làm thế nào?

<details><summary>Đáp án</summary>

Bảng `ProcessedEvent(eventId UNIQUE)`: trong cùng một transaction, chèn dấu "đã xử lý" (`skipDuplicates`) rồi làm việc thật; chèn không được → đã xử lý rồi, bỏ qua. Hoặc thiết kế thao tác tự nhiên idempotent: `SET mastered = true` thay vì `correctCount + 1`. Lỗi lặp lại nhiều lần → đẩy sang topic DLQ để không chặn cả partition.

**Trong project:** [progress-updater.ts](../services/exam-service/src/kafka/progress-updater.ts) ghi hoạt động `exam` và `StudyStreak` theo giờ Việt Nam, dấu `ProcessedEvent` cùng transaction, lỗi 3 lần → DLQ. Gửi lại event trùng → bị bỏ qua, số liệu không đổi.

</details>

### 18. 🟡 Vì sao mọi lời gọi qua mạng phải có timeout?

<details><summary>Đáp án</summary>

Service phía sau treo (deadlock DB, GC dài) thì request phía trước treo theo → hết kết nối, hết RAM → service phía trước chết dù không có bug (lỗi lan truyền). Quy tắc: timeout tầng ngoài lớn hơn tầng trong, nếu không tầng ngoài bỏ cuộc trong khi tầng trong vẫn làm.

**Trong project:** mọi lời gọi gateway → microservice có timeout 10 giây (`MICROSERVICE_TIMEOUT_MS`), quá hạn trả 504 ([grpc-dispatch.client.ts](../packages/nest-common/src/grpc/grpc-dispatch.client.ts)).

</details>

### 19. 🟡 Retry đúng cách thế nào? Khi nào không được retry?

<details><summary>Đáp án</summary>

Có giới hạn số lần, backoff tăng dần và jitter (ngẫu nhiên) để các client không cùng dội lại một lúc. Retry ngay lập tức, vô hạn = dồn thêm tải lên service đang ốm.

Chỉ retry thao tác idempotent. Retry `SubmitExam` không có khóa chống trùng = chấm điểm hai lần, tạo hai `ExamResult`.

**Trong project:** retry có backoff cho lời gọi đọc **chưa làm** — nói thẳng điều này khi được hỏi, kèm lý do vì sao lời gọi ghi không retry.

</details>

### 20. 🔴 Circuit breaker hoạt động thế nào? Khác timeout ở đâu?

<details><summary>Đáp án</summary>

Timeout giới hạn **một** lời gọi. Circuit breaker nhìn **nhiều** lời gọi: tỉ lệ lỗi vượt ngưỡng → mở mạch, trả lỗi ngay không gọi nữa → sau một thời gian cho vài request thử (half-open) → thành công thì đóng lại. Lợi: service phía trước không phí tài nguyên chờ, service phía sau có thời gian hồi phục.

**Trong project:** [circuit-breaker.ts](../packages/nest-common/src/grpc/circuit-breaker.ts) trong gateway: lỗi hạ tầng (timeout, mất kết nối, 5xx) ≥ 50% trong 20 lần gọi gần nhất, cần tối thiểu 10 lần gọi → trả 503 trong 30 giây. Đã thử: tắt content-service → vài lần 504 (chờ 10 giây) rồi chuyển sang 503 trong khoảng 5 ms; bật lại → mạch tự đóng sau khoảng 20 giây. Chỉ đếm lỗi hạ tầng, không đếm lỗi nghiệp vụ như 404, vì đó không phải dấu hiệu service đang chết.

</details>

### 21. 🔴 Graceful degradation: Redis, Kafka hoặc MongoDB chết thì app nên ra sao?

<details><summary>Đáp án</summary>

Phân biệt phụ thuộc **bắt buộc** và **phụ**. Phụ (cache, audit log, analytics, email) không được làm hỏng luồng chính:

- Redis chết → đọc thẳng DB, chậm hơn nhưng chạy.
- Kafka chết → vẫn nộp bài, lưu điểm; event chờ trong outbox.
- MongoDB (audit) chết → vẫn phục vụ; ghi log và metric lỗi.
- content-service chết → trang học lỗi; đăng nhập, hồ sơ vẫn chạy nhờ timeout + circuit breaker.

</details>

### 22. 🟡 Graceful shutdown là gì? Vì sao cần trên Kubernetes?

<details><summary>Đáp án</summary>

Khi nhận SIGTERM: ngừng nhận request mới, làm xong request đang chạy, đóng kết nối DB/Kafka sạch sẽ, rồi mới thoát. Không có thì mỗi lần deploy rolling cắt ngang request đang chạy, consumer Kafka không commit offset kịp và xử lý lại.

**Trong project:** `enableShutdownHooks()` ở cả 3 service. Trong Docker cần `exec` / CMD dạng mảng để node là PID 1 và nhận được tín hiệu ([interview-docker.md](./interview-docker.md)).

</details>

## Câu hỏi mở để tự luyện

1. Viết test e2e: user B gọi `PATCH` vào mục tiêu ngày của user A phải nhận 404.
2. Thêm header `Idempotency-Key` cho route nộp bài thi: lưu ở đâu, giữ bao lâu, trả gì khi hai request cùng key đến đồng thời?
3. Tắt Redis khi stack đang chạy: request tra từ vựng có trả 500 không? Nếu có, sửa để chỉ chậm đi.

<!-- nav:start -->

---

## Đi tiếp

Tài liệu tham khảo thuộc **13. Phỏng vấn**. Cùng nhóm:

- [interview-questions.md](./interview-questions.md) — Bộ câu hỏi Senior chung
- [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md) — Backend NestJS, MQTT, DB
- [interview-devops.md](./interview-devops.md) — DevOps: Kubernetes (probe, rolling update, HPA, securityContext), pipeline CI/CD và deploy thật, monitoring — 19 câu
- [interview-docker.md](./interview-docker.md) — Docker: 25 câu từ Junior tới Senior, đáp án bằng compose/Dockerfile của project (có sự cố `.env` trong image)
- [interview-web.md](./interview-web.md) — Web: React, Next.js, JavaScript/TypeScript, HTTP, webpack — 25 câu, đáp án theo code nihongo-web
- [interview-infra-cloud.md](./interview-infra-cloud.md) — Hạ tầng và cloud: nginx, Terraform, AWS/LocalStack/serverless, GCP, k6, xử lý sự cố
- [interview-backend-android-rn-swift.md](./interview-backend-android-rn-swift.md) — Backend, Android, React Native, Swift
- [interview-mobile.md](./interview-mobile.md) — Senior Mobile
- [interview-android.md](./interview-android.md) — Android: câu hỏi theo code nihongo-android, gồm cả Framework, Binder, Automotive
- [interview-java-dsa.md](./interview-java-dsa.md) — Java, OOP và 10 bài thuật toán gắn với app (lời giải Java đã chạy), kế hoạch luyện bài test lập trình
- [interview-react-native-senior.md](./interview-react-native-senior.md) — Senior React Native

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
