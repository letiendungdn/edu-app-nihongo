# Phỏng vấn hạ tầng và cloud: nginx, Terraform, AWS, GCP, đo tải, xử lý sự cố

> **Mục tiêu:** Trả lời được câu hỏi phỏng vấn DevOps/backend về reverse proxy, hạ tầng bằng code, cloud, kiểm thử tải và xử lý sự cố, mỗi câu dẫn ví dụ thật trong project.
>
> **Cần biết trước:** [learn-nginx.md](./learn-nginx.md), [learn-terraform.md](./learn-terraform.md), [learn-aws.md](./learn-aws.md), [learn-aws-serverless.md](./learn-aws-serverless.md), [learn-localstack.md](./learn-localstack.md), [learn-google-cloud.md](./learn-google-cloud.md), [learn-performance-k6.md](./learn-performance-k6.md), [learn-incident-postmortem.md](./learn-incident-postmortem.md). Docker: [interview-docker.md](./interview-docker.md). Kubernetes, CI/CD, monitoring: [interview-devops.md](./interview-devops.md).

Cách dùng: tự trả lời thành tiếng 1–2 phút rồi mới mở đáp án. Mỗi đáp án có phần "Trong project" để bạn làm ví dụ.

Mức độ: 🟢 Junior · 🟡 Middle · 🔴 Senior.

---

## A. Nginx và reverse proxy

### 1. 🟢 Reverse proxy là gì? Project dùng nginx để làm gì?

<details><summary>Đáp án</summary>

Máy chủ đứng trước các app, nhận mọi request rồi chuyển tới app phù hợp. Lợi: một cổng vào duy nhất, định tuyến theo host/đường dẫn, TLS ở một chỗ, giới hạn kích thước upload, header bảo mật, cùng origin cho web và API (khỏi CORS).

**Trong project:** [infra/nginx/nginx.conf](../infra/nginx/nginx.conf), cổng 8080: `nihongo.localhost` → `/api`, `/health` vào `api-gateway:3000`, `/s3/` vào S3 giả, còn lại vào `nihongo-web:8080`; `auth.localhost` vào Keycloak. Máy ảo Android dùng `10.0.2.2:8080` (cũng có trong `server_name`).

</details>

### 2. 🟢 502, 504, 413 qua nginx nghĩa là gì?

<details><summary>Đáp án</summary>

- 502: nginx không nối được app phía sau (app chưa lên, sai tên/cổng).
- 504: nối được nhưng app trả lời quá `proxy_read_timeout`.
- 413: body vượt `client_max_body_size`.

**Trong project:** `client_max_body_size 10m`; route AI để timeout 120 giây vì model chạy local chậm. 502 hay gặp ngay sau khi bật stack, khi gateway chưa healthy ([learn-nginx.md](./learn-nginx.md) mục 7).

</details>

### 3. 🟡 Vì sao project viết `set $gateway_upstream api-gateway:3000; proxy_pass http://$gateway_upstream…` thay vì `proxy_pass http://api-gateway:3000`?

<details><summary>Đáp án</summary>

Viết thẳng tên máy thì nginx phân giải DNS **một lần lúc khởi động**: service chưa có thì nginx không lên (`host not found in upstream`), và container được tạo lại với IP mới thì nginx vẫn gọi IP cũ (502). Đặt vào biến kèm `resolver 127.0.0.11 valid=10s` (DNS nội bộ của Docker) thì nginx phân giải lúc chạy, cache 10 giây.

Cái giá: khi dùng biến, nginx không tự ghép phần đường dẫn như `proxy_pass` thường, nên project ghi rõ `$request_uri`.

</details>

### 4. 🟡 Các header `X-Forwarded-*` để làm gì?

<details><summary>Đáp án</summary>

