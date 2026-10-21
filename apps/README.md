# Apps

Frontend web và các app mobile của EDU APP Nihongo. App tiếng Anh nằm ở repo riêng `edu-app-english`.

| App | Folder | Port | Stack |
|-----|--------|------|-------|
| **nihongo-web** | `nihongo-web/` | 5173 | Next.js — học tiếng Nhật |

## Chạy dev

```bash
npm run dev:nihongo-web       # :5173
```

Hướng dẫn đầy đủ: [docs/run-local.md](../docs/run-local.md) · Lộ trình ReactJS: [docs/roadmap-reactjs.md](../docs/roadmap-reactjs.md)

## Docker

- `nihongo.localhost` (hoặc `localhost`) qua nginx `:8080` — [docs/docker.md](../docs/docker.md)

## Shared packages

- `@edu/vocab-images` — OpenMoji picture dictionary

## App mobile

| App | Folder | Stack |
|-----|--------|-------|
| **nihongo-mobile** | `nihongo-mobile/` | Expo / React Native |
| **nihongo-cli** | `nihongo-cli/` | React Native CLI (bare) |
| **nihongo-android** | `nihongo-android/` | Kotlin + Compose |
| **nihongo_flutter** | `nihongo_flutter/` | Flutter + Drift |
| **nihongo-ios** | `nihongo-ios/` | SwiftUI *(macOS)* |

Cách chạy từng app: [docs/run-mobile.md](../docs/run-mobile.md) · Tech inventory: [docs/mobile-tech-stacks.md](../docs/mobile-tech-stacks.md)
