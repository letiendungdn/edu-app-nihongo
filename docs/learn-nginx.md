# Học Nginx — áp vào EDU APP

Tài liệu học Nginx **bằng cấu hình thật** của project: [infra/nginx/nginx.conf](../infra/nginx/nginx.conf).
Học Docker trước nếu chưa quen: [learn-docker.md](./learn-docker.md) (bài này là bài số 1 trong mục "Học tiếp" của nó).

---

## 1. Nginx dùng để làm gì?

Nginx là một web server rất nhẹ. Trong thực tế, người ta dùng nó chủ yếu vào các việc sau:

| Vai trò | Nghĩa là | EDU APP có dùng? |
|---------|----------|------------------|
| **Reverse proxy** | Đứng trước các app, nhận request rồi chuyển tới đúng app phía sau | **Có** — việc chính |
| **Một cửa duy nhất** | Người dùng chỉ thấy 1 địa chỉ (`localhost:8080`), không cần biết có bao nhiêu service | **Có** |
| **HTTPS / TLS** | Giữ chứng chỉ, giải mã HTTPS rồi chuyển HTTP thường vào trong | Khi lên production |
| **Phục vụ file tĩnh** | Trả thẳng HTML/CSS/JS/ảnh, không cần Node | Không (Next.js tự lo) |
| **Cân bằng tải** | Chia request cho nhiều bản sao của cùng một app | Chưa (K8s lo việc này) |
| **Giới hạn** | Giới hạn dung lượng upload, timeout, tốc độ request | **Có** (`client_max_body_size`, `proxy_read_timeout`) |
| **Trang lỗi đẹp** | Trả trang/JSON thân thiện khi app phía sau chết | **Có** (503 "đang khởi động") |

Hình dung: nginx là **lễ tân tòa nhà**. Khách chỉ đến một cửa; lễ tân nhìn khách cần gì (đường dẫn, tên miền) rồi dẫn tới đúng phòng.

**Reverse proxy khác forward proxy:**
- Forward proxy (VPN, proxy công ty) đứng phía **người dùng**, giấu người dùng.
- Reverse proxy (nginx ở đây) đứng phía **server**, giấu các server bên trong.

---

## 2. Nginx trong EDU APP

```text
Trình duyệt / app mobile
    → http://localhost:8080            (cổng duy nhất mở ra ngoài cho web)
        → container edu-nginx (:80 bên trong)
            ├─ /api/sentence-practice  → nihongo-web:8080   (route AI nằm trên Next.js)
            ├─ /api/...                → api-gateway:3000   (NestJS)
            ├─ /health...              → api-gateway:3000
            ├─ /realms, /resources...  → keycloak:8080      (đăng nhập, cho máy ảo Android)
            ├─ /s3/...                 → s3:9090            (S3 giả lập: ảnh upload, chỉ dev)
            └─ /  (mọi thứ còn lại)     → nihongo-web:8080   (Next.js)

    → http://auth.localhost:8080       → keycloak:8080       (server block thứ hai)
```

Vì sao web **không** mở cổng riêng (5173 đã bỏ)?
- Chỉ một cửa vào thì cookie, CORS và đường dẫn `/api` đều cùng một origin, ít lỗi.
- Ai muốn vào web phải đi qua nginx, nên các quy tắc (giới hạn upload, trang 503) luôn được áp dụng.

URL thường dùng:

| Mục | URL |
|-----|-----|
| Web tiếng Nhật | http://localhost:8080 hoặc http://nihongo.localhost:8080 |
| API qua nginx | http://localhost:8080/api/... |
| Health của gateway | http://localhost:8080/health |
| Keycloak | http://auth.localhost:8080 |
| Gọi thẳng gateway, bỏ qua nginx | http://localhost:3000/api/... |

**Vì sao app Android hay dùng `:8080`?** Trong máy ảo Android, `10.0.2.2` là máy thật của bạn. App `nihongo-android` mặc định gọi `http://10.0.2.2:8080/api/`, tức đi qua nginx rồi tới gateway. Cùng địa chỉ đó nginx còn chuyển các đường dẫn của Keycloak (`/realms`…), nên đăng nhập trên máy ảo không cần phân giải tên `auth.localhost`. Expo và Flutter có thể trỏ thẳng `:3000`; xem [run-mobile.md](./run-mobile.md).

