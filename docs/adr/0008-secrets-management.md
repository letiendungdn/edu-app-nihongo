# ADR-0008: Bí mật production đi từ GitHub Environment Secrets sang K8s Secret; Vault để sau

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-09
- **Phạm vi:** `.github/workflows/deploy.yml`, `infra/k8s/secret.yaml`, `infra/vault-learn/`

## Bối cảnh

- Bí mật production (mật khẩu DB, `JWT_SECRET`, mật khẩu admin, MQTT) nằm trong **GitHub Environment `production`**.
  Bước deploy tạo K8s Secret `edu-app-secrets` từ chúng. Trong git chỉ có file mẫu ([infra/k8s/secret.yaml](../../infra/k8s/secret.yaml)).
- Bước deploy cũ chèn `${{ secrets.X }}` thẳng vào script và truyền bằng `--from-literal`. Giá trị có `"` hoặc `$(...)`
  thì phá lệnh hoặc chạy lệnh lạ, và mật khẩu hiện trên dòng lệnh của tiến trình (`ps`).
- Chưa có xoay vòng mật khẩu tự động. Mật khẩu DB là một tài khoản dùng chung, sống mãi.
- Công cụ quản lý bí mật tập trung (Vault, AWS Secrets Manager) phải chạy hoặc trả phí liên tục. Hiện chỉ có một môi trường.

## Quyết định

- **Giữ** GitHub Environment Secrets là nơi lưu bí mật production. Môi trường `production` có quy tắc duyệt riêng.
- Bước deploy truyền bí mật qua `env:`, ghi ra file quyền 600 trong `$RUNNER_TEMP`, tạo Secret bằng `--from-env-file`,
  xóa file ngay khi xong (`trap`).
- **Chưa** đưa Vault vào production. Có lab [infra/vault-learn/](../../infra/vault-learn/run.sh) để học KV, policy,
  mật khẩu DB động và thu hồi.
- Điều kiện chuyển sang Vault (hoặc External Secrets Operator + AWS Secrets Manager):
  có từ 2 môi trường trở lên, hoặc cần xoay vòng mật khẩu DB tự động, hoặc có người ngoài nhóm vào cluster.

## Hệ quả

- ✅ Không tốn thêm hạ tầng; bí mật không nằm trong git, không lộ trên dòng lệnh.
- ✅ Giá trị bí mật có ký tự đặc biệt không còn phá lệnh deploy.
- ⚠️ K8s Secret chỉ là base64. Ai có quyền `get secrets` trong namespace là đọc được. Cần bật mã hóa etcd ở cluster
  và giới hạn RBAC.
- ⚠️ Đổi mật khẩu vẫn làm tay: sửa GitHub Secret → chạy lại deploy → khởi động lại pod.
- `ghcr-pull-secret` dùng secret `GHCR_PULL_TOKEN` (PAT chỉ quyền `read:packages`, sống lâu). `GITHUB_TOKEN` hết hạn
  khi job xong nên pod tạo về sau (scale, node mới) sẽ `ImagePullBackOff`; chỉ dùng tạm kèm cảnh báo khi chưa có PAT.
