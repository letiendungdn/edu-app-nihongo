# Câu hỏi phỏng vấn Senior Mobile

> **Mục tiêu:** Trả lời câu hỏi Senior Mobile: Dart/Flutter, Riverpod, kiến trúc, hiệu năng, bộ nhớ, test, native, offline, CI/CD.
>
> **Cần biết trước:** [learn-flutter.md](./learn-flutter.md), [learn-mobile-senior.md](./learn-mobile-senior.md). Android riêng: [interview-android.md](./interview-android.md). React Native: [interview-react-native-senior.md](./interview-react-native-senior.md).

Cách dùng: tự trả lời thành tiếng rồi mới bấm mở **Đáp án**.

---

## DART & FLUTTER CƠ BẢN

**Q: Future vs Stream khác nhau thế nào?**

<details><summary>Đáp án</summary>

Future = 1 giá trị async (HTTP call). Stream = nhiều giá trị theo thời gian (DB watch, websocket).
Drift dùng Stream → UI tự rebuild khi DB thay đổi mà không cần setState thủ công.

</details>

**Q: const constructor có tác dụng gì?**

<details><summary>Đáp án</summary>

Widget được tạo 1 lần duy nhất và reuse — Flutter không rebuild nếu parent rebuild.
Rule: widget không có state biến đổi thì luôn thêm `const`.

</details>

**Q: Khi nào dùng StatefulWidget, khi nào dùng ConsumerWidget?**

<details><summary>Đáp án</summary>

StatefulWidget khi state chỉ sống trong widget đó (animation, form input tạm). ConsumerWidget khi state chia sẻ giữa nhiều widget (user session, review queue).

</details>

**Q: `key` trong Flutter dùng để làm gì?**

<details><summary>Đáp án</summary>

Giúp Flutter phân biệt widget khi rebuild list. Thiếu key trong AnimatedList hoặc reorderable list → state bị gắn nhầm widget.
```dart
ListView.builder(
  itemBuilder: (_, i) => VocabTile(key: ValueKey(vocab[i].id), vocab: vocab[i]),
)
```

</details>

**Q: BuildContext là gì?**

<details><summary>Đáp án</summary>

Handle để widget biết vị trí của nó trong widget tree. Dùng để lookup Theme, MediaQuery, Provider. Không dùng context sau khi widget đã unmount (async gap) → crash.

</details>

**Q: `await` vs `unawaited` khi nào dùng?**

<details><summary>Đáp án</summary>

`await` khi cần kết quả hoặc cần catch error. `unawaited` cho fire-and-forget như analytics, cache persist — không block UI.

</details>

---

## STATE MANAGEMENT — RIVERPOD

**Q: Tại sao dùng Riverpod thay vì Provider hay BLoC?**

<details><summary>Đáp án</summary>

Provider: không type-safe khi override. BLoC: boilerplate nhiều. Riverpod: compile-time safe, dễ test (ProviderContainer override), auto-dispose, không cần BuildContext để read.

</details>

**Q: StreamProvider vs FutureProvider khi nào dùng?**

<details><summary>Đáp án</summary>

FutureProvider cho one-time async (lấy config). StreamProvider cho real-time data (DB watch, websocket). Project dùng StreamProvider cho `reviewQueueProvider` → SRS screen tự cập nhật khi DB thay đổi.

</details>

**Q: Giải thích `ref.watch` vs `ref.read`.**

<details><summary>Đáp án</summary>

`ref.watch` — subscribe, rebuild widget khi value thay đổi. Dùng trong build().
`ref.read` — đọc 1 lần, không subscribe. Dùng trong callback (onTap, initState).
Dùng nhầm `ref.read` trong build → UI không cập nhật. Dùng `ref.watch` trong callback → memory leak.

</details>

**Q: Làm sao test widget dùng Riverpod?**

<details><summary>Đáp án</summary>

```dart
await tester.pumpWidget(
  ProviderScope(
    overrides: [vocabRepositoryProvider.overrideWithValue(mockRepo)],
    child: const MaterialApp(home: SrsScreen()),
  ),
);
```

</details>

---

## KIẾN TRÚC & CLEAN ARCHITECTURE

**Q: Giải thích Clean Architecture trong project của bạn.**

<details><summary>Đáp án</summary>

3 layer:
- **Domain**: Entity (Vocabulary, SrsCard), Repository interface, UseCase — không phụ thuộc framework nào
- **Data**: RepositoryImpl, Drift DAO (local), Dio API (remote), sync logic
- **Presentation**: Widget, ConsumerWidget, Riverpod Provider