**Nginx không làm gì:** không kiểm tra JWT, không chứa logic nghiệp vụ (việc của api-gateway). Khi chạy `npm run dev:*` ngoài Docker cũng không cần nginx, vì frontend tự chuyển `/api` sang `:3000`.

Các file liên quan:

| File | Vai trò |
|------|---------|
| [infra/nginx/nginx.conf](../infra/nginx/nginx.conf) | Toàn bộ quy tắc định tuyến |
| [infra/nginx/Dockerfile](../infra/nginx/Dockerfile) | Image `nginxinc/nginx-unprivileged:1.30-alpine` (không chạy root) + vá gói Alpine + chép config + healthcheck |
| [docker-compose.yml](../docker-compose.yml) (service `nginx`) | Map cổng `8080:8080`, chờ gateway và web khỏe mới chạy |
| [infra/k8s/ingress.yaml](../infra/k8s/ingress.yaml) | Bản tương đương trên Kubernetes |

---

## 3. Đọc nginx.conf từng khối

### 3.1. `server` — một "website ảo"

```nginx
server {
    listen 8080;
    server_name nihongo.localhost localhost 10.0.2.2;
    client_max_body_size 10m;
    ...
}
```

- `listen 8080`: nghe cổng 8080 **bên trong container**, Docker map ra máy bạn cũng là 8080.
  - Vì sao không phải 80: nginx chạy bằng user thường (uid 101) cho an toàn, mà user thường không được mở cổng dưới 1024. Xem [learn-devsecops.md](learn-devsecops.md).
- `server_name`: nginx xem header `Host` của request để chọn server block.
  - `localhost`, `nihongo.localhost` → app tiếng Nhật.
  - `10.0.2.2` → địa chỉ máy thật khi nhìn từ máy ảo Android.
  - `auth.localhost` → rơi vào server block thứ hai (Keycloak).
- `client_max_body_size 10m`: upload quá 10 MB bị trả **413**.

### 3.2. `location` — chọn đường đi theo URL

Thứ tự nginx chọn `location` (rất hay bị hỏi phỏng vấn):

1. `location = /x` — **khớp chính xác**. Gặp là dùng luôn.
2. Tìm prefix **dài nhất** (`location /api/`, `location /`). Nếu prefix đó có `^~` thì dùng luôn, không xét regex.
3. Xét các `location ~ regex` **theo thứ tự trong file**. Regex đầu tiên khớp thắng.
4. Không regex nào khớp → dùng prefix dài nhất ở bước 2.

Áp vào project:

| Request | Location thắng | Lý do |
|---------|----------------|-------|
| `/nginx-health` | `= /nginx-health` | Khớp chính xác |
| `/api/sentence-practice` | `= /api/sentence-practice` | Khớp chính xác, thắng cả `/api/` |
| `/api/jlpt-prediction/likely` | `/api/` | Prefix dài nhất |
| `/health/ready` | `^~ /health` | Có `^~`, không xét regex |
| `/realms/edu-app/...` | `~ ^/(realms\|resources\|js\|robots\.txt)(/\|$)` | Regex khớp |
| `/srs`, `/jlpt/du-doan` | `/` | Không gì khác khớp |

### 3.3. `proxy_pass` — chuyển request đi

```nginx
location /api/ {
    set $gateway_upstream api-gateway:3000;
    proxy_pass http://$gateway_upstream$request_uri;
    ...
}
```

Điểm hay: **dùng biến** thay vì viết thẳng `proxy_pass http://api-gateway:3000;`.

- Viết thẳng: nginx tra DNS **một lần lúc khởi động**. Nếu lúc đó gateway chưa chạy, nginx báo `host not found in upstream` và **không lên được**. Nếu gateway được tạo lại và đổi IP, nginx vẫn gửi tới IP cũ.
- Dùng biến + `resolver 127.0.0.11 valid=10s;` (DNS nội bộ của Docker): nginx tra lại DNS khi cần, cache 10 giây. Nhờ vậy nginx lên được kể cả khi app phía sau chưa chạy.

Lưu ý khi dùng biến: nginx **không tự ghép đường dẫn** nữa, nên phải tự thêm `$request_uri` (như `/api/`). Riêng `location /` không có phần URI sau địa chỉ, nên nginx gửi nguyên URL gốc.

