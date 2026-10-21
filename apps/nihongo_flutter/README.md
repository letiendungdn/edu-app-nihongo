# Nihongo Flutter — offline-first

App mobile học tiếng Nhật (EDU APP), kiến trúc Clean Architecture + Drift + Riverpod.

## Chạy

```bash
cd apps/nihongo_flutter
flutter pub get
dart run build_runner build --delete-conflicting-outputs   # chỉ cần khi đổi bảng Drift
flutter run                 # Android emulator / iOS simulator / máy thật
flutter run -d chrome       # Web (Drift WASM trong web/)
```

Chrome cần file `web/sqlite3.wasm` + `web/drift_worker.js` (đã có sẵn).

## API base URL

Mặc định gọi thẳng API gateway ở cổng **3000** ([lib/data/remote/api_config.dart](lib/data/remote/api_config.dart)):

| Chạy trên | URL mặc định |
|---|---|
| Emulator Android | `http://10.0.2.2:3000/api` (10.0.2.2 = máy host, chỉ có trên emulator Android) |
| Simulator iOS, Chrome | `http://localhost:3000/api` |
| Máy thật | tự truyền: `flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000/api` |

## Tính năng

- **Từ vựng:** tải theo bài từ `GET /api/vocabularies`, lưu SQLite (Drift), đọc offline.
- **SRS:** ôn flashcard local (SM-2). Mỗi lần chấm ghi vào hàng đợi (mỗi thẻ giữ lần chấm mới nhất), gửi `POST /api/progress/review` khi đăng nhập và có mạng. Gửi lỗi thì hàng đợi còn nguyên, lần sau gửi lại.
- **Đăng nhập:** access token và refresh cookie lưu trong secure storage. Token hết hạn (401) thì tự refresh một lần rồi gửi lại request ([auth_interceptor.dart](lib/data/remote/auth_interceptor.dart)).
- **Luyện viết Kanji, phát âm, gia sư AI, luyện câu AI, livestream.** AI chạy ở server (`/api/ai/...`), app không giữ API key nào.
- **Premium:** mua gói bằng Apple Pay (iOS) / Google Pay (Android) qua Stripe. Cấu hình merchant ID, chứng chỉ, webhook: [docs/payment-wallets.md](../../docs/payment-wallets.md).
- **Dịch camera: đang tạm tắt.** Đã gỡ ML Kit để build được trên simulator iOS (ML Kit không hỗ trợ simulator arm64). Màn hình chỉ còn xem trước camera; app Android và iOS bản native vẫn dịch camera được.

## Test

```bash
flutter analyze
flutter test                                   # unit + widget test
INTEGRATION=1 flutter test test/integration    # với backend thật đang chạy ở localhost:3000
```

CI chạy `flutter analyze`, `flutter test`, và kiểm tra code Drift tự sinh còn khớp schema (job `flutter` trong `.github/workflows/ci.yml`).

## Cấu trúc

```
lib/
├── domain/        entity, repository interface, use case (không phụ thuộc Flutter)
├── data/
│   ├── local/     Drift (app_database.dart), token store
│   ├── remote/    Dio, AuthInterceptor, các API
│   └── repository/ VocabularyRepositoryImpl (offline-first + hàng đợi sync)
├── core/          tên route (routes.dart)
├── presentation/  màn hình, GoRouter (app.dart)
├── native/        MethodChannel đo hiệu năng native
├── providers.dart Riverpod providers
└── utils/
```

Học kiến trúc và code của app: [docs/roadmap-flutter.md](../../docs/roadmap-flutter.md) (Giai đoạn 2–4 bám đúng code trong thư mục này).
