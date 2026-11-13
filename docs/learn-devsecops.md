# Học DevSecOps — đưa bảo mật vào từng bước của pipeline

**DevSecOps** = DevOps + bảo mật. Thay vì cuối dự án mới thuê người kiểm tra bảo mật, mỗi bước của pipeline (viết code → build → deploy → vận hành) tự động có một lớp kiểm tra, lỗi bị chặn sớm khi còn rẻ để sửa.

Bài này dựa trên **lần quét thật ngày 09/11/2026** của chính repo. Học trước: [learn-devops-roadmap.md](./learn-devops-roadmap.md) (tới tuần 7, CI/CD) và [learn-security-backend.md](./learn-security-backend.md) (bảo mật trong code).

---

## 1. Bản đồ: mỗi bước một lớp kiểm tra

| Bước | Kiểm tra gì | Công cụ thường dùng | Repo hiện có |
|---|---|---|---|
| **Viết code** | Lộ bí mật (khóa, mật khẩu) trong commit | gitleaks, git-secrets | ✅ gitleaks trong CI, quét commit mới |
| | Lỗi bảo mật trong code (SQL injection, XSS…) — **SAST** | CodeQL, Semgrep | ✅ Semgrep trong job `security` (mục 9) |
| **Thư viện** | Thư viện có lỗ hổng đã công bố — **SCA** | npm audit, Dependabot, Snyk | ✅ `audit-ci` chặn từ mức HIGH (chỉ thư viện production) |
| | Tự động mở PR nâng phiên bản | Dependabot, Renovate | ✅ [.github/dependabot.yml](../.github/dependabot.yml): npm, GitHub Actions, image gốc Docker, hằng tuần |
| **Build image** | Lỗ hổng trong image (hệ điều hành + mọi thứ đóng gói vào) | Trivy, Grype | ✅ Job `image-scan` trong CI: build 7 image, chặn CVE CRITICAL đã có bản vá |
| | Danh sách thành phần — **SBOM** | Syft, Trivy | ✅ BuildKit đính SBOM + provenance vào image, lưu artifact 90 ngày (mục 10) |
| | Ký image để chứng minh nguồn gốc | cosign | ✅ Ký keyless khi build, deploy kiểm chữ ký trước khi chạy (mục 10) |
| **Hạ tầng (IaC)** | Cấu hình sai trong Dockerfile, K8s, Terraform | Trivy config, Checkov | ✅ Bước `trivy config` trong job `security`, chặn HIGH/CRITICAL |
| **Cluster** | Chặn pod sai luật ngay lúc tạo (root, privileged, image chưa ký) | Kyverno, OPA Gatekeeper | ✅ [infra/k8s/policies/](../infra/k8s/policies/README.md), CI kiểm offline (mục 13) |
| **Chạy thử** | Tấn công thử app đang chạy — **DAST** | OWASP ZAP | ✅ [infra/security/zap-baseline.sh](../infra/security/zap-baseline.sh), workflow `DAST` chạy tay vào staging (mục 11) |
| **Vận hành** | Giới hạn tốc độ, xác thực, log, cảnh báo | Throttler, JWT, Prometheus | ✅ Có (xem [learn-security-backend.md](./learn-security-backend.md)) |
| | Quản lý bí mật tập trung, xoay vòng khóa | Vault, AWS Secrets Manager | ⚠️ GitHub Environment Secrets → K8s Secret ([ADR-0008](adr/0008-secrets-management.md)); có lab Vault (mục 12) |

**Tóm lại:** lúc đầu repo chỉ chặn hai lỗi phổ biến nhất (lộ bí mật, thư viện có lỗ hổng), **chưa nhìn vào image và hạ tầng** — đúng hai chỗ lần quét dưới đây tìm ra vấn đề. Đã sửa hết và đưa cả hai máy quét vào CI (mục 2.1), rồi thêm SAST, SBOM, ký image, DAST (mục 9–12). Thêm chính sách bắt buộc trong cluster (mục 13). Còn lại: Vault cho production (khi có ≥ 2 môi trường).

---

## 2. Lần quét thật: tổng quan

