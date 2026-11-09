#!/usr/bin/env bash
# DAST: quét thụ động (không tấn công phá hoại) app ĐANG CHẠY bằng OWASP ZAP baseline.
#   bash infra/security/zap-baseline.sh                         # app trên máy, http://localhost:8080
#   bash infra/security/zap-baseline.sh https://staging.example  # môi trường khác
# Thoát 1 khi có luật FAIL (xem infra/security/zap-rules.tsv). Báo cáo HTML ở infra/security/reports/.
set -euo pipefail
cd "$(dirname "$0")"
TARGET="${1:-http://host.docker.internal:8080/}"
mkdir -p reports && chmod 777 reports
cp zap-rules.tsv reports/zap-rules.tsv
set +e
docker run --rm -v "$PWD/reports:/zap/wrk:rw" zaproxy/zap-stable:2.16.1 \
  zap-baseline.py -t "$TARGET" -m 2 -c zap-rules.tsv -r zap-report.html -J zap-report.json
code=$?
set -e
rm -f reports/zap-rules.tsv
# zap-baseline: 0 = sạch, 1 = có FAIL, 2 = chỉ có WARN, 3 = lỗi khác. WARN không chặn.
if [ "$code" -eq 2 ]; then code=0; fi
echo "Báo cáo: infra/security/reports/zap-report.html (exit $code)"
exit "$code"
