# Học Infra — Từ Project Này

> Học hạ tầng trên **chính thư mục `infra/`** và `docker-compose.yml` của project.
> Mọi lệnh đã chạy thật trên Windows + Docker Desktop. Các "case study" ở mục 4, 6, 7 là
> **sự cố có thật** (10/2026), kèm cách chẩn đoán từng bước.
>
> Tài liệu liên quan: lệnh Docker cơ bản ở [learn-docker.md](./learn-docker.md) · K8s ở
> [learn-kubernetes.md](./learn-kubernetes.md) · metric/trace/log ở [learn-observability.md](./learn-observability.md) ·
> Postgres nâng cao ở [learn-postgres.md](./learn-postgres.md) · chạy máy local ở [run-local.md](./run-local.md).

---

## 0. Bản đồ `infra/`

| Thư mục / file | Vai trò | Dùng khi |
|----------------|---------|----------|
| `nginx/` | Reverse proxy — cổng vào duy nhất `:8080`, chia request theo `Host` | luôn chạy (compose) |
| `postgres/` | Seed nội dung học (`nihongo-content-seed.sql`), script export, script sửa dữ liệu `fix-*.sql` | máy mới, sau khi sửa nội dung |
| `backups/` | Script `pg_dump` + bản dump đầy đủ (gồm user, payment) | trước khi làm việc nguy hiểm, chuyển máy |
| `keycloak/` | Realm `edu-app` (client `nihongo-web`, `nihongo-mobile`; role `user`/`teacher`/`admin`) | import khi Keycloak khởi động |
| `prometheus/` | Scrape `api-gateway:3000/metrics` mỗi 15s + luật cảnh báo `alerts.yml` | observability |
| `alertmanager/` | Gửi cảnh báo → Mailpit (dev) hoặc SMTP Brevo (thật) | observability |
| `grafana/` | Datasource + dashboard `api-gateway.json` provision sẵn | observability |
| `livekit.yaml` | Cấu hình server WebRTC (lớp học live) | tính năng live |
| `k6/` | `load-test.js` (20 VU, ngưỡng p95 < 500ms), `stress-test.js` | đo hiệu năng |
| `k8s/` | Manifest Kubernetes thuần + `jobs/prisma-migrate.job.yaml` | deploy cluster |
| `helm/edu-app/` | Cùng các manifest đó nhưng có tham số (`values.yaml`, `values.prod.yaml`) | deploy cluster nhiều môi trường |
| `terraform/` | Tạo hạ tầng DigitalOcean: droplet, Postgres managed, Redis managed, firewall | dựng môi trường cloud |
| `google-oauth/` | Mẫu `client_secret` cho đăng nhập Google | cấu hình OAuth |

Ba "tầng" cần phân biệt:

```
Chạy trên máy      : docker-compose.yml  + nginx/ postgres/ backups/ keycloak/ prometheus/ ...
Chạy trên cluster  : k8s/  hoặc  helm/edu-app/
Tạo ra máy/DB cloud: terraform/
```

---

## 1. Stack trông như thế nào

```
                 Trình duyệt / app mobile
                          │  http://localhost:8080   (Host: nihongo.localhost | auth.localhost | ...)
                          ▼
                    ┌───────────┐
                    │   nginx   │  edu-nginx
                    └─────┬─────┘
        /api, /health     │      /          /realms… hoặc Host: auth.localhost
          ┌───────────────┼──────────────┬──────────────────┐
          ▼               ▼              ▼
   ┌─────────────┐  ┌───────────┐  ┌──────────┐
   │ api-gateway │  │nihongo-web│  │ keycloak │──► postgres-keycloak
   │  NestJS:3000│  │ Next:5173 │  │  :8080   │
   └──────┬──────┘  └───────────┘  └──────────┘
          │ gRPC                 Prisma ┌──────────────────┐
          ├──────► content-service:50051 ─────────►│ postgres-nihongo │ (volume external
          ├──────► exam-service:50052    ─────────►│   DB nihongo     │  postgres_nihongo_data)
          ├──────► redis (cache, BullMQ)            └──────────────────┘
          ├──────► kafka (+ zookeeper)  — sự kiện
          ├──────► mongodb — audit log
          ├──────► livekit — phòng học live
          └──────► jaeger:4318 (trace)   ◄── prometheus scrape /metrics ──► alertmanager ──► mailpit
```