| Lớp | Công cụ | Kết quả | Thật hay báo nhầm |
|---|---|---|---|
| Bí mật trong **toàn bộ** lịch sử git | gitleaks 8.30.1 | 1 phát hiện | Báo nhầm (mục 5) |
| Lỗ hổng trong image gateway | Trivy 0.69.3 | 12 HIGH/CRITICAL (**2 CRITICAL**) | **Thật**, đều có bản vá |
| Lỗ hổng trong image web | Trivy 0.69.3 | 10 HIGH | **Thật**, đều có bản vá |
| Cấu hình Dockerfile, K8s, Terraform | Trivy config | 60 HIGH/CRITICAL | Phần lớn thật (mục 4) |

### 2.1. Sau khi sửa (quét lại 09/11/2026)

| Lớp | Trước | Sau |
|---|---|---|
| gitleaks toàn bộ lịch sử | 1 (báo nhầm) | **0** (ghi ngoại lệ có lý do) |
| Image gateway, content, exam, signaling, web | 22 HIGH/CRITICAL | **0** |
| Image nginx | chưa quét | lần đầu 3 CRITICAL + 62 HIGH (bản 1.27) → **0** sau khi lên 1.30 và `apk upgrade` |
| Trivy config | 60 | **0** (8 mục còn lại là ngoại lệ có lý do trong [.trivyignore.yaml](../.trivyignore.yaml)) |
| Container chạy root | web, nginx, migrate | **không còn**: app uid 1000, nginx uid 101; image chạy thật không còn npm |

Đã sửa gì:

| Vấn đề | Sửa ở đâu |
|---|---|
| npm và thư viện dev trong image | `npm prune --omit=dev` ở bước build, xóa npm ở bước `runner`: Dockerfile của 4 service, web, migrate |
| Web và migrate chạy root | `USER node`; tạo sẵn và `chown` thư mục cần ghi (`.next/cache`, `/tmp/mori-hls`) — [apps/nihongo-web/Dockerfile](../apps/nihongo-web/Dockerfile) |
| nginx chạy root, bản cũ có CVE | `nginxinc/nginx-unprivileged:1.30-alpine`, nghe 8080 — [infra/nginx/Dockerfile](../infra/nginx/Dockerfile) |
| K8s thiếu `securityContext` | App: `runAsNonRoot`, `readOnlyRootFilesystem`, bỏ mọi capability, seccomp, `emptyDir` cho `/tmp`. Image bên thứ ba (postgres, redis, kafka, mosquitto): seccomp và chặn leo quyền — `infra/k8s/`, `infra/helm/` |
| SSH mở cho mọi IP, droplet không SSH key | `ssh_allowed_cidrs` bắt buộc nhập, chặn `0.0.0.0/0`; thêm `ssh_key_ids` — [infra/terraform/variables.tf](../infra/terraform/variables.tf) |
| Không tự nâng phiên bản | [.github/dependabot.yml](../.github/dependabot.yml) |
| CI không quét image và hạ tầng | [.github/workflows/ci.yml](../.github/workflows/ci.yml): bước `trivy config`, job `image-scan` |

Lưu ý khi đổi sang non-root:
- Volume Docker cũ tạo bởi root sẽ báo `EACCES`. Đổi chủ một lần: `docker run --rm -v <volume>:/v alpine chown -R 1000:1000 /v`.
- `readOnlyRootFilesystem` thì mọi chỗ app ghi file (cache, file tạm, `$HOME` của Prisma) phải trỏ vào `emptyDir`.
- Bài học từ nginx: **đổi sang image an toàn chưa đủ, phải ghim bản mới**. Bản 1.28 vẫn còn CVE CRITICAL trong chính nginx.

---

## 3. Lỗ hổng trong image: vì sao `audit-ci` không thấy

`audit-ci` trong CI báo sạch, vậy mà image lại có 22 lỗ hổng. Hai nguyên nhân — cũng là hai bài học kinh điển của DevSecOps:

### 3.1. Lỗ hổng nằm trong image gốc, không phải code của bạn

Phần lớn nằm ở `/usr/local/lib/node_modules/npm/...` — **công cụ npm** đi kèm image gốc `node:22-alpine`:

| Gói | Phiên bản | Bản vá | Nằm ở |
|---|---|---|---|
| `brace-expansion` | 2.0.2 | 2.1.5 trở lên | npm CLI trong image gốc |
| `pacote` | 19.0.2, 20.0.1 | 21.5.1 | npm CLI trong image gốc |
| `ip-address` | 10.1.0 | 10.3.1 | npm CLI trong image gốc |
| `picomatch`, `sigstore` | | có | npm CLI trong image gốc |

