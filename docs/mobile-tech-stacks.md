# Tech stack chi tiết từng framework — EDU APP

Tài liệu inventory **theo đúng dependency trong repo** (không phải wishlist). Cách chạy: [run-mobile.md](./run-mobile.md). Lộ trình học: [learn-edu-app.md](./learn-edu-app.md).

---

## Bảng so sánh nhanh (4 client mobile)

| Tiêu chí | Expo / RN | Android Kotlin | Flutter | iOS SwiftUI |
|----------|-----------|----------------|---------|-------------|
| **Folder** | `apps/nihongo-mobile` | `apps/nihongo-android` | `apps/nihongo_flutter` | `apps/nihongo-ios` |
| **Ngôn ngữ** | TypeScript | Kotlin (JVM 17) | Dart ≥3.3 | Swift 5.9 |
| **UI** | React Native 0.86 + Expo 57 | Jetpack Compose + Material3 | Flutter Material | SwiftUI |
| **Min target** | — (dev build) | minSdk 24 / target 35 | Android 23+, iOS 13+ | iOS 17.0 |
| **Điều hướng** | expo-router | Navigation Compose | go_router | NavigationStack |
| **State** | React hooks | ViewModel + Flow + Hilt | Riverpod | `@Observable` |
| **Local DB** | expo-sqlite | Room 2.6 | Drift + SQLite | SwiftData |
| **HTTP** | axios | Retrofit + OkHttp | Dio | URLSession |
| **Auth OIDC** | expo-auth-session | AppAuth | flutter_appauth | ASWebAuthenticationSession + CryptoKit |
| **Token store** | expo-secure-store | DataStore Preferences | flutter_secure_storage | Keychain |
| **Camera / OCR** | expo-camera + ML Kit | CameraX + ML Kit JP | camera + ML Kit | AVFoundation + Vision |
| **Live** | livekit-client | livekit-android | livekit_client | LiveKit Swift SDK (SPM) |
| **Push** | expo-notifications → `/push/register` | device token → `/push/register` | device token → `/push/register` | APNs + `/push/register` |
| **TTS** | expo-speech | Android TextToSpeech | flutter_tts | AVSpeechSynthesizer |
| **STT / phát âm** | expo-speech-recognition (ja-JP) | SpeechRecognizer | speech_to_text | SFSpeechRecognizer |
| **AI Tutor** | `POST /ai/chat` | `POST /ai/chat` | `POST /ai/chat` | `POST /ai/chat` |
| **Kanji draw** | PanResponder + SVG | Compose Canvas | CustomPainter | SwiftUI Canvas |
| **Unit test** | Vitest | JUnit | flutter_test | XCTest |
| **API mặc định** | `10.0.2.2:3000/api` | `10.0.2.2:8080/api/` | `10.0.2.2:3000/api` | simulator `localhost:3000/api` |

> Cùng sản phẩm (vocab, SRS SM-2, sync queue). Android native qua **nginx :8080**; Expo/Flutter/iOS mặc định gọi **gateway :3000**.

---

# 1. Expo / React Native — `apps/nihongo-mobile`

## 1.1. Nền tảng

| Mục | Giá trị |
|-----|---------|
| Framework | **Expo SDK ~57** |
| Runtime UI | **React Native 0.86.0** + **React 19.2.3** |
| Ngôn ngữ | TypeScript ~6.0.3 |
| Entry | `expo-router/entry` |
| Bundle ID / package | `com.edu.nihongo` |
| Build | Dev client: `expo run:android` / `run:ios` (camera + ML Kit **không** chạy đủ trên Expo Go) |

## 1.2. Thư viện theo lớp

| Lớp | Package | Vai trò |
|-----|---------|---------|
| Navigation | `expo-router` ~6 | File-based routes trong `app/` |
| Layout | `react-native-screens`, `safe-area-context` | Native screen stack |
| HTTP | `axios` | API client + Bearer interceptor |
| Network status | `@react-native-community/netinfo` | Online/offline |
| Local DB | `expo-sqlite` | Offline vocab / SRS / sync_queue |
| Secure token | `expo-secure-store` | JWT |
| OIDC | `expo-auth-session`, `expo-crypto`, `expo-web-browser` | Keycloak PKCE |
| Camera | `expo-camera` | Preview / frame |
| OCR | `@react-native-ml-kit/text-recognition` | Nhận dạng chữ JP |
| Live | `livekit-client` | Host / viewer livestream |
| TTS | `expo-speech` | Đọc tiếng Nhật |
| STT | `expo-speech-recognition` | Luyện phát âm (ja-JP) |
| Push | `expo-notifications` | Đăng ký token + deep-link SRS |
| Draw | `react-native-svg` | Vẽ kanji |
| Config | `expo-constants` | Đọc `app.json` → `extra` |
| Test | `vitest` | Unit test pure util |

