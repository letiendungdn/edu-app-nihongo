# Học Docker — áp vào EDU APP

Tài liệu này dạy Docker **bằng chính stack của project**, không phải lý thuyết chung chung.
Mỗi mục đi theo cùng một khuôn:

- **Là gì:** giải thích bằng lời thường.
- **Trong project:** chỗ nào đang dùng nó.
- **Lệnh:** gõ gì, và kết quả trông ra sao.
- **Hay nhầm:** những lỗi người mới thường gặp.

Lệnh chạy full stack xem thêm [docker.md](./docker.md); nginx (cổng 8080) xem [learn-nginx.md](./learn-nginx.md).
Lệnh viết cho macOS/Linux (zsh, bash). Trên Windows dùng PowerShell, lệnh `docker` giống hệt, chỉ khác cách viết đường dẫn (`D:\...`).

---

## 1. Docker giải quyết vấn đề gì?

**Vấn đề.** Để chạy EDU APP "trần" trên máy, bạn phải tự cài:

- Node 22, Postgres 16, Redis, MongoDB, Kafka + Zookeeper, Keycloak, nginx…
- Đúng phiên bản, đúng cấu hình, đúng cổng.

Máy mỗi người một kiểu, nên rất hay gặp câu "chạy được trên máy tôi mà máy bạn lỗi".

**Docker làm gì.** Docker đóng gói **cả môi trường** thành một khối chạy được ở mọi máy có Docker. Một khối gồm:

- một hệ điều hành Linux rất nhỏ,
- runtime (Node, Postgres…),
- code và thư viện của app.

**So với máy ảo (VirtualBox, VMware):**

| | Máy ảo | Docker container |
|--|--------|------------------|
| Chứa gì | Cả một hệ điều hành đầy đủ | Chỉ app + thư viện, **dùng chung nhân (kernel) Linux** |
| Khởi động | Vài phút | Vài giây |
| Dung lượng | Hàng GB mỗi máy | Từ vài chục MB (nginx ~76 MB) |
| Chạy song song | Vài máy là nặng | Project này chạy ~23 container cùng lúc |

Trên Mac và Windows, Docker Desktop chạy ngầm **một** máy ảo Linux nhỏ, và mọi container nằm trong máy ảo đó. Đó là lý do Docker Desktop chiếm RAM ngay cả khi chưa chạy container nào.

**Trong project:** bạn không cài Postgres, Redis, Kafka bằng tay. File [docker-compose.yml](../docker-compose.yml) mô tả toàn bộ hệ thống, và một lệnh `docker compose up -d` dựng tất cả.

---

## 2. Ba khái niệm bắt buộc nhớ: Image, Container, Volume

### 2.1. Image — "bộ cài đặt" đóng băng

- **Là gì:** một gói **chỉ đọc**, chứa hệ điều hành nhỏ, runtime, code và lệnh khởi động. Image không chạy; nó chỉ là khuôn.
- **Ví dụ trong project:**
  - Image có sẵn, tải về từ Docker Hub: `postgres:16-alpine`, `nginx:1.30-alpine`.
  - Image tự build từ code: `edu-app-nihongo-web:latest` (~590 MB), `edu-app-api-gateway:latest`.
- **Tên image** có dạng `tên:tag`. Tag thường là phiên bản; `latest` chỉ là tag mặc định, **không** tự hiểu là "mới nhất".
- **Tiền tố `edu-app-`** đến từ dòng `name: edu-app` đầu file compose. Image được đặt tên theo kiểu `<tên project>-<tên service>`.

```bash
docker images | grep edu-app
# edu-app-nihongo-web   latest   ...   590MB
# edu-app-api-gateway   latest   ...   1.39GB
```

### 2.2. Container — image đang chạy

- **Là gì:** một tiến trình được tạo **từ** image, có thêm một lớp ghi riêng. Từ một image có thể tạo nhiều container.
- **Ví dụ trong project:** `edu-nihongo-web`, `edu-gateway`, `edu-postgres-nihongo`. Tên do `container_name:` trong compose đặt.
- **Điểm quan trọng:** mọi thứ ghi vào container (file tạm, log…) **mất khi container bị xóa**. Container dùng xong là bỏ, không phải chỗ để cất dữ liệu.

