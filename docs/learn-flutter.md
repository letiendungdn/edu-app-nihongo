# Lộ trình học Flutter — từ code thật của `nihongo_flutter`

Lộ trình 8 tuần, mỗi ngày khoảng 1,5–2 giờ, 5 ngày mỗi tuần. Bạn học bằng cách đọc, sửa và cố tình làm hỏng chính app [apps/nihongo_flutter](../apps/nihongo_flutter), không làm app mẫu.

**Học xong bạn làm được:**

- Giải thích một thao tác đi qua những lớp nào, từ lúc bấm nút tới khi dữ liệu lên server.
- Thêm một tính năng có lưu offline, gọi API và có test.
- Tìm lỗi bằng test thay vì đoán.

**Cần biết trước:** lập trình cơ bản (biến, hàm, class, async). Chưa biết Dart không sao, tuần 1 dạy phần cần dùng. Muốn học kiến thức Flutter theo chiều rộng thì đọc kèm [roadmap-flutter.md](./roadmap-flutter.md): file đó có sẵn bảng chọn widget và lộ trình 8 tháng. File bạn đang đọc là đường đi ngắn hơn, bám sát code.

**Các phiên bản đang dùng:** Flutter 3.47.6, Dart 3.13.5, Riverpod 2.6, go_router 14.8, Drift 2.31, Dio 5.10.

| Tuần | Chủ đề | Kết quả cuối tuần |
|------|--------|-------------------|
| 0 | Chạy được app | App mở trên máy ảo, test xanh |
| 1 | Dart | Đọc được mọi file trong `domain/` |
| 2 | Widget và layout | Sửa được một màn hình |
| 3 | Riverpod và điều hướng | Có route cần đăng nhập |
| 4 | Clean Architecture và Drift | Viết được migration DB |
| 5 | Mạng và đồng bộ offline | Giải thích được hàng đợi sync và refresh token |
| 6 | Kiểm thử | Tự viết test bắt được lỗi thật |
| 7 | Vẽ, phần cứng, native | Hiểu cách Flutter nói chuyện với nền tảng |
| 8 | CI, build, bài cuối khóa | Tự làm xong một tính năng |

**Cách làm bài "cố tình làm hỏng":** sửa code theo đề, chạy test, xem test nào đỏ, rồi trả lại bằng `git checkout -- <file>`. Kết quả ghi trong bài đã được chạy thử ngày 04/11/2026. Nếu bạn thấy khác, code đã đổi so với lúc viết, và đó là việc đáng tìm hiểu.

---

## Tuần 0 — Chạy được app

**Mục tiêu:** có môi trường chạy, biết app gọi backend ở đâu.

```bash
flutter doctor                              # kiểm tra môi trường
cd apps/nihongo_flutter
flutter pub get
flutter analyze                             # phải báo: No issues found
flutter test                                # phải báo: 44 test qua, 1 bỏ qua
```

Test bị bỏ qua là [auth_refresh_integration_test.dart](../apps/nihongo_flutter/test/integration/auth_refresh_integration_test.dart), chỉ chạy khi đặt `INTEGRATION=1` và có backend thật.

Bật backend rồi chạy app:

```bash
npm run docker:up:nihongo                   # chạy ở thư mục gốc repo
flutter devices                             # xem máy ảo đang có
flutter run                                 # chạy trên máy ảo / máy thật
flutter run -d chrome                       # chạy trên web
```

Trong lúc app chạy: bấm `r` để hot reload (giữ trạng thái), `R` để hot restart (chạy lại từ đầu).