Dependency rule: Presentation → Domain ← Data. Data layer implement interface của Domain.

</details>

**Q: Tại sao Repository là interface ở Domain layer?**

<details><summary>Đáp án</summary>

Để swap implementation không ảnh hưởng đến UseCase. Test dùng MockRepository mà không cần DB thật. Project dùng `VocabularyRepository` interface → `VocabularyRepositoryImpl` ở Data layer.

</details>

**Q: UseCase dùng để làm gì?**

<details><summary>Đáp án</summary>

Encapsulate 1 business operation. `GetReviewQueueUseCase` lọc card đến hạn theo SM-2. Nếu logic thay đổi chỉ sửa 1 chỗ, không sửa trong widget.

</details>

**Q: Offline-first architecture là gì?**

<details><summary>Đáp án</summary>

Single source of truth là local DB. Mọi read từ DB (không gọi API trực tiếp). Write vào DB trước, thêm vào sync queue, flush khi online.
```
User action → Local DB → UI cập nhật ngay
                ↓
           Sync Queue → API (background)
```

</details>

---

## PERFORMANCE

**Q: Tại sao `ListView.builder` tốt hơn `Column` + `map`?**

<details><summary>Đáp án</summary>

`Column` render toàn bộ list vào bộ nhớ cùng lúc → OOM với list dài.
`ListView.builder` lazy — chỉ render item đang visible + buffer. 1000 item chỉ render ~20 item.

</details>

**Q: `const` widget ảnh hưởng performance thế nào?**

<details><summary>Đáp án</summary>

Flutter skip rebuild widget `const` khi parent rebuild. Trong list 1000 item, nếu tile là `const` → chỉ rebuild tile đang thay đổi, không rebuild toàn list.

</details>

**Q: App startup chậm — debug thế nào?**

<details><summary>Đáp án</summary>

Flutter DevTools → Performance tab → Track widget builds. Thường nguyên nhân: init quá nhiều thứ trong `main()` trước khi `runApp()`.
Fix: chỉ init critical path trước runApp, còn lại `unawaited` sau khi UI đã render.

</details>

**Q: Tại sao không dùng `SingleChildScrollView + Column` cho list dài?**

<details><summary>Đáp án</summary>

`Column` đo tổng chiều cao của tất cả children → layout toàn bộ ngay cả khi không visible → lag và OOM.

</details>

**Q: `RepaintBoundary` dùng khi nào?**

<details><summary>Đáp án</summary>

Wrap widget thay đổi thường xuyên (animation, livestream frame) để cô lập repaint. Widget ngoài RepaintBoundary không bị repaint theo. Dùng sai → overhead thêm layer.

</details>

**Q: `shouldRepaint` trong CustomPainter hoạt động thế nào?**

<details><summary>Đáp án</summary>

Khi widget build lại với một painter MỚI, Flutter gọi `newPainter.shouldRepaint(oldPainter)`; `false` thì giữ nguyên hình đã vẽ. Không phải "hỏi mỗi frame".

Bẫy thật trong project (màn KanjiDraw, đã sửa): `shouldRepaint` so `old.strokes != strokes` là **so tham chiếu**, nhưng code lại sửa danh sách tại chỗ (`_current.add(...)`, `_strokes.removeLast()`) → cùng một object → luôn `false` → nét đang vẽ không hiện, hoàn tác/xóa không vẽ lại. Cách sửa: mỗi lần đổi thì tạo danh sách mới (`_current = [..._current, p]`). Kèm một lỗi khác cùng màn: `GestureDetector` bọc `SizedBox.expand()` rỗng với behavior mặc định `deferToChild` → không nhận được chạm nào; phải đặt `HitTestBehavior.opaque`. Test: `test/presentation/kanji_draw_screen_test.dart`.

</details>

---

## MEMORY & LEAK

**Q: Các loại memory leak phổ biến trong Flutter?**

<details><summary>Đáp án</summary>

1. `StreamSubscription` không cancel trong `dispose()`
2. `AnimationController` không dispose
3. `TextEditingController` / `ScrollController` không dispose
4. `Timer.periodic` không cancel
5. Closure capture `BuildContext` qua async gap

</details>

**Q: Làm sao detect memory leak?**

<details><summary>Đáp án</summary>

Flutter DevTools → Memory tab → snapshot → xem object count tăng khi navigate back/forth. Nếu `SrsScreen` count tăng mãi → leak.

</details>

**Q: Riverpod giúp gì với memory leak?**