```bash
docker ps
# NAMES                  STATUS                 PORTS
# edu-nginx              Up 5 hours (healthy)   0.0.0.0:8080->80/tcp
# edu-postgres-nihongo   Up 5 hours (healthy)   0.0.0.0:5433->5432/tcp
```

### 2.3. Volume — ổ đĩa giữ dữ liệu bền

- **Là gì:** một vùng lưu trữ do Docker quản lý, **nằm ngoài** container, được gắn vào một thư mục bên trong container.
- **Vì sao cần:** Postgres ghi dữ liệu vào `/var/lib/postgresql/data`. Nếu chỗ đó nằm trong container, xóa container là mất cả DB. Gắn volume vào đó thì dữ liệu sống tiếp, container mới gắn lại volume cũ là thấy đủ dữ liệu.
- **Trong project:**

```yaml
# docker-compose.yml
postgres-nihongo:
  volumes:
    - postgres_nihongo_data:/var/lib/postgresql/data

volumes:
  postgres_nihongo_data:
    external: true                     # volume có sẵn, compose không tự tạo/xóa
    name: nihongo-app_postgres_data    # tên thật, giữ từ stack cũ "nihongo-app"
```

Toàn bộ từ vựng, kanji, ngữ pháp, đề thi, tài khoản đều nằm trong volume `nihongo-app_postgres_data`.

### 2.4. Ghép lại

```text
Dockerfile ──docker build──▶ Image ──docker run / compose up──▶ Container ◀──gắn── Volume
(công thức)                  (khuôn)                          (đang chạy)          (dữ liệu bền)
```

Ví von: Dockerfile là **công thức**, image là **bánh đông lạnh**, container là **bánh đang hâm trên bàn**, volume là **hộp cất đồ** không bị dọn khi dọn bàn.

**Hay nhầm:** file `.tar` mang trên USB **không phải** image đang chạy được. Nó chỉ là bản sao lưu. Phải `docker load` để thành image trên máy, rồi mới `compose up` (xem mục 8).

---

## 3. Lệnh tối thiểu

Chạy trong thư mục gốc của repo, nơi có `docker-compose.yml`.

### 3.1. Xem trạng thái

| Lệnh | Dùng để | Ghi chú |
|------|---------|---------|
| `docker ps` | Liệt kê container **đang chạy** | Cột `STATUS` có `(healthy)` nghĩa là healthcheck đạt |
| `docker ps -a` | Cả container **đã dừng** | Container `Exited (1)` là chạy lỗi rồi tắt; xem log của nó |
| `docker images` | Liệt kê image trên máy | |
| `docker compose ps` | Chỉ container thuộc stack này | Gọn hơn `docker ps` khi máy có project khác |
| `docker logs -f edu-gateway` | Xem log liên tục | `Ctrl+C` để thoát; `--tail 50` để chỉ xem 50 dòng cuối |
| `docker stats` | CPU/RAM từng container | Tìm container ngốn tài nguyên |

### 3.2. Chạy và dừng

| Lệnh | Làm gì | Dữ liệu |
|------|--------|---------|
| `docker compose up -d` | Tạo (nếu chưa có) và chạy mọi service | Giữ nguyên |
| `docker compose up -d nihongo-web` | Chạy một service **kèm các service nó phụ thuộc** | Giữ nguyên |
| `docker compose up -d --no-deps api-gateway` | Chạy **đúng** một service, không đụng phụ thuộc | Giữ nguyên |
| `docker compose stop` | Dừng, **giữ** container | Giữ nguyên |
| `docker compose start` | Chạy lại container đã `stop` | Giữ nguyên |
| `docker compose restart content-service` | Dừng rồi chạy lại một service (không build lại) | Giữ nguyên |
| `docker compose down` | Dừng **và xóa** container + mạng | Volume **vẫn còn** |
| `docker compose down -v` | Như trên **và xóa volume** | ⚠️ **Mất DB** |

`-d` (detached) nghĩa là chạy nền và trả lại cửa sổ lệnh. Thiếu `-d` thì log tràn màn hình, và `Ctrl+C` sẽ dừng luôn container.

**`stop/start` khác `down/up` thế nào:**

- `stop/start`: tắt rồi bật **đúng container cũ**, giống tắt máy rồi mở máy.
- `down/up`: xóa container rồi tạo container **mới** từ image. Bắt buộc dùng cách này khi đổi cấu hình trong compose (biến môi trường, cổng, volume), vì container cũ không tự nhận cấu hình mới.