Luồng một request `GET /api/reference/textbooks`:

1. Trình duyệt gọi `localhost:8080` → **nginx** khớp `location /api/` → chuyển tới `api-gateway:3000`.
2. **Gateway** kiểm JWT, gọi **content-service** qua gRPC.
3. **content-service** đọc cache in-memory (TTL 5 phút, xem mục 6.4), hết hạn thì query **Postgres** bằng Prisma.

---

## 2. Cổng (port) — mở cái gì để xem cái gì

| Cổng máy | Dịch vụ | Ghi chú |
|----------|---------|---------|
| **8080** | nginx | **cửa chính**: app, API, Keycloak qua `auth.localhost:8080` |
| 3000 | api-gateway | gọi thẳng, bỏ qua nginx — dùng để khoanh vùng lỗi (mục 4) |
| 5173 | nihongo-web | frontend chạy thẳng |
| 8081 | keycloak | admin console |
| 5433 | postgres-nihongo | `psql -h localhost -p 5433 -U nihongo nihongo` |
| 5435 | postgres-keycloak | |
| 50051 / 50052 | content / exam (gRPC) | |
| 9090 / 9093 / 4000 | prometheus / alertmanager / grafana | |
| 16686 | jaeger UI | |
| 8025 | mailpit | hộp thư giả: mail xác thực, cảnh báo |
| 27017 / 9092 / 2181 | mongodb / kafka / zookeeper | |
| 7880–7881, 50100–50200/udp | livekit | WebRTC |

Redis **không** mở cổng ra máy — chỉ container trong mạng compose gọi được.

---

## 3. Compose: thứ tự khởi động, healthcheck, restart

Ba khái niệm hay bị hiểu nhầm:

| Khai báo | Nghĩa thật | Không làm gì |
|----------|-----------|--------------|
| `depends_on: { x: { condition: service_healthy } }` | Khi **`docker compose up`**, chờ `x` healthy rồi mới tạo container này | **Không** áp dụng khi Docker Desktop tự bật lại container lúc khởi động máy |
| `healthcheck:` | Docker chạy lệnh kiểm tra định kỳ, gắn nhãn `healthy`/`unhealthy` | **Không** tự restart container unhealthy |
| `restart: unless-stopped` | Tiến trình **thoát** → Docker bật lại | Tiến trình **treo** (vẫn sống) → Docker không làm gì |

Bảng healthcheck hiện tại (từ `docker compose config`):

```
Có healthcheck : postgres-nihongo, postgres-keycloak, redis, mongodb, zookeeper, kafka, keycloak, nginx (trong Dockerfile)
Không có       : api-gateway, content-service, exam-service, nihongo-web, prometheus, ...
```