<details><summary>Đáp án</summary>

Provider với `autoDispose` tự hủy khi không còn widget nào watch. `ref.watch` trong Riverpod tự cancel subscription khi widget dispose — không cần viết `dispose()` thủ công.

</details>

---

## TESTING

**Q: Widget test vs Integration test khác gì?**

<details><summary>Đáp án</summary>

Widget test: render widget trong test environment, không cần device, nhanh (ms). Integration test: chạy app thật trên emulator/device, chậm hơn (giây). E2E (Maestro): test user flow trên app thật bằng YAML.

</details>

**Q: Làm sao test widget dùng Stream?**

<details><summary>Đáp án</summary>

```dart
when(() => mock.watchReviewQueue())
    .thenAnswer((_) => Stream.value([fakeCard()]));
// Sau pumpWidget phải gọi await tester.pump() để Stream emit
```

</details>

**Q: Golden test là gì?**

<details><summary>Đáp án</summary>

Screenshot widget → so sánh với ảnh baseline. Detect visual regression tự động.
```dart
await expectLater(find.byType(SrsScreen), matchesGoldenFile('srs_screen.png'));
```

</details>

---

## NATIVE & PLATFORM

**Q: Platform Channel là gì?**

<details><summary>Đáp án</summary>

Bridge giữa Dart và native code (Kotlin/Swift), truyền message bất đồng bộ qua codec. Project dùng (chỉ Android) để làm việc nặng ở native: gộp các plane YUV của khung hình camera, và gợi ý khoảng cách giữa hai lần quét OCR theo cấu hình máy.
```dart
// lib/native/native_perf_channel.dart
static const _channel = MethodChannel('com.edu.nihongo/native_perf');
final ms = await _channel.invokeMethod<int>('getSuggestedScanIntervalMs');
```
Native trả lỗi hoặc chưa cài đặt → `PlatformException` / `MissingPluginException`: phải bắt và có giá trị mặc định (code trả 900 ms).

</details>

**Q: Khi nào nên viết Platform Channel thay vì dùng plugin?**

<details><summary>Đáp án</summary>

Khi plugin không có, khi cần tối ưu performance tối đa, khi cần access native API mới nhất chưa có trong pub.dev.

</details>

**Q: FlutterEngine và Isolate khác gì?**

<details><summary>Đáp án</summary>

FlutterEngine: chạy Dart code, render UI, handle gestures. Isolate: thread riêng cho heavy computation (parse JSON lớn, mã hóa) — không block UI thread. Giao tiếp qua `SendPort/ReceivePort`.

</details>

---

## NETWORKING & OFFLINE

**Q: Dio Interceptor dùng để làm gì?**

<details><summary>Đáp án</summary>

Intercept request/response để thêm auth header, retry khi 401, log, cache. Project: `AuthInterceptor` (lib/data/remote/auth_interceptor.dart) gắn Bearer token; gặp 401 thì refresh **một lần** bằng refresh cookie đã lưu lúc đăng nhập, rồi gửi lại request **một lần**. Mười request cùng 401 chỉ refresh một lần (dùng chung một Future). Không refresh cho chính `/auth/login` (sai mật khẩu cũng là 401). Server từ chối refresh → xóa phiên; lỗi mạng → giữ phiên. Gọi refresh bằng một Dio riêng không có interceptor, để refresh lỗi không vòng lại chính nó. (Bản trước chỉ gắn token: 15 phút sau là mọi request lỗi.)

</details>

**Q: Retry logic khi request thất bại — implement thế nào?**

<details><summary>Đáp án</summary>

```dart
// Trong Dio interceptor
onError: (error, handler) async {
  if (error.response?.statusCode == 401) {
    await refreshToken();
    return handler.resolve(await _retry(error.requestOptions));
  }
  handler.next(error);
}
```

</details>

**Q: Giải thích Sync Queue pattern.**

<details><summary>Đáp án</summary>

Khi offline, write vào local DB + đánh dấu `syncStatus = 'pending'`. Background job kiểm tra online → gọi API cho từng pending record → mark `synced` sau khi thành công. Nếu API fail → giữ `pending`, retry lần sau.

</details>

---

## CICD & DEVOPS

**Q: Tại sao cần CI/CD cho mobile?**

<details><summary>Đáp án</summary>

Build tay dễ quên step (sign, version bump), không reproducible. CI đảm bảo mỗi commit chạy test + analyze. CD build APK/IPA tự động → share QA nhanh hơn.

</details>

**Q: EAS Build khác gì build local?**

