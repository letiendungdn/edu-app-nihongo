# Note cá nhân — Học gì để lên Senior (từ edu_app)

> Không học thêm framework mới — học **độ sâu + production judgment + leadership**.  
> Repo này cover đủ cả 3 mảng: **backend**, **mobile**, **web frontend** — học từ code thật, không lý thuyết suông.

---

## Tổng quan ưu tiên

| # | Mảng | Thứ tự học | Timeline |
|---|------|-----------|----------|
| 1 | **Backend** | Testing → PostgreSQL → Kafka → Redis → Stripe → Design → Obs → Lead | 8 tuần |
| 2 | **Mobile (Flutter)** | Sync bug → FCM → CI/CD → SRS Swipe → Test → Biometric/Deep Link | 11 tuần |
| 3 | **Web frontend** | React Query pattern → SSE/realtime → Performance → Auth UX | song song |

---

## Trạng thái audit

| Mục | Chi tiết trong note? | Code repo hiện tại |
|-----|----------------------|--------------------|
| 1 Testing | ✅ đủ path + việc làm | Có `webhook.service.spec.ts`; concurrent book vẫn chủ yếu trong docs học |
| 2 Postgres | ✅ đủ (EXPLAIN / N+1 / race / expand-contract) | Race `bookSession` **chưa fix**; chỉ có `@@index([coachId, scheduledAt])`, **chưa** `@@unique` |
| 3 Kafka | ✅ đủ + trạng thái thật | Có **producer** (exam/payment); **chưa** Outbox / DLQ chuẩn |
| 4 Redis | ✅ đủ + file path | Rate limit sliding window có; stampede/lock/invalidate còn là bài học |
| 5 Stripe | ✅ đủ + file path | Idempotency webhook có; reconciliation job thường **chưa** |
| 6 System design | ✅ tách mục + checkpoint | ADR / trade-off = việc *bạn* làm |
| 7 Observability | ✅ log/trace/metric | Audit log có; p99 metric và distributed trace **chưa** |
| 8 Leadership | ✅ ADR + mock interview | Cần thực hành |
| 9 Mobile Flutter | ✅ 11 tuần code thật | flushSyncQueue bug + FCM + SRS swipe |
| 10 Web frontend | ✅ bổ sung mới | React Query cache + SSE hook + Next.js perf |

---

---

# PHẦN 1 — BACKEND SENIOR (8 tuần)

## Thứ tự ưu tiên

| # | Học / làm gì | Áp dụng trên edu_app |
|---|--------------|----------------------|
| 1 | **Testing** | Auth refresh · Stripe webhook · booking race |
| 2 | **PostgreSQL sâu** | `EXPLAIN ANALYZE` · N+1 · race `bookSession` · expand/contract |
| 3 | **Kafka đúng cách** | Outbox · retry/DLQ · idempotent consumer |
| 4 | **Redis nâng cao** | Stampede · lock · invalidation |
| 5 | **Stripe production** | Replay · reconcile · Connect |
| 6 | **System design** | Q trong senior-roadmap + Alex Xu |
| 7 | **Observability** | Log / metric p99 / trace gateway→gRPC |
| 8 | **Leadership** | ADR · estimate · review như mentor |

---

### 1. Testing — 3 flow nguy hiểm

| Flow | Chỗ code | Việc làm |
|------|----------|----------|
| Auth refresh | `services/api-gateway/src/auth/` · `apps/nihongo-web/src/contexts/AuthContext.tsx` · `apps/nihongo-web/src/lib/api-client.ts` (`refreshInFlight`) | Access hết hạn → 401 → `POST /api/auth/refresh` → retry 1 lần. 2 request song song chỉ **1** refresh. |
| Stripe webhook | `services/payment-service/src/webhook/` · test sẵn: `webhook.service.spec.ts` · docs: [learn-stripe-idempotency.md](./learn-stripe-idempotency.md) | Gửi cùng `event.id` (`evt_…`) 2 lần → chỉ 1 `WebhookEvent` PROCESSED, không double charge. |
| Booking race | `services/payment-service/src/booking/booking.service.ts` · mẫu test: [learn-testing.md](./learn-testing.md) | 2 learner cùng `coachId` + `scheduledAt` → 1 fulfill + 1 reject `Conflict`. |

**Checkpoint mục 1:** tự viết hoặc chạy được 3 test; giải thích được *vì sao* fail trước khi fix.

---

### 2. PostgreSQL sâu — 4 kỹ năng

#### 2.1 `EXPLAIN ANALYZE`

**Áp dụng (SQL khớp schema hiện tại):**

```bash
docker exec -it edu-postgres-nihongo psql -U nihongo nihongo
```