### 3.3. Build lại sau khi sửa code

Code nằm **trong image** (được chép vào lúc build). Sửa file trong `apps/nihongo-web` thì container đang chạy **không** tự thấy thay đổi. Phải build image mới, rồi tạo container mới từ nó:

```bash
docker compose build nihongo-web                 # build image mới từ Dockerfile
docker compose up -d --no-deps nihongo-web       # thay container cũ bằng container mới
# hoặc gộp: docker compose up -d --build nihongo-web
```

Sửa gì thì build lại service nào:

| Bạn sửa | Cần làm |
|---------|---------|
| `apps/nihongo-web/**` | Build lại `nihongo-web` |
| `services/api-gateway/**` | Build lại `api-gateway` |
| `infra/nginx/nginx.conf` | Build lại `nginx` |
| Dữ liệu trong DB (chạy file seed `.sql`) | **Không** build gì; dữ liệu nằm trong volume. Chỉ restart service nào có cache (gateway cache kho câu 30 phút) |
| Biến môi trường trong `docker-compose.yml` | `docker compose up -d <service>` để tạo lại container |
| Biến `NEXT_PUBLIC_*` của web | **Build lại** web: biến này được ghi cứng vào JavaScript lúc build |

---

## 4. Docker Compose: chỉ huy cả dàn nhạc

### 4.1. Là gì

`docker run` chạy **một** container, và cấu hình phải gõ dài trên dòng lệnh. Compose cho phép mô tả **cả hệ thống** trong một file YAML: có những service nào, mỗi service dùng image gì, cổng nào, volume nào, service nào chờ service nào.

### 4.2. Đọc một service thật

```yaml
nihongo-web:                                   # (1) tên service
  build:                                       # (2) tự build image
    context: .
    dockerfile: apps/nihongo-web/Dockerfile
    args:
      NEXT_PUBLIC_KEYCLOAK_URL: ${NEXT_PUBLIC_KEYCLOAK_URL:-http://auth.localhost:8080}
  container_name: edu-nihongo-web              # (3) tên container cố định
  environment:                                 # (4) biến môi trường lúc chạy
    API_URL: http://api-gateway:3000
  volumes:                                     # (5) gắn thư mục từ máy vào
    - ./apps/nihongo-web/public/media/book-audio:/app/apps/nihongo-web/public/media/book-audio
  healthcheck:                                 # (6) cách kiểm tra "còn sống"
    test: ['CMD-SHELL', 'wget -qO /dev/null http://127.0.0.1:8080/ || exit 1']
  depends_on:                                  # (7) chạy sau service nào
    - api-gateway
  # (8) không có "ports:" — chỉ vào được qua nginx
```

1. **Tên service** là tên dùng trong lệnh `docker compose ...`, đồng thời là **tên máy** để các container khác gọi tới (`http://nihongo-web:8080`).
2. **`build`**: `context: .` gửi cả repo cho Docker làm nguyên liệu, `dockerfile` chỉ ra công thức. Service có `image: postgres:16-alpine` thay cho `build` thì chỉ tải image về, không build.
3. **`container_name`** đặt tên dễ nhớ cho `docker logs` hay `docker exec`. Thiếu dòng này, Docker tự đặt tên kiểu `edu-app-nihongo-web-1`.
4. **`environment`**: cấu hình lúc chạy. Cú pháp `${BIẾN:-mặc định}` lấy giá trị từ file `.env` hoặc shell; nếu không có thì dùng giá trị mặc định.
5. **`volumes`** có hai kiểu:
   - **Bind mount** (`./đường/dẫn:/trong/container`): gắn thư mục thật trên máy vào container. Sửa file trên máy thì container thấy ngay. Ở đây dùng cho file âm thanh.
   - **Named volume** (`postgres_nihongo_data:/var/lib/...`): ổ do Docker quản lý (mục 2.3).
6. **`healthcheck`**: lệnh Docker chạy định kỳ trong container. Lệnh trả về 0 thì container được đánh dấu `healthy`.
7. **`depends_on`**: thứ tự khởi động. Dạng `condition: service_healthy` (service `nginx` đang dùng) nghĩa là chờ service kia **khỏe** chứ không chỉ chờ nó **bật**. Nếu chỉ chờ bật, Postgres vừa start nhưng chưa nhận kết nối thì API đã chạy và báo lỗi.
8. **`ports`**: dạng `"máy:container"`. Ví dụ `5433:5432` nghĩa là máy bạn gọi cổng 5433 sẽ vào cổng 5432 của Postgres trong container. Web không có `ports` nên chỉ vào được qua nginx ở `localhost:8080`.

