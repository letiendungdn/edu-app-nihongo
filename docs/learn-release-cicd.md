# Học CI/CD & Release — Từ Project Này

> Viết code xong mới được nửa việc; senior chịu trách nhiệm **đưa nó lên production an toàn và lùi lại được**.
> Project có [`ci.yml`](../.github/workflows/ci.yml) và [`deploy.yml`](../.github/workflows/deploy.yml) — tài liệu soát
> chúng, chỉ ra 4 lỗ hổng thật và cách sửa.

> **Cập nhật 2026-09-29 — cả 4 lỗ hổng ở mục 2 đã sửa** trong [`deploy.yml`](../.github/workflows/deploy.yml):
> deploy chỉ chạy khi CI xanh (`workflow_run`) và build đúng commit đó; image gắn tag `:<sha>` ngay khi apply; image
> `migrator` ([`Dockerfile.migrate`](../packages/prisma-nihongo/Dockerfile.migrate)) chạy Job migrate **trước** khi đổi code
> ([`prisma-migrate.job.yaml`](../infra/k8s/jobs/prisma-migrate.job.yaml)); bỏ `replicas` cho api-gateway; chờ rollout cả 4
> Deployment, lỗi thì `rollout undo`; smoke test `/health/ready`; SSH fallback kiểm tra `/health` (trước đây `/api/health` luôn 404).
> Workflow qua `actionlint`.
> - **Branch protection** `main` (bật qua GitHub API): PR phải qua 3 check `security`, `backend`, `nihongo-web`;
>   cấm force push / xoá nhánh; admin vẫn push thẳng được.
> - **Feature flag** (mục 4): bảng `FeatureFlag`, `GET /api/feature-flags`, admin `PATCH /api/admin/feature-flags/:key`,
>   hook web `useFeatureFlag` — ô "Tra từ trên mọi bài" đã chạy sau cờ `vocab-search-all-lessons`.
> - CI trên `main` từng đỏ vì `package-lock.json` lệch `package.json` (`npm ci` lỗi EUSAGE) → lockfile đã đồng bộ lại.

## 1. Pipeline hiện tại

```
push / PR ──▶ ci.yml
               ├─ backend : npm ci → prisma generate → migrate deploy (DB CI) → lint → test+coverage → e2e → build
               └─ nihongo-web : lint → test → build

push main ──▶ deploy.yml
               ├─ build-and-push (matrix 5 image) → ghcr.io/…/<service>:latest và :<git sha>
               ├─ deploy : kubectl apply namespace, secret, rồi mọi file infra/k8s/*.yaml
               │            → kubectl rollout status deployment/api-gateway
               └─ deploy-ssh-fallback (khi deploy lỗi): git pull + docker compose up
```

Điểm tốt đã có: CI chạy test với Postgres/Redis thật; image gắn **cả tag `:<sha>`**; secret lấy từ GitHub Secrets;
có bước chờ rollout; cache build theo từng service.

---

## 2. Bốn lỗ hổng thật

### 2.1. Deploy **không chờ CI**

`deploy.yml` chạy khi `push main` — **song song và độc lập** với `ci.yml`. Test đỏ vẫn deploy.

```yaml
# deploy.yml — chỉ chạy khi workflow CI trên main đã xanh
on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]
jobs:
  build-and-push:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
```

Kèm **branch protection** cho `main`: bắt buộc PR + CI xanh + 1 review mới được merge.

### 2.2. Image `:latest` → `kubectl apply` **không** cập nhật pod

Manifest: `image: ghcr.io/letiendungdn/edu_app/api-gateway:latest` + `imagePullPolicy: Always`.
Build mới vẫn tên `:latest` → manifest **không đổi một ký tự** → `kubectl apply` báo `unchanged` → **không rollout** →
pod cũ vẫn chạy code cũ (chỉ pod nào tình cờ bị restart mới kéo image mới) → mỗi pod một phiên bản khác nhau.

```yaml
# deploy job — dùng tag bất biến vừa build
- name: Roll out exact version
  run: |
    for svc in api-gateway content-service exam-service nihongo-web; do
      kubectl set image deployment/$svc $svc=${{ env.IMAGE_PREFIX }}/$svc:${{ github.sha }} -n edu-app
    done
    for svc in api-gateway content-service exam-service nihongo-web; do
      kubectl rollout status deployment/$svc -n edu-app --timeout=300s
    done
```

Quy tắc: **production không bao giờ chạy `:latest`**. Tag = git sha → biết chính xác commit nào đang chạy, lùi lại
bằng cách đặt lại sha cũ. (Với Helm: `--set image.tag=${{ github.sha }}`.)

### 2.3. Production **không bao giờ chạy migration**