## 1.3. Kiến trúc thư mục

```
apps/nihongo-mobile/
├── app/                 # Screens (expo-router)
├── src/
│   ├── config/          # API, Keycloak
│   ├── data/            # sqlite, axios, repository
│   ├── domain/          # entities
│   ├── utils/           # srs.ts, overlay.ts
│   ├── components/
│   └── hooks/
├── app.json             # extra.apiBaseUrl, keycloak*, livekit*
└── vitest.config.ts
```

## 1.4. Config quan trọng

- API: `app.json` → `extra.apiBaseUrl` = `http://10.0.2.2:3000/api`
- Keycloak: `extra.keycloakUrl` / realm / clientId
- LiveKit WS: `extra.livekitWsUrl` = `ws://10.0.2.2:7880`
- Cleartext HTTP: `android.usesCleartextTraffic: true`

## 1.5. Lệnh

```powershell
cd apps\nihongo-mobile
npm install
npx expo prebuild --platform android   # lần đầu / đổi native
npm run android
npm run test:run
npm run typecheck
```

---

# 2. Android native (Kotlin + Compose) — `apps/nihongo-android`

## 2.1. Nền tảng

| Mục | Giá trị |
|-----|---------|
| Ngôn ngữ | Kotlin, **JVM 17** |
| UI | **Jetpack Compose** (BOM `2024.10.01`) + **Material 3** |
| SDK | `minSdk 24`, `targetSdk` / `compileSdk` **35** |
| applicationId | `com.edu.nihongo` |
| DI | **Hilt** 2.52 + **KSP** |
| Async | Kotlin Coroutines + Flow |

## 2.2. Thư viện theo lớp

| Lớp | Package | Vai trò |
|-----|---------|---------|
| Navigation | `navigation-compose` 2.8.4 + `hilt-navigation-compose` | Nav graph |
| State | `lifecycle-viewmodel-compose` | ViewModel |
| Local DB | **Room** 2.6.1 | SQLite type-safe |
| Prefs | DataStore Preferences | Token / settings |
| HTTP | **Retrofit** 2.11 + Gson + **OkHttp** 4.12 | REST |
| OIDC | `net.openid:appauth` 0.11.1 + Browser | Keycloak |
| Camera | **CameraX** 1.4.1 | ImageAnalysis stream |
| OCR | `text-recognition-japanese` 16.0.1 (ML Kit) | OCR JP |
| Permission | Accompanist permissions | Runtime permission |
| Live | `livekit-android` 2.26 + compose-components 2.4 | Livestream |
| Test | JUnit 4.13.2 | `SrsAlgorithmTest` |

## 2.3. Kiến trúc thư mục

```
app/src/main/java/com/edu/nihongo/
├── presentation/     # Compose UI + ViewModel theo feature
├── domain/           # entity, repository interface, usecase
├── data/
│   ├── local/        # Room entity/dao
│   ├── remote/       # Retrofit API
│   └── repository/   # impl
├── di/               # Hilt modules
└── utils/            # SrsAlgorithm
```

## 2.4. Config quan trọng (`build.gradle.kts` BuildConfig)

| Field | Mặc định |
|-------|----------|
| `API_BASE_URL` | `http://10.0.2.2:8080/api/` (**nginx**) |
| `KEYCLOAK_URL` | `http://10.0.2.2:8080` |
| `KEYCLOAK_REALM` | `edu-app` |
| `KEYCLOAK_CLIENT_ID` | `nihongo-mobile` |
| `KEYCLOAK_REDIRECT_URI` | `com.edu.nihongo:/oauth2redirect` |

## 2.5. Lệnh

```powershell
cd apps\nihongo-android
.\gradlew.bat installDebug
.\gradlew.bat testDebugUnitTest
# hoặc mở bằng Android Studio → Run
```

---

# 3. Flutter — `apps/nihongo_flutter`

## 3.1. Nền tảng

