FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY services/signaling-service ./services/signaling-service
RUN npm ci --workspace=@edu/signaling-service --include-workspace-root
RUN npm run build -w @edu/signaling-service

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY services/signaling-service/package.json ./services/signaling-service/package.json
COPY --from=builder /app/services/signaling-service/dist ./services/signaling-service/dist
RUN npm ci --omit=dev --workspace=@edu/signaling-service --include-workspace-root
# Bảo mật: app chạy bằng `node`, không cần npm. npm đi kèm image gốc mang theo lỗ hổng
# (brace-expansion, pacote, ip-address… — Trivy quét 09/11/2026) và là công cụ có sẵn cho kẻ tấn công.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
WORKDIR /app/services/signaling-service
USER node
EXPOSE 3002
CMD ["node", "dist/main.js"]