```sql
-- Dùng index @@index([lessonId, sortOrder])
EXPLAIN ANALYZE
SELECT * FROM "Vocabulary"
WHERE "lessonId" = 1
ORDER BY "sortOrder";

-- SRS composite (userId, nextReviewAt)
EXPLAIN ANALYZE
SELECT * FROM "SrsCard"
WHERE "userId" = 1 AND "nextReviewAt" <= NOW();
```

**Học:** https://use-the-index-luke.com/ · Hussein Nasser "EXPLAIN ANALYZE"

**Checkpoint:** nhìn output biết đang Seq Scan vì thiếu / sai thứ tự index nào.

#### 2.2 Fix N+1

```ts
// BAD — N query cho N lesson
const lessons = await prisma.lesson.findMany();
for (const l of lessons) {
  l.vocab = await prisma.vocabulary.findMany({ where: { lessonId: l.id } });
}

// GOOD — 1 query với JOIN
await prisma.lesson.findMany({ include: { vocabularies: true } });
```

**Áp dụng:** bật Prisma `log: ['query']` → gọi 1 API list → đếm `SELECT`. Soi: content-service list, marketplace coach list, admin list.

**Checkpoint:** 1 request không còn `WHERE id = 1`, `id = 2`, … N lần.

#### 2.3 Race `bookSession()`

**Hiện trạng:** `CoachingSession` có `@@index([coachId, scheduledAt])` — **không** phải unique → DB không chặn double row.

**Chỗ race:** check ngoài tx, create trong tx:

```
findFirst(conflict)     // A và B cùng thấy trống
→ $transaction {
     create CoachingSession + Payment
   }                    // cả 2 có thể OK
```

**Fix:**
1. Thêm `@@unique([coachId, scheduledAt])` (partial unique cho CANCELED slot)
2. Catch Prisma `P2002` → `409 Conflict`
3. Đưa check conflict **vào** `$transaction` + `SELECT … FOR UPDATE`

**Checkpoint:** whiteboard được timeline A/B và chỉ đúng dòng `findFirst` trước `$transaction`.

#### 2.4 Migration expand / contract

| Phase | Ý nghĩa | Ví dụ trên `CoachingSession.topic` |
|-------|---------|-------------------------------------|
| Expand | Thêm mới, giữ cũ | Add `sessionTopic` nullable; dual-write |
| Migrate | Backfill | `UPDATE … SET "sessionTopic" = topic` |
| Contract | Xóa cũ | Drop `topic` khi app chỉ đọc `sessionTopic` |

**Checkpoint:** biết khi nào `ALTER … NOT NULL` / rename 1 shot nguy hiểm trên bảng lớn.

---

### 3. Kafka đúng cách

| Khái niệm | Việc / trạng thái trên edu_app |
|-----------|-------------------------------|
| Topics | `edu.exam.submitted`, `edu.payment.succeeded`, `edu.session.completed`, `edu.vocab.reviewed` |
| Producer hiện có | `services/exam-service/src/kafka/` · `services/payment-service/src/kafka/` |
| Outbox | **Chưa có** — ghi event trong cùng `$transaction` với business write → worker poll publish |
| Retry / DLQ | Consumer fail → backoff; poison → dead-letter, không block partition |
| Idempotent handler | Cùng message 2 lần → không double streak / double payout |

**Đọc:** https://microservices.io/patterns/data/transactional-outbox.html

**Checkpoint:** vẽ được sequence Outbox; chỉ ra chỗ producer hiện tại *có thể* lệch nếu publish ngoài transaction.

---

### 4. Redis nâng cao

| Khái niệm | Việc / chỗ code |
|-----------|-----------------|
| Hiện dùng | `SlidingWindowRateLimitGuard` (`@app/common`) · cache vocab/coach (cache-manager Redis) · throttler Nest toàn cục `app.module.ts` |
| Cache stampede | Nhiều miss cùng lúc → cùng hit DB. Fix: singleflight / lock ngắn / soft TTL trên key vocab |
| Distributed lock | Job payout / reconcile chạy 1 instance khi scale |
| Invalidation | Sau admin import vocab → xóa key cache lesson (đừng chỉ TTL và quên) |

**Checkpoint:** giải thích khác nhau Throttler vs SlidingWindow; đưa 1 case stampede trên API vocab.

---

### 5. Stripe production

| Khái niệm | Việc / chỗ code |
|-----------|-----------------|
| Webhook + verify | `POST /api/webhooks/stripe` · `constructWebhookEvent` trong payment-service |
| Idempotency | Model `WebhookEvent` (`eventId` unique) — [db-design.md](./db-design.md) · [learn-stripe-idempotency.md](./learn-stripe-idempotency.md) |
| Replay | Stripe gửi lại cùng `evt_` → skip nếu đã `PROCESSED` |
| Reconciliation | **Thường chưa có** — nightly so `Payment` local vs Stripe PaymentIntent / invoice |
| Connect / payout | Coach payout flow; không tin chỉ client `confirmPayment` |