| Mục | Giá trị |
|-----|---------|
| Framework | **Flutter** (Material Design) |
| Ngôn ngữ | **Dart** SDK `>=3.3.0 <4.0.0` |
| Package name | `nihongo_app` |
| Android | minSdk ≥ 23 (theo Flutter), Java 11 |
| iOS | deployment target 13.0 (trong project iOS của Flutter) |
| Web | Hỗ trợ (`kIsWeb`, Drift WASM) |

## 3.2. Thư viện theo lớp

| Lớp | Package | Vai trò |
|-----|---------|---------|
| State | **flutter_riverpod** ^2.5 | Providers toàn app |
| Navigation | **go_router** ^14 | Declarative routes |
| Local DB | **drift** ^2.18 + sqlite3_flutter_libs | Type-safe SQL + codegen |
| HTTP | **dio** ^5.4 | REST + interceptor |
| Connectivity | connectivity_plus | Online/offline |
| Secure token | flutter_secure_storage | JWT |
| Prefs | shared_preferences | Non-secret |
| OIDC | **flutter_appauth** ^8 | Keycloak |
| Camera | camera ^0.11 | Preview |
| OCR | google_mlkit_text_recognition ^0.14 | Text recognition |
| Permission | permission_handler | Runtime |
| Live | livekit_client ^2.3 | Livestream |
| TTS / STT | flutter_tts, speech_to_text | Luyện phát âm |
| Codegen | drift_dev + build_runner | Generate Drift |
| Test | flutter_test + flutter_lints | Unit / widget |

## 3.3. Kiến trúc thư mục

```
lib/
├── presentation/     # screens + widgets
├── domain/           # entity, repository iface, usecase
├── data/
│   ├── local/        # Drift AppDatabase
│   ├── remote/       # Dio, ApiConfig, Keycloak
│   └── repository/
├── core/             # routes, theme
├── utils/            # srs_algorithm.dart
├── providers.dart
└── native/           # MethodChannel (perf)
```

## 3.4. Config quan trọng

- `lib/data/remote/api_config.dart`
  - Web: `http://localhost:3000/api`
  - Mobile mặc định: `http://10.0.2.2:3000/api`
  - Override: `--dart-define=API_BASE_URL=...`
- Keycloak: `keycloak_config.dart` (emulator → `10.0.2.2:8080`)

## 3.5. Lệnh

```powershell
cd apps\nihongo_flutter
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run
flutter test
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:3000/api
```

---

# 4. iOS SwiftUI — `apps/nihongo-ios`

## 4.1. Nền tảng

| Mục | Giá trị |
|-----|---------|
| UI | **SwiftUI** |
| Ngôn ngữ | **Swift 5.9** |
| iOS | **17.0+** |
| Bundle ID | `com.edu.nihongo.ios` |
| Project | **XcodeGen** từ `project.yml` (không commit sẵn `.xcodeproj` bắt buộc) |
| Dependencies | **LiveKit** via SPM (`client-sdk-swift`); còn lại Apple frameworks |

## 4.2. Framework hệ thống (Apple)

| Lớp | Framework / API | Vai trò |
|-----|-----------------|---------|
| UI / nav | SwiftUI `NavigationStack` | Màn hình |
| State | Observation (`@Observable`) | ViewModel |
| Local DB | **SwiftData** (+ SyncQueueItem) | Vocabulary, SRSCard, sync queue |
| Network monitor | **Network** (`NWPathMonitor`) | Online/offline chip + flush sync |
| HTTP | **URLSession** | REST thủ công |
| OIDC | **ASWebAuthenticationSession** + **CryptoKit** (PKCE) | Keycloak |
| Token | **Keychain** (`Security`) | access token |
| Camera / OCR | **AVFoundation** + **Vision** | Dịch camera JP→VI |
| Translate | `POST /api/translate` | Overlay bản dịch |
| Live | **LiveKit** SPM | Host / viewer livestream |
| TTS | AVSpeechSynthesizer | Đọc tiếng Nhật |
| Push | UserNotifications + APNs | Push (backend APNs) |
| Test | XCTest | SRS + OverlayMapper |

## 4.3. Tính năng đã ngang các app còn lại

- Dịch camera (OCR + overlay)
- Livestream list / host / viewer (LiveKit)
- Online indicator + SRS sync queue → `POST /progress/review`
- Deep link push → màn SRS
- AI Tutor (`POST /ai/chat`)
- Luyện phát âm (SFSpeechRecognizer)
- Vẽ Kanji (SwiftUI Canvas)
- TTS (AVSpeechSynthesizer)

