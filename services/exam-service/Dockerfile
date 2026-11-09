FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY services ./services
RUN npm ci
RUN npm run build -w @edu/vocab-images
WORKDIR /app/services
RUN npm run prisma:generate -w @edu/nihongo-services
RUN npm run build:exam -w @edu/nihongo-services
# Bảo mật: bỏ thư viện chỉ dùng khi build/test (ts-jest kéo theo handlebars có lỗ hổng CRITICAL) trước khi
# chép node_modules sang image chạy thật. Xem docs/learn-devsecops.md mục 3.2.
WORKDIR /app
RUN npm prune --omit=dev


FROM node:22-alpine AS runner
# Bảo mật: app chạy bằng `node`, không cần npm. npm đi kèm image gốc mang theo lỗ hổng
# (brace-expansion, pacote, ip-address… — Trivy quét 09/11/2026) và là công cụ có sẵn cho kẻ tấn công.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app/services
ENV NODE_ENV=production
COPY --from=builder /app/services/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
RUN rm -rf node_modules/@prisma/client \
    && mkdir -p node_modules/@prisma \
    && ln -sfn ../../packages/prisma-nihongo/generated/client node_modules/@prisma/client \
    && ln -sfn ../../../../../packages/nest-contracts/proto dist/apps/exam-service/packages/nest-contracts/proto
USER node
CMD ["node", "dist/apps/exam-service/services/exam-service/src/main.js"]