**Checkpoint:** kể được 3 failure mode: chữ ký sai, double delivery, DB crash giữa chừng sau Stripe OK.

---

### 6. System design

| Việc | Chi tiết |
|------|----------|
| Tự trả lời | Hết Q trong [senior-roadmap.md](./senior-roadmap.md) + [interview-questions.md](./interview-questions.md) — không nhìn đáp án trước |
| Vẽ lại | nginx `:8080` → gateway → gRPC content/exam → Postgres / Redis / Mongo audit |
| Sách | Alex Xu Vol.1+2 |
| Trade-off repo | Chat REST poll vs SSE vs socket · LiveKit vs signaling `:3002` · 2 DB nihongo/english · SSO token exchange vs shared session |

**Checkpoint:** 15 phút whiteboard "book coaching + Stripe" end-to-end không mở file.

---

### 7. Observability

| Việc | Chi tiết |
|------|----------|
| Log correlation | 1 `requestId` xuyên gateway → gRPC (hiện có thể chưa đủ) |
| Metrics | Latency p50/p99, error rate auth / webhook / bookSession |
| Tracing | Nếu Compose có Jaeger — [docker.md](./docker.md); trace 1 request vocab list |
| Audit sẵn có | `AuditInterceptor` → MongoDB `audit_logs` (TTL) — [system-design.md](./system-design.md) |

**Checkpoint:** sau reproduce 1 bug, chỉ ra *chỗ nào thiếu log* khiến debug chậm.

---

### 8. Leadership

| Việc | Chi tiết |
|------|----------|
| ADR (1–2 trang) | (A) Chat poll vs SSE. (B) LiveKit vs P2P signaling. Context → Decision → Consequences |
| Estimate | Q33 livestream trong senior-roadmap — nhắc MVP LiveKit **đã có** |
| Code review | Review `bookSession` như Q32 — liệt kê race, missing validation, thiếu unique |
| Mock interview | 2 buổi/tuần: senior-roadmap + [interview-devops.md](./interview-devops.md) |

**Checkpoint:** người khác đọc ADR hiểu *tại sao* chọn, không chỉ *đã chọn gì*.

---

### Checklist 8 tuần — Backend

- [ ] Test 3 flow: auth refresh, Stripe webhook, booking conflict
- [ ] `EXPLAIN ANALYZE` ≥ 3 query thật trên `edu-postgres-nihongo`
- [ ] Tìm hoặc fix ≥ 1 N+1 (có trước/sau số query)
- [ ] PR fix race `bookSession` (unique và/hoặc check trong tx) + test concurrent
- [ ] Sketch Outbox cho 1 Kafka topic (hoặc implement tối thiểu)
- [ ] 1 PR "senior" thêm: metric hoặc cache invalidation rõ ràng
- [ ] 1 ADR: poll chat vs SSE **hoặc** LiveKit vs signaling
- [ ] Mock interview 2 buổi/tuần — không nhìn đáp án

---

---

# PHẦN 2 — MOBILE SENIOR — Flutter (11 tuần)

> **Lưu ý:** ví dụ Tuần 1–2 bên dưới viết bằng TypeScript cho app **Expo** (`apps/nihongo-mobile`); bản Expo hiện đã gọi API trước rồi mới xóa hàng đợi. Lỗi cùng loại ở bản **Flutter** (xóa hàng đợi trước khi gọi API → mất lần ôn khi API lỗi) đã sửa trong `apps/nihongo_flutter/lib/data/repository/vocabulary_repository_impl.dart`, test ở `test/data/vocabulary_repository_sync_test.dart`; giải thích ở [roadmap-flutter.md](./roadmap-flutter.md) phần Data Layer.

## Tuần 1–2: Fix flushSyncQueue + Sentry

### Bug root cause

```typescript
// ❌ SAI — mark synced mà không gọi API
async flushSyncQueue() {
  const pending = await db.vocabulary
    .filter(v => v.syncStatus === 'pending').toArray();
  // BUG: không có API call nào ở đây
  await db.vocabulary
    .where('syncStatus').equals('pending')
    .modify({ syncStatus: 'synced' });
}
```

```typescript
// ✅ ĐÚNG — gọi API trước, update local sau
// apps/nihongo-mobile/src/data/repository.ts (app Expo)
async flushSyncQueue() {
  if (!(await isOnline())) return;

  const pending = await db.vocabulary
    .filter(v => v.syncStatus === 'pending').toArray();
  if (!pending.length) return;

  try {
    await vocabularyApi.bulkUpsert(
      pending.map(v => ({ id: v.remoteId, progress: v.progress, lastReviewedAt: v.lastReviewedAt }))
    );
    await db.vocabulary
      .where('id').anyOf(pending.map(v => v.id))
      .modify({ syncStatus: 'synced' });
  } catch (err) {
    console.warn('Sync failed, will retry:', err);
  }
}
```