### 4.3. Tên service ≠ tên container

| Dùng ở đâu | Dùng tên nào | Ví dụ |
|------------|--------------|-------|
| `docker compose up/build/restart/logs` | **Tên service** | `docker compose restart api-gateway` |
| `docker logs/exec/inspect` (không có chữ `compose`) | **Tên container** | `docker logs edu-gateway` |
| Container gọi nhau qua mạng | **Tên service** | `http://api-gateway:3000` |

```bash
docker compose up -d nihongo-web       # ✅ tên service
docker compose up -d edu-nihongo-web   # ❌ "no such service"
```

### 4.4. Script có sẵn trong package.json

| Script | Tương đương |
|--------|-------------|
| `npm run docker:up:nihongo` | Chỉ chạy phần app tiếng Nhật: DB, Redis, Mongo, Kafka, S3 giả lập, content, exam, gateway, web, nginx |
| `npm run docker:up:infra` | Chỉ hạ tầng (DB, Redis, Mongo, Kafka), để chạy code bằng `npm run dev` ngoài Docker |
| `npm run docker:up` | Toàn bộ stack (~23 container: thêm Keycloak, Grafana, Jaeger, Airflow…) |
| `npm run docker:down` | `docker compose down` |

Máy yếu thì dùng `docker:up:nihongo`, không cần bật Grafana hay Airflow để học.

---

## 5. Mạng: request đi đâu khi mở app?

### 5.1. Đường đi

```text
Trình duyệt
  └─▶ http://localhost:8080                       (máy bạn)
        └─▶ edu-nginx :80                         (cổng 8080 của máy → 80 trong container)
              ├─▶ /           → edu-nihongo-web :8080   (Next.js)
              └─▶ /api/...    → edu-gateway :3000       (NestJS)
                                  ├─▶ gRPC → edu-content :50051
                                  ├─▶ gRPC → edu-exam    :50052
                                  └─▶ edu-postgres-nihongo :5432
```

### 5.2. Mạng nội bộ của Compose

Compose tạo một **mạng ảo riêng** (ở đây tên là `edu-app_default`) và cho mọi container vào đó. Trong mạng này:

- Mỗi container được gọi bằng **tên service**, vì Docker có DNS nội bộ dịch `api-gateway` thành IP của container.
- Các container gọi nhau **thẳng bằng cổng bên trong** (`5432`, `3000`), không cần khai báo `ports`.
- `ports` chỉ dùng để **máy bạn** gọi vào container.

### 5.3. `localhost` là ai?

Trong container, `localhost` là **chính container đó**, không phải máy Mac/Windows của bạn. Đây là lỗi số một của người mới.

| Ai gọi | Đúng | Sai | Vì sao sai |
|--------|------|-----|-----------|
| Web (trong container) → API | `http://api-gateway:3000` | `http://localhost:3000` | `localhost` là chính container web, mà trong đó không có gì nghe cổng 3000 |
| Gateway → Postgres | `postgres-nihongo:5432` | `localhost:5433` | 5433 là cổng **của máy bạn**, không phải trong mạng Docker |
| Máy bạn → API | `http://localhost:3000` hoặc `http://localhost:8080/api/...` | `http://api-gateway:3000` | Máy bạn không dùng DNS nội bộ của Docker |
| Máy bạn → Postgres (DBeaver, Prisma) | `localhost:5433` | `localhost:5432` | Cổng 5432 trên máy có thể là Postgres khác |
| Container → app chạy trên máy bạn (Ollama) | `http://host.docker.internal:11434` | `http://localhost:11434` | `host.docker.internal` là tên đặc biệt trỏ về máy thật |

---

## 6. Dockerfile: công thức build image

### 6.1. Image có sẵn và image tự build

| Loại | Ví dụ | Lấy ở đâu | Khi nào làm lại |
|------|-------|-----------|-----------------|
| Có sẵn | `postgres:16-alpine`, `redis`, `nginx`, `kafka` | `docker pull` từ Docker Hub | Gần như không; chỉ khi muốn nâng phiên bản |
| Tự build | `edu-app-nihongo-web`, `edu-app-api-gateway` | `docker compose build` từ Dockerfile | **Mỗi lần sửa code** |