App chạy bằng `node dist/main.js`, **không cần npm**. Nhưng npm vẫn nằm trong image → kẻ tấn công vào được container có thêm công cụ để dùng, và máy quét báo lỗ hổng.

**Cách sửa:** xóa npm ở giai đoạn `runner` của Dockerfile, hoặc dùng image gốc tối giản (distroless) không có npm.

```dockerfile
FROM node:22-alpine AS runner
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
```

### 3.2. Thư viện chỉ dùng khi test lọt vào image chạy thật

`handlebars` 4.7.9 (**2 lỗ hổng CRITICAL**, bản vá 4.7.10) đến từ `ts-jest` — thư viện **chỉ dùng khi chạy test**:

```bash
npm ls handlebars
# └─┬ @edu/nihongo-services
#   └─┬ ts-jest@29.4.14
#     └── handlebars@4.7.9
```

Nó có mặt trong image vì [Dockerfile của gateway](../services/api-gateway/Dockerfile) chạy `npm ci` (cài cả thư viện dev) ở bước build, rồi **chép nguyên `node_modules`** sang bước chạy. `audit-ci` đặt `skip-dev: true` nên bỏ qua nó.

**Cách sửa:** sau khi build xong, chạy `npm prune --omit=dev` trước khi chép sang `runner`. Image nhỏ hơn và bớt hẳn một lớp tấn công.

**Bài học:** quét **thư viện của project** (SCA) và quét **image đã build** là hai việc khác nhau. Cần cả hai.

---

## 4. Cấu hình hạ tầng: 60 phát hiện

| Phát hiện | Số lượng | Thật hay không | Việc cần làm |
|---|---|---|---|
| K8s không đặt `securityContext` (KSV-0118) | 32 | Thật | Thêm `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, bỏ `capabilities` thừa |
| K8s cho ghi vào hệ thống file gốc (KSV-0014) | 16 | Thật | `readOnlyRootFilesystem: true`, chỗ nào cần ghi thì gắn `emptyDir` |
| Dockerfile chạy bằng `root` (DS-0002) | 3 | **Thật**: web, nginx, image migrate | Thêm `USER node` (web), dùng `nginxinc/nginx-unprivileged` (nginx) |
| SSH mở cho mọi IP (DIG-0001, dòng 66) | 1 | **Thật**: `ssh_allowed_cidrs` mặc định `0.0.0.0/0` | Bỏ giá trị mặc định, bắt buộc nhập IP của bạn |
| HTTP/HTTPS mở cho mọi IP (DIG-0001, dòng 72, 78) | 2 | Đúng thiết kế: web phải công khai | Ghi ngoại lệ có lý do |
| Cho phép kết nối ra mọi IP (DIG-0003) | 3 | Chấp nhận được với app này | Ghi ngoại lệ có lý do |
| Droplet không có SSH key (DIG-0004) | 1 | Thật | Thêm `ssh_keys`, tắt đăng nhập bằng mật khẩu |
| ConfigMap MQTT chứa bí mật (KSV-0109) | 1 | **Báo nhầm**: `PASSWD` chỉ là tên biến đường dẫn file; mật khẩu thật lấy từ Secret | Ghi ngoại lệ |
| S3 không mã hóa bằng khóa riêng (AWS-0132) | 1 | Chấp nhận với bài học: S3 vẫn mã hóa mặc định bằng khóa của AWS | Ghi ngoại lệ (khóa riêng tốn ~1 USD/tháng) |

**Gateway đã làm đúng:** có `USER node`, không chạy bằng root.

---

## 5. Xử lý báo nhầm

Máy quét nào cũng báo nhầm. Bỏ qua cảnh báo là sai; tắt luôn máy quét càng sai. Cách đúng: **ghi ngoại lệ kèm lý do và điều kiện gỡ**, như repo đang làm trong [audit-ci.jsonc](../audit-ci.jsonc).

Ví dụ trong lần quét này:

- gitleaks báo `generic-api-key` ở `lessonGroups.test.ts` (commit `96cb7fe`): thực ra là chuỗi `key` của một nhóm bài học trong test. Thêm vào allowlist của [.gitleaks.toml](../.gitleaks.toml) theo đường dẫn file test.
- Trivy báo `KSV-0109` ở ConfigMap MQTT: `PASSWD` chỉ là đường dẫn file. Ghi vào [.trivyignore.yaml](../.trivyignore.yaml) — mỗi mục có `paths` (chỉ áp cho đúng file đó) và `statement` (lý do).

---

## 6. Tự chạy lại các máy quét

Không cần cài gì, chạy bằng Docker (đã chạy thật các lệnh này):

```bash
# Bí mật trong toàn bộ lịch sử git (CI chỉ quét commit mới)
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.30.1 \
  git /repo --config /repo/.gitleaks.toml --redact --no-banner