### Sentry setup — Flutter

```dart
// apps/nihongo_flutter/lib/main.dart
// pubspec: sentry_flutter: ^8.9.0
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SentryFlutter.init(
    (options) {
      options.dsn = const String.fromEnvironment('SENTRY_DSN');
      options.tracesSampleRate = 0.1;
      options.environment = kDebugMode ? 'debug' : 'production';
      options.beforeSend = (event, hint) => event.copyWith(user: null); // không gửi PII
    },
    appRunner: () => runApp(const ProviderScope(child: NihongoApp())),
  );
}
```

**Checklist:**
- [ ] Tìm đúng nơi trong `flushSyncQueue` cần thêm API call
- [ ] Viết endpoint `POST /vocabulary/bulk-upsert` nếu chưa có
- [ ] Test offline: tắt wifi → tạo progress → bật wifi → verify server nhận dữ liệu
- [ ] Đăng ký Sentry free, thêm `SENTRY_DSN` vào `.env` (không commit)
- [ ] Trigger 1 exception giả để verify Sentry nhận được

---

## Tuần 3–4: Push Notifications (FCM)

```dart
// pubspec: firebase_messaging: ^15.1.0, flutter_local_notifications: ^18.0.0
// Setup: dart pub global activate flutterfire_cli && flutterfire configure

// apps/nihongo_flutter/lib/notifications/push_service.dart
class PushService {
  static Future<void> init(GoRouter router, AuthApi authApi) async {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    final msg = FirebaseMessaging.instance;
    await msg.requestPermission(alert: true, badge: true, sound: true);

    final token = await msg.getToken();
    if (token != null) await authApi.saveDeviceToken(token);

    FirebaseMessaging.onMessage.listen(_showLocalNotif);           // [1] foreground
    FirebaseMessaging.onMessageOpenedApp.listen((m) => _handleTap(m.data, router)); // [2] background
    final initial = await msg.getInitialMessage();
    if (initial != null) _handleTap(initial.data, router);         // [3] killed
  }

  static void _handleTap(Map<String, dynamic> data, GoRouter router) {
    switch (data['type']) {
      case 'SRS_REMINDER': router.push('/srs'); break;
      case 'LIVE_SESSION': router.push('/live'); break;
    }
  }
}
```

```typescript
// services/api-gateway/src/notification/notification.service.ts
@Injectable()
export class NotificationService {
  async sendToUser(userId: number, payload: { title: string; body: string; data?: Record<string, string> }) {
    const tokens = await this.prisma.deviceToken.findMany({ where: { userId } });
    if (!tokens.length) return;
    await admin.messaging().sendEachForMulticast({
      tokens: tokens.map(t => t.token),
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
  }

  @EventPattern('edu.live.started')
  async onLiveStarted(event: LiveStartedEvent) {
    const followers = await this.getFollowers(event.coachId);
    for (const userId of followers) {
      await this.sendToUser(userId, {
        title: `${event.coachName} đang livestream`,
        body: event.title,
        data: { type: 'LIVE_SESSION', sessionId: event.sessionId },
      });
    }
  }
}
```

**Checklist:**
- [ ] Tạo Firebase project, chạy `flutterfire configure`
- [ ] Test trên device thật (emulator không nhận FCM)
- [ ] Thêm bảng `DeviceToken` vào schema Prisma
- [ ] Handle đủ 3 trạng thái: foreground, background, killed
- [ ] Scheduled job gửi SRS reminder lúc 8h sáng

---

## Tuần 5–6: CI/CD — GitHub Actions + EAS Build

```yaml
# .github/workflows/flutter.yml
name: Flutter CI
on:
  push:
    branches: [main]
    paths: ['apps/nihongo_flutter/**']
  pull_request:
    paths: ['apps/nihongo_flutter/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.27.x', cache: true }
      - run: cd apps/nihongo_flutter && flutter pub get
      - run: cd apps/nihongo_flutter && flutter analyze --fatal-infos
      - run: cd apps/nihongo_flutter && flutter test --coverage

  build-android:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.27.x', cache: true }
      - run: cd apps/nihongo_flutter && flutter build apk --release
      - uses: actions/upload-artifact@v4
        with:
          name: release-apk
          path: apps/nihongo_flutter/build/app/outputs/flutter-apk/app-release.apk
```

```bash
# EAS Build — Expo
npm install -g eas-cli && eas login
cd apps/nihongo-mobile && eas init
eas build --profile preview --platform android --non-interactive
```

```json
// apps/nihongo-mobile/eas.json
{
  "build": {
    "preview": { "distribution": "internal", "android": { "buildType": "apk" } },
    "production": { "android": { "buildType": "aab" }, "ios": { "distribution": "store" } }
  }
}
```