Healthcheck của **nginx** gọi `wget http://127.0.0.1/health` — tức là đi xuyên qua nginx tới **gateway**.
Vì vậy `edu-nginx (unhealthy)` thường có nghĩa là **gateway** có vấn đề, không phải nginx.

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"     # xem healthy/unhealthy
docker inspect edu-nginx --format "{{json .State.Health}}"   # 5 lần check gần nhất + output
```

---

## 4. Case study: "Mở Docker lên là 502"

### Triệu chứng

```
GET http://localhost:8080/api/reference/textbooks   →   502 Bad Gateway
```

### Chẩn đoán — đi từ ngoài vào trong

**Bước 1. Ai trả 502?** 502 nghĩa là *nginx* không nói chuyện được với upstream. Đọc log nginx:

```powershell
docker logs --tail 20 edu-nginx
# connect() failed (111: Connection refused) while connecting to upstream,
#   upstream: "http://172.18.0.13:3000/api/reference/textbooks"
```

`Connection refused` = tới được máy nhưng **không có ai nghe cổng 3000**.
(Nếu là `504` / `timed out` thì upstream nghe nhưng trả lời quá chậm.)

**Bước 2. IP đó có đúng là gateway không?**

```powershell
docker inspect edu-gateway --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}"
# 172.18.0.13   → đúng. Không phải lỗi nginx giữ IP cũ.
```

**Bước 3. Gateway có nghe cổng không?** Vào *trong* container mà hỏi:

```powershell
docker exec edu-gateway netstat -tln
# chỉ có 127.0.0.11:xxxxx (DNS nội bộ Docker) — KHÔNG có :::3000
docker exec edu-gateway ps aux
# node dist/apps/api-gateway/.../main.js   ← tiến trình vẫn sống
```

→ Tiến trình **sống nhưng treo** trong lúc khởi động, chưa bao giờ gọi `app.listen()`.

**Bước 4. Vì sao treo?** Xem DB lúc đó:

```powershell
docker logs --tail 30 edu-postgres-nihongo
# FATAL:  the database system is starting up            (lặp lại ~2 phút)
# syncing data directory (fsync), elapsed time: 140.04 s
# database system was not properly shut down; automatic recovery in progress
```

Docker Desktop bị tắt không sạch → Postgres phải fsync + recovery gần 3 phút.
Trong lúc đó Docker Desktop bật lại **mọi** container cùng lúc (bỏ qua `depends_on`) →
gateway khởi động khi DB/Kafka chưa sẵn sàng và kẹt ở bước init.

### Vì sao không tự hồi phục?

- Gateway **không chết** → `restart: unless-stopped` không kích hoạt.
- Gateway **không có healthcheck** trong compose → Docker không biết nó hỏng.
- Restart bằng tay (`docker restart edu-gateway`) khi DB đã lên → chạy bình thường.

### Cách sửa đã áp dụng

Watchdog trong [`services/api-gateway/src/main.ts`](../services/api-gateway/src/main.ts):
nếu sau `STARTUP_TIMEOUT_MS` (mặc định 180 000 ms) chưa `listen()` được thì `process.exit(1)` →
Docker restart lại, lần sau DB đã sẵn sàng. Lỗi trong `bootstrap()` cũng `exit(1)` thay vì treo im lặng.

Nguyên tắc rút ra: **một tiến trình hỏng nên chết hẳn** (fail fast) để orchestrator (Docker, K8s) xử lý,
thay vì sống dở chết dở.

### Runbook ngắn

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"             # ai unhealthy / restarting?
docker logs --tail 30 edu-nginx                                 # 502 hay 504? upstream nào?
docker exec edu-nginx wget -qO- -T 3 http://api-gateway:3000/health   # nginx → gateway
curl.exe -s http://localhost:3000/health                        # máy → gateway (bỏ qua nginx)
docker exec edu-gateway netstat -tln                            # gateway có nghe :3000?
docker logs --tail 50 edu-postgres-nihongo                      # DB còn đang recovery?
docker restart edu-gateway                                      # khi DB đã "ready to accept connections"
```

---

## 5. Nginx: chia theo Host và mẹo `resolver`

[`infra/nginx/nginx.conf`](../infra/nginx/nginx.conf) có 2 `server` block, chọn theo header `Host`:

| Host | `/api/`, `/health` | `/` |
|------|--------------------|-----|
| `nihongo.localhost`, `localhost`, `10.0.2.2` | api-gateway:3000 | nihongo-web:5173 (+ `/realms` → Keycloak cho emulator Android) |
| `auth.localhost` | — | keycloak:8080 |

Mẹo quan trọng:

```nginx
resolver 127.0.0.11 valid=10s ipv6=off;      # DNS nội bộ của Docker

location /api/ {
    set $gateway_upstream api-gateway:3000;   # đưa tên vào BIẾN
    proxy_pass http://$gateway_upstream$request_uri;
}
```

