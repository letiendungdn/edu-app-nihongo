# Câu hỏi phỏng vấn DevOps + Lộ trình học
> Ví dụ lấy từ project Nihongo thực tế

---

## DOCKER & CONTAINER

**Q: Container vs VM khác nhau thế nào?**

A: VM: virtualize hardware, có OS riêng, nặng (~GB), boot chậm (phút). Container: share OS kernel, isolate process, nhẹ (~MB), boot nhanh (giây).

Project Nihongo chạy local bằng Docker Compose: api-gateway + PostgreSQL + Redis + Kafka — 4 service khởi động trong vài giây thay vì cần 4 VM.

---

**Q: Dockerfile best practice — giải thích layer cache.**

A: Layer cache: lệnh ít thay đổi → để lên trên. `package.json` ít thay đổi hơn source code → copy trước → Docker cache layer install deps, không reinstall mỗi lần build.

```dockerfile
# services/api-gateway/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files TRƯỚC — layer này cache khi source code thay đổi
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm ci                    # cache layer này nếu package.json không đổi

# Copy source SAU — thay đổi thường xuyên hơn
COPY src/ ./src/
RUN npm run build

# Stage 2: runtime — image nhỏ, không có devDependencies
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules  # chỉ prod deps
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

Multi-stage: image cuối không có TypeScript source, devDependencies, build tools → nhỏ hơn ~60%.

---

**Q: `.dockerignore` cần thiết không?**

A: Bắt buộc — exclude `node_modules`, `.env`, `.git` khỏi build context. Nếu thiếu:
- `node_modules` (~500MB) copy vào build context → build chậm
- `.env` bị copy vào image → secrets leak nếu push lên registry

```
# .dockerignore
node_modules
dist
.env
.env.*
*.log
.git
coverage
```

---

**Q: Docker Compose trong project Nihongo dùng thế nào?**

A: Toàn bộ infrastructure local chạy bằng 1 lệnh:

```yaml
# docker-compose.yml
services:
  api-gateway:
    build: ./services/api-gateway
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/nihongo
      REDIS_URL: redis://redis:6379
      GEMINI_API_KEY: ${GEMINI_API_KEY}  # từ .env, không hardcode
      LIVEKIT_URL: ${LIVEKIT_URL}
    depends_on:
      db:
        condition: service_healthy    # chờ DB sẵn sàng mới start
      redis:
        condition: service_started

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: nihongo
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data  # persist data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine

  livekit:
    image: livekit/livekit-server:latest
    ports: ["7880:7880"]
    command: --dev  # dev mode, không cần cert

volumes:
  postgres_data:
```

---

## KUBERNETES (K8s)

**Q: Pod, Deployment, Service, Ingress — giải thích qua project Nihongo.**

A:
- **Pod**: 1 instance của api-gateway container
- **Deployment**: quản lý 3 replica api-gateway, rolling update, rollback
- **Service**: stable endpoint cho api-gateway (Pod IP thay đổi khi restart, Service IP không đổi)
- **Ingress**: route `api.nihongo.app → api-gateway Service`, `nihongo.app → frontend Service`

```yaml
# k8s/api-gateway-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels: { app: api-gateway }
  template:
    metadata:
      labels: { app: api-gateway }
    spec:
      containers:
        - name: api-gateway
          image: nihongo/api-gateway:1.2.0
          ports: [{ containerPort: 3000 }]
          env:
            - name: GEMINI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: nihongo-secrets
                  key: gemini-api-key   # không hardcode trong yaml
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef: { name: nihongo-secrets, key: database-url }
          resources:
            requests: { memory: "128Mi", cpu: "100m" }
            limits:   { memory: "256Mi", cpu: "500m" }
          readinessProbe:
            httpGet: { path: /health, port: 3000 }
            initialDelaySeconds: 5   # chờ NestJS bootstrap
          livenessProbe:
            httpGet: { path: /health, port: 3000 }
            initialDelaySeconds: 30  # chờ DB connection
```

---

**Q: Liveness vs Readiness Probe — project có `/health` endpoint không?**

A: Có — `health.controller.ts`:

```typescript
// services/api-gateway/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  ready() {
    // Kiểm tra DB và Redis có connect không
    return this.healthService.checkDependencies();
  }
}
```

```yaml
# Readiness: app sẵn sàng nhận traffic? (DB connected?)
readinessProbe:
  httpGet: { path: /health/ready, port: 3000 }
  initialDelaySeconds: 5

# Liveness: app còn sống? (không deadlock?)
livenessProbe:
  httpGet: { path: /health, port: 3000 }
  initialDelaySeconds: 30
