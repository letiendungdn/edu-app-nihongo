# Phỏng vấn Docker: câu hỏi và đáp án bằng code EDU APP

> **Mục tiêu:** Trả lời được các câu hỏi Docker hay gặp ở vòng phỏng vấn backend/DevOps, mỗi câu dẫn được ví dụ thật trong project thay vì định nghĩa sách vở.
>
> **Cần biết trước:** [learn-docker.md](./learn-docker.md) (bài này dùng lại số mục của bài đó). Kubernetes: [interview-devops.md](./interview-devops.md), [learn-kubernetes.md](./learn-kubernetes.md).

Cách dùng: đọc câu hỏi, tự trả lời thành tiếng trong 1–2 phút, rồi mới mở đáp án. Nhà tuyển dụng đánh giá cao nhất là câu trả lời có **ví dụ cụ thể và cái giá phải trả**. Mỗi đáp án dưới đây có phần "Trong project" để bạn dùng làm ví dụ.

Mức độ: 🟢 Junior · 🟡 Middle · 🔴 Senior.

---

## A. Khái niệm

### 1. 🟢 Container khác máy ảo thế nào?

<details><summary>Đáp án</summary>

Máy ảo giả lập cả phần cứng và chạy một hệ điều hành đầy đủ; container chỉ là tiến trình được cô lập bằng tính năng của nhân Linux (namespace để cô lập, cgroup để giới hạn tài nguyên), **dùng chung nhân** với máy chủ. Vì vậy container khởi động trong vài giây và nhẹ hơn nhiều.

Cái giá: cô lập yếu hơn máy ảo (chung nhân, lỗ hổng nhân ảnh hưởng mọi container), và container Linux cần nhân Linux. Trên Mac/Windows, Docker Desktop chạy ngầm một máy ảo Linux.

**Trong project:** khoảng 20 container chạy cùng lúc trên một laptop; `redis:7-alpine` chỉ 59 MB và lên trong chưa đầy 1 giây.

</details>

### 2. 🟢 Image, container, volume khác nhau ra sao?

<details><summary>Đáp án</summary>

- Image: gói chỉ đọc, gồm nhiều lớp, là khuôn.
- Container: một lần chạy của image, có thêm lớp ghi riêng; xóa container là mất lớp ghi đó.
- Volume: lưu trữ do Docker quản lý, nằm ngoài container, dùng cho dữ liệu cần giữ.

**Trong project:** image `edu-app-api-gateway` → container `edu-gateway`; dữ liệu Postgres nằm ở volume `nihongo-app_postgres_data`, được gắn vào `/var/lib/postgresql/data`.

</details>

### 3. 🟢 `CMD` và `ENTRYPOINT` khác nhau thế nào?

<details><summary>Đáp án</summary>

`ENTRYPOINT` là chương trình luôn chạy; `CMD` là tham số mặc định (hoặc lệnh mặc định nếu không có `ENTRYPOINT`). Tham số truyền khi `docker run image xyz` sẽ **thay** `CMD`, còn `ENTRYPOINT` giữ nguyên (muốn đổi phải `--entrypoint`).

Nên dùng dạng mảng (`["node", "main.js"]`): tiến trình chạy là PID 1, nhận trực tiếp tín hiệu SIGTERM. Dạng chuỗi chạy qua `sh -c`, shell thành PID 1 và có thể không chuyển tín hiệu cho app → `docker stop` phải đợi hết 10 giây rồi giết (mã 137).

**Trong project:** gateway dùng `CMD ["node", "dist/.../main.js"]`. Service `mosquitto` thay entrypoint (`entrypoint: ['/bin/sh', '/mosquitto/entrypoint.sh']`) để tạo file mật khẩu từ biến môi trường trước khi bật broker.

</details>

### 4. 🟢 `ARG` và `ENV` khác nhau thế nào?

<details><summary>Đáp án</summary>

`ARG` chỉ tồn tại lúc build; `ENV` nằm trong image và có khi container chạy. Muốn một giá trị build arg dùng được khi chạy thì gán lại vào `ENV`.