Hậu tố `-alpine` là bản dựng trên Alpine Linux, rất nhỏ (vài MB). Image nhẹ hơn nhiều so với bản Debian.

### 6.2. Đọc Dockerfile của web

File: [apps/nihongo-web/Dockerfile](../apps/nihongo-web/Dockerfile). Nó dùng kỹ thuật **multi-stage**, tức hai giai đoạn.

**Giai đoạn 1 — `builder` (bếp nấu):**

```dockerfile
FROM node:22-alpine AS builder            # bắt đầu từ image có sẵn Node 22
WORKDIR /app                              # các lệnh sau chạy trong /app
COPY package.json package-lock.json ./    # chép file khai báo thư viện TRƯỚC
COPY packages/vocab-images ./packages/vocab-images
COPY apps/nihongo-web ./apps/nihongo-web
RUN npm ci                                # cài thư viện (cả devDependencies)
ARG NEXT_PUBLIC_KEYCLOAK_URL=...          # nhận giá trị từ compose (build.args)
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
RUN npm run build                         # next build → ra thư mục .next/standalone
```

**Giai đoạn 2 — `runner` (đĩa mang ra bàn):**

```dockerfile
FROM node:22-alpine AS runner             # bắt đầu lại từ image sạch
RUN apk add --no-cache libc6-compat ffmpeg
ENV NODE_ENV=production PORT=8080
COPY --from=builder /app/apps/nihongo-web/.next/standalone ./   # chỉ lấy THÀNH PHẨM
COPY --from=builder /app/apps/nihongo-web/.next/static ./apps/nihongo-web/.next/static
COPY --from=builder /app/apps/nihongo-web/public ./apps/nihongo-web/public
EXPOSE 8080                               # ghi chú: app nghe cổng 8080
CMD ["node", "apps/nihongo-web/server.js"]   # lệnh chạy khi container khởi động
```

**Vì sao chia hai giai đoạn:** giai đoạn 1 cần cả TypeScript, công cụ build và devDependencies, nặng hàng GB. Giai đoạn 2 chỉ chép bản build đã xong sang một image sạch. Kết quả là image web chỉ ~590 MB, và không mang theo mã nguồn hay công cụ build.

### 6.3. Các lệnh Dockerfile cần biết

| Lệnh | Ý nghĩa |
|------|---------|
| `FROM` | Image nền để bắt đầu |
| `WORKDIR` | Thư mục làm việc (tự tạo nếu chưa có) |
| `COPY` | Chép file từ repo (context) vào image |
| `RUN` | Chạy lệnh **lúc build** (cài đặt, biên dịch) |
| `ARG` | Biến chỉ có **lúc build**, nhận từ `build.args` |
| `ENV` | Biến môi trường, có cả lúc build lẫn lúc chạy |
| `EXPOSE` | Ghi chú cổng app nghe. **Không** tự mở cổng ra máy; mở cổng là việc của `ports` |
| `CMD` | Lệnh chạy **khi container khởi động** |
| `HEALTHCHECK` | Lệnh kiểm tra sức khỏe (ví dụ trong [infra/nginx/Dockerfile](../infra/nginx/Dockerfile)) |

### 6.4. Cache theo lớp — vì sao build lần hai nhanh

Mỗi lệnh trong Dockerfile tạo ra một **lớp** (layer). Khi build lại, Docker dùng lại các lớp có đầu vào không đổi, và chỉ chạy lại từ lớp đầu tiên có thay đổi trở đi.

Vì vậy Dockerfile thường chép `package.json` **trước** và chạy `npm ci`, rồi mới chép code. Nếu chỉ sửa code, lớp `npm ci` được dùng lại, và build nhanh hơn rất nhiều.

Cache build có thể phình rất to (máy này đang có ~39 GB cache). Cách dọn xem mục 9.

---

## 7. Volume: chỗ dữ liệu thật sự nằm

### 7.1. Xem volume

```bash
docker volume ls | grep nihongo
# nihongo-app_postgres_data          ← DB chính của app tiếng Nhật
# nihongo_postgres_keycloak_data     ← tài khoản đăng nhập Keycloak
# nihongo_mongodb_data

docker volume inspect nihongo-app_postgres_data   # xem nơi lưu, ngày tạo
```