CI chạy `migrate deploy` trên DB **của CI**; Dockerfile chỉ `CMD node dist/...main.js`; manifest K8s và `deploy.yml`
không có bước migrate. → Deploy code cần cột mới lên DB chưa có cột → **500 hàng loạt**.

```yaml
# infra/k8s/migrate-job.yaml — chạy TRƯỚC khi cập nhật Deployment
apiVersion: batch/v1
kind: Job
metadata:
  name: prisma-migrate-${GIT_SHA}
  namespace: edu-app
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: ghcr.io/letiendungdn/edu_app/migrator:${GIT_SHA}   # image có prisma CLI + thư mục migrations
          command: ["npx", "prisma", "migrate", "deploy", "--schema", "packages/prisma-nihongo/schema.prisma"]
          envFrom: [{ secretRef: { name: edu-app-secrets } }]
```

```yaml
- name: Migrate database
  run: |
    envsubst < infra/k8s/migrate-job.yaml | kubectl apply -f -
    kubectl wait --for=condition=complete job/prisma-migrate-${GIT_SHA} -n edu-app --timeout=300s
```

Migration fail → job fail → **dừng deploy** trước khi đụng tới pod đang chạy.

> Đừng chạy `migrate deploy` trong `CMD` của mỗi pod: 5 pod khởi động = 5 tiến trình migrate cùng lúc (Prisma có khoá
> advisory nhưng pod sẽ khởi động chậm, crash loop khi migration lỗi).

### 2.4. `replicas: 2` trong manifest đánh nhau với HPA

HPA scale `api-gateway` 2–5 theo CPU. Mỗi lần deploy, `kubectl apply` file có `replicas: 2` → **ép về 2 pod** ngay giữa
giờ cao điểm. Khi đã có HPA: **xoá `replicas`** khỏi Deployment, để HPA quyết định. Chi tiết: [learn-kubernetes.md](./learn-kubernetes.md).

---

## 3. Migration không làm gián đoạn: expand → migrate → contract

Trong lúc rolling update, **code cũ và code mới chạy cùng lúc** trên **cùng một DB**. Mọi migration phải để cả hai phiên
bản cùng chạy được.

Ví dụ đổi `DailyActivity.date` từ `text` sang `date` (bài tập ở [learn-db-design.md](./learn-db-design.md)):

```
❌ Một bước: ALTER COLUMN date TYPE date   → code cũ đang ghi chuỗi → lỗi trong lúc rollout

✅ Release 1 (expand)  : thêm cột "day" DATE NULL; code ghi CẢ HAI cột, vẫn đọc cột cũ
✅ Backfill            : UPDATE ... SET "day" = "date"::date WHERE "day" IS NULL  (theo lô 1000 dòng)
✅ Release 2 (migrate) : code đọc cột mới; vẫn ghi cả hai
✅ Release 3 (contract): code thôi ghi cột cũ; migration xoá cột "date", đặt NOT NULL cho "day"
```

| Thao tác | An toàn một bước? |
|----------|-------------------|
| Thêm bảng, thêm cột NULL, thêm index `CONCURRENTLY` | ✅ |
| Thêm cột NOT NULL có DEFAULT hằng số (Postgres ≥ 11) | ✅ |
| Xoá cột / đổi tên cột / đổi kiểu | ❌ expand–contract |
| Thêm NOT NULL / UNIQUE lên bảng lớn | ⚠️ khoá bảng — làm ngoài giờ hoặc tạo index CONCURRENTLY trước |
| Migration chạy UPDATE dữ liệu theo nội dung | ⚠️ trên DB mới tinh nó chạy lúc bảng trống (bài học `textbook_lessons` — learn-db-design mục 11) |

---

## 4. Chiến lược release

```
Rolling (mặc định K8s) : thay dần từng pod. Rẻ; có lúc 2 phiên bản song song (→ mục 3)
Blue/Green            : dựng đủ bộ mới, chuyển toàn bộ traffic một lần. Lùi lại tức thì; tốn gấp đôi tài nguyên
Canary                : 5% traffic → theo dõi lỗi/p95 → 25% → 100%. An toàn nhất; cần metric tốt (learn-observability)
Feature flag          : deploy code nhưng TẮT tính năng; bật cho admin → 10% user → tất cả. Tách "deploy" khỏi "release"
```

Feature flag tối giản cho project (bảng cấu hình + cache Redis) đủ để: bật tính năng mới cho tài khoản admin trước,
tắt ngay khi có lỗi **mà không cần deploy lại**.

```ts
if (await this.flags.isOn("vocab-search-v2", user)) { return this.searchV2(q); }
return this.searchV1(q);
```