# Cấu hình Dockerfile, K8s, Terraform
docker run --rm -v "$PWD:/repo:ro" -v trivy-cache:/root/.cache aquasec/trivy:0.69.3 \
  config /repo --ignorefile /repo/.trivyignore.yaml --severity HIGH,CRITICAL --skip-dirs "/repo/**/node_modules"

# Lỗ hổng trong image đã build: xuất image ra file rồi quét file
docker save -o /tmp/gateway.tar edu-app-api-gateway:latest
docker run --rm -v /tmp:/scan:ro -v trivy-cache:/root/.cache aquasec/trivy:0.69.3 \
  image --input /scan/gateway.tar --severity HIGH,CRITICAL --ignore-unfixed
rm /tmp/gateway.tar
```

**Vì sao xuất image ra file thay vì gắn `docker.sock`:** cách phổ biến trên mạng là cho container Trivy dùng `/var/run/docker.sock` để đọc image. Làm vậy là trao **quyền điều khiển toàn bộ Docker trên máy** cho một container — chính thứ DevSecOps khuyên tránh. Quét file `.tar` chỉ cần quyền đọc.

---

## 7. Lộ trình học DevSecOps (4 tuần, sau lộ trình DevOps)

| Tuần | Chủ đề | Làm trên repo | Xong khi |
|---|---|---|---|
| 1 | Bí mật & thư viện | Chạy gitleaks toàn lịch sử, xử lý phát hiện; đọc `audit-ci.jsonc`; thêm Dependabot (`.github/dependabot.yml`) | Mọi phát hiện có lý do; Dependabot mở PR đầu tiên |
| 2 | Image an toàn | Bỏ npm khỏi image chạy thật, `npm prune --omit=dev`, `USER` cho web; thêm job Trivy image vào CI chặn CRITICAL | Quét lại: 0 CRITICAL; CI chặn được image có lỗ hổng |
| 3 | Hạ tầng an toàn | Thêm `securityContext` cho K8s; sửa SSH mặc định; thêm job Trivy config vào CI; `.trivyignore` có lý do | Trivy config chỉ còn các ngoại lệ đã ghi |
| 4 | Code & chạy thử | Đọc mục 9–11: chạy Semgrep, ZAP baseline vào `localhost:8080`, tạo SBOM; thử bỏ một header rồi xem ZAP FAIL | Giải thích được từng ngoại lệ trong `.semgrepignore` và `zap-rules.tsv` |

**Sau đó:** chạy lab Vault (mục 12), đọc phần ký image (mục 10); tiếp theo là chính sách bắt buộc trong cluster (Kyverno / OPA Gatekeeper: chỉ cho chạy image đã ký, cấm container root).

---

## 8. Hay hỏi khi phỏng vấn

1. SAST, DAST, SCA khác nhau thế nào? Mỗi cái bắt được lỗi gì mà cái kia không?
2. Vì sao `npm audit` sạch mà image vẫn có lỗ hổng? (mục 3)
3. "Shift left" nghĩa là gì? Đổi lại phải trả giá gì (pipeline chậm hơn, báo nhầm)?
4. Xử lý báo nhầm thế nào để không thành "tắt hết cảnh báo"?
5. Lộ khóa AWS trong một commit đã đẩy lên: làm gì trước tiên? (Vô hiệu hóa khóa ngay, rồi mới xóa khỏi lịch sử — xóa lịch sử không làm khóa hết hiệu lực.)
6. Vì sao container không nên chạy bằng root? Vì sao không nên gắn `docker.sock`?
7. Vì sao ghim GitHub Action theo SHA thay vì `@v5`? (mục 9)
8. Ký image keyless hoạt động thế nào? Vì sao ký theo digest chứ không theo tag? (mục 10)
9. Mật khẩu DB động của Vault giải quyết vấn đề gì mà K8s Secret không làm được? (mục 12)

---

## 9. SAST: Semgrep đọc code tìm lỗi bảo mật

Chọn Semgrep thay CodeQL vì repo private: CodeQL trên repo private cần gói GitHub Advanced Security (trả phí). Semgrep chạy bằng Docker, đọc được TS/JS, Python, nginx, Terraform, workflow.

```bash
docker run --rm -v "$PWD:/src" -w /src semgrep/semgrep:1.140.0 semgrep scan \
  --config p/default --config p/typescript --config p/nodejs --config p/secrets \
  --severity ERROR --severity WARNING --metrics=off --error \
  --exclude-rule generic.nginx.security.dynamic-proxy-host.dynamic-proxy-host \
  --exclude-rule generic.nginx.security.missing-internal.missing-internal \
  --exclude-rule java.android.security.exported_activity.exported_activity