**Checklist:**
- [ ] Flutter workflow — verify xanh trên PR đầu tiên
- [ ] EAS Build chạy thành công, download APK cài được trên device
- [ ] Thêm `EXPO_TOKEN` vào GitHub Secrets
- [ ] Fix hết warning từ `flutter analyze --fatal-infos`

---

## Tuần 7–8: Swipe Gesture SRS (Tinder-style)

Swipe phải = biết (SM-2 quality 5), trái = quên (quality 0).

```dart
// apps/nihongo_flutter/lib/presentation/srs/swipe_card.dart
class SwipeCard extends StatefulWidget {
  const SwipeCard({required this.card, required this.onSwipe, super.key});
  final ReviewCard card;
  final void Function(int quality) onSwipe;
  @override
  State<SwipeCard> createState() => _SwipeCardState();
}

class _SwipeCardState extends State<SwipeCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  Offset _drag = Offset.zero;
  double _rot = 0;
  bool _flipped = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 250));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); } // tránh memory leak

  void _onPanUpdate(DragUpdateDetails d) => setState(() {
    _drag += d.delta;
    _rot = (_drag.dx / 300).clamp(-0.4, 0.4);
  });

  void _onPanEnd(DragEndDetails _) {
    final threshold = context.size!.width * 0.35;
    if (_drag.dx > threshold)       _flyOff(right: true);
    else if (_drag.dx < -threshold) _flyOff(right: false);
    else setState(() { _drag = Offset.zero; _rot = 0; });
  }

  void _flyOff({required bool right}) {
    final w = MediaQuery.of(context).size.width;
    final anim = Tween<Offset>(
      begin: _drag,
      end: Offset(right ? w * 1.5 : -w * 1.5, _drag.dy),
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    anim.addListener(() => setState(() => _drag = anim.value));
    _ctrl.forward().then((_) => widget.onSwipe(right ? 5 : 0));
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanUpdate: _onPanUpdate,
      onPanEnd: _onPanEnd,
      onTap: () => setState(() => _flipped = !_flipped),
      child: Transform.translate(
        offset: _drag,
        child: Transform.rotate(
          angle: _rot,
          child: Stack(children: [
            _CardFace(card: widget.card, flipped: _flipped),
            if (_drag.dx > 20)  Positioned(top: 16, left: 16,  child: _SwipeLabel(text: 'BIẾT', color: Colors.green)),
            if (_drag.dx < -20) Positioned(top: 16, right: 16, child: _SwipeLabel(text: 'QUÊN', color: Colors.red)),
          ]),
        ),
      ),
    );
  }
}
```

**Checklist:**
- [ ] Dispose `AnimationController` trong `dispose()` — bắt buộc
- [ ] Overlay BIẾT/QUÊN xuất hiện khi kéo > 20px
- [ ] Tap card để flip front/back
- [ ] Kiểm tra DevTools Memory tab — không leak khi navigate back

---

## Tuần 9–10: Widget Tests + Maestro E2E

### Widget test với Riverpod + mocktail

```dart
// pubspec dev_dependencies: mocktail: ^0.3.0
class MockVocabRepo extends Mock implements VocabularyRepository {}

void main() {
  testWidgets('hiện empty state khi không có thẻ', (tester) async {
    final mock = MockVocabRepo();
    when(() => mock.watchReviewQueue()).thenAnswer((_) => Stream.value([]));

    await tester.pumpWidget(ProviderScope(
      overrides: [vocabRepositoryProvider.overrideWithValue(mock)],
      child: const MaterialApp(home: SrsScreen()),
    ));
    await tester.pump();

    expect(find.text('Không có thẻ cần ôn hôm nay'), findsOneWidget);
    expect(find.byType(SwipeCard), findsNothing);
  });

  testWidgets('swipe phải gọi updateSrsCard với quality=5', (tester) async {
    final mock = MockVocabRepo();
    when(() => mock.watchReviewQueue()).thenAnswer((_) => Stream.value([fakeCard()]));
    when(() => mock.updateSrsCard(any())).thenAnswer((_) async {});

    await tester.pumpWidget(ProviderScope(
      overrides: [vocabRepositoryProvider.overrideWithValue(mock)],
      child: const MaterialApp(home: SrsScreen()),
    ));
    await tester.pump();
    await tester.drag(find.byType(SwipeCard), const Offset(400, 0));
    await tester.pumpAndSettle();

    verify(() => mock.updateSrsCard(
      any(that: predicate<SrsCard>((c) => c.quality == 5)),
    )).called(1);
  });
}
```

### Maestro E2E

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

```yaml
# .maestro/srs-review.yaml
appId: com.edu.nihongo
---
- launchApp
- tapOn: "Ôn tập SRS"
- assertVisible: "Xem đáp án"
- tapOn: "Xem đáp án"
- assertVisible: "Dễ"
- swipeLeft
- assertVisible: "Xem đáp án"
```

