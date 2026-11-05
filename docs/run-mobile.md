# Chạy các app mobile (local)

Repo có **4 app mobile** dùng chung backend NestJS. Bảng tra nhanh:

| App | Folder | Stack | Lệnh chạy |
|-----|--------|-------|-----------|
| **Nihongo Mobile** | `apps/nihongo-mobile` | Expo / React Native | `npm run android` |
| **Nihongo Android** | `apps/nihongo-android` | Kotlin + Compose | `.\gradlew.bat installDebug` |
| **Nihongo Flutter** | `apps/nihongo_flutter` | Flutter + Drift | `flutter run` |
| **Nihongo iOS** | `apps/nihongo-ios` | SwiftUI *(cần macOS)* | `xcodegen generate` → Xcode Run |

**Tech chi tiết từng framework (dependency, kiến trúc, config):** [mobile-tech-stacks.md](./mobile-tech-stacks.md)

---

## Bước 0 — Backend phải chạy trước

```powershell
cd C:\Users\dungle\Desktop\edu_app
npm run docker:up:nihongo
# ≈14 container (nginx :8080, Keycloak, LiveKit, …) — xem docker.md
```

Kiểm tra: `curl.exe http://localhost:8080/api/lessons` phải trả `200`.

> Emulator không dùng được `localhost` (đó là chính emulator). Máy host = **`10.0.2.2`** trên Android emulator.

Nếu vẫn không kết nối được, forward cổng host vào emulator:

```powershell
adb reverse tcp:8080 tcp:8080
adb reverse tcp:3000 tcp:3000
```

### Cổng API mỗi app đang trỏ tới

| App | API base URL (mặc định) | Qua |
|-----|-------------------------|-----|
| nihongo-mobile | `http://10.0.2.2:3000/api` | gateway trực tiếp |
| nihongo-android | `http://10.0.2.2:8080/api/` | nginx |
| nihongo_flutter | `http://10.0.2.2:3000/api` | gateway trực tiếp |
| nihongo-ios (simulator) | `http://localhost:3000/api` | gateway trực tiếp |

---

## 1. Nihongo Mobile — Expo / React Native

Cần: Node >= 22, Android Studio (SDK + emulator) hoặc thiết bị thật bật USB debugging.

```powershell
cd apps\nihongo-mobile
npm install

# Lần đầu (hoặc sau khi đổi plugin/native config)
npx expo prebuild --platform android

npm run android      # = expo run:android — build & cài lên emulator/thiết bị
```

| Script | Mô tả |
|--------|--------|
| `npm start` | Metro bundler (nếu app đã cài) |
| `npm run android` | Build & chạy Android |
| `npm run ios` | Build & chạy iOS *(macOS)* |
| `npm run typecheck` | TypeScript |

> Camera + ML Kit (dịch camera) **không chạy trên Expo Go** — phải dùng dev build `expo run:android`.

Đổi API cho máy thật: sửa `extra.apiBaseUrl` trong `apps/nihongo-mobile/app.json` thành IP LAN, ví dụ `http://192.168.1.10:3000/api`.

---

## 2. Nihongo Android — Kotlin native

Cần: JDK 17, Android SDK 35 (Android Studio).

```powershell
cd apps\nihongo-android

.\gradlew.bat installDebug     # build + cài lên device/emulator đang chạy
# hoặc chỉ build APK:
.\gradlew.bat assembleDebug    # → app\build\outputs\apk\debug\app-debug.apk
```

Cách dễ nhất: mở folder `apps/nihongo-android` bằng **Android Studio** → chọn device → **Run ▶**.

Đổi API cho máy thật: sửa `buildConfigField("String", "API_BASE_URL", ...)` trong `apps/nihongo-android/app/build.gradle.kts`.

---

## 3. Nihongo Flutter

Cần: Flutter SDK, Android SDK (hoặc Chrome cho web).

```powershell
cd apps\nihongo_flutter
flutter pub get
dart run build_runner build --delete-conflicting-outputs   # sinh code Drift

flutter run                 # Android / iOS device đang kết nối
flutter run -d chrome       # Web (Drift WASM)
flutter devices             # xem device khả dụng
```

Đổi API cho máy thật:

```powershell
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000/api
```

### Chạy trên máy ảo Android, từng bước

Đã chạy thật ngày 05/11/2026 trên macOS (Apple Silicon), Flutter 3.47.6, máy ảo `pixel_api_35` (Android 15).

```bash
# 1. Bật backend (ở thư mục gốc repo), rồi kiểm tra: phải ra 200
npm run docker:up:nihongo
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/health

# 2. Kiểm tra môi trường và tìm máy ảo
flutter doctor
flutter emulators

# 3. Bật máy ảo
flutter emulators --launch pixel_api_35
adb wait-for-device
adb shell getprop sys.boot_completed      # ra 1 là khởi động xong
flutter devices                           # phải thấy emulator-5554

# 4. Chạy app
cd apps/nihongo_flutter
flutter pub get
flutter run -d emulator-5554
```

