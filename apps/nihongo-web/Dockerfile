FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/vocab-images ./packages/vocab-images
COPY apps/nihongo-web ./apps/nihongo-web
RUN npm ci
RUN apk add --no-cache libc6-compat
RUN npm run build -w @edu/vocab-images
WORKDIR /app/apps/nihongo-web
# Next.js type validator resolves ../../app/* — symlink for src/app layout in monorepo
RUN ln -sf src/app app
ENV API_URL=http://api-gateway:3000
ARG NEXT_PUBLIC_SIGNALING_URL=http://localhost:3002
ENV NEXT_PUBLIC_SIGNALING_URL=$NEXT_PUBLIC_SIGNALING_URL
ARG NEXT_PUBLIC_KEYCLOAK_URL=http://auth.localhost:8080
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
ARG NEXT_PUBLIC_KEYCLOAK_REALM=edu-app
ENV NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=nihongo-web
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RUN npm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat ffmpeg
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5173
ENV HOSTNAME=0.0.0.0
ENV API_URL=http://api-gateway:3000
COPY --from=builder /app/apps/nihongo-web/.next/standalone ./
COPY --from=builder /app/apps/nihongo-web/.next/static ./apps/nihongo-web/.next/static
COPY --from=builder /app/apps/nihongo-web/public ./apps/nihongo-web/public
EXPOSE 5173
CMD ["node", "apps/nihongo-web/server.js"]