```

Readiness fail → K8s không route traffic đến pod này (nhưng không restart).
Liveness fail → K8s restart pod.

---

**Q: Secret trong K8s — GEMINI_API_KEY, LIVEKIT_API_SECRET lưu thế nào?**

A: Không commit secret vào git. Dùng K8s Secret hoặc External Secrets Operator.

```bash
# Tạo secret từ .env file
kubectl create secret generic nihongo-secrets \
  --from-literal=gemini-api-key="$GEMINI_API_KEY" \
  --from-literal=livekit-api-secret="$LIVEKIT_API_SECRET" \
  --from-literal=database-url="postgresql://..."

# Hoặc dùng Sealed Secrets — encrypt secret, commit được lên git
kubeseal --format yaml < secret.yaml > sealed-secret.yaml
git add sealed-secret.yaml  # an toàn vì đã encrypt
```

---

**Q: Rolling update — deploy api-gateway version mới thế nào?**

A:
```bash
# Build và push image mới
docker build -t nihongo/api-gateway:1.3.0 ./services/api-gateway
docker push nihongo/api-gateway:1.3.0

# Update deployment — K8s tự rolling update
kubectl set image deployment/api-gateway api-gateway=nihongo/api-gateway:1.3.0

# Theo dõi rollout
kubectl rollout status deployment/api-gateway

# Rollback nếu có vấn đề
kubectl rollout undo deployment/api-gateway
```

K8s tạo pod mới (1.3.0) → wait readiness → terminate pod cũ (1.2.0). Zero downtime.

---

## CI/CD PIPELINE

**Q: GitHub Actions pipeline cho project Nihongo — viết hoàn chỉnh.**

A:
```yaml
# .github/workflows/api-gateway.yml
name: API Gateway CI/CD

on:
  push:
    branches: [main]
    paths: ['services/api-gateway/**']
  pull_request:
    paths: ['services/api-gateway/**']

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: nihongo_test }
        options: --health-cmd pg_isready --health-interval 5s
      redis:
        image: redis:7-alpine

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }

      - run: cd services/api-gateway && npm ci
      - run: cd services/api-gateway && npm run lint
      - run: cd services/api-gateway && npm run build
      - run: cd services/api-gateway && npm test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/nihongo_test
          REDIS_URL: redis://localhost:6379

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      # Build Docker image với tag = git SHA → immutable, traceable
      - run: |
          docker build -t nihongo/api-gateway:${{ github.sha }} \
                       -t nihongo/api-gateway:latest \
                       ./services/api-gateway

      # Push lên registry
      - uses: docker/login-action@v3
        with: { username: ${{ secrets.DOCKER_USER }}, password: ${{ secrets.DOCKER_TOKEN }} }
      - run: docker push nihongo/api-gateway:${{ github.sha }}

      # Deploy lên K8s
      - run: |
          kubectl set image deployment/api-gateway \
            api-gateway=nihongo/api-gateway:${{ github.sha }}
          kubectl rollout status deployment/api-gateway --timeout=120s
```

---

**Q: EAS Build cho Expo (nihongo-mobile) — CI/CD thế nào?**

A:
```yaml
# .github/workflows/expo.yml
name: Expo EAS Build
on:
  push:
    branches: [main]
    paths: ['apps/nihongo-mobile/**']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd apps/nihongo-mobile && npm ci
      - run: cd apps/nihongo-mobile && eas build --profile preview --non-interactive
        # Tạo APK → share link cho QA test ngay, không cần cài Android Studio
```

```json
// apps/nihongo-mobile/eas.json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }  // share APK link cho team
    },
    "production": {
      "android": { "buildType": "aab" },  // Google Play Store
      "ios": { "distribution": "store" }  // App Store
    }
  }
}
```

---

**Q: Flutter CI pipeline — project đã có gì?**

A:
```yaml
# .github/workflows/flutter.yml
name: Flutter CI
on:
  push:
    branches: [main]
    paths: ['apps/nihongo_flutter/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.27.x', cache: true }
      - run: cd apps/nihongo_flutter && flutter pub get
      - run: cd apps/nihongo_flutter && flutter analyze --fatal-infos
      - run: cd apps/nihongo_flutter && flutter test

  build-android:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.27.x', cache: true }
      - run: cd apps/nihongo_flutter && flutter build apk --release
      - uses: actions/upload-artifact@v4
        with:
          name: release-apk
          path: apps/nihongo_flutter/build/app/outputs/flutter-apk/app-release.apk