- Viết thẳng `proxy_pass http://api-gateway:3000;` → nginx tra DNS **một lần lúc khởi động**.
  Khi gateway được tạo lại (IP đổi) nginx vẫn gọi IP cũ → 502 cho tới khi restart nginx.
  Tệ hơn: nếu lúc nginx khởi động gateway chưa tồn tại → nginx **không khởi động được**.
- Dùng **biến** → nginx tra DNS lúc chạy, cache 10s → tự theo IP mới.
- Hệ quả: khi dùng biến, phải tự nối `$request_uri` vào `proxy_pass`.

Kiểm tra cấu hình trước khi build:

```powershell
docker exec edu-nginx nginx -t
```

---

## 6. Dữ liệu Postgres — ba loại file SQL, đừng nhầm

| Loại | Ở đâu | Chứa | Tạo bằng | Nạp bằng |
|------|-------|------|----------|----------|
| **Migration** | `packages/prisma-nihongo/migrations/` | cấu trúc bảng (DDL) | `prisma migrate dev` | `npm run migrate:deploy -w @edu/prisma-nihongo` |
| **Content seed** | `infra/postgres/nihongo-content-seed.sql` | **chỉ** bảng nội dung học (Minna, KLL, JLPT…) | `npm run db:export-content` | `npm run seed -w @edu/prisma-nihongo` |
| **Full backup** | `infra/backups/nihongo_YYYYMMDD_HHMMSS.sql` (chỉ trên máy, **không commit** — [ADR-0009](adr/0009-db-backups-out-of-git.md)) | toàn bộ DB: user, payment, nội dung | `npm run db:backup` | `psql -f` (mục 6.2) |
| **Sửa dữ liệu** | `infra/postgres/fix-*.sql` | `UPDATE`/`DELETE` có chủ đích, bọc `BEGIN…COMMIT` | viết tay / sinh bằng script | `psql -v ON_ERROR_STOP=1 -f` |

**Nguồn sự thật là DB**, không phải seed. Seed chỉ là ảnh chụp để máy mới có dữ liệu.
Hệ quả: DB chạy lâu sẽ **lệch** khỏi seed (10/2026: DB có 13 973 từ vựng, seed chỉ 2 708).
Chạy `db:export-content` lúc DB đã lệch xa sẽ làm seed phình 3 MB → 23 MB — đó là quyết định riêng,
đừng để nó lẫn vào một commit sửa lỗi nhỏ.

Volume `postgres_nihongo_data` khai báo **external** → `docker compose down -v` **không** xoá được DB nihongo.
Đây là chủ ý: lỡ tay không mất dữ liệu.

### 6.1. Case study: backup bị "lỗi font"

File backup mở ra thấy:

```
12052	「自由（じゆう）」 nghĩa là gì?  tự do    ← đúng
12052	πÇîΦç¬τö▒∩╝ê...  nghĩa lφ g├¼?  tß╗▒ do   ← trong file backup
```

Kiểu hỏng này gọi là **mojibake**: byte UTF-8 bị đọc theo bảng mã khác rồi ghi lại thành UTF-8.

Thủ phạm là dòng cũ trong `backup.ps1`:

```powershell
docker exec edu-postgres-nihongo pg_dump -U nihongo nihongo | Set-Content -Path $file -Encoding utf8
```

PowerShell 5.1 không truyền byte qua pipe. Nó **giải mã** stdout của chương trình ngoài theo code page
của console (CP437) thành chuỗi .NET, rồi `Set-Content` mã hoá lại UTF-8 (kèm BOM, xuống dòng CRLF).
`ự` (UTF-8: `E1 BB B1`) → đọc CP437 thành `ß╗▒` → lưu thành 3 ký tự mới.

Cách nhận biết và khôi phục:

```powershell
Select-String -Path infra\backups\*.sql -Pattern 'ß╗' -List   # có kết quả = file đã hỏng
```

```python
# Hỏng kiểu này là đảo ngược được: encode lại CP437 → decode UTF-8
t = open(path, encoding='utf-8-sig').read().replace('\r\n', '\n')
open(path, 'w', encoding='utf-8', newline='\n').write(t.encode('cp437').decode('utf-8'))
```