Lần build đầu mất khoảng 4–5 phút, các lần sau nhanh hơn nhiều. Khi app đang chạy, bấm `r` (hot reload), `R` (hot restart) hoặc `q` (thoát) trong terminal.

**Kiểm tra app đã nối được backend:**

1. Trên Home, góc phải phải hiện **Online**.
2. Vào **Từ vựng**, bấm biểu tượng tải về ở góc phải. Phải hiện "Đã tải bài 1".
3. Xem gateway có nhận request không:

   ```bash
   docker logs --tail 60 edu-gateway | grep "vocabularies"
   ```

Từ vựng hiện ra chưa chứng minh được đã nối backend, vì dữ liệu có thể là bản đã lưu sẵn trong máy ảo. Hãy dựa vào bước 2 và 3.

---

## 4. Nihongo iOS — SwiftUI

Chỉ chạy được trên **macOS + Xcode 15+**. Project sinh từ `project.yml` bằng [XcodeGen](https://github.com/yonaskolb/XcodeGen).

```bash
cd apps/nihongo-ios
brew install xcodegen
xcodegen generate            # sinh NihongoEDU.xcodeproj (+ resolve LiveKit SPM)
open NihongoEDU.xcodeproj
```

Trong Xcode: chọn simulator → **Run ▶**. Lần đầu Xcode tải package **LiveKit**.

Quyền camera/micro đã khai báo trong `Info.plist` (`NSCameraUsageDescription`, `NSMicrophoneUsageDescription`).

Đổi API cho thiết bị thật: **Edit Scheme → Run → Environment Variables** → bật `API_BASE_URL` = `http://192.168.1.10:3000/api`.

---

## Unit test

| App | Lệnh | Nội dung chính |
|-----|------|----------------|
| Expo | `cd apps/nihongo-mobile && npm test` / `npm run test:run` | SM-2 (`srs.ts`), OCR overlay map |
| Android | `cd apps/nihongo-android && .\gradlew.bat testDebugUnitTest` | `SrsAlgorithmTest` (JUnit) |
| Flutter | `cd apps/nihongo_flutter && flutter test` | Thuật toán SRS, đồng bộ offline, refresh token, widget, thanh toán |
| iOS | `xcodegen generate` rồi Xcode Test / `xcodebuild test` *(macOS)* | `SRSAlgorithmTests` |

---

## Xử lý lỗi thường gặp

| Triệu chứng | Cách xử lý |
|-------------|------------|
| App không gọi được API | Backend chưa chạy (`docker compose up -d`) hoặc dùng `localhost` thay vì `10.0.2.2` |
| `adb: no devices/emulators found` | Mở emulator trong Android Studio (Device Manager) trước |
| Expo: camera / ML Kit / STT không hoạt động | Đang dùng Expo Go — chạy `npx expo prebuild` + `npm run android` (cần native module) |
| Expo build lỗi sau khi đổi native config | Xóa `android/` rồi `npx expo prebuild --platform android --clean` |
| Gradle `SDK location not found` | Tạo `apps/nihongo-android/local.properties` với `sdk.dir=C:\\Users\\<user>\\AppData\\Local\\Android\\Sdk` |
| Flutter lỗi generated file | Chạy lại `dart run build_runner build --delete-conflicting-outputs` |
| Flutter build Android: `relies on ... InternalProblems, a Gradle internal API that was removed in Gradle 9.6.0` | Gradle mới hơn mức AGP hỗ trợ. AGP đang là 8.11.1, nên `android/gradle/wrapper/gradle-wrapper.properties` phải dùng Gradle dưới 9.6 (hiện là 9.3.1). Muốn dùng Gradle mới hơn thì nâng AGP trong `android/settings.gradle.kts` trước |
| Flutter cảnh báo Kotlin 2.2.20 "will soon be dropped" | Chỉ là cảnh báo, app vẫn build được. Sau này phải nâng Kotlin lên từ 2.3.20 trong `android/settings.gradle.kts` |
| Máy thật không vào được API | Điện thoại và máy host phải cùng WiFi; mở firewall cho port 3000/8080 |

---

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [run-local.md](./run-local.md) | Chạy backend + web local |
| [docker.md](./docker.md) | Full stack trong Docker |
| [learn-nginx.md](./learn-nginx.md) | Nginx reverse proxy — cổng `:8080`, route API/web/Keycloak |
| [apps/nihongo-mobile/README.md](../apps/nihongo-mobile/README.md) | Chi tiết app Expo |
| [apps/nihongo-android/README.md](../apps/nihongo-android/README.md) | Chi tiết app Kotlin |
| [apps/nihongo_flutter/README.md](../apps/nihongo_flutter/README.md) | Chi tiết app Flutter |

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **9. Mobile** — bài 2/9.

- Bài trước: [mobile-tech-stacks.md](./mobile-tech-stacks.md) — Tech stack từng app mobile
- **Bài tiếp: [learn-android-fundamentals.md](./learn-android-fundamentals.md)** — Nền tảng Android qua code nihongo-android

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