**Checklist:**
- [ ] 3 widget test: empty state, swipe phải, swipe trái
- [ ] Maestro flow cho SRS và vocab screen
- [ ] `flutter test` chạy xanh trong CI

---

## Tuần 11+: Biometric · Deep Linking · Presigned URL

### Biometric

```dart
// pubspec: local_auth: ^2.3.0, flutter_secure_storage: ^9.2.0
class AuthService {
  final _auth = LocalAuthentication();
  static const _store = FlutterSecureStorage();

  Future<void> saveTokenSecurely(String token) =>
      _store.write(key: 'auth_token', value: token);

  Future<String?> tryBiometricLogin() async {
    if (!(await _auth.canCheckBiometrics)) return null;
    final ok = await _auth.authenticate(
      localizedReason: 'Xác thực để vào Nihongo',
      options: const AuthenticationOptions(biometricOnly: false, stickyAuth: true),
    );
    if (!ok) return null;
    return _store.read(key: 'auth_token');
  }
}
```

### Deep Linking (App Links — tốt hơn Custom Scheme)

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW"/>
  <category android:name="android.intent.category.DEFAULT"/>
  <category android:name="android.intent.category.BROWSABLE"/>
  <data android:scheme="https" android:host="nihongo.app" android:pathPrefix="/lesson"/>
</intent-filter>
```

```dart
final _router = GoRouter(
  routes: [...],
  redirect: (context, state) {
    final uri = state.uri;
    if (uri.host == 'nihongo.app' && uri.pathSegments.firstOrNull == 'lesson') {
      return '/vocab?lesson=${uri.pathSegments.elementAtOrNull(1)}';
    }
    return null;
  },
);
// Test: adb shell am start -a android.intent.action.VIEW -d "https://nihongo.app/lesson/1"
```

### Presigned URL Upload

```dart
// Flutter — upload thẳng lên S3, không qua server
Future<String> uploadAvatar(File file) async {
  final presign = await uploadApi.presign(
    filename: path.basename(file.path), mimeType: 'image/jpeg');

  final bytes = await file.readAsBytes();
  await Dio().put(
    presign.uploadUrl,
    data: Stream.fromIterable([bytes]),
    options: Options(headers: {'Content-Type': 'image/jpeg', 'Content-Length': bytes.length}),
  );

  await authApi.updateAvatar(presign.publicUrl);
  return presign.publicUrl;
}
```

**Checklist:**
- [ ] Biometric test trên device thật (emulator không hỗ trợ)
- [ ] App Links: host `assetlinks.json` tại `/.well-known/assetlinks.json`
- [ ] S3 bucket CORS: cho phép `PUT` từ mobile
- [ ] Presigned URL TTL ≤ 15 phút

---

## Câu hỏi phỏng vấn — Mobile Senior

**Q: App bạn xử lý offline như thế nào?**
A: Offline-first — mọi read/write qua local DB, sync queue flush khi online. Không phải "check network trước rồi mới làm".

**Q: Memory leak phổ biến nhất trong Flutter?**
A: `StreamSubscription` không cancel trong `dispose()`. `AnimationController` không dispose. `GlobalKey` giữ reference đến Widget đã unmount.

**Q: Tại sao dùng App Links thay vì Custom URL Scheme?**
A: Custom scheme (`myapp://`) dễ bị hijack bởi app khác. App Links cần verify domain ownership, an toàn hơn, fallback về browser nếu app chưa cài.

**Q: Presigned URL là gì?**
A: URL tạm thời có TTL do server cấp, cho phép client upload thẳng lên S3 mà không qua server → tiết kiệm bandwidth và cost.

---

---

# PHẦN 3 — WEB FRONTEND SENIOR (song song)

> Repo có: `nihongo-web` (Next.js 15, App Router).  
> Học từ code thật trong app này — không cần dự án mới.

## 3.1 React Query patterns đúng cách

**Đang dùng trong repo:** `@tanstack/react-query` — tất cả data fetching trong nihongo-web.

```typescript
// ✅ ĐÚNG — invalidate chính xác sau mutation, không invalidate toàn bộ
const mutation = useMutation({
  mutationFn: (data) => sendSupportMessage(token, data),
  onSuccess: () => {
    // Chỉ invalidate key liên quan, không dùng queryClient.invalidateQueries() không có filter
    queryClient.invalidateQueries({ queryKey: ['support-thread'] });
  },
});

// ✅ optimistic update — update UI trước, rollback nếu fail
const mutation = useMutation({
  mutationFn: markNotificationRead,
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['notifications'] });
    const prev = queryClient.getQueryData(['notifications']);
    queryClient.setQueryData(['notifications'], (old) =>
      old?.map(n => n.id === id ? { ...n, read: true } : n)
    );
    return { prev };
  },
  onError: (_, __, ctx) => queryClient.setQueryData(['notifications'], ctx?.prev),
});
```