Cách đúng — **không để byte đi qua PowerShell**: `pg_dump` ghi file ngay trong container rồi `docker cp` ra
(đã áp dụng trong [`backup.ps1`](../infra/backups/backup.ps1)):

```powershell
docker exec edu-postgres-nihongo pg_dump -U nihongo -f /tmp/backup.sql nihongo
docker cp edu-postgres-nihongo:/tmp/backup.sql infra\backups\nihongo_xxx.sql
docker exec edu-postgres-nihongo rm -f /tmp/backup.sql
```

`export-content-seed.ps1` không bị lỗi này vì nó đọc stdout bằng `ProcessStartInfo` với
`StandardOutputEncoding = UTF8` — một cách đúng khác.

### 6.2. Restore — cùng cái bẫy, chiều ngược lại

```powershell
# SAI — PowerShell mã hoá lại file trước khi đưa vào psql → chữ Việt/Nhật thành "?"
Get-Content infra\backups\nihongo_<ngày_giờ>.sql | docker exec -i edu-postgres-nihongo psql -U nihongo nihongo

# ĐÚNG
docker cp infra\backups\nihongo_<ngày_giờ>.sql edu-postgres-nihongo:/tmp/restore.sql
docker exec edu-postgres-nihongo psql -U nihongo -d nihongo -f /tmp/restore.sql
```

Dùng Git Bash thì `docker exec ... /tmp/x` bị Git Bash đổi thành `C:/Users/.../Temp/x`.
Tắt chuyển đổi đường dẫn bằng `MSYS_NO_PATHCONV=1`:

```bash
MSYS_NO_PATHCONV=1 docker exec edu-postgres-nihongo psql -U nihongo -d nihongo -f /tmp/restore.sql
```

### 6.3. Thử một file SQL trên DB tạm trước khi tin nó

```bash
export MSYS_NO_PATHCONV=1
P="docker exec -i edu-postgres-nihongo psql -U nihongo -v ON_ERROR_STOP=1 -q"
$P -d nihongo -c "CREATE DATABASE seedtest"
grep -v -E '^\\(un)?restrict' infra/backups/nihongo_schema_<ngày_giờ>.sql | $P -d seedtest
grep -v -E '^\\(un)?restrict' infra/postgres/nihongo-content-seed.sql            | $P -d seedtest
$P -d seedtest -c 'select count(*) from "Vocabulary"'
$P -d nihongo -c "DROP DATABASE seedtest"
```

`-v ON_ERROR_STOP=1` là bắt buộc: không có nó psql gặp lỗi vẫn chạy tiếp và **thoát mã 0**.
Dòng `\restrict` / `\unrestrict` do pg_dump 16.10+ sinh ra; bỏ đi khi nạp qua stdin.
Trong bash, đường ống `grep | docker exec` cho exit code của lệnh cuối — lấy exit code của psql bằng
`${PIPESTATUS[1]}`.

### 6.4. Sửa DB xong mà app vẫn hiện dữ liệu cũ

content-service cache kết quả trong bộ nhớ (`CacheModule`, `ttl: 300_000` trong
[`content.module.ts`](../services/content-service/src/content.module.ts)). Chờ 5 phút hoặc:

```powershell
docker restart edu-content
```

Đừng `FLUSHALL` Redis để "xoá cache": Redis ở đây chứa **hàng đợi BullMQ** (`bull:email-broadcast:*`), không phải
cache nội dung.

---

## 7. Case study: dữ liệu nhập từ ngoài sai từ gốc

Bảng `KanjiVocab` (Kanji Look and Learn) được cào từ một website. Script cào đọc lệch hàng:

```
Mục 入 (bài 7) trước khi sửa:            Sau khi sửa:
  人   = Lối vào, cửa vào     ✗           入口 いりぐち = Lối vào, cửa vào
  入学 = Nhập khẩu            ✗           入学 にゅうがく = Nhập học
  収入 = Thu nhập             ✓           収入 しゅうにゅう = Thu nhập
```