```

---

## MONITORING & OBSERVABILITY

**Q: Project Nihongo đã có Prometheus — HttpMetricsInterceptor làm gì?**

A: Đếm HTTP request theo method/path/status. Grafana query Prometheus để vẽ dashboard.

```typescript
// services/api-gateway/src/metrics/http-metrics.interceptor.ts
// Counter: http_requests_total{method="POST", path="/ai/chat", status="200"}
this.counter.inc({ method, path, status });

// Query Grafana:
// rate(http_requests_total{status=~"5.."}[5m])  → error rate
// histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))  → p99 latency
```

Cũng có Sentry (`instrument.ts`) và OpenTelemetry tracing (`tracing.ts`) trong project.

---

**Q: SLA, SLO, SLI cho API Gateway — ví dụ cụ thể.**

A:
- **SLI**: `(requests không có 5xx error) / total requests = 99.5%`
- **SLO**: 99.9% requests thành công mỗi tháng
- **SLA**: cam kết với user — vi phạm → refund/penalty

Error budget: 99.9% uptime → 0.1% downtime/tháng = ~43 phút được phép down.
Khi deploy AI feature mới (Gemini integration) → dùng error budget cho risk này.

---

**Q: Pino logger trong project dùng thế nào — tốt hơn console.log gì?**

A: Pino structured JSON logging, tốt hơn `console.log` vì:
- JSON format → dễ query trong Loki/ELK
- Không block event loop (async write)
- Log level filter (production chỉ `warn` + `error`)

```typescript
// services/api-gateway/src/main.ts
import { Logger as PinoLogger } from 'nestjs-pino';
app.useLogger(app.get(PinoLogger));

// Output: {"level":"info","msg":"API Gateway: http://localhost:3000","time":1234567890}
// Thay vì: [Nest] 123 - LOG Bootstrap: API Gateway: http://localhost:3000
```

---

## CLOUD (AWS/GCP)

**Q: Secrets trong production — GEMINI_API_KEY, LIVEKIT_API_SECRET lưu thế nào?**

A: Không hardcode, không commit vào git. Hierarchy:

```
Local dev:
  .env file (gitignored)
  GEMINI_API_KEY=xxx

CI/CD (GitHub Actions):
  GitHub Secrets → inject qua env trong workflow
  secrets.GEMINI_API_KEY

Production (K8s):
  AWS Secrets Manager / HashiCorp Vault
  → External Secrets Operator sync vào K8s Secret
  → Pod đọc từ K8s Secret env var
```

```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name prod/nihongo/gemini \
  --secret-string '{"api_key":"xxx"}'

# Rotate tự động mỗi 30 ngày
aws secretsmanager rotate-secret --secret-id prod/nihongo/gemini
```

---

**Q: Database trong production — RDS hay tự host PostgreSQL?**

A: RDS (managed) tốt hơn tự host vì: auto backup, multi-AZ failover, auto minor version update, không lo disk full. Nhược điểm: đắt hơn ~30%.

```
nihongo-db.cluster.ap-southeast-1.rds.amazonaws.com
  - Multi-AZ: primary (write) + replica (read)
  - Read heavy (vocab fetch) → dùng read replica
  - Write (SRS update, progress) → primary
```

**Q: S3 cho upload ảnh — presigned URL pattern trong project.**

A: Project đã có `upload.controller.ts`. Client upload thẳng lên S3, không qua server.

```typescript
// services/api-gateway/src/http/upload/upload.service.ts
async presign(userId: number, filename: string, mimeType: string) {
  const key = `uploads/${userId}/${Date.now()}-${filename}`;
  const uploadUrl = await this.s3.getSignedUrlPromise('putObject', {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: mimeType,
    Expires: 300,  // 5 phút TTL
  });
  return { uploadUrl, publicUrl: `https://${process.env.CDN_HOST}/${key}` };
}
```

---

## SECURITY

**Q: OWASP — project Nihongo đã protect những gì?**

A:
1. **Injection**: Prisma parameterized query → không SQL inject được
2. **Broken Access Control**: JWT Guard, `@Public()` decorator chỉ cho route public
3. **Security Misconfiguration**: `helmet()` trong main.ts set security headers
4. **Sensitive Data Exposure**: `toPublicUser()` strip `passwordHash` trước khi return
5. **CORS**: whitelist origin trong `app.enableCors()`

```typescript
// auth.service.ts — không bao giờ trả passwordHash ra ngoài
toPublicUser(user: PublicUserRow) {
  const { passwordHash, googleId, ...rest } = user;  // destructure + discard
  return { ...rest, hasPassword: !!passwordHash, isGoogleLinked: !!googleId };
}

