# Bảo mật: image nginx chính thức bản không chạy bằng root (Trivy DS-0002). User thường không được nghe cổng
# dưới 1024 nên nginx nghe 8080 trong container; docker-compose map ${NGINX_HTTP_PORT:-8080}:8080.
# Repo đã chuyển nginxinc → nginx; pin 1.30.7 để vá nginx2root (CVE-2026-113425 / 121810 / 123007 / 123633).
FROM nginx/nginx-unprivileged:1.30.7-alpine

# Image gốc đôi khi chậm vá thư viện Alpine (openssl, curl...). Nâng gói lúc build để Trivy không còn CRITICAL,
# rồi trả về user 101 ở dưới. Cần root tạm thời cho apk.
USER root
RUN apk upgrade --no-cache

COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Image gốc đã chạy bằng user nginx (uid 101); ghi rõ để máy quét tĩnh (Trivy DS-0002) và người đọc thấy ngay.
USER 101

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:8080/nginx-health || exit 1