<details><summary>Đáp án</summary>

Build trên cloud server của Expo, không cần Mac để build iOS. Cache dependency → nhanh hơn lần 2. Share link APK/IPA qua OTA mà không cần App Store.

</details>

**Q: OTA Update là gì, giới hạn của nó?**

<details><summary>Đáp án</summary>

Expo Updates push JS bundle mới mà không cần App Store review. Hotfix nhanh (10 phút thay vì 2-3 ngày review). Giới hạn: không thay đổi được native code (camera permission mới, native SDK mới) → vẫn phải submit store.

</details>

---

## SYSTEM DESIGN

**Q: Design hệ thống livestream cho app học — bạn sẽ làm thế nào?**

<details><summary>Đáp án</summary>

Dùng SFU (LiveKit/Janus) thay vì P2P — scale được nhiều viewer. Host publish stream → SFU → distribute đến viewers. Fallback: nếu LiveKit down → HLS stream từ RTMP server.
Project dùng LiveKit: host publish camera+mic, viewer subscribe, DataChannel cho chat.

</details>

**Q: Tại sao dùng SFU thay vì MCU cho livestream?**

<details><summary>Đáp án</summary>

MCU mix stream trên server → CPU cao, latency cao. SFU forward stream nguyên bản → CPU thấp hơn, latency thấp hơn (~200ms). Nhược điểm SFU: viewer nhận nhiều stream riêng → mobile bandwidth cao hơn.

</details>

**Q: Design offline-first sync — xử lý conflict thế nào?**

<details><summary>Đáp án</summary>

Last-write-wins theo `updatedAt` timestamp (đơn giản), hoặc CRDT (phức tạp hơn, không conflict).

Project thực tế: bản Flutter sync **một chiều** (chỉ đẩy lên, chưa kéo về), nên chưa có xung đột nào cần giải. Hàng đợi giữ lần chấm mới nhất của mỗi thẻ; gửi API trước, thành công mới xóa đúng các dòng đã gửi. Bản web có kéo về và gộp theo `lastReviewedAt`: bản nào ôn gần hơn thì thắng (`mergeServerWords` trong apps/nihongo-web/src/utils/mistakeVocab.ts). Trả lời phỏng vấn nên nói rõ policy đang dùng và những gì CHƯA xử lý (hai máy ôn cùng thẻ lúc offline).

</details>

---

## BẠN CÓ THỂ HỎI NGƯỢC LẠI INTERVIEWER

- Tech stack mobile của team là gì — Flutter hay React Native hay native?
- Team hiện tại có bao nhiêu mobile dev?
- Release cycle thế nào — weekly, bi-weekly?
- CI/CD hiện tại dùng gì?
- Feature lớn nhất đang làm là gì?
- Codebase có test coverage không?

<!-- nav:start -->

---

## Đi tiếp

Tài liệu tham khảo thuộc **13. Phỏng vấn**. Cùng nhóm:

- [interview-questions.md](./interview-questions.md) — Bộ câu hỏi Senior chung
- [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md) — Backend NestJS, MQTT, DB
- [interview-devops.md](./interview-devops.md) — DevOps: Kubernetes (probe, rolling update, HPA, securityContext), pipeline CI/CD và deploy thật, monitoring — 19 câu
- [interview-docker.md](./interview-docker.md) — Docker: 25 câu từ Junior tới Senior, đáp án bằng compose/Dockerfile của project (có sự cố `.env` trong image)
- [interview-web.md](./interview-web.md) — Web: React, Next.js, JavaScript/TypeScript, HTTP, webpack — 25 câu, đáp án theo code nihongo-web
- [interview-infra-cloud.md](./interview-infra-cloud.md) — Hạ tầng và cloud: nginx, Terraform, AWS/LocalStack/serverless, GCP, k6, xử lý sự cố
- [interview-backend-security.md](./interview-backend-security.md) — Bảo mật API (OWASP), thanh toán chống trùng, outbox, timeout, retry, circuit breaker
- [interview-backend-android-rn-swift.md](./interview-backend-android-rn-swift.md) — Backend, Android, React Native, Swift
- [interview-android.md](./interview-android.md) — Android: câu hỏi theo code nihongo-android, gồm cả Framework, Binder, Automotive
- [interview-java-dsa.md](./interview-java-dsa.md) — Java, OOP và 10 bài thuật toán gắn với app (lời giải Java đã chạy), kế hoạch luyện bài test lập trình
- [interview-react-native-senior.md](./interview-react-native-senior.md) — Senior React Native

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