> **Bẫy dấu `/` cuối** (khi không dùng biến):
> `location /api/ { proxy_pass http://gw:3000; }` → `/api/users` gửi đi là `/api/users`.
> `location /api/ { proxy_pass http://gw:3000/; }` → `/api/users` gửi đi là `/users` (bị cắt `/api/`).
> Chỉ một dấu `/` mà ra 404.

### 3.4. Header gửi kèm

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

App phía sau chỉ thấy request **đến từ nginx**. Các header này cho app biết thông tin gốc:

| Header | Cho app biết | Dùng khi |
|--------|--------------|----------|
| `Host` | Tên miền người dùng gõ | Tạo link tuyệt đối, chọn tenant |
| `X-Real-IP` / `X-Forwarded-For` | IP thật của người dùng | Log, rate limit, chống spam |
| `X-Forwarded-Proto` | Người dùng vào bằng `http` hay `https` | Redirect, cookie `Secure` |

Keycloak còn cần `X-Forwarded-Host`, `X-Forwarded-Port` để sinh đúng URL đăng nhập. Ngoài ra, header token của Keycloak to, nên phải tăng `proxy_buffer_size 128k`. Nếu không, bạn sẽ gặp lỗi **502 "upstream sent too big header"**.

### 3.5. WebSocket

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

WebSocket bắt đầu bằng một request HTTP xin "nâng cấp" kết nối. Nginx mặc định không chuyển 2 header này, nên phải khai báo. Next.js dev (hot reload) và các tính năng realtime cần chúng.

### 3.6. Trang "đang khởi động" thay cho 502

```nginx
location / {
    ...
    error_page 502 504 = @web_starting;
}

location @web_starting {
    add_header Retry-After 5 always;
    return 503 '<!doctype html>... Hệ thống đang khởi động… <meta http-equiv="refresh" content="5"> ...';
}
```

- `@web_starting` là **named location**: không truy cập được từ URL, chỉ dùng nội bộ.
- Khi Docker Desktop vừa bật lại, nginx thường lên trước web/gateway. Lúc đó nginx gặp lỗi kết nối:
  - Trang web: thay vì 502 xấu, người dùng thấy trang "đang khởi động" và trang tự tải lại sau 5 giây.
  - API: trả JSON `503 SERVICE_STARTING` kèm `Retry-After`, frontend tự thử lại.
- `return 200 "ok"` ở `/nginx-health` là healthcheck của **riêng nginx**. Nó không phụ thuộc gateway, nên nginx không bị đánh dấu "unhealthy" chỉ vì gateway đang chết.

---

## 4. Triển khai trên máy (Docker Compose)

### 4.1. Image

```dockerfile
FROM nginxinc/nginx-unprivileged:1.30-alpine
USER root
RUN apk upgrade --no-cache          # vá thư viện Alpine (openssl, curl...) mà image gốc chưa kịp vá
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf
USER 101                            # trả về user nginx, không chạy root
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:8080/nginx-health || exit 1
```

- Image `nginx-unprivileged` là bản chính chủ của nginx, chạy sẵn bằng user thường. Đổi sang nó thì phải đổi `listen` thành 8080.
- Đừng ghim phiên bản quá cũ: bản 1.27 và 1.28 còn CVE CRITICAL trong chính nginx. Dependabot sẽ mở PR nâng phiên bản.

Config được **chép vào image** lúc build. Vì vậy, sau khi sửa `nginx.conf`, phải build lại image (hoặc dùng cách reload ở 4.3).

### 4.2. Lệnh hằng ngày

```bash
docker compose build nginx && docker compose up -d --no-deps nginx   # áp config mới
docker compose ps nginx                                             # xem trạng thái
docker logs -f edu-nginx                                            # log truy cập + lỗi
```

Đổi cổng ngoài (8080 đang bị chiếm), không cần sửa compose:

```bash
NGINX_HTTP_PORT=8081 docker compose up -d nginx
```

### 4.3. Kiểm tra config trước khi áp dụng

```bash
docker exec edu-nginx nginx -t          # kiểm tra cú pháp config đang có trong container
docker exec edu-nginx nginx -T | less   # in toàn bộ config nginx đang dùng
docker exec edu-nginx nginx -s reload   # nạp lại config, không ngắt kết nối đang có
```

Muốn thử nhanh mà không build lại, chép file vào container rồi kiểm tra và reload:

```bash
docker cp infra/nginx/nginx.conf edu-nginx:/etc/nginx/conf.d/default.conf
docker exec edu-nginx nginx -t && docker exec edu-nginx nginx -s reload
```