Sau proxy, app chỉ thấy request đến từ nginx qua HTTP thường. `X-Forwarded-For` cho biết IP thật của người dùng (rate limit, audit), `X-Forwarded-Proto`/`Host`/`Port` cho biết URL gốc để app tạo link chuyển hướng đúng (đăng nhập xong không bị đẩy về `http://` hay sai cổng). App phải được cấu hình chỉ tin các header này khi đến từ proxy (trust proxy), không thì người dùng tự đặt header giả được.

**Trong project:** mọi `location` đặt bốn header này; Keycloak bật `KC_PROXY_HEADERS: xforwarded`.

</details>

### 5. 🔴 Kể một lỗ hổng cấu hình nginx bạn từng sửa.

<details><summary>Đáp án</summary>

**Trong project:** chuyển nguyên `$http_upgrade` cho mọi request cho phép client gửi `Upgrade: h2c` và mở đường hầm HTTP/2 đi vòng qua mọi luật của nginx (h2c smuggling — Semgrep phát hiện). Sửa bằng `map`: chỉ chuyển `Upgrade` khi giá trị đúng là `websocket`, request thường không gửi `Connection: upgrade`. Kèm theo: `server_tokens off` để không lộ phiên bản (ZAP 10036), image `nginx-unprivileged` chạy bằng uid 101 nên nghe cổng 8080.

</details>

---

## B. Terraform

### 6. 🟢 `plan` và `apply` khác nhau thế nào? Đọc plan cần chú ý gì?

<details><summary>Đáp án</summary>

`plan` so code với state và thực tế rồi in ra sẽ làm gì, không đổi gì; `apply` thực hiện. Đọc ký hiệu: `+` tạo, `~` sửa tại chỗ, `-/+` **xóa rồi tạo lại** (với DB là mất dữ liệu), `-` xóa. Dòng cuối "Plan: X to add, Y to change, Z to destroy" phải khớp với ý định.

</details>

### 7. 🟡 State là gì? Vì sao không commit? Làm nhóm thì sao?

<details><summary>Đáp án</summary>

State ghi tài nguyên đã tạo kèm id thật để lần sau Terraform biết phải sửa gì. State có thể chứa bí mật (mật khẩu DB), nên không commit. Mất state thì Terraform "quên" và tạo trùng. Làm nhóm dùng remote backend có khóa (S3 + `use_lockfile`, bản cũ dùng DynamoDB) để hai người không `apply` cùng lúc.

**Trong project:** [infra/aws-learn](../infra/aws-learn) dùng workspace `localstack` và `aws` để tách state theo đích; `.gitignore` chặn `*.tfstate`. Chưa dùng backend từ xa vì là bài học một người — nói rõ đây là chỗ phải đổi khi làm nhóm.

</details>

### 8. 🟡 Drift là gì?

<details><summary>Đáp án</summary>

Hạ tầng thật khác code vì ai đó sửa tay trên Console. Lần `plan` sau Terraform đòi đổi lại theo code. Phòng: mọi thay đổi qua code + review; chạy `plan` định kỳ trong CI để phát hiện; quyền sửa Console hạn chế.

</details>

### 9. 🟡 Sửa code Lambda mà `terraform apply` không deploy bản mới. Vì sao?

<details><summary>Đáp án</summary>

Terraform chỉ thấy thay đổi ở thuộc tính của tài nguyên. Nếu file zip đổi nội dung nhưng không có thuộc tính nào phụ thuộc vào nội dung đó, nó coi là không đổi.

**Trong project:** `source_code_hash = data.archive_file.lambda.output_base64sha256` — sửa code → hash đổi → plan báo `~ source_code_hash` và cập nhật Lambda ([learn-terraform.md](./learn-terraform.md) mục 7).

</details>

---

## C. AWS, serverless, LocalStack, GCP

### 10. 🟢 Mapping stack của project sang AWS thế nào?

<details><summary>Đáp án</summary>