Chạy trên máy ảo Android từng bước, kèm cách kiểm tra app đã nối được backend: xem [run-mobile.md](./run-mobile.md#chạy-trên-máy-ảo-android-từng-bước).

App gọi thẳng gateway ở cổng 3000, không qua nginx. Địa chỉ phụ thuộc nơi chạy ([api_config.dart](../apps/nihongo_flutter/lib/data/remote/api_config.dart)):

| Chạy trên | Địa chỉ | Vì sao |
|-----------|---------|--------|
| Máy ảo Android | `http://10.0.2.2:3000/api` | `10.0.2.2` là máy thật khi nhìn từ máy ảo Android |
| Simulator iOS, Chrome | `http://localhost:3000/api` | Dùng chung mạng với máy Mac |
| Máy thật | Tự truyền `--dart-define=API_BASE_URL=http://192.168.x.x:3000/api` | Điện thoại không biết `localhost` của máy tính |

**Bản đồ thư mục `lib/`:**

```text
main.dart          Điểm vào: ProviderScope + NihongoApp
providers.dart     Mọi provider Riverpod, đóng vai trò nơi lắp ráp phụ thuộc
core/routes.dart   Tên các route
domain/            Dart thuần: entity, interface repository, use case
data/              Drift (local), Dio (remote), repository thật, thanh toán
presentation/      Màn hình, mỗi tính năng một thư mục; app.dart có theme và router
native/            MethodChannel sang Kotlin
utils/             SM-2, TTS, theo dõi mạng
```

**Xong tuần khi:** app mở trên máy ảo, vào Từ vựng tải được bài 1, tắt mạng vẫn xem được.

---

## Tuần 1 — Dart

**Mục tiêu:** đọc code không vấp cú pháp.

**Đọc:** toàn bộ [lib/domain/](../apps/nihongo_flutter/lib/domain), [srs_algorithm.dart](../apps/nihongo_flutter/lib/utils/srs_algorithm.dart), [envelope.dart](../apps/nihongo_flutter/lib/data/remote/envelope.dart).

| Kiến thức | Xem ở đâu | Cần hiểu |
|-----------|-----------|----------|
| Null safety | `String? kanji` trong [vocabulary.dart](../apps/nihongo_flutter/lib/domain/entity/vocabulary.dart) | `?` cho phép null; trình biên dịch bắt bạn xử lý trường hợp null |
| Constructor có tên, `required`, `const` | `Vocabulary({...})` | Vì sao `const` giúp Flutter đỡ dựng lại widget |
| Đối tượng bất biến, `copyWith` | `Vocabulary.copyWith` | Đổi dữ liệu bằng cách tạo bản mới, không sửa bản cũ |
| `sealed class` | [result.dart](../apps/nihongo_flutter/lib/domain/repository/result.dart) | `Result` chỉ có thể là `Success` hoặc `Failure` |
| `enum`, `extension` | [sync_status.dart](../apps/nihongo_flutter/lib/domain/entity/sync_status.dart) | Thêm hàm cho kiểu có sẵn |
| `abstract interface class` | [vocabulary_repository.dart](../apps/nihongo_flutter/lib/domain/repository/vocabulary_repository.dart) | Khai báo việc cần làm, chưa nói làm thế nào |
| `switch` biểu thức | `intervalLabel` trong [premium_checkout.dart](../apps/nihongo_flutter/lib/data/payment/premium_checkout.dart) | `switch` trả về giá trị |
| Record | `({card, vocab})` trong `watchDueReviewCards` | Trả nhiều giá trị mà không cần tạo class |
| `Future`, `async/await` | `updateSrsCard` | Một kết quả trong tương lai |
| `Stream`, `async*`, `yield*` | `onlineStream` trong [network_monitor.dart](../apps/nihongo_flutter/lib/utils/network_monitor.dart) | Nhiều kết quả theo thời gian |
| `StreamController`, `Timer` | [get_review_queue_usecase.dart](../apps/nihongo_flutter/lib/domain/usecase/get_review_queue_usecase.dart) | Tự tạo stream, nhớ dọn timer khi hủy |

**Bài thực hành:**

1. Mở [srs_algorithm.dart](../apps/nihongo_flutter/lib/utils/srs_algorithm.dart). Tính tay: thẻ mới, chấm `quality = 4` ba lần liên tiếp. Ghi `interval`, `repetitions`, `easeFactor` sau mỗi lần, rồi viết một test để so.
2. Viết hàm `describe(Result<void> r)` dùng `switch` biểu thức. Xóa một nhánh và đọc lỗi trình biên dịch: đây là lợi ích của `sealed`.
3. Giải thích bằng lời: vì sao `GetReviewQueueUseCase` nhận `now` qua constructor thay vì gọi thẳng `DateTime.now()`?

**Xong tuần khi:** đọc cả thư mục `domain/` không phải tra cú pháp.

---

## Tuần 2 — Widget và layout

**Mục tiêu:** dựng và sửa được màn hình.

**Đọc:** [home_screen.dart](../apps/nihongo_flutter/lib/presentation/home/home_screen.dart), [srs_screen.dart](../apps/nihongo_flutter/lib/presentation/srs/srs_screen.dart), phần theme trong [app.dart](../apps/nihongo_flutter/lib/presentation/app.dart).

**Ý tưởng cốt lõi:** giao diện là kết quả của trạng thái. Bạn không sửa nút trên màn hình; bạn đổi trạng thái, Flutter gọi lại `build` và dựng giao diện mới.

| Kiến thức | Xem ở đâu | Cần hiểu |
|-----------|-----------|----------|
| `StatelessWidget` | `_NavCard`, `_RatingBtn` | Chỉ phụ thuộc tham số đầu vào |
| `State` và `setState` | `_SrsScreenState` | Biến nào đổi thì phải nằm trong `setState` mới vẽ lại |
| Tách widget nhỏ | `_FlashCard`, `_ProgressBar`, `_DoneView` | Mỗi phần có một việc, dễ đọc và dựng lại ít hơn |
| Lấy theme | `Theme.of(context).colorScheme` | Dùng màu theo theme thay vì viết thẳng, để có sáng và tối |
| `mounted` | `if (!mounted) return;` sau `await` trong `_rate` | Sau `await` màn hình có thể đã đóng |
| `dispose` | `_LiveHostScreenState.dispose` | Dọn thứ đã mở, nếu không sẽ rò rỉ |

**Hay nhầm:** dùng `context` hoặc `setState` sau `await` mà không kiểm tra `mounted`. Người dùng thoát màn hình giữa chừng là app báo lỗi.

**Bài thực hành:**

1. Trong Home, thêm một `_NavCard` tên "Gói Premium" trỏ tới `Routes.premium`.
2. Thẻ "Luyện câu AI" đang ghi "Gemini sửa lỗi", nhưng backend mặc định dùng Ollama. Sửa dòng chữ thành mô tả chung.
3. Chạy `flutter test test/widget_test.dart`. Đổi chữ "Từ vựng" trên Home và xem test đỏ, rồi trả lại.
4. Mở [roadmap-flutter.md](./roadmap-flutter.md), đọc mục "Chọn Widget nào, khi nào, tại sao?". Với mỗi widget trong `_FlashCard`, trả lời vì sao chọn nó.

**Xong tuần khi:** bạn thêm một khối giao diện mới mà màn hình đúng ở cả chế độ sáng và tối.

---

## Tuần 3 — Riverpod và điều hướng

**Mục tiêu:** hiểu dữ liệu từ đâu đến màn hình, và màn hình nối với nhau thế nào.

**Đọc:** [providers.dart](../apps/nihongo_flutter/lib/providers.dart), [vocab_screen.dart](../apps/nihongo_flutter/lib/presentation/vocab/vocab_screen.dart), phần Router trong [app.dart](../apps/nihongo_flutter/lib/presentation/app.dart).

**Các loại provider trong app:**

| Loại | Ví dụ | Dùng khi |
|------|-------|----------|
| `Provider` | `dioProvider`, `vocabRepositoryProvider` | Cung cấp một đối tượng dùng chung |
| `StateProvider` | `selectedLessonProvider` | Một giá trị đơn giản có thể đổi |
| `FutureProvider` | `isLoggedInProvider` | Một kết quả bất đồng bộ |
| `StreamProvider` | `reviewQueueProvider`, `isOnlineProvider` | Dữ liệu đổi theo thời gian |
| `.family` | `vocabByLessonProvider(lesson)` | Provider có tham số |

**Ba cách dùng `ref`, phân biệt cho thật rõ:**

- `ref.watch` trong `build`: dữ liệu đổi thì màn hình dựng lại.
- `ref.read` trong hàm xử lý sự kiện: lấy giá trị một lần. Ví dụ `_rate` đọc `vocabRepositoryProvider`.
- `ref.onDispose`: dọn dẹp khi provider bị hủy. Ví dụ đóng DB trong `appDatabaseProvider`.

Dùng `ref.watch` trong `onPressed`, hoặc `ref.read` trong `build`, đều là lỗi hay gặp.

**Luồng dữ liệu của màn ôn tập:**

```text
Drift watch() → repository → GetReviewQueueUseCase → reviewQueueProvider
    → ref.watch trong SrsScreen → AsyncValue (đang tải / có dữ liệu / lỗi) → giao diện
```

Vì DB là nguồn dữ liệu, chấm thẻ xong không cần tự cập nhật danh sách: ghi vào DB thì stream tự phát danh sách mới.

**Bài thực hành:**

1. **Đổi `StateProvider` sang `Notifier`** (cách khuyên dùng khi trạng thái có logic):

   ```dart
   class SelectedLesson extends Notifier<int> {
     @override
     int build() => 1;

     void select(int lesson) => state = lesson;
   }

   final selectedLessonProvider =
       NotifierProvider<SelectedLesson, int>(SelectedLesson.new);
   ```

   Sửa chỗ gọi trong `vocab_screen.dart` thành `.select(v)`.

2. **Sửa lỗi crash khi thiếu dữ liệu route.** Route `liveViewer` viết `state.extra as LiveJoinResponse`. Mở thẳng URL `/live/viewer` trên web thì `extra` là null và app crash. Sửa:

   ```dart
   builder: (_, state) {
     final join = state.extra;
     return join is LiveJoinResponse
         ? LiveViewerScreen(join: join)
         : const LiveListScreen();
   },
   ```

   Làm tương tự cho `liveHost`.

3. **Thêm route cần đăng nhập.** Hiện router chưa chặn trang nào. Đưa `_router` vào một provider để đọc được `TokenStore`:

   ```dart
   const protectedRoutes = {Routes.premium, Routes.liveHost};

   /// Route công khai trả null NGAY; chỉ route cần đăng nhập mới đọc token.
   FutureOr<String?> loginGuard(String location, Future<bool> Function() isLoggedIn) {
     if (!protectedRoutes.contains(location)) return null;
     return isLoggedIn().then((ok) => ok ? null : Routes.login);
   }

   final routerProvider = Provider<GoRouter>((ref) => GoRouter(
     initialLocation: Routes.home,
     redirect: (context, state) =>
         loginGuard(state.matchedLocation, ref.read(tokenStoreProvider).isLoggedIn),
     routes: [ /* giữ nguyên */ ],
   ));
   ```

   Trong `NihongoApp`, đổi thành `routerConfig: ref.watch(routerProvider)`.

   **Bẫy đã gặp khi viết bài này:** nếu viết `redirect: (context, state) async { ... }` và đọc token ở **mọi** route, `test/widget_test.dart` sẽ đỏ: `redirect` chạy bất đồng bộ nên Home không hiện ngay ở khung hình đầu. Vì vậy `loginGuard` trả kết quả đồng bộ cho route công khai.

   Viết test cho `loginGuard` với hàm `isLoggedIn` giả. Tách logic thành hàm thuần giúp test không phải dựng cả app.

**Xong tuần khi:** `flutter test` xanh sau cả 3 bài, và bạn giải thích được khi nào dùng `context.push`, khi nào dùng `context.go`.

---

## Tuần 4 — Clean Architecture và Drift

**Mục tiêu:** biết code nào đặt ở lớp nào, và làm chủ DB trên máy.

**Đọc:** [app_database.dart](../apps/nihongo_flutter/lib/data/local/app_database.dart), phần `watch...` trong [vocabulary_repository_impl.dart](../apps/nihongo_flutter/lib/data/repository/vocabulary_repository_impl.dart), [srs_card.dart](../apps/nihongo_flutter/lib/domain/entity/srs_card.dart).

**Ba lớp và hướng phụ thuộc:**

```text
presentation ──▶ domain ◀── data
```

- `domain` không import Flutter, Drift hay Dio. Nhờ vậy test use case chỉ cần repository giả.
- `data` hiện thực interface của `domain`, và đổi dòng DB thành entity (`_toVocabDomain`, `_toSrsDomain`).
- `presentation` không viết SQL. Nó chỉ gọi provider.

Kiểm tra nhanh luật này: `grep -rn "drift\|dio\|flutter/" lib/domain` không được ra kết quả nào.

**Drift:**

| Việc | Xem ở đâu |
|------|-----------|
| Khai báo bảng | `VocabularyTable`, `SrsCardTable`, `SyncQueueTable` |
| Đọc một lần: `.get()`, `.getSingleOrNull()` | `getSrsByVocabId` |
| Đọc liên tục: `.watch()` | `watchVocabByLesson` |
| JOIN | `watchDueReviewCards` |
| Ghi nhiều dòng trong một lần: `batch` | `upsertVocabularies` |
| Test bằng DB trong RAM | `AppDatabase(NativeDatabase.memory())` trong test |

Sau khi đổi bảng phải sinh lại code. File `*.g.dart` được commit, và CI sẽ đỏ nếu quên:

```bash
dart run build_runner build --delete-conflicting-outputs
```

**Bài thực hành:**

1. **Viết migration đầu tiên.** App đang ở `schemaVersion => 1` và chưa có `MigrationStrategy`. Nếu đổi bảng mà không có migration, người dùng cũ sẽ lỗi vì DB trên máy họ không có cột mới. Thêm cột lưu lỗi gần nhất vào `SyncQueueTable`:

   ```dart
   TextColumn get lastError => text().named('last_error').nullable()();
   ```

   ```dart
   @override
   int get schemaVersion => 2;

   @override
   MigrationStrategy get migration => MigrationStrategy(
         onUpgrade: (m, from, to) async {
           if (from < 2) await m.addColumn(syncQueueTable, syncQueueTable.lastError);
         },
       );
   ```

   Rồi viết test: tạo DB với bảng kiểu cũ và `PRAGMA user_version = 1`, mở bằng `AppDatabase`, kiểm tra đọc được dữ liệu cũ.

2. **Tìm lỗi tiềm ẩn nhờ khóa ngoại.** `SrsCardTable.vocabularyId` có `references(...)`, nhưng SQLite mặc định **không** kiểm khóa ngoại. Bật nó trong `MigrationStrategy`:

   ```dart
   beforeOpen: (details) async {
     await customStatement('PRAGMA foreign_keys = ON');
   },
   ```

   Toàn bộ test hiện có vẫn xanh, vì chưa test nào gọi `syncLesson`. Giờ thêm test: cho API giả trả một từ, gọi `repo.syncLesson(1)`, mong đợi `Success`. Kết quả là `Failure`: `syncLesson` gọi `_ensureSrsCard` **trước** khi lưu từ vựng, nên thẻ trỏ tới một từ chưa tồn tại.

   Sửa bằng cách lưu từ trước, tạo thẻ sau, rồi chạy lại cho xanh:

   ```dart
   if (companions.isNotEmpty) {
     await _db.upsertVocabularies(companions);
     for (final row in companions) {
       await _ensureSrsCard(row.id.value);
     }
   }
   ```

   Bài học: có khai báo ràng buộc chưa chắc ràng buộc đã chạy, và test xanh chỉ nói về những gì nó có kiểm.

**Xong tuần khi:** nâng được DB cũ lên bản mới mà không mất dữ liệu.

---

## Tuần 5 — Mạng và đồng bộ offline

Đây là phần khó nhất và đáng giá nhất của app. Dành trọn tuần cho nó.

**Đọc:** toàn bộ [vocabulary_repository_impl.dart](../apps/nihongo_flutter/lib/data/repository/vocabulary_repository_impl.dart), [auth_interceptor.dart](../apps/nihongo_flutter/lib/data/remote/auth_interceptor.dart), [dio_factory.dart](../apps/nihongo_flutter/lib/data/remote/dio_factory.dart), [token_store.dart](../apps/nihongo_flutter/lib/data/local/token_store.dart). Đọc thêm mục 1 và 6 của [core-flows.md](./core-flows.md).

**Luồng chấm một thẻ:**

```text
Bấm "Ổn"
  → SrsAlgorithm tính lịch ôn mới
  → ghi thẻ vào DB trên máy
  → xếp vào hàng đợi (mỗi thẻ chỉ giữ lần chấm mới nhất)
  → thẻ tiếp theo hiện ngay, không chờ mạng
  → ở nền: có mạng + đã đăng nhập → gửi POST /progress/review
  → gửi thành công mới xóa đúng các dòng đã gửi
```

**Luồng hết hạn token:**

```text
Request trả 401
  → AuthInterceptor gọi refresh MỘT lần (10 request cùng 401 thì chờ chung)
  → thành công: lưu token mới, gửi lại request ban đầu
  → server từ chối: xóa phiên, người dùng phải đăng nhập lại
  → lỗi mạng: GIỮ phiên, chỉ báo lỗi request đó
```

Refresh dùng một đối tượng Dio **riêng, không có interceptor**. Nếu dùng chung, refresh lỗi 401 sẽ tự gọi lại chính nó.

**Bài thực hành: làm hỏng từng quy tắc.** Mỗi dòng dưới đây đã được chạy thử:

| # | Sửa code | Chạy test | Test bị đỏ | Hậu quả với người dùng |
|---|----------|-----------|------------|------------------------|
| 1 | Trong `_syncOnce`, chuyển vòng `deleteSyncItem` lên **trước** `syncReviewBank` | `test/data/vocabulary_repository_sync_test.dart` | "API lỗi → hàng đợi CÒN NGUYÊN" | Rớt mạng là mất các lần ôn |
| 2 | Xóa dòng `deleteSyncByEntity` trong `updateSrsCard` | như trên | "chấm một thẻ 3 lần lúc offline" | Gửi thừa, lần cũ có thể đè lần mới |
| 3 | Xóa khối `if (running != null)` trong `syncAllPending` | như trên | "gọi sync chồng nhau" | Gửi trùng dữ liệu |
| 4 | Xóa dòng `if (running != null) return running;` trong `_refreshOnce` | `test/data/auth_interceptor_test.dart` | "10 request cùng 401" | 10 lần refresh đua nhau, người dùng bị đăng xuất |
| 5 | Đổi thành luôn `_tokens.clear()` trong `_refreshOnce` | như trên | "lỗi mạng/502 khi refresh → GIỮ phiên" (và 2 test khác) | Mạng chập chờn là bị đăng xuất |
| 6 | Xóa điều kiện `req.extra[_retriedKey] == true` trong `onError` | như trên | "token mới vẫn 401" | Refresh và gửi lại không dứt |
| 7 | Cho `ApiConfig.resolve` luôn trả `10.0.2.2` | `test/data/api_config_test.dart` | "emulator Android dùng 10.0.2.2…" | Simulator iOS không vào được API |

Với mỗi dòng, viết ra một câu: quy tắc này bảo vệ người dùng khỏi điều gì. Trả lại code bằng `git checkout -- lib`.

**Thử trên máy ảo:** bật chế độ máy bay, chấm vài thẻ, tắt máy bay, rồi xem bảng `SrsCard` trên server có cập nhật không.

**Xong tuần khi:** bạn vẽ lại được hai luồng trên mà không nhìn tài liệu.

---

## Tuần 6 — Kiểm thử

**Mục tiêu:** viết test để bắt lỗi, không phải để có con số đẹp.

**Đọc:** cả thư mục [test/](../apps/nihongo_flutter/test).

| Loại test | Ví dụ | Kỹ thuật cần học |
|-----------|-------|------------------|
| Hàm thuần | [srs_algorithm_test.dart](../apps/nihongo_flutter/test/srs_algorithm_test.dart) | Truyền `now` vào để cố định thời gian |
| Lớp giả | [vocabulary_repository_sync_test.dart](../apps/nihongo_flutter/test/data/vocabulary_repository_sync_test.dart) | `FakeApi`, `FakeNetwork`, DB trong RAM, `Completer` giả mạng chậm |
| Thời gian giả | [get_review_queue_usecase_test.dart](../apps/nihongo_flutter/test/domain/get_review_queue_usecase_test.dart) | `fakeAsync` tua thời gian, không phải chờ 1 phút thật |
| Widget | [kanji_draw_screen_test.dart](../apps/nihongo_flutter/test/presentation/kanji_draw_screen_test.dart) | `pumpWidget`, `startGesture`, `pump` |
| Tích hợp | [auth_refresh_integration_test.dart](../apps/nihongo_flutter/test/integration/auth_refresh_integration_test.dart) | Chạy với backend thật: `INTEGRATION=1` |

**Bài thực hành:**

1. **Lỗi giao diện chỉ test widget mới thấy.** Trong `kanji_draw_screen.dart`, khai báo `Stroke _current = [];` và đổi `_onPanUpdate` thành `setState(() => _current.add(d.localPosition));`. Test đỏ ở "nét đang vẽ phải hiện ngay". Lý do: `shouldRepaint` so sánh theo tham chiếu, mà sửa tại chỗ thì vẫn là danh sách cũ, nên canvas không vẽ lại.

2. **Bỏ timer của use case.** Xóa dòng `Timer.periodic` trong `GetReviewQueueUseCase`. Hai test đỏ. Giải thích vì sao test "hủy lắng nghe → dừng timer" cũng đỏ theo.

3. **Khi test xanh mà code vẫn sai.** Bài quan trọng nhất của tuần. Trong `srs_algorithm.dart`, đổi dòng tính `next` thành:

   ```dart
   final next = at.add(Duration(days: interval));
   ```

   Chạy `flutter test test/srs_algorithm_test.dart`: **vẫn xanh hết**, dù comment trong code nói cách này sai. Vì Việt Nam không đổi giờ mùa hè, nên ở đây một ngày luôn dài 24 giờ.

   Thêm test có ngày đổi giờ (nước Mỹ đổi giờ ngày 08/03/2026):

   ```dart
   test('qua ngày đổi giờ vẫn giữ giờ ôn', () {
     final at = DateTime(2026, 3, 7, 9, 0);
     final card = SrsCard(
       id: 1, vocabularyId: 1, easeFactor: 2.5, interval: 1, repetitions: 1,
       nextReviewAt: at, mastered: false, syncStatus: SyncStatus.synced, updatedAt: at,
     );
     final next = SrsAlgorithm.calculateNextReview(card, 4, now: at);
     expect(next.nextReviewAt.hour, 9);
   });
   ```

   Chạy với múi giờ New York:

   ```bash
   TZ=America/New_York flutter test test/srs_algorithm_test.dart
   ```

   Với code hỏng, test đỏ (`Expected: <9>, Actual: <10>`). Trả code về bản đúng thì xanh. Bài học: test chỉ bắt được lỗi trong điều kiện nó được chạy, nên lỗi về múi giờ phải được test ở múi giờ có đổi giờ.

4. Viết test cho `reviewItemFor`: đây là hàm thuần, không cần DB.

**Xong tuần khi:** với mỗi test mới viết, bạn đã làm hỏng code và thấy nó đỏ ít nhất một lần. Test chưa từng đỏ thì chưa chứng minh được gì.

---

## Tuần 7 — Vẽ, phần cứng và native

**Mục tiêu:** dùng được những thứ ngoài Dart thuần.

| Chủ đề | Đọc | Cần hiểu |
|--------|-----|----------|
| `CustomPainter` | [kanji_draw_screen.dart](../apps/nihongo_flutter/lib/presentation/kanji_draw/kanji_draw_screen.dart) | `paint` vẽ, `shouldRepaint` quyết định có vẽ lại không |
| Quyền và camera | [camera_translate_screen.dart](../apps/nihongo_flutter/lib/presentation/camera/camera_translate_screen.dart) | Xin quyền trước khi dùng, thu hồi tài nguyên khi rời màn |
| Đọc và nghe | [tts_service.dart](../apps/nihongo_flutter/lib/utils/tts_service.dart), [pronunciation_screen.dart](../apps/nihongo_flutter/lib/presentation/pronunciation/pronunciation_screen.dart) | Plugin gọi API của hệ điều hành |
| `MethodChannel` | [native_perf_channel.dart](../apps/nihongo_flutter/lib/native/native_perf_channel.dart), [NativePerfPlugin.kt](../apps/nihongo_flutter/android/app/src/main/kotlin/com/edu/nihongo_app/NativePerfPlugin.kt) | Dart gọi Kotlin bằng tên kênh và tên hàm; luôn có đường dự phòng khi không hỗ trợ |
| Livestream | [live_host_screen.dart](../apps/nihongo_flutter/lib/presentation/live/live_host_screen.dart), mục 4 của [core-flows.md](./core-flows.md) | Lấy token từ gateway rồi nối LiveKit |
| Thanh toán | [premium_checkout.dart](../apps/nihongo_flutter/lib/data/payment/premium_checkout.dart), [stripe_wallet_payer.dart](../apps/nihongo_flutter/lib/data/payment/stripe_wallet_payer.dart), [payment-wallets.md](./payment-wallets.md) | `WalletPayer` là interface, nên test được luồng mua mà không cần Stripe |
| Khác biệt nền tảng | Import có điều kiện đầu file [app.dart](../apps/nihongo_flutter/lib/presentation/app.dart), `kIsWeb` trong [dio_factory.dart](../apps/nihongo_flutter/lib/data/remote/dio_factory.dart) | Web không có `dart:io` và camera theo cùng cách |

**Lưu ý:** nhận chữ qua camera đang **tạm tắt** trên bản Flutter. ML Kit đã bị gỡ để app build được trên simulator iOS. Màn hình camera vẫn còn, nhưng chỉ xem trước.

**Bài thực hành:**

1. Thêm thanh trượt đổi độ dày nét vào màn Vẽ Kanji. Truyền `strokeWidth` vào `_StrokePainter`. Nếu quên thêm nó vào `shouldRepaint`, kéo thanh trượt sẽ không có gì xảy ra. Tự thử để thấy.
2. Thêm hàm `getBatteryLevel` vào `NativePerfChannel` và `NativePerfPlugin.kt`. Chạy trên máy ảo Android. Trên web hàm phải trả về giá trị dự phòng, không được crash.
3. Viết thêm một test cho `PremiumCheckout` với `WalletPayer` giả: người dùng hủy bảng thanh toán giữa chừng.

**Xong tuần khi:** bạn giải thích được code Dart đến được code Kotlin theo đường nào.

---

## Tuần 8 — CI, build và bài cuối khóa

**CI:** đọc job `flutter` trong [ci.yml](../.github/workflows/ci.yml). Mỗi lần push, nó kiểm tra code sinh tự động còn khớp không, chạy `flutter analyze`, rồi `flutter test`. Chạy thử đúng các bước đó trên máy trước khi push:

```bash
dart run build_runner build --delete-conflicting-outputs
git diff --exit-code -- lib
flutter analyze
flutter test
```

**Build bản phát hành:**

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://api.example.com/api
flutter build ios --release --dart-define=API_BASE_URL=https://api.example.com/api
flutter build web --dart-define=API_BASE_URL=https://api.example.com/api
```

Bản phát hành phải truyền `API_BASE_URL`. Nếu không, app sẽ trỏ về địa chỉ dev ở Tuần 0.

**Dùng DevTools:** chạy `flutter run --profile` trên máy thật, mở tab Performance và cuộn danh sách từ vựng. Xem có khung hình nào vượt 16 ms không. Chế độ debug chậm hơn nhiều, nên đo trong debug là không có ý nghĩa.

**Bài cuối khóa: giới hạn số lần gửi lại.** Bảng `sync_queue` có cột `retry_count` và hàm `incrementSyncRetry`, nhưng **chưa có code nào gọi hàm này**. Nếu server luôn từ chối một dòng, dòng đó chặn cả hàng đợi mãi mãi. Làm tính năng hoàn chỉnh:

1. **Domain:** quyết định quy tắc. Ví dụ gửi lỗi 5 lần thì đánh dấu dòng đó là "hỏng" và bỏ qua.
2. **Data:** dùng `retryCount`, và cột `lastError` từ Tuần 4. Phân biệt lỗi mạng (không tính) với lỗi server từ chối (có tính). Gợi ý: `syncReviewBank` gửi nhiều dòng trong một lần, nên phải quyết định tính lỗi cho cả lô hay tách từng dòng.
3. **Giao diện:** hiện số lần ôn chưa đồng bộ trên màn SRS, có nút "Thử lại".
4. **Test:** làm hỏng từng quy tắc và thấy test đỏ, như Tuần 5.
5. **Kiểm tra cuối:** chạy đủ 4 lệnh CI ở trên.

**Xong khóa khi:** tính năng chạy trên máy ảo, CI xanh, và bạn trình bày được quyết định thiết kế trong 5 phút.

---

## Việc còn tồn trong app

Những chỗ sau là thật, tìm thấy khi viết bài này. Chúng được dùng làm bài tập nên **chưa sửa** trong code:

| Vấn đề | Tuần xử lý |
|--------|------------|
| `/live/viewer`, `/live/host` crash khi thiếu `extra` | 3 |
| Router chưa chặn trang cần đăng nhập | 3 |
| Chưa có `MigrationStrategy` | 4 |
| Khóa ngoại SQLite chưa bật; `syncLesson` tạo thẻ trước khi có từ | 4 |
| `syncLesson` chưa có test | 4 |
| Chưa có test cho ngày đổi giờ | 6 |
| `retry_count` có cột nhưng không dùng | 8 |
| Nhận chữ qua camera đang tắt | Ngoài khóa |

---

## Câu hỏi tự kiểm tra

1. `StatelessWidget` khác `StatefulWidget` thế nào? Widget, Element, RenderObject là gì?
2. Vì sao phải kiểm tra `mounted` sau `await`?
3. `ref.watch` khác `ref.read` thế nào? Dùng sai thì sao?
4. Vì sao màn SRS không tự xóa thẻ khỏi danh sách sau khi chấm?
5. Vì sao `domain` không được import Drift?
6. Vì sao gửi trước rồi mới xóa khỏi hàng đợi?
7. Vì sao refresh token phải dùng Dio riêng?
8. Vì sao lỗi mạng khi refresh không được đăng xuất người dùng?
9. Vì sao không lọc "thẻ đến hạn" ngay trong câu SQL `watch`?
10. Vì sao cộng ngày lịch thay vì `Duration(days: n)`?
11. `shouldRepaint` trả sai thì có hiện tượng gì?
12. Hot reload khác hot restart thế nào? Khi nào hot reload không đủ?

Muốn thêm câu hỏi: [interview-mobile.md](./interview-mobile.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **9. Mobile** — bài 7/9.

- Bài trước: [learn-swift-ios.md](./learn-swift-ios.md) — Swift/SwiftUI qua nihongo-ios
- **Bài tiếp: [learn-ml-mobile.md](./learn-ml-mobile.md)** — Machine learning trong app mobile: on-device, LLM, SRS thông minh

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