**Trong project:** Dockerfile web nhận `ARG NEXT_PUBLIC_KEYCLOAK_URL` rồi `ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL` trước `npm run build`, vì Next.js chép biến `NEXT_PUBLIC_*` vào JavaScript lúc build. Đổi biến này mà không build lại thì web không đổi.

Lưu ý bảo mật: giá trị `ARG` vẫn thấy được qua `docker history`, nên không truyền bí mật bằng `ARG`.

</details>

### 5. 🟢 `EXPOSE` có mở cổng không?

<details><summary>Đáp án</summary>

Không. `EXPOSE` chỉ là tài liệu. Cổng ra máy được mở bằng `-p` / `ports:`. Container trong cùng mạng gọi nhau được dù không có `EXPOSE`.

**Trong project:** nginx `EXPOSE 8080`, cổng thật được mở bởi `ports: ['${NGINX_HTTP_PORT:-8080}:8080']`. `nihongo-web` không mở cổng nào, chỉ nginx gọi được nó.

</details>

---

## B. Dockerfile và image

### 6. 🟡 Multi-stage build là gì, được lợi gì?

<details><summary>Đáp án</summary>

Dockerfile có nhiều `FROM`. Stage đầu có đủ công cụ build (compiler, devDependencies); stage cuối bắt đầu từ image sạch và chỉ `COPY --from=` kết quả cần chạy. Lợi: image nhỏ hơn, ít lỗ hổng hơn, không mang mã nguồn và công cụ build vào môi trường chạy.

**Trong project:** gateway build TypeScript ở stage `builder`, chạy `npm prune --omit=dev` (bỏ `ts-jest` và `handlebars` có lỗ hổng CRITICAL), rồi stage `runner` chỉ chép `node_modules`, `dist`, `packages`. Stage cuối còn xóa `npm` vì app chạy bằng `node`.

</details>

### 7. 🟡 Cache theo lớp hoạt động thế nào? Sắp xếp Dockerfile ra sao cho build nhanh?

<details><summary>Đáp án</summary>

Mỗi lệnh tạo một lớp. Docker dùng lại lớp đã có cho tới lệnh đầu tiên có đầu vào thay đổi (nội dung file được `COPY`, chuỗi lệnh `RUN`…); từ đó trở đi build lại hết. Vì vậy đặt thứ ít đổi lên trước: chép `package.json` + lock file, `npm ci`, **rồi** mới chép mã nguồn.

**Trong project (tự phê bình):** Dockerfile gateway chép cả `packages` và `services` rồi mới `npm ci`, nên sửa một file `.ts` cũng làm cài lại toàn bộ thư viện. Cách cải thiện: chép riêng các `package.json` của workspace trước, `npm ci`, rồi chép mã nguồn. Đây là bài tập 4 trong learn-docker.

</details>

### 8. 🟡 Làm sao giảm dung lượng image?

<details><summary>Đáp án</summary>

Image gốc nhỏ (`alpine`, `distroless`, `-slim`); multi-stage; bỏ devDependencies; gộp lệnh `RUN` và xóa cache trong cùng lệnh (`apk add --no-cache`); `.dockerignore` để không chép rác vào; dùng output tối giản của framework (Next.js `standalone`).

**Trong project:** web dùng `output: standalone` của Next.js nên image chạy chỉ 591 MB dù `node_modules` lúc build lớn hơn nhiều. Gateway 1,08 GB vẫn lớn vì chép cả `node_modules` của monorepo — một chỗ còn có thể tối ưu (bundle bằng webpack/esbuild, hoặc `npm prune` theo từng workspace).

</details>

### 9. 🔴 `.dockerignore` để làm gì? Kể một sự cố thật.

<details><summary>Đáp án</summary>

Loại file khỏi build context: build nhanh hơn, image sạch hơn, và quan trọng nhất là **không đưa bí mật vào image**. Docker không đọc `.gitignore`.