Cách này mất khi container bị tạo lại. Thử xong nhớ build lại image.

### 4.4. Thử từng route bằng curl

```bash
curl -i localhost:8080/nginx-health                       # 200 ok — nginx sống
curl -i localhost:8080/health                              # gateway trả lời qua nginx
curl -s "localhost:8080/api/jlpt-prediction/likely?level=n5&limit=3" | head -c 300
curl -sI localhost:8080/srs | head -1                      # trang Next.js
curl -sI -H "Host: auth.localhost" localhost:8080/ | head -1   # server block Keycloak
```

Mẹo `-H "Host: ..."`: giả lập tên miền khác mà không cần sửa `/etc/hosts`.

---

## 5. Triển khai thật trên VPS (một máy chủ Linux)

Mô hình phổ biến nhất cho dự án nhỏ:

```text
Internet ──443 HTTPS──▶ nginx trên VPS ──HTTP──▶ docker compose (web, gateway, keycloak…)
```

### Bước 1 — Trỏ tên miền

Tạo bản ghi DNS `A` cho `nihongo.example.com` và `auth.example.com`, trỏ về IP của VPS.

### Bước 2 — Chạy stack, không mở cổng app ra ngoài

Chỉ nginx được nghe cổng 80/443. Gateway, Postgres… chỉ nằm trong mạng Docker. Trên production, bỏ các dòng như `ports: '3000:3000'` và `'5433:5432'`, hoặc bind chúng vào `127.0.0.1`.

### Bước 3 — Cấu hình HTTPS

Cách đơn giản nhất: cài nginx thẳng lên VPS và lấy chứng chỉ miễn phí bằng Let's Encrypt.

```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d nihongo.example.com -d auth.example.com   # tự sửa config + tự gia hạn
```

Config mẫu sau khi có chứng chỉ:

```nginx
# HTTP → chuyển hết sang HTTPS
server {
    listen 80;
    server_name nihongo.example.com auth.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name nihongo.example.com;

    ssl_certificate     /etc/letsencrypt/live/nihongo.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nihongo.example.com/privkey.pem;

    client_max_body_size 10m;

    # Nén văn bản cho tải nhanh
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # Header bảo mật cơ bản
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff always;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;        # gateway publish ở 127.0.0.1:3000
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location / {
        proxy_pass http://127.0.0.1:8081;        # web publish ở 127.0.0.1:8081
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Áp config:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Cách khác:** giữ nguyên container `edu-nginx`, map thêm `443:443`, rồi mount chứng chỉ vào container. Cách này gọn trong compose, nhưng phải tự lo việc gia hạn chứng chỉ (ví dụ chạy thêm một container certbot). Một lựa chọn nữa là dùng Caddy hoặc Traefik, vốn tự lấy và gia hạn chứng chỉ.

### Bước 4 — Đổi URL public của app

Biến `NEXT_PUBLIC_KEYCLOAK_URL` và các biến tương tự đang để `http://auth.localhost:8080`. Lên thật phải đổi thành `https://auth.example.com` rồi **build lại web**: biến `NEXT_PUBLIC_*` được ghi cứng vào JS lúc build. Phía Keycloak cũng cần thêm redirect URI mới.

---

## 6. Trên Kubernetes: Ingress NGINX

Trên K8s, bạn không tự viết `nginx.conf`. Thay vào đó:

- Cài **ingress-nginx controller**: bản chất là nginx chạy trong cluster.
- Khai báo luật định tuyến bằng YAML `Ingress`. Controller tự sinh `nginx.conf` từ YAML đó.

Đối chiếu với [infra/k8s/ingress.yaml](../infra/k8s/ingress.yaml):

| Docker Compose (`nginx.conf`) | Kubernetes (`ingress.yaml`) |
|-------------------------------|-----------------------------|
| `server_name localhost` | `rules[].host: nihongo.example.com` |
| `location /api/ { proxy_pass api-gateway:3000 }` | `path: /api` → `service: api-gateway, port 3000` |
| `client_max_body_size 10m` | annotation `nginx.ingress.kubernetes.io/proxy-body-size: 10m` |
| `proxy_read_timeout 120s` | annotation `nginx.ingress.kubernetes.io/proxy-read-timeout` |
| Chứng chỉ trong `ssl_certificate` | `spec.tls` + cert-manager tự lấy Let's Encrypt |