// Prisma — không thể SQL inject
// ❌ NGUY HIỂM (nếu ai đó viết thế này)
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);
// ✅ An toàn — Prisma tự parameterize
await prisma.user.findUnique({ where: { email } });
```

---

## LỘ TRÌNH HỌC DEVOPS — 8 tháng

```
Tháng 1: Linux cơ bản
  - File system, permission, process, SSH
  - Bash scripting
  - Networking: TCP/IP, DNS, HTTP/HTTPS
  - Thực hành: SSH vào VPS, setup project chạy tay

Tháng 2: Docker
  - Dockerfile, image, container, volume, network
  - Docker Compose
  - Thực hành: Container hóa api-gateway + postgres + redis
    → docker compose up chạy được toàn bộ project

Tháng 3: CI/CD
  - GitHub Actions
  - Docker registry (Docker Hub / ECR)
  - Thực hành: Pipeline test → build image → push registry
    → Đã có trong project, hiểu và mở rộng thêm deploy step

Tháng 4: Cloud cơ bản (AWS)
  - EC2, S3, RDS, VPC, IAM
  - Thực hành: Deploy api-gateway lên EC2
    → S3 upload đã có trong project (upload.service.ts)

Tháng 5: Kubernetes
  - Pod, Deployment, Service, Ingress
  - Helm chart
  - Thực hành: Deploy project lên k3s (K8s local nhẹ)

Tháng 6: Monitoring
  - Prometheus + Grafana (đã có HttpMetricsInterceptor)
  - Loki cho logs (đã có Pino structured logging)
  - Thực hành: Dashboard request rate, error rate, latency p99

Tháng 7-8: Nâng cao
  - Terraform (IaC)
  - EKS / GKE
  - GitOps (ArgoCD)
```

**Certification:**
- **AWS Solutions Architect Associate** — phổ biến nhất, tăng lương tốt
- **CKA** (Certified Kubernetes Administrator) — nếu muốn K8s chuyên
- **Terraform Associate** — nếu thích IaC

---

## CÂU HỎI PHỎNG VẤN HAY GẶP

**Q: Deployment api-gateway bị lỗi — debug thế nào?**

A:
```bash
# 1. Pod đang ở trạng thái gì?
kubectl get pods -l app=api-gateway
# CrashLoopBackOff → container crash liên tục
# Pending → không schedule được (resource?)
# ImagePullBackOff → image không pull được

# 2. Xem event và resource
kubectl describe pod api-gateway-xxx

# 3. Log của container bị crash
kubectl logs api-gateway-xxx --previous

# 4. Rollback nếu cần
kubectl rollout undo deployment/api-gateway
```

**Q: NestJS app start chậm (30s) — nguyên nhân thường là gì?**

A: Thường do chờ DB connection. Fix: tách readiness probe (chờ DB) vs liveness probe (chỉ check process).

```typescript
// health.controller.ts
@Get('ready')
async ready() {
  // Chỉ return ok khi Prisma connect được
  await this.prisma.$queryRaw`SELECT 1`;
  return { status: 'ready' };
}

@Get()
check() {
  // Luôn return ok nếu process còn sống
  return { status: 'ok' };
}
```

**Q: Database migration trong production — không downtime thế nào?**

A: Expand-contract pattern:
1. **Expand**: thêm column `nullable` (không break app cũ)
2. Deploy code mới — read/write cả old và new column
3. Backfill data
4. **Contract**: remove old column (chỉ khi chắc code cũ không dùng nữa)

```sql
-- ❌ Break ngay: NOT NULL không có default
ALTER TABLE users ADD COLUMN display_name VARCHAR NOT NULL;

-- ✅ An toàn: nullable trước
ALTER TABLE users ADD COLUMN display_name VARCHAR;
-- Deploy code → backfill → sau đó mới add constraint
```

**Q: Container bị OOMKilled — xử lý thế nào?**

A:
```bash
# Xác nhận OOMKilled
kubectl describe pod api-gateway-xxx | grep OOMKilled

# Tăng memory limit tạm
kubectl set resources deployment/api-gateway --limits=memory=512Mi

# Profile memory — AiService giữ conversation history có thể tích lũy
# ai.service.ts: history.slice(-10) → giới hạn 10 messages, tránh leak
```

<!-- nav:start -->

---

## Đi tiếp

Tài liệu tham khảo thuộc **13. Phỏng vấn**. Cùng nhóm:

- [interview-questions.md](./interview-questions.md) — Bộ câu hỏi Senior chung
- [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md) — Backend NestJS, MQTT, DB
- [interview-backend-android-rn-swift.md](./interview-backend-android-rn-swift.md) — Backend, Android, React Native, Swift
- [interview-mobile.md](./interview-mobile.md) — Senior Mobile
- [interview-react-native-senior.md](./interview-react-native-senior.md) — Senior React Native

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