**Trong project (sự cố 13/11/2026):** repo chưa có `.dockerignore`. `COPY apps/nihongo-web ./apps/nihongo-web` chép cả `.env`, `node_modules` (307 MB của Mac) và `.next` (634 MB). Bản build `standalone` của Next.js chép `.env` sang thư mục chạy, nên image chạy thật chứa `MORI_PLAYBACK_SECRET`. Phát hiện bằng `docker run --rm --entrypoint sh <image> -c 'ls -a …'`.

Sửa: thêm `.dockerignore` (`**/.env`, `**/node_modules`, `**/.next`…); biến công khai duy nhất phụ thuộc file đó (`NEXT_PUBLIC_MAPBOX_TOKEN`) chuyển sang build arg; build lại và kiểm image không còn `.env`; đổi khóa đã lộ. Bài học trả lời phỏng vấn: bí mật vào lúc chạy, không vào lúc build; luôn có `.dockerignore`; quét image (Trivy) trong CI.

</details>

### 10. 🟡 Vì sao không nên chạy container bằng root?

<details><summary>Đáp án</summary>

Nếu app bị chiếm quyền, kẻ tấn công có quyền root trong container: sửa file hệ thống, cài công cụ, và nếu có lỗ hổng thoát container hoặc có `docker.sock`/thư mục máy được gắn vào thì nguy hiểm cho cả máy chủ.

**Trong project:** gateway và web có `USER node` (uid 1000); nginx dùng image `nginx-unprivileged` (uid 101) và vì user thường không được nghe cổng dưới 1024 nên nginx nghe 8080 trong container. Trivy rule DS-0002 kiểm điều này. Ngược lại, `localstack` gắn `/var/run/docker.sock` — comment trong compose ghi rõ đó là trao quyền điều khiển Docker của máy, nên chỉ bật khi học (profile `aws-learn`).

</details>

### 11. 🟡 Tag `latest` có vấn đề gì?

<details><summary>Đáp án</summary>

`latest` chỉ là tag mặc định, không đảm bảo là bản mới nhất và **thay đổi theo thời gian**: hôm nay và tuần sau `docker pull` có thể ra hai image khác nhau, khó tái hiện lỗi và khó rollback. Nên ghim phiên bản cụ thể (và chặt hơn nữa là digest `@sha256:…`).

**Trong project:** image hạ tầng đều ghim phiên bản: `postgres:16-alpine`, `quay.io/keycloak/keycloak:26.2`, `confluentinc/cp-kafka:7.6.1`. Image tự build dùng `latest` vì chỉ chạy trên máy dev; triển khai thật gắn tag theo commit ([learn-release-cicd.md](./learn-release-cicd.md)).

</details>

---

## C. Compose, khởi động, healthcheck

### 12. 🟢 `depends_on` có đảm bảo service kia đã sẵn sàng không?

<details><summary>Đáp án</summary>

Dạng ngắn (`depends_on: [api-gateway]`) chỉ đảm bảo **đã bật**, không phải sẵn sàng. Muốn đợi sẵn sàng phải có `healthcheck` ở service kia và `condition: service_healthy`. Ngoài ra `depends_on` chỉ có tác dụng với `docker compose up`; khi Docker tự khởi động lại container (`restart:`), thứ tự không được đảm bảo, nên app vẫn phải tự thử lại kết nối.

**Trong project:** gateway đợi `postgres-nihongo: service_healthy` nhưng chỉ `service_started` với content/exam. Comment ở service nginx ghi lại đúng chuyện Docker Desktop bật lại container sau khi máy ngủ không theo thứ tự, nên cấu hình nginx tự chịu khoảng chờ.

</details>

### 13. 🟡 Healthcheck nên kiểm gì? Liveness khác readiness ra sao?

<details><summary>Đáp án</summary>

Liveness: tiến trình còn phục vụ được không (không gọi phụ thuộc bên ngoài). Readiness: đã sẵn sàng nhận việc chưa (có thể kiểm DB, cache). Healthcheck của Docker dùng để quyết định `service_healthy` và hiển thị trạng thái, nên kiểm kiểu liveness, nếu không lỗi của DB sẽ lan thành "gateway unhealthy" và kéo theo mọi service đợi gateway.