Container (gateway, web, content, exam, Keycloak) → ECS Fargate trong private subnet; ALB ở public subnet; Postgres → RDS; Redis → ElastiCache; upload → S3 (project đang dùng); Kafka → MSK (hoặc SQS/SNS nếu không cần đúng mô hình Kafka); log/metric → CloudWatch. Ra Internet (Stripe, Google OAuth) từ private subnet đi qua NAT Gateway.

**Trong project:** [learn-aws.md](./learn-aws.md) mục 1 vẽ sơ đồ này. GCP tương ứng: Cloud Run, Cloud SQL, Cloud Storage, Pub/Sub, GKE ([learn-google-cloud.md](./learn-google-cloud.md)).

</details>

### 11. 🟡 Khoản tiền bất ngờ nhất khi mới học AWS là gì?

<details><summary>Đáp án</summary>

NAT Gateway: tính theo giờ **và** theo GB đi qua, kể cả kéo image từ ECR hay đọc S3. Giảm bằng VPC endpoint (S3 gateway endpoint miễn phí), đặt budget alert, và dọn tài nguyên sau khi học (`terraform destroy`).

</details>

### 12. 🟡 Cloud Run và ECS Fargate khác nhau thế nào với một consumer Kafka chạy nền?

<details><summary>Đáp án</summary>

Cloud Run cấp CPU chủ yếu khi đang xử lý request và có thể thu về 0 instance, nên tiến trình nghe Kafka chạy nền không hợp (trừ khi bật luôn cấp CPU và giữ tối thiểu một instance). Fargate chạy task liên tục nên consumer chạy bình thường.

**Trong project:** exam-service và gateway có consumer/outbox Kafka — lý do [learn-aws.md](./learn-aws.md) ghi rõ khác biệt này khi chọn nơi chạy.

</details>

### 13. 🔴 Thiết kế Lambda tạo ảnh thu nhỏ khi upload S3. Bẫy nào phải tránh?

<details><summary>Đáp án</summary>

1. **Vòng lặp vô hạn:** Lambda ghi ảnh vào chính bucket kích hoạt nó. Chặn hai lớp: `filter_prefix = "uploads/"` ở trigger và `shouldProcess()` trong code.
2. **Quyền tối thiểu:** chỉ `GetObject` trên `uploads/*`, `PutObject` trên `thumbnails/*`.
3. **Tên file trong sự kiện bị mã hóa URL** (`+`, `%E1%BA%A3`): phải giải mã (`decodeS3Key`).
4. **Giới hạn:** 512 MB, 30 giây; ảnh quá 10 MB bỏ qua.
5. **Gọi lại khi lỗi:** S3 gọi bất đồng bộ, AWS tự thử lại 2 lần → hàm phải idempotent (ghi đè cùng tên file thu nhỏ).
6. **Cold start:** gói nặng khởi động chậm; `jimp` thuần JS đổi lấy xử lý chậm hơn `sharp`.

**Trong project:** [learn-aws-serverless.md](./learn-aws-serverless.md) mục 4, chạy thật trên LocalStack bằng Terraform.

</details>

### 14. 🟡 LocalStack giúp gì, không thay được AWS thật ở đâu?

<details><summary>Đáp án</summary>

Giả lập API AWS trên máy: học và test tích hợp không tốn tiền, không cần tài khoản. Không thay được: IAM được kiểm chặt như thật (bản miễn phí lỏng hơn), giới hạn/hiệu năng thật, mạng VPC, một số dịch vụ chỉ có bản trả phí, và bản miễn phí mất dữ liệu khi khởi động lại.

**Trong project:** service `localstack` trong compose nằm ở profile `aws-learn` và gắn `docker.sock` để chạy Lambda trong container — đánh đổi bảo mật được ghi rõ trong compose. Upload hằng ngày dùng S3Mock thay vì LocalStack vì cần giữ file sau khi khởi động lại ([learn-localstack.md](./learn-localstack.md) mục 8).

</details>

### 15. 🟡 Ứng dụng lấy credentials AWS thế nào cho đúng?

<details><summary>Đáp án</summary>