### 7.2. Lệnh nào xóa dữ liệu?

| Lệnh | Container | Volume (DB) |
|------|-----------|-------------|
| `docker compose stop` | Còn | Còn |
| `docker compose down` | Xóa | **Còn** |
| `docker compose down -v` | Xóa | **Xóa** (volume `external` như DB nihongo thì được giữ, nhưng **đừng dựa vào điều đó**) |
| `docker volume rm <tên>` | — | **Xóa** |
| `docker system prune --volumes` | Xóa container đã dừng | **Xóa mọi volume không gắn container nào**, kể cả của project khác |

Quy tắc an toàn: **sao lưu trước** khi chạy bất cứ lệnh nào có chữ `-v`, `rm` hay `prune`.

### 7.3. Sao lưu và khôi phục DB

Project có sẵn script [infra/backups/backup.sh](../infra/backups/backup.sh):

```bash
bash infra/backups/backup.sh
# → infra/backups/nihongo_<ngày_giờ>.sql          (toàn bộ dữ liệu)
# → infra/backups/nihongo_schema_<ngày_giờ>.sql   (chỉ cấu trúc bảng)
```

Script này chỉ gọi `pg_dump` **bên trong** container rồi ghi kết quả ra máy:

```bash
docker exec edu-postgres-nihongo pg_dump -U nihongo nihongo > nihongo.sql
```

Khôi phục từ file `.sql`:

```bash
docker exec -i edu-postgres-nihongo psql -U nihongo -d nihongo < nihongo.sql
```

`-i` giữ đầu vào mở, để nội dung file `.sql` chảy vào `psql` trong container.

---

## 8. Mang image sang máy khác (USB, không có internet)

**Ý tưởng:** đóng các image thành một file `.tar`, chép sang máy kia, nạp vào Docker của máy đó.

**Máy A — xuất:**

```bash
docker save -o /Volumes/USB/edu-app-images.tar \
  edu-app-nihongo-web:latest edu-app-api-gateway:latest \
  edu-app-content-service:latest edu-app-exam-service:latest edu-app-nginx:latest
bash infra/backups/backup.sh       # nhớ mang theo cả DB (file .sql)
```

**Máy B — nạp rồi chạy:**

```bash
docker load -i /Volumes/USB/edu-app-images.tar
cd ~/Projects/edu-app-nihongo      # vẫn cần source để có docker-compose.yml
docker compose up -d
docker exec -i edu-postgres-nihongo psql -U nihongo -d nihongo < nihongo_<ngày_giờ>.sql
```

**Hay nhầm:**

- Không thể "chạy app thẳng từ USB". File `.tar` chỉ là gói vận chuyển.
- Máy B vẫn cần **source** (ít nhất là `docker-compose.yml` và thư mục `infra/`). Image chỉ thay cho bước build.
- Image **không chứa DB**. DB nằm trong volume, phải mang bằng file sao lưu.
- Máy Mac chip M (ARM) và máy Windows/Intel (x86) có kiến trúc khác nhau. Image build trên máy này có thể không chạy được trên máy kia; khi đó build lại trên máy đích.

---

## 9. Giải phóng ổ đĩa

Docker rất ăn ổ đĩa. Xem tổng quan trước khi dọn:

```bash
docker system df
# TYPE            TOTAL   ACTIVE   SIZE      RECLAIMABLE
# Images          32      30       24.21GB   924.5MB
# Build Cache     229     0        39.11GB   20.57GB    ← thường là thủ phạm lớn nhất
```

Dọn theo mức an toàn, từ an toàn nhất trở xuống:

| Lệnh | Xóa gì | Mức độ |
|------|--------|--------|
| `docker builder prune` | Cache build | An toàn. Lần build sau chậm hơn một chút |
| `docker image prune` | Image "lơ lửng" (`<none>`), sinh ra mỗi lần build lại | An toàn |
| `docker container prune` | Container đã dừng | Cẩn thận: có thể là container của project khác đang tạm tắt |
| `docker image prune -a` | Mọi image không có container nào dùng | Lần sau phải tải hoặc build lại |
| `docker system prune --volumes` | Tất cả những thứ trên **và volume** | ⚠️ Nguy hiểm: có thể mất DB |

Máy này còn có các project khác (ví dụ `edu-english-nginx`), nên đừng dọn kiểu "xóa hết".