> **Cổng của web:** image web nghe cổng **8080** (`ENV PORT=8080` trong `apps/nihongo-web/Dockerfile`), nên `containerPort`, `targetPort`, probe và port trong Ingress đều là 8080 (`infra/k8s/nihongo-web.yaml`, `ingress.yaml` và bản Helm). Trước đây các file này ghi 5173, là cổng của thời chạy dev bằng Vite; đã sửa ngày 03/11/2026.

---

## 7. Lỗi hay gặp và cách đọc

| Triệu chứng | Nghĩa | Kiểm tra |
|-------------|-------|----------|
| **502 Bad Gateway** | Nginx không kết nối được app phía sau | `docker compose ps`: app có chạy không? Đúng tên service, đúng cổng chưa? |
| **504 Gateway Timeout** | App nhận request nhưng trả lời quá lâu | Tăng `proxy_read_timeout` (route AI đang để 120s) hoặc sửa app chậm |
| **413 Request Entity Too Large** | Upload vượt `client_max_body_size` | Tăng giới hạn ở cả nginx và app |
| **404 chỉ khi đi qua nginx** | Đường dẫn bị cắt hoặc ghép sai | Xem lại bẫy dấu `/` ở 3.3 |
| `host not found in upstream` khi khởi động | `proxy_pass` viết thẳng tên service mà service chưa có | Dùng biến + `resolver` như project |
| **502 "upstream sent too big header"** | Header hoặc cookie quá to (Keycloak) | Tăng `proxy_buffer_size` / `proxy_buffers` |
| Đăng nhập xong bị chuyển về `http://` hoặc sai cổng | App không biết request gốc là HTTPS hoặc cổng 8080 | Gửi đủ `X-Forwarded-Proto/Host/Port` |
| Sửa `nginx.conf` mà không thấy đổi | Config nằm trong image, chưa build lại | `docker compose build nginx && docker compose up -d --no-deps nginx` |

Đọc log:

```bash
docker logs edu-nginx 2>&1 | grep -i error | tail -20    # lỗi nginx
docker logs edu-nginx 2>&1 | grep " 50[234] " | tail     # request bị 502/503/504
```

---

## 8. Bài tập trên stack này

1. Gọi `curl -i localhost:8080/health` và `curl -i localhost:3000/health`, rồi so sánh header. Header nào do nginx thêm vào?
2. Chạy `docker compose stop api-gateway`, rồi gọi `curl -i localhost:8080/api/jlpt-prediction/likely?level=n5`. Bạn nhận được gì, và khối config nào sinh ra câu trả lời đó? Nhớ bật lại gateway.
3. Thêm `location = /ping { return 200 "pong"; }`, kiểm tra bằng `nginx -t`, reload, rồi gọi thử.
4. Đổi `client_max_body_size` thành `1k`, rồi POST một file 2 KB. Bạn thấy mã lỗi gì? Nhớ trả lại `10m`.
5. Viết lại `location /api/` **không dùng biến**, rồi dừng gateway và khởi động lại nginx. Quan sát lỗi, giải thích vì sao project dùng biến.
6. Mở `infra/k8s/nihongo-web.yaml`, tìm mọi chỗ ghi cổng 8080 và giải thích vì sao probe cũng phải đổi theo khi đổi cổng app (xem mục 6).

---

## 9. Cheat sheet

```bash
# Áp config mới
docker compose build nginx && docker compose up -d --no-deps nginx

# Kiểm tra / nạp lại mà không dừng
docker exec edu-nginx nginx -t
docker exec edu-nginx nginx -s reload

# Xem config đang chạy, log
docker exec edu-nginx nginx -T | less
docker logs -f edu-nginx

# Thử route
curl -i localhost:8080/nginx-health
curl -sI -H "Host: auth.localhost" localhost:8080/
```

```text
Thứ tự location:  =  →  prefix dài nhất (^~ dừng)  →  regex theo thứ tự  →  prefix dài nhất
proxy_pass có "/" cuối  → cắt phần location khỏi URL
proxy_pass dùng biến    → cần resolver + tự thêm $request_uri
```

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **6. DevOps và hạ tầng** — bài 3/9.

- Bài trước: [learn-docker.md](./learn-docker.md) — Docker: image, container, volume, compose
- **Bài tiếp: [learn-infra.md](./learn-infra.md)** — Thư mục infra/, cổng, healthcheck và các sự cố thật

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