```

Lần quét đầu: **69 phát hiện**. Lỗi thật:

| Phát hiện | Vì sao nguy hiểm | Sửa |
|---|---|---|
| 39 × `uses: actions/checkout@v5` (tag đổi được) | Ai chiếm được repo của action chỉ cần trỏ tag `v5` sang code độc, CI của bạn chạy nó với quyền đẩy image | Ghim theo **commit SHA**, giữ tên tag trong comment: `@fbc6f39… # v5`. Dependabot vẫn nâng được |
| nginx chuyển nguyên `Upgrade: $http_upgrade` | **h2c smuggling**: client gửi `Upgrade: h2c` mở đường hầm HTTP/2 thẳng tới backend, đi vòng mọi luật của nginx | `map` chỉ nhận `websocket` ([nginx.conf](../infra/nginx/nginx.conf)) |

Còn lại là báo nhầm, xử lý theo 3 cách:
- **Bỏ cả đường dẫn** ([.semgrepignore](../.semgrepignore)): test cố ý chứa token giả, docs, script chạy tay, file JS sinh tự động, workflow trong thư mục con (GitHub không chạy).
- **`nosemgrep` tại dòng code**, kèm lý do: regex đã `escapeRegExp`, đổi `http→ws` theo cấu hình.
- **Tắt luật** (ghi lý do trong CI): `proxy_pass` dùng biến gán cứng, activity Android bắt buộc `exported`.

Bẫy: có file `.semgrepignore` thì Semgrep **bỏ danh sách mặc định** (kể cả `node_modules`). Dòng đầu phải là `:include .gitignore`.

---

## 10. Chuỗi cung ứng: SBOM, provenance, ký image

Ba câu hỏi khi một CVE mới được công bố hoặc khi nghi registry bị xâm nhập:

| Câu hỏi | Công cụ | Ở đâu trong repo |
|---|---|---|
| Image đang chạy có chứa thư viện X bản Y không? | **SBOM** (danh sách mọi thành phần) | `sbom: true` trong [deploy.yml](../.github/workflows/deploy.yml), artifact `sbom-<image>` |
| Image này build từ commit nào, workflow nào? | **Provenance** (SLSA) | `provenance: mode=max` |
| Image trên registry có đúng là do CI của mình build? | **Chữ ký** (cosign) | Bước `Sign image`, bước deploy `Verify image signatures` |

**Ký keyless:** không có khóa riêng để giữ (hay để lộ). Lúc ký, GitHub cấp token OIDC chứng minh "workflow `deploy.yml` của repo này". Sigstore cấp chứng chỉ ngắn hạn theo danh tính đó và ghi chữ ký vào log công khai Rekor. Bước verify kiểm đúng danh tính (`--certificate-identity-regexp`), nên image do người khác ký cũng bị từ chối.

**Ký theo digest, không theo tag:** tag `:latest` hay `:abc123` đổi được, digest `sha256:…` thì không.

Đã thử trên máy (registry tạm, ký bằng cặp khóa vì keyless cần GitHub):

```
đã ký sha256:f5116ed4606f…
== verify image đã ký:              The signatures were verified against the specified public key   (exit 0)
== kẻ xấu đẩy image khác lên tag v1: Error: no signatures found                                       (exit 10)
```

SBOM tự tạo trên máy và quét lại không cần image:

```bash
docker save -o /tmp/gw.tar edu-app-api-gateway:latest
docker run --rm -v /tmp:/scan aquasec/trivy:0.69.3 image --input /scan/gw.tar --format cyclonedx -o /scan/gw.cdx.json
docker run --rm -v /tmp:/scan aquasec/trivy:0.69.3 sbom /scan/gw.cdx.json --severity HIGH,CRITICAL
```

SBOM của gateway có **646 thành phần**. Trong đó có 2 bản `express` (5.0.6 và 5.2.1): đây là loại chuyện chỉ SBOM mới cho thấy.

---

## 11. DAST: OWASP ZAP quét app đang chạy

SAST đọc code; DAST nhìn app **từ bên ngoài** như kẻ tấn công: header, cookie, trang lỗi, thông tin bị lộ. Bản baseline chỉ quan sát, không gửi payload phá hoại.

```bash
bash infra/security/zap-baseline.sh                          # app trên máy (:8080)
bash infra/security/zap-baseline.sh https://staging.example  # môi trường bạn sở hữu
```

| | Lần đầu | Sau khi sửa |
|---|---|---|
| FAIL | 0 | 0 |
| WARN | 13 | 2 (đã biết, ghi trong [zap-rules.tsv](../infra/security/zap-rules.tsv)); sau khi có nonce, ZAP hết báo `script-src unsafe-inline` |

Đã sửa:

| ZAP báo | Sửa |
|---|---|
| Thiếu chống clickjacking, `X-Content-Type-Options`, `Permissions-Policy`, CSP | `headers()` trong [next.config.ts](../apps/nihongo-web/next.config.ts) (đặt ở app để sau Ingress K8s cũng có); gateway thêm `Permissions-Policy` |
| `X-Powered-By: Next.js` | `poweredByHeader: false` |
| `Server: nginx/1.30.6` lộ phiên bản | `server_tokens off` |
| **Swagger `/api/docs` mở trên production** | Production mặc định tắt; `ENABLE_SWAGGER=true` để bật (compose trên máy dev đã bật) |

**CSP có nonce** ([middleware.ts](../apps/nihongo-web/middleware.ts), [src/lib/csp.ts](../apps/nihongo-web/src/lib/csp.ts)):

- Mỗi request sinh một nonce ngẫu nhiên. `script-src 'self' 'nonce-…' 'strict-dynamic'`: chỉ script mang nonce của request này chạy được; chunk Next, Stripe, Mapbox do chúng nạp tiếp thì được tin theo. Script XSS chèn vào trang không đoán được nonce → bị chặn.
- Next đọc CSP trong **request** header để tự gắn nonce vào thẻ `<script>` nó sinh; script chọn theme trong [layout.tsx](../apps/nihongo-web/src/app/layout.tsx) đọc `x-nonce`.
- Bẫy gặp thật: middleware phải nằm ở **gốc `apps/nihongo-web/`**, không phải `src/`. Lý do: bước build tạo symlink `app → src/app`, Next coi gốc là thư mục dự án, nên `src/middleware.ts` bị bỏ qua mà không báo lỗi gì (`middleware-manifest.json` trống).
- Thử bằng Chrome headless (CDP) trên `/`, `/vocab`, `/kana`, `/grammar/hoi-dap`, `/mori`, `/login`, `/pricing`, `/japan-map`, `/analytics`. Lần đầu CSP chặn stylesheet Google Fonts → thêm `https://fonts.googleapis.com` vào `style-src`. Sau đó không còn vi phạm nào.
- `style-src` vẫn có `'unsafe-inline'` (React `style={{…}}`, Mapbox). Chèn CSS độc nguy hiểm kém xa chèn script.

Còn lại, ghi WARN có lý do:
- **Cô lập Spectre đầy đủ:** cần COEP `require-corp`, sẽ chặn ảnh và video tải từ nguồn khác.

[zap-rules.tsv](../infra/security/zap-rules.tsv) nâng các header đã sửa lên **FAIL**. Ai lỡ xóa header thì lần quét sau báo lỗi ngay (chặn hồi quy).

---

## 12. Quản lý bí mật: hiện tại và lab Vault

**Hiện tại** ([ADR-0008](adr/0008-secrets-management.md)): bí mật nằm trong GitHub Environment `production`. Bước deploy tạo K8s Secret từ đó. Lỗi đã sửa ở bước này:

```yaml
# Trước: secret chèn thẳng vào script, nằm trên dòng lệnh
--from-literal=JWT_SECRET="${{ secrets.JWT_SECRET }}"
# Sau: qua env → file quyền 600 → --from-env-file → xóa file
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

Đã thử với giá trị `a"b$(echo PWNED)c` + `` `id` ``: Secret nhận đúng nguyên văn, không lệnh nào chạy.

**Lab Vault** ([infra/vault-learn/run.sh](../infra/vault-learn/run.sh)) chạy riêng, có Postgres riêng, không đụng app:

```bash
bash infra/vault-learn/run.sh up && bash infra/vault-learn/run.sh demo
bash infra/vault-learn/run.sh down
```

Kết quả thật:

```
== 1. KV: lưu bí mật tĩnh có phiên bản      bản mới nhất: lab-jwt-v2 / bản cũ (v1): lab-jwt-v1
== 2. Policy: app chỉ được ĐỌC               ✓ app thử GHI → bị từ chối (403)
== 3. Mật khẩu DB động                        Vault cấp user: v-token-app-rw-KyNuk87A… ✓ đăng nhập và ghi được
== 4. Lộ mật khẩu? Thu hồi ngay               ✓ user đã bị xóa, đăng nhập thất bại
```

Pull secret của GHCR: dùng `GHCR_PULL_TOKEN` (PAT chỉ quyền `read:packages`). Trước đây dùng `GITHUB_TOKEN`, token này hết hạn khi job deploy xong, nên pod tạo về sau (scale, node mới) bị `ImagePullBackOff`.

Backup DB đầy đủ không còn commit vào git ([ADR-0009](adr/0009-db-backups-out-of-git.md)). Lịch sử cũ vẫn còn, repo phải giữ private cho tới khi viết lại lịch sử.

Điểm ăn tiền của Vault là mục 3–4. Mỗi pod xin một tài khoản DB riêng, tự hết hạn. Lộ một mật khẩu thì chỉ thu hồi đúng nó, không phải đổi mật khẩu cho cả hệ thống lúc nửa đêm.

## 13. Chính sách bắt buộc trong cluster (Kyverno)

Máy quét trong CI chỉ kiểm **file trong repo**. Ai `kubectl apply` tay một pod chạy root vẫn lọt. Kyverno là admission controller: API server hỏi Kyverno trước khi tạo Pod, sai luật thì **từ chối**.

| Luật | File |
|---|---|
| Mọi pod trong `edu-app`: chặn leo quyền, cấm `privileged` | [require-pod-security.yaml](../infra/k8s/policies/require-pod-security.yaml) |
| App tự viết: non-root, hệ thống file chỉ đọc, bỏ mọi capability | như trên |
| Image `ghcr.io/letiendungdn/edu_app/*` phải có chữ ký keyless của `deploy.yml`; tag đổi thành digest đã kiểm | [verify-image-signatures.yaml](../infra/k8s/policies/verify-image-signatures.yaml) |

Kiểm offline (CI chạy ở job `security`):

```
$ bash infra/k8s/policies/test.sh
== Manifest thật (phải qua):        pass: 14, fail: 0
== Pod cố tình sai (phải bị chặn):  ✓ Bị chặn đúng
```

Có **test âm** (pod sai phải bị chặn) để chắc luật không vô tình "cho qua tất cả", ví dụ khi gõ sai tên label.

Thêm: app không gọi Kubernetes API nên mọi pod của app đặt `automountServiceAccountToken: false`. Lọt vào container cũng không có token để dò cluster.

Ngoài repo (làm ở cluster): bật mã hóa Secret trong etcd (EKS envelope encryption; GKE mã hóa sẵn), RBAC không cho tài khoản thường `get secrets`.

## Luyện phỏng vấn

Câu hỏi phỏng vấn kèm đáp án: bảo mật API và quét lỗ hổng trong [interview-backend-security.md](./interview-backend-security.md); image và container trong [interview-docker.md](./interview-docker.md). Mục 8 ở trên là danh sách câu hỏi ngắn để tự ôn.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **6. DevOps và hạ tầng** — bài 8/8.

- Bài trước: [learn-incident-postmortem.md](./learn-incident-postmortem.md) — Xử lý sự cố, runbook, postmortem (có postmortem thật)
- Xong nhóm này. **Nhóm tiếp: 7. Cloud** — bắt đầu bằng [learn-localstack.md](./learn-localstack.md) (Giả lập AWS trên máy bằng LocalStack)

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