**Áp dụng trên repo:**
- `apps/nihongo-web/src/hooks/queries.ts` — xem các `refetchInterval`, check có invalidate đúng không sau mutation
- `apps/nihongo-web/src/hooks/useChatSSE.ts` — `queryClient.setQueryData` append message từ SSE (pattern tốt, giữ nguyên)

**Checkpoint:** 1 screen không refetch toàn bộ sau mỗi action nhỏ; có 1 optimistic update thật.

---

## 3.2 SSE / Realtime pattern

**Đã implement trong repo:**

```typescript
// apps/nihongo-web/src/hooks/useChatSSE.ts — pattern chuẩn
export function useSupportSSE(threadId: number | null, enabled = true) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || !threadId) return;
    const es = new EventSource(`${API_BASE}/api/support/stream`);
    esRef.current = es;

    es.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      queryClient.setQueryData(['support-thread'], (prev) => {
        if (!prev) return prev;
        const exists = prev.messages.some(m => m.id === msg.id);
        if (exists) return prev;                        // idempotent
        return { ...prev, messages: [...prev.messages, msg] };
      });
    };

    es.onerror = () => es.close();
    return () => { es.close(); esRef.current = null; };
  }, [enabled, threadId, queryClient]);
}
```

**Điểm cần học thêm:**
- Reconnect tự động (EventSource tự reconnect sau error nhưng cần handle `readyState`)
- Auth header với SSE — EventSource không cho set header → dùng token trong URL param (đang làm) hoặc cookie
- Fallback graceful: nếu SSE fail → tăng poll interval, không để UI đứng im

**Checkpoint:** SSE disconnect (tắt server) → UI vẫn có dữ liệu từ poll fallback 30s.

---

## 3.3 Next.js App Router — patterns đúng

```typescript
// ✅ Server Component fetch — không client waterfall
// apps/nihongo-web/src/app/(main)/vocab/page.tsx
export default async function VocabPage({ searchParams }) {
  const lesson = Number(searchParams.lesson ?? 1);
  // fetch trực tiếp trong Server Component — không dùng useEffect + fetch
  const data = await fetchVocabServer(lesson); // gọi internal API hoặc trực tiếp service
  return <VocabClient initialData={data} lesson={lesson} />;
}

// ✅ Streaming với Suspense
export default function Page() {
  return (
    <Suspense fallback={<VocabSkeleton />}>
      <VocabList />           {/* async Server Component */}
    </Suspense>
  );
}
```

**Kiến thức cần nắm:**
| Khái niệm | Mô tả | Áp dụng |
|-----------|-------|---------|
| Server vs Client Component | `'use client'` chỉ khi cần state/event | Audit nihongo-web xem có `'use client'` thừa không |
| Route cache vs Data cache | `revalidatePath`, `revalidateTag`, `no-store` | Admin page cần `no-store`; public vocab cần revalidate 5m |
| Parallel routes `@slot` | `@modal` pattern cho lightbox | Lesson detail overlay |
| `generateStaticParams` | Pre-render vocab pages | `/vocab/[lessonNumber]` |

**Checkpoint:** 1 page chuyển từ client fetch → server fetch → Lighthouse score tăng.

---

## 3.4 Angular 19 — Signals + standalone

> App Angular (`apps/nihongo-angular`) đã gỡ khỏi repo (10/2026) — mục này giữ làm kiến thức chung.

```typescript
// Angular 19 Signals — thay NgRx cho state đơn giản
@Component({ standalone: true, ... })
export class VocabComponent {
  private vocabService = inject(VocabService);

  // signal thay vì BehaviorSubject
  lesson = signal(1);
  vocabs = computed(() => this.vocabService.getByLesson(this.lesson()));

  // effect thay vì ngOnChanges + subscribe
  constructor() {
    effect(() => {
      console.log('lesson changed:', this.lesson());
    });
  }
}

// HttpClient trong standalone — inject trực tiếp
const vocabList = toSignal(
  inject(HttpClient).get<Vocab[]>('/api/vocabularies'),
  { initialValue: [] }
);
```

**Kiến thức cần nắm:**
- `inject()` thay DI trong constructor — clean hơn
- `toSignal()` wrap Observable → Signal — không unsubscribe thủ công
- `deferrable views` (`@defer`) — lazy load component khi visible
- Standalone = không cần `NgModule`; `provideRouter`, `provideHttpClient` trong `bootstrapApplication`

**Checkpoint:** 1 feature Angular không dùng `*ngIf`/`*ngFor` cũ — dùng `@if`/`@for` block mới (Angular 17+).

---

## 3.5 Web Performance