**Riêng Windows:** Docker Desktop lưu mọi thứ trong một file đĩa ảo (`docker_data.vhdx`). Xóa image xong file này **không tự co lại**. Muốn lấy lại dung lượng trên ổ C:

1. Tắt Docker Desktop.
2. Compact file VHDX (cần quyền Admin, ví dụ bằng `diskpart` hoặc `Optimize-VHD`).
3. Bật lại Docker.

Nếu chuyển cả dữ liệu Docker sang USB, phải cắm USB **trước** khi bật Docker. Rút USB khi Docker đang chạy rất dễ làm hỏng volume.

---

## 10. Debug khi "không lên"

### 10.1. Quy trình 4 bước

1. **Container có chạy không?** Gõ `docker compose ps`. Container mang trạng thái `Exited`, `Restarting` hoặc `unhealthy` là thủ phạm.
2. **Nó nói gì?** Gõ `docker logs --tail 50 <tên container>`. Dòng lỗi thường nằm ở cuối.
3. **Gọi thẳng nó được không?** Ví dụ gọi `curl localhost:3000/health` để bỏ qua nginx. Nếu gọi thẳng chạy được mà qua 8080 lỗi, vấn đề nằm ở nginx.
4. **Vào trong xem:** `docker exec -it <tên container> sh`, rồi kiểm tra file, biến môi trường (`env`), mạng (`wget -qO- http://api-gateway:3000/health`).

### 10.2. Bảng triệu chứng

| Triệu chứng | Nguyên nhân thường gặp | Làm gì |
|-------------|------------------------|--------|
| `Cannot connect to the Docker daemon` | Docker Desktop chưa bật | Bật Docker Desktop, đợi biểu tượng báo đang chạy |
| `port is already allocated` | Cổng 8080/3000/5433 đã có app khác dùng | `lsof -i :8080` (Mac) để tìm app đó, rồi tắt nó hoặc đổi cổng (`NGINX_HTTP_PORT=8081`) |
| Trang 8080 báo "Hệ thống đang khởi động…" | Web hoặc gateway chưa lên xong | Đợi 30–60 giây; kiểm tra `docker compose ps` |
| Trang 8080 trắng hoặc 502 | Web chết | `docker logs edu-nihongo-web`, `docker logs edu-nginx` |
| Dữ liệu "Đang tải…" mãi | Gateway hoặc content-service lỗi | `docker logs edu-gateway`; thử `curl localhost:3000/api/lessons` |
| Sửa code mà không thấy đổi | Quên build lại, hoặc trình duyệt dùng cache | `docker compose up -d --build <service>`, rồi tải lại trang bằng `Cmd+Shift+R` |
| Container `Restarting` liên tục | App lỗi ngay khi khởi động (thiếu biến môi trường, sai URL DB) | `docker logs` xem lỗi đầu tiên |
| `no space left on device` | Hết ổ đĩa Docker | Mục 9 |
| `exec format error` | Image build cho kiến trúc CPU khác | Build lại trên máy đang dùng |

### 10.3. Vào bên trong container

```bash
docker exec -it edu-postgres-nihongo psql -U nihongo -d nihongo   # mở SQL
docker exec -it edu-nihongo-web sh                                 # mở shell
docker exec edu-gateway env | grep DATABASE                        # xem biến môi trường
docker inspect edu-gateway --format '{{.State.Health.Status}}'     # trạng thái healthcheck
```

`-it` = `-i` (giữ đầu vào) + `-t` (giả lập terminal). Bắt buộc khi muốn gõ lệnh tương tác.

---

## 11. Bài tập trên stack này

Làm lần lượt và ghi lại lệnh đã gõ. Mỗi bài có câu hỏi để tự kiểm tra.

