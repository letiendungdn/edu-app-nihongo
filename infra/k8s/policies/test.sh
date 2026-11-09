#!/usr/bin/env bash
# Kiểm manifest trong infra/k8s với chính sách Kyverno, không cần cluster. CI chạy script này (job security).
# 1) Mọi Pod template thật phải QUA.  2) Một Pod cố tình sai phải bị CHẶN (chứng minh luật có tác dụng).
set -euo pipefail
cd "$(dirname "$0")/../../.."
work="$(mktemp -d)"
# mktemp mặc định 0700: user trong image kyverno-cli không đọc được → "permission denied".
chmod 755 "$work"
trap 'rm -rf "${work:?}"' EXIT

for f in infra/k8s/*.yaml infra/k8s/mqtt/*.yaml infra/k8s/jobs/*.yaml; do
  out="$work/$(basename "$f" .yaml).pod.yaml"
  docker run --rm -i mikefarah/yq:4.47.1 \
    'select(.kind == "Deployment" or .kind == "StatefulSet" or .kind == "Job")
     | {"apiVersion":"v1","kind":"Pod",
        "metadata":{"name":.metadata.name,"namespace":.metadata.namespace,"labels":.spec.template.metadata.labels},
        "spec":.spec.template.spec}' < "$f" > "$out"
  [ -s "$out" ] || rm -f "$out"
done

cat > "$work/bad.negative.yaml" <<'POD'
apiVersion: v1
kind: Pod
metadata: {name: bad-root, namespace: edu-app, labels: {app: api-gateway}}
spec:
  containers:
    - name: c
      image: ghcr.io/letiendungdn/edu_app/api-gateway:latest
      securityContext: {privileged: true}
POD

chmod -R a+rX "$work"

kyverno() {
  docker run --rm -v "$PWD:/repo:ro" -v "$work:/work:ro" -w /repo ghcr.io/kyverno/kyverno-cli:v1.15.2 "$@"
}
args=()
for p in "$work"/*.pod.yaml; do args+=(--resource "/work/$(basename "$p")"); done

echo "== Manifest thật (phải qua):"
kyverno apply infra/k8s/policies/require-pod-security.yaml "${args[@]}"

echo "== Pod cố tình sai (phải bị chặn):"
if kyverno apply infra/k8s/policies/require-pod-security.yaml --resource /work/bad.negative.yaml >/dev/null 2>&1; then
  echo "✗ Luật KHÔNG chặn pod privileged/root" >&2
  exit 1
fi
echo "✓ Bị chặn đúng"