**Trong project:** gateway kiểm `/health/live` (không gọi DB) với `start_period: 90s` và `start_interval: 3s`: 90 giây đầu khởi động không tính lỗi nhưng kiểm 3 giây một lần, healthy là báo ngay. Trên Kubernetes, project tách liveness/readiness probe riêng ([learn-kubernetes.md](./learn-kubernetes.md)).

</details>

### 14. 🟡 Các chính sách `restart` khác nhau thế nào?

<details><summary>Đáp án</summary>

`no` (mặc định), `always`, `unless-stopped` (như always nhưng không tự bật lại nếu bạn đã chủ động dừng), `on-failure[:n]` (chỉ khi thoát với mã khác 0).

**Trong project:** service dài hạn dùng `unless-stopped`; Flyway là việc chạy một lần nên `restart: "no"` — `Exited (0)` của nó là thành công, không phải lỗi.

</details>

### 15. 🟡 Biến môi trường trong compose: `${A:-x}`, `${A-x}`, `${A:?msg}` khác nhau gì?

<details><summary>Đáp án</summary>

- `${A:-x}`: A không đặt **hoặc rỗng** → `x`.
- `${A-x}`: chỉ khi A **không đặt** mới dùng `x`; đặt rỗng thì giữ rỗng.
- `${A:?msg}`: A không đặt hoặc rỗng → compose dừng và in `msg`.

**Trong project:** `JWT_SECRET: ${JWT_SECRET:?…}` để gateway không bao giờ chạy với bí mật mặc định. `AWS_ENDPOINT_URL: ${AWS_ENDPOINT_URL-http://s3:9090}` không có dấu `:` để đặt `AWS_ENDPOINT_URL=` (rỗng) là chuyển từ S3 giả sang S3 thật.

</details>

### 16. 🟡 Override file và profile dùng để làm gì?

<details><summary>Đáp án</summary>

Override (`-f a.yml -f b.yml`): file sau đè lên file trước, để thêm cấu hình cho một môi trường mà không sửa file chính. Profile: service chỉ chạy khi gọi tên profile, để file compose chứa cả những thứ tùy chọn.

**Trong project:** `docker-compose.host-dev.yml` chỉ mở cổng Redis `127.0.0.1:6379` cho gateway chạy trên máy; `airflow` và `localstack` nằm trong profile riêng. Cái giá của override: chạy lệnh thiếu file override thì compose thấy cấu hình khác và tạo lại container (Redis mất cổng), nên các script `npm run docker:*` gói sẵn tổ hợp file đúng.

</details>

---

## D. Mạng

### 17. 🟢 Trong container, `localhost` là gì? Gọi service khác thế nào?

<details><summary>Đáp án</summary>

`localhost` là chính container đó. Gọi service khác bằng **tên service** — Docker có DNS nội bộ trong mạng do compose tạo. Gọi ra máy chủ (Docker Desktop) dùng `host.docker.internal`.

**Trong project:** compose đặt `REDIS_URL: redis://redis:6379` cho container, còn `services/.env` (chạy trên máy) đặt `redis://localhost:6379`. Gateway gọi Ollama trên Mac qua `http://host.docker.internal:11434`. Máy ảo Android gọi máy qua `10.0.2.2`.

</details>

### 18. 🟡 `ports` khác `expose`? Vì sao project mở một số cổng chỉ trên 127.0.0.1?

<details><summary>Đáp án</summary>

`ports` mở cổng ra máy; mặc định nghe `0.0.0.0` nghĩa là máy khác trong mạng LAN cũng vào được. `expose` chỉ ghi chú cho container cùng mạng. Ghi `127.0.0.1:host:container` để chỉ máy mình vào được.

**Trong project:** Mosquitto, LocalStack, và Redis (qua override) chỉ mở trên `127.0.0.1`. Redis bị bỏ hẳn `ports` (commit `81eed11`) vì Docker Desktop trên Windows làm Redis mất kết nối mạng sau khi máy ngủ — đánh đổi là gateway chạy trên máy không gọi được Redis, sau đó giải bằng file override.