Trên máy: profile trong `~/.aws` (không dán khóa vào code/`.env` commit). Trên cloud: IAM role gắn vào task/instance/Lambda, SDK tự lấy khóa tạm thời. Không dùng khóa của tài khoản root, bật MFA, quyền tối thiểu, xoay khóa khi lộ.

**Trong project:** AWS chỉ dùng qua một profile riêng; compose để `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` mặc định rỗng và trỏ `AWS_ENDPOINT_URL` vào S3 giả ([learn-aws.md](./learn-aws.md) mục 4).

</details>

---

## D. Đo tải và hiệu năng

### 16. 🟢 Load test, stress test, spike test, soak test khác nhau thế nào?

<details><summary>Đáp án</summary>

Load: tải dự kiến, kiểm có đạt mục tiêu không. Stress: tăng dần tới khi gãy, tìm giới hạn. Spike: tăng vọt đột ngột. Soak: tải vừa trong nhiều giờ, tìm rò rỉ bộ nhớ, kết nối. Smoke: vài request kiểm kịch bản chạy được.

**Trong project:** [infra/k6](../infra/k6) có `load-test.js` và `stress-test.js`.

</details>

### 17. 🟡 Vì sao nhìn p95 chứ không nhìn trung bình?

<details><summary>Đáp án</summary>

Trung bình giấu đuôi chậm. Ví dụ kết quả thật: `avg=32.9ms med=8.53ms p(95)=123ms` — phần lớn request 8 ms (trúng cache Redis) nhưng 5% chậm hơn 123 ms. Khoảng cách median–p95 lớn cho biết có hai đường đi (cache hit/miss). Người dùng nhớ lần chậm, không nhớ trung bình.

</details>

### 18. 🔴 Hệ thống chậm khi tải tăng. Bạn tìm nút thắt thế nào?

<details><summary>Đáp án</summary>

Đi theo đường request (`k6 → nginx → gateway → gRPC → content-service → Redis → Postgres`) và quan sát đồng thời: `docker stats` (container nào chạm 100% của một core — Node một luồng), Jaeger (span dài nhất), `pg_stat_activity`/`pg_stat_statements` (query chờ khóa, query tốn thời gian nhất), lỗi pool Prisma, event loop lag. Nguyên nhân hay gặp: N+1 query, thiếu index (`EXPLAIN ANALYZE` thấy Seq Scan), `ILIKE '%x%'` (dùng `pg_trgm` + GIN), trả quá nhiều dữ liệu, cache stampede. CPU là nút thắt thì profile bằng `node --cpu-prof`.

</details>

### 19. 🔴 Ước lượng cần bao nhiêu instance gateway?

<details><summary>Đáp án</summary>

Tính tải từ giả định nghiệp vụ, đo sức chịu tải một instance, chia với hệ số an toàn. Ví dụ trong [learn-performance-k6.md](./learn-performance-k6.md) mục 6: 5.000 người/ngày, 40% vào giờ cao điểm 2 tiếng, 60 request/phiên → khoảng 17 req/s, nhân 3 cho đột biến ≈ 50 req/s. Đo "knee" của một pod (điểm latency bắt đầu vọt), chỉ vận hành ở 70% điểm đó → số pod = 50 / (0,7 × knee) → đặt min/max cho HPA. Luôn ghi kèm giả định để biết sửa chỗ nào khi số thật khác.

</details>

---

## E. Xử lý sự cố

### 20. 🟡 Khi có sự cố nghiêm trọng, bạn làm theo thứ tự nào?

<details><summary>Đáp án</summary>

Phát hiện → phân loại mức độ (SEV) → **khôi phục trước** (rollback, tắt feature flag, chuyển lưu lượng), tìm nguyên nhân sau → thông báo đều đặn cho người bị ảnh hưởng → đóng sự cố → postmortem. SEV1 có vai trò rõ: người chỉ huy, người xử lý kỹ thuật, người liên lạc. Có runbook cho từng loại alert.

</details>