Lỗi nằm im từ commit đầu tiên tới khi có người học thấy `何曜日 = đồ giặt`. Có những chữ còn bị gán nhầm cả
mục (`管` thật ra là `官`, `琴` là `答`, `組` là `祖`). Chi tiết bản sửa: [`fix-kanji-vocab.sql`](../infra/postgres/fix-kanji-vocab.sql).

Bài học hạ tầng dữ liệu:

1. **Viết bất biến (invariant) thành câu SQL** và chạy sau mỗi lần import. Ví dụ "từ vựng của một chữ Hán phải
   chứa chữ đó":

   ```sql
   SELECT kv.id, ke.character, kv.word, kv."meaningVi"
   FROM "KanjiVocab" kv
   JOIN "KanjiEntry" ke ON ke.id = kv."kanjiEntryId"
   JOIN "KanjiLesson" kl ON kl.id = ke."lessonId"
   WHERE kl."lessonNumber" BETWEEN 1 AND 32
     AND position(ke.character IN kv.word) = 0;     -- trước: 459 dòng · sau: 0 dòng
   ```

2. **Giữ dữ liệu gốc** (raw) tách khỏi dữ liệu đã xử lý, để sửa parser rồi chạy lại được.
3. **Sửa bằng file `fix-*.sql` có `BEGIN … COMMIT`**, commit vào git: ai cũng xem lại được đã đổi gì,
   và chạy lại được trên máy khác.
4. Sửa xong thì cập nhật **cả ba nơi**: DB, seed, backup mới.

---

## 8. Observability trong `infra/` — tóm tắt

| Thành phần | File | Đang làm gì |
|------------|------|-------------|
| Prometheus | `prometheus/prometheus.yml` | scrape `api-gateway:3000/metrics` mỗi 15s |
| Luật cảnh báo | `prometheus/alerts.yml` | `ApiGatewayTargetDown` (up == 0 trong 2m), `ApiHighErrorRate`, `ApiHighLatencyP95`, `ApiGatewayRestarting`, `ApiEventLoopBlocked` |
| Alertmanager | `alertmanager/alertmanager.local.yml` | gửi mail vào Mailpit `:8025` |
| Grafana | `grafana/` | dashboard `api-gateway.json` tự nạp |
| Jaeger | (compose) | nhận trace OTLP ở `:4318`, UI `:16686` |

Với sự cố ở mục 4, `ApiGatewayTargetDown` **đúng ra** đã bắn sau 2 phút (gateway không nghe cổng → `up == 0`) —
nếu Prometheus + Alertmanager đang chạy, bạn có mail trong Mailpit trước cả khi mở trình duyệt.
Chi tiết RED/USE, SLO, cardinality: [learn-observability.md](./learn-observability.md).

---

## 9. Từ máy local lên cloud

```
docker-compose.yml  ──(dịch tay)──►  infra/k8s/*.yaml  ──(tham số hoá)──►  infra/helm/edu-app/
                                                                              ├─ values.yaml
                                                                              └─ values.prod.yaml
terraform/  ──►  DigitalOcean: droplet + Postgres managed (DB nihongo, english_learning) + Redis managed + firewall
```

Điểm đáng học:

- **Migration là Job riêng**, không nằm trong `k8s/*.yaml`
  ([`jobs/prisma-migrate.job.yaml`](../infra/k8s/jobs/prisma-migrate.job.yaml)): `backoffLimit: 0` (migration lỗi thì
  dừng hẳn, không thử lại mù), tên Job gắn git sha để mỗi lần deploy là một Job mới, chạy **trước** khi cập nhật
  Deployment.
- `k8s/` và `helm/` là hai bản của cùng một thứ — sửa một bên phải nhớ sửa bên kia
  (hoặc bỏ `k8s/`, chỉ giữ Helm).
- Trên K8s, chuyện "tiến trình treo không ai biết" ở mục 4 được giải bằng **liveness probe**: probe fail → kubelet
  giết Pod. Compose không có cơ chế tương đương, nên mới cần watchdog trong code.