1. **Nhận diện.** Chạy `docker compose ps`. Kể tên 3 container và việc của từng cái. Container nào không có cột cổng ra máy, và vì sao?
2. **Theo dấu request.** Mở `http://localhost:8080/srs`, rồi chạy `docker logs --tail 5 edu-nginx`. Request của bạn hiện lên ra sao?
3. **Build lại.** Sửa một chữ trên giao diện, chạy `docker compose up -d --build nihongo-web`, rồi tải lại trang. Chạy `docker images`: có image `<none>` mới xuất hiện không, và vì sao?
4. **Vào DB.** Chạy `docker exec edu-postgres-nihongo psql -U nihongo -d nihongo -c 'SELECT COUNT(*) FROM "Vocabulary";'`. Tại sao phải dùng `5433` khi kết nối từ máy, nhưng ở lệnh này không cần cổng?
5. **stop/start và down/up.** Chạy `docker compose stop nihongo-web` rồi `start`, sau đó xem cột `CREATED` trong `docker ps`. Làm lại với `docker compose rm -sf nihongo-web && docker compose up -d nihongo-web`. Cột đó khác gì?
6. **localhost.** Chạy `docker exec edu-nihongo-web wget -qO- http://localhost:3000/health`, rồi thay `localhost` bằng `api-gateway`. Giải thích kết quả.
7. **Sao lưu.** Chạy `bash infra/backups/backup.sh`, mở file `.sql` vừa tạo, tìm lệnh tạo bảng `"Vocabulary"`.

---

## 12. Cheat sheet

```bash
# Chạy app tiếng Nhật — mở http://localhost:8080
npm run docker:up:nihongo

# Trạng thái và log
docker compose ps
docker logs -f --tail 50 edu-gateway

# Sửa code → build lại một service
docker compose up -d --build nihongo-web
docker compose build api-gateway && docker compose up -d --no-deps api-gateway

# DB
docker exec -it edu-postgres-nihongo psql -U nihongo -d nihongo
bash infra/backups/backup.sh

# Dọn ổ đĩa an toàn
docker system df
docker builder prune

# Tắt (giữ DB) — KHÔNG thêm -v
docker compose down
```

**Năm ý cần nắm** để dùng Docker hằng ngày cho EDU APP:

1. **Image** là khuôn, **container** là bản đang chạy, **volume** giữ dữ liệu.
2. Sửa code thì phải **build lại** image. Sửa dữ liệu DB thì không cần.
3. Trong container, **`localhost` là chính nó**. Gọi service khác bằng **tên service**.
4. Lệnh `compose` dùng **tên service**; `docker logs/exec` dùng **tên container**.
5. Thấy `-v`, `rm`, `prune` thì **sao lưu trước**.

---

## 13. Học tiếp

Xong Docker, đi tiếp nhóm **DevOps và hạ tầng** theo thứ tự dưới đây. Mỗi bài dựa trên bài trước, và đều học trên chính stack này.

| Thứ tự | Tài liệu | Học gì | Vì sao học sau bài trước |
|--------|----------|--------|--------------------------|
| **1** | [learn-nginx.md](./learn-nginx.md) | Reverse proxy cổng 8080, đọc `nginx.conf`, HTTPS, triển khai lên VPS | Là "cửa vào" của mọi container bạn vừa học |
| 2 | [learn-infra.md](./learn-infra.md) | Thư mục `infra/` và các sự cố thật của stack, cách chẩn đoán từng bước | Áp kỹ năng debug ở mục 10 vào lỗi thật |
| 3 | [learn-kubernetes.md](./learn-kubernetes.md) | Manifest `infra/k8s/`, Helm chart, chạy nhiều bản sao | Bước tiếp theo của Compose khi lên production |
| 4 | [learn-release-cicd.md](./learn-release-cicd.md) | `ci.yml`, `deploy.yml`: build image tự động, deploy, rollback | Tự động hóa những lệnh `build` / `up` bạn đang gõ tay |
| 5 | [learn-observability.md](./learn-observability.md) | Log, metric (Prometheus, Grafana), trace (Jaeger) | Biết container đang làm gì mà không phải đọc `docker logs` mãi |
| 6 | [learn-incident-postmortem.md](./learn-incident-postmortem.md) | Xử lý sự cố, viết postmortem | Dùng log/metric vừa học để xử lý sự cố thật |

Volume ở mục 7 chứa gì và truy vấn chạy nhanh hay chậm: học ở nhóm **Cơ sở dữ liệu**, bắt đầu từ [learn-sql.md](./learn-sql.md).
Mọi nhóm khác (backend, cloud, mobile…) xem [mục lục tài liệu](./README.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **6. DevOps và hạ tầng** — bài 2/9.

- Bài trước: [learn-devops-roadmap.md](./learn-devops-roadmap.md) — Lộ trình 16 tuần: nối các bài DevOps thành đường đi có thứ tự
- **Bài tiếp: [learn-nginx.md](./learn-nginx.md)** — Nginx: reverse proxy cổng 8080, HTTPS, triển khai

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