### 21. 🔴 Kể một sự cố thật và postmortem của nó.

<details><summary>Đáp án</summary>

**Trong project (SEV2):** chạy seed nội dung với `DATABASE_URL` trỏ vào DB thử nghiệm, nhưng script vẫn ghi vào DB chính. Bản dump dùng `--disable-triggers`; import dừng giữa chừng nên không tới câu `ENABLE TRIGGER`, để lại trigger của bảng `CounterCategory` bị tắt trên DB chính. Không mất dữ liệu người học, phát hiện và khôi phục trong cùng phiên.

5 lần "vì sao": script viết cứng `-d nihongo` thay vì đọc `DATABASE_URL` → giả định chỉ có một DB → psql chạy từng câu, không bọc transaction → không có bước in "đang ghi vào DB nào".

Việc đã làm: đọc đích từ `DATABASE_URL`; psql chạy `-v ON_ERROR_STOP=1 --single-transaction` (lỗi thì rollback toàn bộ, kể cả câu tắt trigger); đồng bộ lại sequence sau import. Viết theo kiểu không đổ lỗi: tập trung vào điều hệ thống cho phép lỗi xảy ra ([learn-incident-postmortem.md](./learn-incident-postmortem.md) mục 5).

</details>

### 22. 🟡 Postmortem "không đổ lỗi" nghĩa là gì, vì sao quan trọng?

<details><summary>Đáp án</summary>

Hỏi "hệ thống nào cho phép lỗi này xảy ra" thay vì "ai gõ sai". Người ta chỉ kể thật khi không sợ bị phạt; không có sự thật thì không sửa được nguyên nhân gốc. Mỗi việc cần làm phải có loại (phòng ngừa / phát hiện / giảm thiểu), người phụ trách và hạn.

</details>

## Câu hỏi mở để tự luyện

1. Viết lại khối `location /api/` của nginx để thêm rate limit theo IP (`limit_req`). Gateway đã có rate limit 120 request/phút; giữ cả hai lớp có lợi gì?
2. Chuyển [infra/aws-learn](../infra/aws-learn) sang remote backend S3 có khóa: những bước nào, state hiện có chuyển thế nào?
3. Chạy `infra/k6/stress-test.js` với stack trên máy, vẽ đường p95 theo req/s và chỉ ra knee.

<!-- nav:start -->

---

## Đi tiếp

Tài liệu tham khảo thuộc **13. Phỏng vấn**. Cùng nhóm:

- [interview-questions.md](./interview-questions.md) — Bộ câu hỏi Senior chung
- [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md) — Backend NestJS, MQTT, DB
- [interview-devops.md](./interview-devops.md) — DevOps: Kubernetes (probe, rolling update, HPA, securityContext), pipeline CI/CD và deploy thật, monitoring — 19 câu
- [interview-docker.md](./interview-docker.md) — Docker: 25 câu từ Junior tới Senior, đáp án bằng compose/Dockerfile của project (có sự cố `.env` trong image)
- [interview-web.md](./interview-web.md) — Web: React, Next.js, JavaScript/TypeScript, HTTP, webpack — 25 câu, đáp án theo code nihongo-web
- [interview-backend-security.md](./interview-backend-security.md) — Bảo mật API (OWASP), thanh toán chống trùng, outbox, timeout, retry, circuit breaker
- [interview-backend-android-rn-swift.md](./interview-backend-android-rn-swift.md) — Backend, Android, React Native, Swift
- [interview-mobile.md](./interview-mobile.md) — Senior Mobile
- [interview-android.md](./interview-android.md) — Android: câu hỏi theo code nihongo-android, gồm cả Framework, Binder, Automotive
- [interview-java-dsa.md](./interview-java-dsa.md) — Java, OOP và 10 bài thuật toán gắn với app (lời giải Java đã chạy), kế hoạch luyện bài test lập trình
- [interview-react-native-senior.md](./interview-react-native-senior.md) — Senior React Native

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