Nhớ **dọn flag** sau khi bật 100% — flag cũ là nợ kỹ thuật.

---

## 5. Rollback

```powershell
kubectl rollout history deployment/api-gateway -n edu-app
kubectl rollout undo deployment/api-gateway -n edu-app                # về bản trước
kubectl rollout undo deployment/api-gateway -n edu-app --to-revision=7
```

Rollback code dễ; **rollback DB khó**. Vì thế:

- Migration phải **tương thích ngược** (mục 3) → lùi code về bản trước vẫn chạy được với schema mới.
- Prisma không có "down migration" — lùi schema = viết migration mới đảo ngược, hoặc restore backup
  (`infra/backups/`, xem mục Backup trong [db-design.md](./db-design.md)).
- Có **tiêu chí rollback** viết sẵn: "5xx > 2% trong 5 phút sau deploy → rollback, không cần hỏi ai".

---

## 6. Pipeline mục tiêu

```
PR  : lint → unit test → e2e → build → gitleaks + npm audit → (preview env)
main: CI xanh ──▶ build image :sha ──▶ migrate job ──▶ set image :sha (rolling)
                                           │                  │
                                           ▼                  ▼
                                   fail → dừng, báo     rollout status + smoke test (/health/ready, 1 luồng đăng nhập)
                                                               │
                                                        fail → rollout undo + báo
```

---

## Bài tập thực hành

1. Sửa `deploy.yml` chỉ chạy khi CI thành công (2.1); bật branch protection cho `main`.
2. Chứng minh lỗi 2.2: deploy 2 lần với `:latest`, chạy `kubectl get pods -o jsonpath='{..imageID}'` xem digest các pod.
   Sửa bằng `kubectl set image …:<sha>`.
3. Viết image `migrator` + Job migrate (2.3), gắn vào `deploy.yml` trước bước cập nhật image.
4. Xoá `replicas` khỏi `api-gateway.yaml` (2.4). Scale lên 4 bằng tải giả, deploy lại, kiểm tra vẫn còn 4.
5. Lên kế hoạch expand–contract (mục 3) cho việc đổi tên `Vocabulary.meaning` → `meaningVi`, ghi rõ từng release.
6. Thêm bước smoke test sau rollout, tự `rollout undo` nếu fail.
7. Cài một feature flag đơn giản và dùng nó để phát hành ô "Tra từ trên mọi bài" chỉ cho admin trước.

<details>
<summary>Gợi ý đáp án</summary>

1. Dùng `on: workflow_run` như mục 2.1; lưu ý `workflow_run` checkout mặc định là nhánh mặc định — dùng
   `ref: ${{ github.event.workflow_run.head_sha }}` ở `actions/checkout` để build đúng commit đã test.
2. Hai pod khác `imageID` (digest khác) = đang chạy 2 phiên bản. Sau khi dùng `:sha`, `kubectl rollout history` ghi mỗi
   lần deploy thành một revision — thứ mà `:latest` không làm được.
3. Dockerfile `migrator`: `FROM node:22-alpine`, copy `package*.json`, `packages/prisma-nihongo`, `npm ci --omit=dev`
   phần prisma, `CMD` như Job. Tên Job gắn sha để mỗi deploy một Job mới (Job cũ không chạy lại khi `apply`).
4. HPA đọc `replicas` hiện tại làm điểm xuất phát; khi manifest không còn `replicas`, `kubectl apply` không đụng tới trường
   đó (nhờ three-way merge) → số pod do HPA đặt được giữ nguyên.
5. R1: thêm `meaningVi` NULL, code ghi cả 2, đọc `meaning`; backfill `meaningVi = meaning`. R2: đọc `meaningVi`.
   R3: thôi ghi `meaning`; migration đặt `meaningVi` NOT NULL rồi xoá `meaning`. Search/seed/export cũng phải đổi ở R2.
6. ```bash
   curl -fsS https://<domain>/health/ready && curl -fsS -X POST https://<domain>/api/auth/login -d … \
     || { kubectl rollout undo deployment/api-gateway -n edu-app; exit 1; }
   ```
7. Bảng `FeatureFlag { key String @id, enabled Boolean, rolesAllowed Role[] }`; `isOn` cache Redis 30s; web đọc flag qua
   một endpoint `/api/flags` để ẩn/hiện ô tra từ.

</details>

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **6. DevOps và hạ tầng** — bài 6/9.

- Bài trước: [learn-kubernetes.md](./learn-kubernetes.md) — Kubernetes qua infra/k8s + Helm: probe, HPA, rolling update
- **Bài tiếp: [learn-observability.md](./learn-observability.md)** — Log, metric, trace với Prometheus, Grafana, Jaeger

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
