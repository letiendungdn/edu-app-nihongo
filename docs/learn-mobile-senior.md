# Lộ trình Senior Mobile — Từ Project Này

> **Phạm vi:** checklist skill tier mobile (push, sync, OCR…).  
> Khác [notes-senior-study.md](./notes-senior-study.md) Phần 2 (11 tuần) và [senior-roadmap.md](./senior-roadmap.md) (backend).  
> Status: [mobile-tech-stacks.md](./mobile-tech-stacks.md).

## Hiện trạng đã có

```
✅ Clean Architecture (Domain/Data/Presentation)
✅ SQLite offline-first + Sync queue (gửi API trước, thành công mới xóa hàng đợi; mỗi thẻ giữ lần chấm mới nhất)
✅ SRS algorithm (nhận `now` từ ngoài, cộng ngày lịch)
⚠️ Camera OCR: có ở app Android (ML Kit) và iOS (Vision); bản Flutter đang TẠM TẮT
   (gỡ ML Kit để build được simulator iOS)
✅ Riverpod state management (Flutter)
✅ Drift ORM với Stream reactive
✅ Dio AuthInterceptor: 401 → refresh một lần → gửi lại (Flutter); Android: OkHttp Authenticator
✅ go_router navigation
✅ Dark mode (ThemeMode.system)
✅ Native platform channel (MethodChannel com.edu.nihongo/native_perf)
✅ Livestream LiveKit (host publish camera + mic, viewer xem, chat qua data channel)
✅ CI: Flutter analyze + test, Android unit + emulator test, iOS unit + UI test
```

---

## Tier 1 — Production Basics (thiếu là không ship được)

### 1. Push Notifications (FCM + APNs)

**Tại sao senior cần:**
App học ngôn ngữ mà không có reminder → user quên ôn tập → churn cao.

**Use cases trong project:**
- "Bạn có 15 thẻ cần ôn hôm nay" (daily reminder)
- "Coach [tên] đang livestream" (real-time alert)
- "Session của bạn bắt đầu sau 30 phút"

**Flutter:**
```yaml
firebase_messaging: ^15.1.0
flutter_local_notifications: ^18.0.0
```

```dart
// lib/notifications/push_handler.dart

Future<void> initNotifications() async {
  await Firebase.initializeApp();
  final messaging = FirebaseMessaging.instance;

  // Xin quyền (iOS yêu cầu, Android 13+ yêu cầu)
  await messaging.requestPermission(alert: true, badge: true, sound: true);

  // Token để server gửi notification đến đúng device
  final token = await messaging.getToken();
  await saveDeviceToken(token!);  // POST /api/users/device-token

  // App đang foreground
  FirebaseMessaging.onMessage.listen((message) {
    showLocalNotification(message);
  });

  // User tap notification khi app background/killed
  FirebaseMessaging.onMessageOpenedApp.listen((message) {
    handleNotificationTap(message.data);
  });
}

void handleNotificationTap(Map<String, dynamic> data) {
  final type = data['type'];
  if (type == 'LIVE_SESSION') {
    router.push('/live/${data['sessionId']}');
  } else if (type == 'SRS_REMINDER') {
    router.push('/srs');
  }
}
```

**Backend — gửi notification:**
```typescript
// services/notification-service/src/push.service.ts
import * as admin from 'firebase-admin';

async sendPush(userId: number, payload: PushPayload) {
  const devices = await this.prisma.deviceToken.findMany({ where: { userId } });
  
  await admin.messaging().sendEachForMulticast({
    tokens: devices.map(d => d.token),
    notification: { title: payload.title, body: payload.body },
    data: payload.data,
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  });
}

// Kafka consumer — khi coach bắt đầu live
@EventPattern('edu.live.started')
async onLiveStarted(data: LiveStartedEvent) {
  const followers = await this.getFollowers(data.coachId);
  for (const userId of followers) {
    await this.sendPush(userId, {
      title: `${data.coachName} đang livestream`,
      body: data.title,
      data: { type: 'LIVE_SESSION', sessionId: data.sessionId },
    });
  }
}
```

**DB schema:**
```prisma
model DeviceToken {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  token     String
  platform  String   // "android" | "ios"
  createdAt DateTime @default(now())
  
  @@unique([userId, token])
}
```