## 4.4. Kiến trúc thư mục

```
NihongoEDU/
├── App/
├── Core/           # APIConfig, Keycloak, SRSAlgorithm, TokenStore
├── Domain/
├── Data/Local|Remote/
└── Presentation/   # Home, Vocab, SRS, ...
NihongoEDUTests/    # XCTest
project.yml
```

## 4.5. Config quan trọng

- `Core/APIConfig.swift`: env `API_BASE_URL` hoặc simulator `http://localhost:3000/api`
- Scheme env trong `project.yml` (Keycloak, Gemini…)
- OAuth scheme: `com.edu.nihongo.ios`

## 4.6. Lệnh (macOS)

```bash
cd apps/nihongo-ios
brew install xcodegen
xcodegen generate
open NihongoEDU.xcodeproj
# Product → Test (⌘U)
```

---

# 5. Web Next.js — `apps/nihongo-web` (tóm tắt)

| Mục | Stack |
|-----|--------|
| Framework | **Next.js 15** App Router |
| UI | React 19, TypeScript |
| Server state | TanStack Query |
| Auth | oidc-client-ts (Keycloak) + Google OAuth |
| Realtime | socket.io-client (signaling) |
| Payment | Stripe React |
| Map / canvas | mapbox-gl, fabric, hanzi-writer |
| Test | Vitest + Testing Library |
| API | Rewrite `/api` → gateway `:3000` |

Chi tiết chạy: [run-local.md](./run-local.md).

---

# 6. Backend NestJS — `services/` (tóm tắt)

| Mục | Stack |
|-----|--------|
| Framework | **NestJS 11** / Node ≥22 |
| Gateway | HTTP REST + Swagger `:3000` |
| Microservices | **gRPC** content `:50051`, exam `:50052` |
| ORM | **Prisma 6** (PostgreSQL) |
| Cache | Redis + cache-manager |
| Audit | MongoDB / Mongoose |
| Queue | BullMQ; events **Kafka** |
| Auth | JWT + Passport + Keycloak OIDC verify |
| Payment | Stripe |
| Live tokens | livekit-server-sdk |
| Mail | Brevo |
| Observability | Pino, OTEL, Prometheus |

---

# 7. Schema offline chung (mobile)

Ba app Expo / Android / Flutter (và iOS SRS/vocab) hướng tới cùng mô hình:

| Bảng / entity | Mục đích |
|---------------|----------|
| `vocabulary` | Từ vựng cache offline |
| `srs_card` | SM-2 (ease, interval, repetitions, nextReviewAt, mastered) |
| `sync_queue` / syncStatus | Hàng đợi đồng bộ `synced` \| `pending` \| `conflict` |

Thuật toán SM-2 port song song: `srs.ts` · `SrsAlgorithm.kt` · `srs_algorithm.dart` · `SRSAlgorithm.swift`.

---

# 8. Khi nào chọn framework nào?

| Mục tiêu | Nên chọn |
|----------|----------|
| Nhanh, cùng skill web React | **Expo** |
| Android thuần, Hilt/Room/CameraX | **Kotlin** |
| 1 codebase Android+iOS+web, typed | **Flutter** |
| iOS thuần, SwiftUI/SwiftData (+ LiveKit SPM) | **Swift** |
| Học / demo so sánh kiến trúc | Đọc cả 4, **code sâu 1** |

---

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [run-mobile.md](./run-mobile.md) | Lệnh chạy + unit test |
| [learn-edu-app.md](./learn-edu-app.md) | Lộ trình + Phụ lục Mobile |
| [roadmap-react-native.md](./roadmap-react-native.md) | Roadmap RN dài |
| [learn-android-kotlin.md](./learn-android-kotlin.md) | Lộ trình Android 4 bài (9 tuần, gắn `nihongo-android`), bắt đầu từ bài này |
| [roadmap-android.md](./roadmap-android.md) | Roadmap Android |
| [roadmap-flutter.md](./roadmap-flutter.md) | Roadmap Flutter |
| [roadmap-swift.md](./roadmap-swift.md) | Roadmap Swift |
| [roadmap-reactjs.md](./roadmap-reactjs.md) | Roadmap ReactJS (web `nihongo-web`) |
| [learn-nginx.md](./learn-nginx.md) | Vì sao Android hay dùng `:8080` |

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **9. Mobile** — bài 1/13.

- **Bài tiếp: [run-mobile.md](./run-mobile.md)** — Chạy các app mobile

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