| Kỹ năng | Áp dụng trên repo |
|---------|------------------|
| Core Web Vitals (LCP/CLS/INP) | Lighthouse nihongo-web → fix 1 issue LCP |
| Bundle analysis | `next build && ANALYZE=true next build` — có `@next/bundle-analyzer` chưa? |
| Image optimization | `next/image` thay `<img>` cho vocab/kanji image |
| Font loading | `next/font` với font local — không flash unstyled text |
| React DevTools Profiler | Tìm component render > 50ms — thường là list không có `key` tốt |

**Checkpoint:** 1 trang Lighthouse ≥ 80 performance sau khi fix.

---

## 3.6 Auth UX patterns

**Đang có trong repo:**
- nihongo-web: `AuthContext` + Bearer token + refresh rotation

**Kiến thức cần nắm:**
```typescript
// ✅ Xử lý token refresh đúng — không race
// apps/nihongo-web/src/contexts/AuthContext.tsx
let refreshPromise: Promise<string> | null = null;

async function getValidToken() {
  if (isExpired(accessToken)) {
    if (!refreshPromise) {
      refreshPromise = refresh().finally(() => { refreshPromise = null; });
    }
    return refreshPromise;  // tất cả request chờ cùng 1 promise
  }
  return accessToken;
}
```

**Q phỏng vấn:**
- "CSRF với HttpOnly cookie xử lý sao?" → SameSite=Strict hoặc CSRF token header
- "Refresh token rotation — nếu cả 2 request cùng refresh thì sao?" → mutex / `refreshInFlight` pattern trong `apps/nihongo-web/src/lib/api-client.ts`
- "SSO cross-domain cookie vấn đề gì?" → phải gọi set-cookie từ đúng domain

---

## Checklist Web Frontend

- [ ] Audit `'use client'` trong nihongo-web — xóa cái thừa (1 pass)
- [ ] 1 page chuyển sang Server Component fetch
- [ ] Verify `refetchInterval` hợp lý (chat = 30s fallback, notifications = 60s?)
- [ ] Lighthouse ≥ 80 performance cho `/vocab` page
- [ ] Kiểm tra refresh token race condition — có `refreshInFlight` guard chưa?

---

---

# KHÔNG cần học thêm (trừ khi JD bắt)

- Framework mobile thứ 2/3/4
- Angular *và* React cùng lúc nếu target backend
- Kubernetes sâu khi chưa xong testing + DB
- NgRx / Redux "cho đủ"
- Micro-frontend nếu monorepo chưa đủ phức tạp

---

# Sách bắt buộc — link chính thức

> Sách có bản quyền — mua/đọc qua kênh chính thức. Giá eBook thường 30–50 USD, O'Reilly/Manning hay sale.

### 1. Designing Data-Intensive Applications — Martin Kleppmann
- O'Reilly (trial 10 ngày): https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/
- Trang tác giả (mục lục + tài liệu free): https://dataintensive.net/
- Amazon: https://www.amazon.com/dp/1449373321

### 2. System Design Interview Vol.1 + 2 — Alex Xu
- ByteByteGo (bản online chính chủ): https://bytebytego.com/
- Amazon Vol.1: https://www.amazon.com/dp/B08CMF2CQF
- Amazon Vol.2: https://www.amazon.com/dp/1736049119
- Free: blog ByteByteGo https://blog.bytebytego.com/

### 3. Unit Testing Principles, Practices, and Patterns — Vladimir Khorikov
- Manning (hay sale 50%): https://www.manning.com/books/unit-testing
- Amazon: https://www.amazon.com/dp/1617296279
- Free: blog tác giả https://enterprisecraftsmanship.com/

### Free 100%

| Nguồn | Chủ đề |
|-------|--------|
| https://use-the-index-luke.com/ | Database indexing |
| https://github.com/donnemartin/system-design-primer | System design primer |
| https://microservices.io/patterns/ | Outbox, Saga, CQRS patterns |
| https://docs.nestjs.com/ | NestJS internals |
| https://web.dev/learn/performance/ | Web Performance |

---

# Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [senior-roadmap.md](./senior-roadmap.md) | Roadmap đầy đủ + Q&A backend |
| [mobile-tech-stacks.md](./mobile-tech-stacks.md) | Stack 4 mobile apps |
| [interview-questions.md](./interview-questions.md) | Câu hỏi phỏng vấn backend |
| [interview-devops.md](./interview-devops.md) | Câu hỏi DevOps |
| [learn-testing.md](./learn-testing.md) | Testing trên repo (kèm concurrent book) |
| [learn-stripe-idempotency.md](./learn-stripe-idempotency.md) | Webhook idempotent |
| [system-design.md](./system-design.md) | Kiến trúc + Kafka topics |
| [db-design.md](./db-design.md) | Schema + `WebhookEvent` |
| [docker.md](./docker.md) | Containers / Jaeger |
| [roadmap-reactjs.md](./roadmap-reactjs.md) | React/Next.js roadmap chi tiết |
| [roadmap-flutter.md](./roadmap-flutter.md) | Flutter roadmap chi tiết |