- Terraform output có `postgres_app_password`, `postgres_uri` → **state file chứa secret**, không commit
  `terraform.tfstate`.

Đọc tiếp: [learn-kubernetes.md](./learn-kubernetes.md) (probe, HPA, rolling update), [learn-release-cicd.md](./learn-release-cicd.md).

---

## 10. Đo tải với k6

```powershell
# Docker Desktop: container gọi máy host qua host.docker.internal (--network host không dùng được trên Windows)
Get-Content infra\k6\load-test.js -Raw | docker run --rm -i -e BASE_URL=http://host.docker.internal:3000 grafana/k6 run -
```

`load-test.js`: tăng lên 20 VU trong 30s, giữ 1 phút, ngưỡng `http_req_duration p(95) < 500ms`; gọi
vocabularies, grammars, `/health`. Xem kết quả song song trên Grafana `:4000`.
Chi tiết: [learn-performance-k6.md](./learn-performance-k6.md).

---

## 11. Lỗi đang tồn tại (tìm thấy khi viết tài liệu này)

| # | Ở đâu | Lỗi | Hậu quả |
|---|-------|-----|---------|
| 1 | [`backups/backup.sh:3`](../infra/backups/backup.sh) | `set -euo pipefailo pipefail` — gõ nhầm | bash báo `pipefailo: invalid option name`, script dừng ngay, **không backup được** trên Linux/macOS |
| 2 | `docker-compose.yml` → `api-gateway` | không có `healthcheck` | `docker ps` không cho thấy gateway hỏng; chỉ thấy gián tiếp qua nginx unhealthy |
| 3 | `infra/k8s/` vs `infra/helm/` | hai bản manifest song song | dễ lệch nhau |

---

## Bài tập thực hành

1. **Đọc bản đồ.** Mở `http://localhost:8080/api/reference/textbooks`, rồi `http://localhost:3000/api/reference/textbooks`.
   Cái thứ hai bỏ qua lớp nào? Khi nào bạn cần gọi thẳng `:3000`?
2. **Tái hiện 502.** `docker stop edu-gateway`, gọi lại qua `:8080`. Đọc `docker logs edu-nginx` — thông báo
   có khác mục 4 không (`Connection refused` hay `host not found`)? Vì sao? `docker start edu-gateway` để khôi phục.
3. **Healthcheck cho gateway.** Thêm vào service `api-gateway` trong compose:
   `test: ['CMD', 'wget', '-qO-', 'http://127.0.0.1:3000/health/live']`. Kiểm tra `docker ps` hiện `(healthy)`.
   Sau đó đổi `depends_on` của `nginx` sang `condition: service_healthy`.
4. **Bẫy encoding.** Trong PowerShell 5.1 chạy
   `docker exec edu-postgres-nihongo psql -U nihongo -d nihongo -Atc "select meaning from \"Vocabulary\" where kanji='自由' limit 1" | Out-File t.txt`
   rồi mở `t.txt`. So với cách `docker exec ... -o /tmp/t.txt` + `docker cp`.
5. **Bất biến dữ liệu.** Viết câu SQL kiểm tra "mọi `ExerciseOption` đúng (`isCorrect = true`) phải có `text`
   bằng `Exercise.answer`". Chạy trên DB và giải thích kết quả.
6. **Sửa lỗi #1 ở mục 11** và chạy `bash infra/backups/backup.sh` trong Git Bash. File sinh ra có lỗi font không?
   (Gợi ý: bash `>` ghi byte nguyên vẹn.)
7. **Restore an toàn.** Tạo DB `restoretest`, nạp bản backup mới nhất vào đó theo mục 6.3, đếm số user, rồi xoá DB.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **6. DevOps và hạ tầng** — bài 4/9.

- Bài trước: [learn-nginx.md](./learn-nginx.md) — Nginx: reverse proxy cổng 8080, HTTPS, triển khai
- **Bài tiếp: [learn-kubernetes.md](./learn-kubernetes.md)** — Kubernetes qua infra/k8s + Helm: probe, HPA, rolling update

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