</details>

### 19. 🔴 Vì sao Kafka trong compose cần hai listener?

<details><summary>Đáp án</summary>

Client Kafka nối vào broker (bootstrap), broker trả lại metadata gồm **địa chỉ quảng bá** (advertised listener), và client dùng địa chỉ đó cho mọi kết nối sau. Container cần nhận `kafka:9092`, client trên máy cần nhận `localhost:9092`. Một listener không thể phục vụ cả hai: client ở phía còn lại sẽ nối thành công lần đầu rồi thất bại khi dùng địa chỉ được trả về.

**Trong project:** `KAFKA_LISTENERS: INTERNAL://0.0.0.0:9092,EXTERNAL://0.0.0.0:9093`, `KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka:9092,EXTERNAL://localhost:9092`, `ports: ['9092:9093']`.

</details>

---

## E. Dữ liệu và vận hành

### 20. 🟢 `docker compose down -v` nguy hiểm thế nào? Project bảo vệ DB ra sao?

<details><summary>Đáp án</summary>

`-v` xóa mọi volume do compose tạo, tức xóa dữ liệu. Project khai báo volume DB chính là `external: true` (`nihongo-app_postgres_data`): compose không tạo và không xóa nó, nên gõ nhầm `down -v` vẫn còn DB. Kèm theo đó là sao lưu (`npm run db:backup`) trước mọi thay đổi lớn.

</details>

### 21. 🟡 Bind mount khác named volume? Khi nào dùng cái nào?

<details><summary>Đáp án</summary>

Bind mount gắn một thư mục cụ thể của máy vào container (dễ sửa từ máy, phụ thuộc đường dẫn và quyền của máy chủ). Named volume do Docker quản lý (di chuyển được, hiệu năng tốt hơn trên Mac/Windows, không phụ thuộc cấu trúc thư mục).

**Trong project:** cấu hình đọc-chỉ dùng bind mount `:ro` (`./infra/nginx/...`, `./infra/keycloak/realm-edu-app.json:...:ro`); dữ liệu dùng named volume (`postgres_nihongo_data`, `s3_data`, `mori_hls_cache`). Video khóa học Mori gắn từ ổ USB qua biến `MORI_COURSE_DIR` — cắm USB sau khi container đã bật thì container thấy thư mục rỗng, phải tạo lại container.

</details>

### 22. 🟡 Container `Exited (137)` nghĩa là gì? Bạn điều tra ra sao?

<details><summary>Đáp án</summary>

137 = 128 + 9: tiến trình bị SIGKILL. Hai nguyên nhân thường gặp: hết bộ nhớ (OOM killer) hoặc `docker stop` quá thời gian chờ (app không xử lý SIGTERM). Kiểm `docker inspect --format '{{.State.OOMKilled}}' <container>`; xem `docker stats` và giới hạn RAM của Docker Desktop; xem app có bắt SIGTERM để tắt êm không. `Exited (143)` = 128 + 15 là nhận SIGTERM và thoát bình thường.

</details>

### 23. 🟡 Quy trình gỡ lỗi khi một container không lên?

<details><summary>Đáp án</summary>

1. `docker compose ps`: trạng thái, mã thoát, health.
2. `docker compose logs --tail 100 <service>`: tìm dòng lỗi **đầu tiên**.
3. `docker inspect --format '{{json .State.Health}}'`: healthcheck lần cuối in gì.
4. `docker exec -it <container> sh`: kiểm `env`, DNS (`getent hosts redis`), gọi thử endpoint.

**Trong project:** gateway "restart liên tục" thường do một phụ thuộc chưa lên (Kafka, Mongo, Keycloak) — log dòng đầu chỉ ra phụ thuộc nào.

</details>

### 24. 🔴 Bí mật nên đưa vào container thế nào?

<details><summary>Đáp án</summary>