---

### 2. Deep Linking (Universal Links / App Links)

**Use cases:**
- Share link: `nihongo://lesson/5` → mở thẳng bài 5
- Coach share link livestream: `nihongo://live/123`
- Email verification: `nihongo://verify?token=xxx`

**Flutter + go_router:**
```dart
// lib/presentation/app.dart
final _router = GoRouter(
  initialLocation: '/',
  routes: [...],
  // Deep link handling
  redirect: (context, state) {
    // nihongo://lesson/5 → /vocab?lesson=5
    if (state.uri.host == 'lesson') {
      return '/vocab?lesson=${state.uri.pathSegments.first}';
    }
    return null;
  },
);

// android/app/src/main/AndroidManifest.xml
// <intent-filter android:autoVerify="true">
//   <action android:name="android.intent.action.VIEW"/>
//   <category android:name="android.intent.category.BROWSABLE"/>
//   <data android:scheme="https" android:host="nihongo.app" android:pathPrefix="/lesson"/>
// </intent-filter>
```

**Senior pattern:** App Links (https://) quan trọng hơn Custom Scheme (nihongo://) vì:
- HTTPS links work ngay cả khi app chưa cài → redirect App Store
- Custom scheme dễ bị hijack bởi app khác

---

### 3. Error Monitoring (Sentry / Crashlytics)

**Tại sao:** App crash ở user máy thật → không có log → không biết fix gì.

```yaml
# Flutter
sentry_flutter: ^8.9.0
```

```dart
// main.dart
Future<void> main() async {
  await SentryFlutter.init(
    (options) {
      options.dsn = 'https://xxx@sentry.io/xxx';
      options.tracesSampleRate = 0.1;  // 10% requests → performance data
      options.environment = kDebugMode ? 'debug' : 'production';
    },
    appRunner: () => runApp(const ProviderScope(child: NihongoApp())),
  );
}

// Wrap Repository calls
Future<Result<void>> updateSrsCard(SrsCard card) async {
  try {
    // ...
  } catch (e, stackTrace) {
    await Sentry.captureException(e, stackTrace: stackTrace);
    return Failure(e, stackTrace: stackTrace);
  }
}
```

**Senior rule:** KHÔNG log PII (tên, email, progress) vào Sentry — GDPR/privacy violation.

---

### 4. CI/CD — Expo EAS Build + Fastlane

**Tại sao:** Build tay → mất 1 tiếng/lần → không thể ship nhanh.

**Expo (nihongo-mobile):**
```yaml
# .github/workflows/build-mobile.yml
name: EAS Build

on:
  push:
    branches: [main]
    paths: ['apps/nihongo-mobile/**']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd apps/nihongo-mobile && eas build --profile preview --non-interactive
```

**Flutter (nihongo_flutter):**
```yaml
# eas.json không dùng cho Flutter — dùng fastlane
# Fastfile
lane :beta do
  increment_build_number
  build_app(scheme: 'Runner')
  upload_to_testflight
end
```

---

## Tier 2 — Feature Complexity (cái này mới phân biệt mid vs senior)

### 5. Gesture-Driven Animations

Senior không chỉ biết `AnimatedContainer` — biết custom physics-based animation.

**Use case:** Swipe thẻ SRS (Tinder-style — swipe phải = biết, trái = quên)

```dart
// lib/presentation/srs/swipe_card.dart
class SwipeCard extends StatefulWidget {
  const SwipeCard({required this.card, required this.onSwipe});
  final ReviewCard card;
  final void Function(int quality) onSwipe;

  @override
  State<SwipeCard> createState() => _SwipeCardState();
}

class _SwipeCardState extends State<SwipeCard> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  Offset _dragOffset = Offset.zero;
  double _rotation = 0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
  }

  void _onPanUpdate(DragUpdateDetails details) {
    setState(() {
      _dragOffset += details.delta;
      _rotation = _dragOffset.dx / 300 * 0.3; // max 17 degrees
    });
  }

  void _onPanEnd(DragEndDetails details) {
    final threshold = MediaQuery.of(context).size.width * 0.4;
    
    if (_dragOffset.dx > threshold) {
      // Swipe right → biết (quality 5)
      _flyOff(right: true, quality: 5);
    } else if (_dragOffset.dx < -threshold) {
      // Swipe left → quên (quality 0)
      _flyOff(right: false, quality: 0);
    } else {
      // Snap back
      setState(() { _dragOffset = Offset.zero; _rotation = 0; });
    }
  }

  void _flyOff({required bool right, required int quality}) {
    final screenWidth = MediaQuery.of(context).size.width;
    // Tween to fly off screen
    final tween = Tween<Offset>(
      begin: _dragOffset,
      end: Offset(right ? screenWidth * 1.5 : -screenWidth * 1.5, _dragOffset.dy),
    );
    _controller.forward().then((_) => widget.onSwipe(quality));
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanUpdate: _onPanUpdate,
      onPanEnd: _onPanEnd,
      child: Transform.translate(
        offset: _dragOffset,
        child: Transform.rotate(
          angle: _rotation,
          child: _CardContent(card: widget.card),
        ),
      ),
    );
  }
}
```

**Học thêm:** `AnimatedList`, `Hero` transition, `CustomPainter`, `Lottie`.

---

### 6. Biometric Authentication

```yaml
local_auth: ^2.3.0
```

```dart
// lib/data/local/biometric_service.dart
class BiometricService {
  final LocalAuthentication _auth = LocalAuthentication();

  Future<bool> isAvailable() async {
    final available = await _auth.canCheckBiometrics;
    final devices = await _auth.getAvailableBiometrics();
    return available && devices.isNotEmpty;
  }

  Future<bool> authenticate() async {
    try {
      return await _auth.authenticate(
        localizedReason: 'Xác thực để vào app',
        options: const AuthenticationOptions(
          biometricOnly: false,  // fallback to PIN if biometric fails
          stickyAuth: true,
        ),
      );
    } catch (_) {
      return false;
    }
  }
}

// Trong login flow:
// 1. Lần đầu → login bằng email/password → lưu token vào SecureStorage
// 2. Lần sau → dùng biometric → đọc token từ SecureStorage (không login lại)
```

---

### 7. Infinite Scroll + Virtualization

```dart
// lib/presentation/vocab/vocab_screen.dart
// Senior pattern: load 20 items, khi scroll gần cuối load thêm

class VocabScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<VocabScreen> createState() => _VocabScreenState();
}

class _VocabScreenState extends ConsumerState<VocabScreen> {
  final _scrollController = ScrollController();
  int _cursor = 0;        // last item id (keyset pagination)
  bool _isLoading = false;
  bool _hasMore = true;
  final List<Vocabulary> _items = [];

  @override
  void initState() {
    super.initState();
    _loadMore();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    final maxScroll = _scrollController.position.maxScrollExtent;
    final current = _scrollController.offset;
    // Load thêm khi còn 200px cuối
    if (current >= maxScroll - 200 && !_isLoading && _hasMore) {
      _loadMore();
    }
  }

  Future<void> _loadMore() async {
    setState(() => _isLoading = true);
    final result = await ref.read(vocabRepoProvider).getVocabPage(cursor: _cursor, limit: 20);
    setState(() {
      _items.addAll(result.data);
      _cursor = result.nextCursor ?? _cursor;
      _hasMore = result.hasMore;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      controller: _scrollController,
      itemCount: _items.length + (_isLoading ? 1 : 0),
      itemBuilder: (context, i) {
        if (i == _items.length) {
          return const Center(child: CircularProgressIndicator());
        }
        return VocabTile(vocab: _items[i]);
      },
    );
  }
}
```

**Lưu ý senior:** Dùng `ListView.builder` (lazy), KHÔNG dùng `SingleChildScrollView + Column` cho list dài → OOM.

---

### 8. Image/File Upload (với progress)

Use case: User upload ảnh profile, Coach upload tài liệu bài học.

```dart
// lib/data/remote/upload_api.dart
class UploadApi {
  UploadApi(this._dio);
  final Dio _dio;

  // Upload với progress callback
  Future<String> uploadImage(
    File file,
    void Function(double progress) onProgress,
  ) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
        filename: path.basename(file.path),
        contentType: DioMediaType('image', 'jpeg'),
      ),
    });

    final res = await _dio.post(
      '/upload/image',
      data: formData,
      onSendProgress: (sent, total) => onProgress(sent / total),
    );

    return res.data['url'] as String;  // S3/R2 URL
  }
}
```

**Backend:** Presigned URL pattern (senior approach — không upload qua server):
```typescript
// GET /api/upload/presign → trả về S3 presigned URL
// Client upload thẳng lên S3 → server không làm middleman
// Server chỉ lưu URL vào DB sau khi upload thành công
```

---

### 9. Localization (i18n)

**Tại sao:** App học tiếng Nhật mà UI toàn tiếng Anh hardcoded → người mới không hiểu.

```yaml
# Flutter
flutter_localizations:
  sdk: flutter
intl: ^0.19.0
```

```
# lib/l10n/app_vi.arb
{
  "srsTitle": "Ôn tập",
  "srsEmpty": "Không có thẻ cần ôn hôm nay",
  "srsRemaining": "{count} thẻ còn lại",
  "@srsRemaining": {
    "placeholders": { "count": { "type": "int" } }
  }
}
```

```dart
Text(AppLocalizations.of(context)!.srsRemaining(cards.length))
```

---

## Tier 3 — Performance (phân biệt senior thực sự)

### 10. App Startup Time Optimization

```dart
// ❌ Anti-pattern: khởi tạo tất cả ngay khi app start
void main() async {
  await Firebase.initializeApp();
  await SentryFlutter.init(...);
  await WorkManager.initialize();
  await loadAllConfig();
  runApp(...);
}

// ✅ Senior: lazy init — chỉ cần gì thì init cái đó
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Critical path — phải có trước khi show UI
  await Firebase.initializeApp();
  
  runApp(const ProviderScope(child: NihongoApp()));
  
  // Non-critical — init sau khi UI đã render
  unawaited(() async {
    await SentryFlutter.init(...);
    await SyncService.initialize();
  }());
}
```

**Senior metric:** First meaningful paint < 1 giây.

---

### 11. Memory Leak Detection

```dart
// ❌ Common leak: StreamSubscription không cancel
class SrsScreen extends StatefulWidget {...}
class _SrsScreenState extends State<SrsScreen> {
  StreamSubscription? _sub;
  
  @override
  void initState() {
    super.initState();
    _sub = someStream.listen((_) {});  // ← leak nếu không cancel
  }
  
  @override
  void dispose() {
    _sub?.cancel();  // ← bắt buộc
    super.dispose();
  }
}

// ✅ Senior: dùng ref.watch trong Riverpod — tự cancel khi widget dispose
// Không cần quản lý subscription thủ công
```

**Tool:** Flutter DevTools → Memory tab → xem object count tăng hay không khi navigate back.

---

### 12. Heavy List Optimization (Slivers)

```dart
// ❌ Slow: nested ListView
Column(
  children: [
    Header(),
    ListView(children: [...]),  // ← không scroll đúng, không lazy
  ],
)

// ✅ Senior: CustomScrollView + Slivers
CustomScrollView(
  slivers: [
    SliverToBoxAdapter(child: Header()),
    SliverAppBar(title: Text('Từ vựng'), floating: true, snap: true),
    SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, i) => VocabTile(vocab: vocabs[i]),
        childCount: vocabs.length,
      ),
    ),
  ],
)
```

---

## Tier 4 — Testing (không test = không senior)

### 13. Widget Tests (Flutter)

```dart
// test/presentation/srs/srs_screen_test.dart
testWidgets('shows empty state when no cards due', (tester) async {
  // Arrange: mock repo trả empty list
  final container = ProviderContainer(
    overrides: [
      vocabRepoProvider.overrideWith((ref) => MockVocabRepo()),
    ],
  );

  // Act
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: const MaterialApp(home: SrsScreen()),
    ),
  );
  await tester.pump(); // let stream emit

  // Assert
  expect(find.text('Không có thẻ cần ôn hôm nay'), findsOneWidget);
  expect(find.byType(SwipeCard), findsNothing);
});

testWidgets('calls reviewCard when swiped right', (tester) async {
  final mockRepo = MockVocabRepo();
  when(() => mockRepo.watchReviewQueue()).thenAnswer((_) => Stream.value([fakeCard]));

  await tester.pumpWidget(...);
  await tester.drag(find.byType(SwipeCard), const Offset(400, 0));
  await tester.pumpAndSettle();

  verify(() => mockRepo.updateSrsCard(any())).called(1);
});
```

---

### 14. E2E Testing với Maestro

Maestro = test user flows bằng YAML, không cần code.

```yaml
# .maestro/srs-review.yaml
appId: com.edu.nihongo
---
- launchApp
- tapOn: "Ôn tập SRS"
- assertVisible: "Xem đáp án"
- tapOn: "Xem đáp án"
- assertVisible: "Quên"
- assertVisible: "Dễ"
- tapOn: "OK"
# Card tiếp theo phải hiện
- assertVisible: "Xem đáp án"
```

```bash
maestro test .maestro/srs-review.yaml
```

**Senior rule:** E2E test golden path. Unit test edge cases. Không E2E test từng edge case → quá chậm.

---

## Tier 5 — DevOps Mobile

### 15. OTA Updates (Over-The-Air)

Expo: dùng Expo Updates — push JS bundle mới mà không cần App Store review.

```bash
# Ship hotfix không cần review
eas update --branch production --message "fix: srs algorithm wrong interval"
```

**Lưu ý:** OTA chỉ update JS/Dart logic, không update native code (camera permission mới, native SDK mới → phải submit App Store).

---

### 16. App Store Deployment Checklist

```
Android (Play Console):
  □ Signed APK/AAB với keystore (ĐỪNG mất keystore — không thể publish update)
  □ targetSdkVersion = API 35 (Android 15) — Google yêu cầu
  □ 64-bit builds
  □ Privacy policy URL
  □ Screenshot 6 loại màn hình

iOS (App Store Connect):
  □ Apple Developer account ($99/năm)
  □ Certificates + Provisioning Profiles
  □ NSCameraUsageDescription trong Info.plist
  □ Review Guidelines: không được mention competitor
  □ Age rating (app học = 4+)
```

---

## Bảng tổng kết — Roadmap theo thứ tự ưu tiên

| STT | Tính năng | Tier | Package |
|---|---|---|---|
| 1 | Fix flushSyncQueue gọi API thật | Critical | — |
| 2 | Push Notifications | T1 | firebase_messaging |
| 3 | Error Monitoring | T1 | sentry_flutter |
| 4 | Deep Linking | T1 | go_router (built-in) |
| 5 | CI/CD EAS Build | T1 | GitHub Actions |
| 6 | Swipe gesture animation | T2 | built-in |
| 7 | Biometric auth | T2 | local_auth |
| 8 | Infinite scroll | T2 | ListView.builder |
| 9 | Image upload + presigned URL | T2 | dio |
| 10 | Localization | T2 | flutter_localizations |
| 11 | Livestream | T2 | livekit_client |
| 12 | Startup time < 1s | T3 | DevTools |
| 13 | Slivers optimization | T3 | built-in |
| 14 | Widget tests | T4 | flutter_test |
| 15 | E2E Maestro | T4 | maestro |
| 16 | OTA Updates | T5 | expo-updates |
| 17 | App Store deploy | T5 | EAS / Xcode |

---

## Câu hỏi phỏng vấn senior mobile

```
Q: App bạn xử lý offline như thế nào?
A: Offline-first — mọi read/write qua local DB, sync queue flush khi online
   → Không phải "check network trước rồi mới làm"

Q: Giải thích Stream vs Future trong Flutter?
A: Future = 1 giá trị async. Stream = nhiều giá trị theo thời gian.
   Room/Drift dùng Stream → UI tự rebuild khi DB thay đổi, không cần refresh thủ công.

Q: Memory leak phổ biến nhất trong Flutter?
A: StreamSubscription không cancel trong dispose().
   GlobalKey giữ reference đến Widget đã unmount.
   AnimationController không dispose.

Q: Tại sao dùng riverpod_annotation thay vì viết Provider tay?
A: Code gen đảm bảo type-safe, không typo provider name.
   Auto-dispose theo lifecycle.
   Dễ mock trong test.

Q: Sự khác nhau giữa App Link và Custom URL Scheme?
A: Custom scheme (myapp://) dễ implement nhưng dễ bị hijack.
   App Link (https://) cần verify domain ownership nhưng an toàn hơn,
   và fallback về browser nếu app chưa cài.
```
