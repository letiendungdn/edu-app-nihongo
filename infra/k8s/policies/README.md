# Chính sách bắt buộc trong cluster (Kyverno)

Máy quét trong CI chỉ kiểm file trong repo. Ai `kubectl apply` tay, hay sửa manifest mà bỏ qua CI, vẫn lọt.
Kyverno là admission controller: API server hỏi Kyverno trước khi tạo Pod, sai luật thì **từ chối**.

| File | Luật |
|---|---|
| `require-pod-security.yaml` | App của mình (gateway, content, exam, web, migrate): không root, chặn leo quyền, hệ thống file chỉ đọc, bỏ mọi capability. Mọi pod trong `edu-app`: chặn leo quyền, cấm `privileged` |
| `verify-image-signatures.yaml` | Image `ghcr.io/letiendungdn/edu_app/*` phải có chữ ký cosign keyless của workflow `deploy.yml` repo này |

Cài (một lần, khi đã có cluster):

```bash
helm repo add kyverno https://kyverno.github.io/kyverno/
helm install kyverno kyverno/kyverno -n kyverno --create-namespace --version 3.5.2
kubectl apply -f infra/k8s/policies/
```

Thử trước khi áp (không cần cluster; CI cũng chạy lệnh này):

```bash
bash infra/k8s/policies/test.sh
# == Manifest thật (phải qua):         pass: 14, fail: 0
# == Pod cố tình sai (phải bị chặn):   ✓ Bị chặn đúng
```

Lưu ý: CLI không tự sinh luật cho Deployment như trong cluster (autogen), nên script tách pod template ra thành Pod rồi mới kiểm.
`verify-image-signatures.yaml` cần mạng và registry nên chỉ kiểm được trong cluster.