Vào lúc **chạy**, không vào lúc build: biến môi trường từ hệ thống quản lý bí mật, Docker/Kubernetes secrets (gắn dạng file), hoặc dịch vụ như AWS Secrets Manager. Không `COPY` file `.env`, không truyền qua `ARG` (lộ trong `docker history`), không commit vào Git. Quét image và repo trong CI (Trivy, gitleaks).

**Trong project:** compose đọc `.env` ở gốc và truyền vào `environment:`; bí mật quan trọng dùng `${X:?}` để không có giá trị mặc định. Sự cố `.env` nằm trong image web (câu 9) là ví dụ cho việc vì sao cần `.dockerignore` và quét image. Phần quét: [learn-devsecops.md](./learn-devsecops.md).

</details>

### 25. 🔴 Compose khác Kubernetes thế nào? Khi nào chuyển?

<details><summary>Đáp án</summary>

Compose chạy trên **một** máy: tiện cho dev và hệ thống nhỏ, nhưng không tự dời container khi máy chết, không tự scale theo tải, không có rolling update có kiểm soát. Kubernetes điều phối trên nhiều máy: tự khởi động lại và dời pod, HPA, rolling update/rollback, probe riêng cho liveness/readiness, quản lý secret và cấu hình.

Chuyển khi cần chạy nhiều máy, cần sẵn sàng cao, hoặc cần scale từng service. Cái giá: phức tạp vận hành lớn hơn nhiều.

**Trong project:** dev dùng compose; `infra/k8s` + Helm có manifest cho cùng các service với probe, HPA, rolling update ([learn-kubernetes.md](./learn-kubernetes.md)).

</details>

---

## Câu hỏi mở để tự luyện

Không có đáp án mẫu: trả lời bằng code project, rồi tự kiểm lại bằng lệnh.

1. Dockerfile gateway chép cả thư mục `services` trước `npm ci`. Đề xuất cách viết lại để sửa code không làm cài lại thư viện, và đo thời gian build trước/sau.
2. Gateway image 1,08 GB. Liệt kê ba cách giảm, ước lượng mỗi cách giảm được bao nhiêu (gợi ý: `docker history edu-app-api-gateway:latest`).
3. Nếu phải chạy hai bản gateway sau nginx để chịu tải, cần đổi gì trong compose (tên container, cổng, cấu hình nginx)?
4. Thiết kế bước CI kiểm image không chứa `.env` và không chạy bằng root.

<!-- nav:start -->

---

## Đi tiếp

Tài liệu tham khảo thuộc **13. Phỏng vấn**. Cùng nhóm:

- [interview-questions.md](./interview-questions.md) — Bộ câu hỏi Senior chung
- [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md) — Backend NestJS, MQTT, DB
- [interview-devops.md](./interview-devops.md) — DevOps: Kubernetes (probe, rolling update, HPA, securityContext), pipeline CI/CD và deploy thật, monitoring — 19 câu
- [interview-web.md](./interview-web.md) — Web: React, Next.js, JavaScript/TypeScript, HTTP, webpack — 25 câu, đáp án theo code nihongo-web
- [interview-infra-cloud.md](./interview-infra-cloud.md) — Hạ tầng và cloud: nginx, Terraform, AWS/LocalStack/serverless, GCP, k6, xử lý sự cố
- [interview-backend-security.md](./interview-backend-security.md) — Bảo mật API (OWASP), thanh toán chống trùng, outbox, timeout, retry, circuit breaker
- [interview-backend-android-rn-swift.md](./interview-backend-android-rn-swift.md) — Backend, Android, React Native, Swift
- [interview-mobile.md](./interview-mobile.md) — Senior Mobile
- [interview-android.md](./interview-android.md) — Android: câu hỏi theo code nihongo-android, gồm cả Framework, Binder, Automotive
- [interview-java-dsa.md](./interview-java-dsa.md) — Java, OOP và 10 bài thuật toán gắn với app (lời giải Java đã chạy), kế hoạch luyện bài test lập trình
- [interview-react-native-senior.md](./interview-react-native-senior.md) — Senior React Native

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
