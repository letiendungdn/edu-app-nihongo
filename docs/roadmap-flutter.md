# Lộ trình Flutter — Từ cơ bản đến Senior

> **Lộ trình học**, không phải bảng status feature. Inventory: [mobile-tech-stacks.md](./mobile-tech-stacks.md). Chạy: [run-mobile.md](./run-mobile.md).

Dùng project Nihongo (`apps/nihongo_flutter/`) làm ví dụ xuyên suốt.

---

## GIAI ĐOẠN 1 — DART + FLUTTER NỀN TẢNG (tháng 1–2)

### Dart cơ bản

```dart
// 1. Sound null safety — Dart 2.12+
String name = 'Nihongo';      // non-nullable
String? name = null;           // nullable
final length = name?.length ?? 0;

// 2. Named + optional parameters
class Vocabulary {
  final int id;
  final String kana;
  final String meaning;
  final int lessonNumber;
  
  const Vocabulary({
    required this.id,
    required this.kana,
    required this.meaning,
    required this.lessonNumber,
  });
  
  // copyWith — như copy() trong Kotlin data class
  Vocabulary copyWith({ String? meaning }) => Vocabulary(
    id: id,
    kana: kana,
    meaning: meaning ?? this.meaning,
    lessonNumber: lessonNumber,
  );
}

// 3. Sealed class (Dart 3.0+)
sealed class SrsResult {}
class Again extends SrsResult { final int intervalDays; const Again(this.intervalDays); }
class Good  extends SrsResult { final int intervalDays; const Good(this.intervalDays); }
class Easy  extends SrsResult { final int intervalDays; const Easy(this.intervalDays); }

// Pattern matching với switch expression
final message = switch (result) {
  Again(:final intervalDays) => 'Ôn lại sau $intervalDays ngày',
  Good(:final intervalDays)  => 'Tốt! Ôn lại sau $intervalDays ngày',
  Easy(:final intervalDays)  => 'Dễ! Ôn lại sau $intervalDays ngày',
};

// 4. Extension methods
extension JapaneseStringExtension on String {
  bool get isKana => split('').every((c) {
    final code = c.codeUnitAt(0);
    return (code >= 0x3040 && code <= 0x309F) ||  // Hiragana
           (code >= 0x30A0 && code <= 0x30FF);     // Katakana
  });
}

'おはよう'.isKana  // true
'hello'.isKana    // false

// 5. Future vs Stream
Future<List<Vocabulary>> fetchOnce();        // 1 giá trị, sau đó done
Stream<List<Vocabulary>> watchLiveUpdates(); // nhiều giá trị theo thời gian
```

---

### Widget fundamentals

```dart
// StatelessWidget — render từ props, không có internal state
class VocabCard extends StatelessWidget {
  final Vocabulary vocab;
  final VoidCallback onPlayTts;
  
  const VocabCard({
    super.key,
    required this.vocab,
    required this.onPlayTts,
  });
  
  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(vocab.kana, style: Theme.of(context).textTheme.titleMedium),
        subtitle: Text(vocab.meaning),
        trailing: IconButton(
          icon: const Icon(Icons.volume_up),
          onPressed: onPlayTts,
        ),
      ),
    );
  }
}

// StatefulWidget — khi state sống trong widget đó (animation, form)
class FlipCard extends StatefulWidget {
  final Vocabulary vocab;
  const FlipCard({ super.key, required this.vocab });
  
  @override
  State<FlipCard> createState() => _FlipCardState();
}

class _FlipCardState extends State<FlipCard> {
  bool _isFlipped = false;
  
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => setState(() => _isFlipped = !_isFlipped),
      child: Text(_isFlipped ? widget.vocab.meaning : widget.vocab.kana),
    );
  }
}
```

---

## Chọn Widget nào, khi nào, tại sao?

> Đây là phần bắt buộc trước Clean Architecture. Flutter là cây widget; chọn sai thường gây overflow, scroll lồng nhau, rebuild thừa hoặc leak controller.

### 1. Chọn loại component/state

| Nhu cầu | Dùng | Vì sao / ví dụ repo |
|---------|------|----------------------|
| Chỉ render từ constructor props | `StatelessWidget` | Nhẹ, dễ test. `_NavCard`, `_SectionLabel` trong `home_screen.dart` |
| State UI cục bộ + lifecycle/controller | `StatefulWidget` | Có `initState`, `dispose`, `setState`. Flip card, animation |
| Đọc Riverpod, không local state | `ConsumerWidget` | Có `WidgetRef`; `HomeScreen` đọc `isOnlineProvider` |
| Riverpod + local state/lifecycle | `ConsumerStatefulWidget` | `ref` + `setState` + lifecycle. `VocabScreen`, `SrsScreen`, camera |
| Logic dùng lại, không có UI | Dart class/service/provider | `TtsService`, repository, use case; đừng tạo widget |

**Quy tắc:**
- Server/DB state → Riverpod (`ref.watch`), không copy sang `setState`.
- State tạm chỉ thuộc màn hình (flipped, submitting, controller) → local state.
- State nhiều màn cùng dùng → Provider/Notifier, không truyền props xuyên 5 tầng.

### 2. Layout: Row, Column, Wrap, Stack

| Muốn gì? | Widget | Khi nào không dùng |
|----------|--------|--------------------|
| Xếp dọc, số con ít, **không cần scroll** | `Column` | Danh sách dài hoặc có thể vượt màn hình |
| Xếp ngang | `Row` | Nhiều chip/button có thể tràn ngang → dùng `Wrap` |
| Tự xuống dòng | `Wrap` | List hàng nghìn item → dùng lazy list/grid |
| Chồng lớp | `Stack` + `Positioned` | Layout bình thường; đừng dùng tọa độ tuyệt đối thay `Row/Column` |
| Một child chiếm phần còn lại | `Expanded` | Trong `ListView`/unbounded axis sẽ lỗi constraint |
| Child co linh hoạt nhưng không bắt buộc fill | `Flexible` | Khi muốn fill hết thì `Expanded` rõ hơn |
| Khoảng cách cố định | `SizedBox` | Decoration/padding/background → `Container`/`DecoratedBox` |
| Padding duy nhất | `Padding` | Đừng dùng `Container` chỉ để padding |
| Căn vị trí | `Align` / `Center` | Đừng bọc nhiều `Row/Column` chỉ để center |

**Ví dụ repo:** `VocabScreen` dùng `Column` cho picker + nội dung, rồi `Expanded(ListView...)` để list nhận chiều cao còn lại. `HomeScreen` dùng `Row → Expanded(Column)` trong card để text không đẩy icon tràn.

### 3. Scroll và danh sách

| Dữ liệu/UI | Dùng | Tại sao |
|------------|------|---------|
| Ít section tĩnh, toàn trang cần scroll | `ListView(children: [...])` | Đơn giản; `HomeScreen` |
| List động/dài | `ListView.builder` / `.separated` | Lazy build; vocab list |
| Grid ảnh/card dài | `GridView.builder` | Lazy 2D |
| Header + list/grid phức tạp, sticky/collapse | `CustomScrollView` + `SliverAppBar`/`SliverList`/`SliverGrid` | Một scroll pipeline, tránh nested scroll |
| Nội dung ngắn trong form | `SingleChildScrollView` + `Column` | Không lazy; tránh cho list dài |
| Chuyển trang ngang/onboarding/cards | `PageView` | Có page semantics/controller |
| Giữ state các tab | `IndexedStack` | Mọi tab vẫn được build/giữ memory; ít tab thôi |

**Sai hay gặp:**
```dart
// BAD: ListView trong Column không có giới hạn chiều cao
Column(children: [header, ListView.builder(...)]);

// GOOD
Column(children: [header, Expanded(child: ListView.builder(...))]);
```

Không bật `shrinkWrap: true` như thuốc chữa mọi lỗi: nó đo toàn bộ children, mất lợi ích lazy với list lớn.

### 4. Box constraints và responsive

Flutter đi theo quy tắc: **constraints đi xuống → size đi lên → parent đặt position**.

| Tình huống | Dùng |
|------------|------|
| Quyết định UI theo chiều rộng phần cha | `LayoutBuilder` |
| Lấy kích thước/inset toàn màn hình | `MediaQuery` |
| Tránh notch/status/home indicator | `SafeArea` |
| Giới hạn tablet không kéo card quá rộng | `ConstrainedBox(maxWidth: ...)` + `Center` |
| Giữ tỉ lệ camera/video/card | `AspectRatio` |
| Fit ảnh/video vào box | `FittedBox` / `BoxFit` |

```dart
LayoutBuilder(
  builder: (context, constraints) {
    final columns = constraints.maxWidth >= 700 ? 3 : 1;
    return GridView.count(crossAxisCount: columns);
  },
);
```

**Checkpoint:** giải thích được lỗi `RenderFlex overflowed` và `Vertical viewport was given unbounded height`.

### 5. Async/loading/error

| Nguồn dữ liệu | Dùng | Trong repo |
|---------------|------|-----------|
| Riverpod `AsyncValue<T>` | `async.when(data:, loading:, error:)` | Home online status, vocab, SRS |
| Một `Future` đơn, không có provider | `FutureBuilder` | Chỉ khi Future ổn định, không tạo Future mới trong `build` |
| Stream trực tiếp | `StreamBuilder` | Khi không đưa stream vào `StreamProvider` |
| DB reactive dùng nhiều nơi | `StreamProvider` + `ConsumerWidget` | Drift due cards/vocab |

Ưu tiên state rõ ràng:
- Loading → `CircularProgressIndicator`/skeleton.
- Empty → empty-state có CTA.
- Error → message + retry.
- Data → list/content.

`VocabScreen` đã làm đủ loading/error/empty/data qua `vocabAsync.when`.

### 6. Interaction: Button, InkWell, GestureDetector

| Nhu cầu | Dùng | Vì sao |
|---------|------|--------|
| Action chính | `FilledButton` | Material semantics, disabled/loading rõ |
| Action phụ | `OutlinedButton` / `TextButton` |
| Icon action | `IconButton` | Có tooltip + hit target |
| Card có ripple Material | `InkWell` bên trong `Card`/`Material` | `_NavCard` trong Home |
| Gesture custom (drag/swipe/pinch/raw tap) | `GestureDetector` | SRS flashcard, swipe card |
| Chọn on/off | `Switch` / `Checkbox` |
| Chọn một trong ít lựa chọn | `SegmentedButton` / `Radio` |
| Menu nhiều lựa chọn | `DropdownButton` / menu anchor | Lesson picker hiện tại |

Đừng dùng `GestureDetector` cho mọi nút: nó không tự có ripple, focus, disabled style và accessibility như Material buttons.

### 7. Card, ListTile, Container, DecoratedBox

| Widget | Dùng khi |
|--------|----------|
| `Card` | Nhóm nội dung Material có surface/shape/theme |
| `ListTile` | Row chuẩn leading/title/subtitle/trailing |
| `Container` | Cần phối hợp padding + decoration + constraints |
| `DecoratedBox` | Chỉ cần decoration (nhẹ/rõ hơn Container) |
| `ColoredBox` | Chỉ cần màu nền |
| `Chip` | Status/filter/tag ngắn; online/offline |

Repo: Home dùng `Card + InkWell + Padding + Row`; online status dùng `Chip`; vocab picker dùng `Container` vì cần margin + padding + border.

### 8. Animation và chuyển trạng thái

| Nhu cầu | Dùng |
|---------|------|
| Thay widget fade/scale đơn giản | `AnimatedSwitcher` — SRS đổi Show Answer ↔ Rating |
| Animate property đơn giản | `AnimatedContainer`, `AnimatedOpacity` |
| Animation có controller/timeline | `AnimationController` + `TickerProvider`, phải `dispose` |
| Shared element giữa routes | `Hero` |
| Swipe/drag card | `GestureDetector` + controller/transform |

Implicit animation trước; chỉ dùng `AnimationController` khi cần điều khiển play/reverse/progress.

### 9. Lifecycle và resource

Chọn `StatefulWidget`/`ConsumerStatefulWidget` khi sở hữu:
- `TextEditingController`, `AnimationController`, `ScrollController`
- camera/microphone/stream/subscription
- `WidgetsBindingObserver`

Phải cleanup trong `dispose`. `CameraTranslateScreen` là mẫu tốt: add observer/init camera trong `initState`, stop stream + dispose controller + close recognizer trong `dispose`, handle background/resume bằng `didChangeAppLifecycleState`.

Sau `await`, kiểm tra `mounted` trước `setState`/dùng `context`:
```dart
await repository.sync();
if (!mounted) return;
setState(() => loading = false);
```

### 10. Decision tree 30 giây

```text
Có UI?
├─ Không → service/repository/use case/provider
└─ Có
   ├─ Cần Riverpod?
   │  ├─ Không + không local state → StatelessWidget
   │  ├─ Không + có lifecycle/state → StatefulWidget
   │  ├─ Có + không local state → ConsumerWidget
   │  └─ Có + lifecycle/state → ConsumerStatefulWidget
   └─ Layout
      ├─ List dài → ListView.builder / GridView.builder
      ├─ Section tĩnh cần scroll → ListView(children)
      ├─ Header + list phức tạp → CustomScrollView + Slivers
      ├─ Ngang có thể tràn → Wrap
      ├─ Chồng lớp/camera overlay → Stack
      └─ Responsive → LayoutBuilder + constraints
```

### Bài tập widget (bám repo)

1. Giải thích từng widget trong `_NavCard`: tại sao `Card → InkWell → Padding → Row → Expanded(Column)`.
2. Trong `VocabScreen`, bỏ `Expanded` quanh list và quan sát lỗi constraint; ghi lại lý do.
3. Camera OCR overlay: giải thích vì sao bắt buộc `Stack` thay vì `Column`.
4. Refactor một nhóm chip dài từ `Row` sang `Wrap`.
5. Viết responsive home: 1 cột mobile, 2 cột tablet bằng `LayoutBuilder`.

**Checkpoint widget:** nhìn một mockup và chọn được layout/scroll/state widget, đồng thời giải thích được *vì sao không dùng widget còn lại*.

---

## GIAI ĐOẠN 2 — CLEAN ARCHITECTURE (tháng 3–4)

> Mọi đoạn code từ đây tới hết Giai đoạn 4 trích từ `apps/nihongo_flutter/lib/` (đã rút gọn chỗ không liên quan). Đọc doc song song với code thật. Chỗ nào ghi "bản cũ" là lỗi từng có trong repo và đã sửa; mỗi lỗi có test chứng minh.

### Cấu trúc project Nihongo

```
apps/nihongo_flutter/lib/
  main.dart                    ProviderScope + chạy app
  providers.dart               mọi Riverpod provider (đóng vai DI container)
  core/
    routes.dart                tên route (Routes.home, Routes.srs, ...)
  domain/                      ← Dart thuần, không import Flutter/Drift/Dio
    entity/
      vocabulary.dart
      srs_card.dart            SrsCard + ReviewCard (thẻ kèm chữ để hiển thị)
      sync_status.dart
    repository/
      vocabulary_repository.dart   interface
      result.dart                  sealed Result: Success / Failure
    usecase/
      get_review_queue_usecase.dart
  data/                        ← implement interface của domain
    local/
      app_database.dart        Drift: bảng + query (không tách DAO riêng)
      token_store.dart         access token + refresh cookie (secure storage)
    remote/
      dio_factory.dart         tạo Dio + AuthInterceptor
      auth_interceptor.dart    401 → refresh → gửi lại
      vocabulary_api.dart, auth_api.dart, ai_tutor_api.dart, sentence_practice_api.dart, ...
    repository/
      vocabulary_repository_impl.dart   offline-first + hàng đợi sync
  presentation/                ← widget
    app.dart                   GoRouter
    home/, vocab/, srs/, kanji_draw/, pronunciation/, ai_tutor/,
    sentence_practice/, camera/, live/, auth/
  native/                      MethodChannel đo hiệu năng native
  utils/
    srs_algorithm.dart         SM-2
    network_monitor.dart, tts_service.dart, ...
```

Hướng phụ thuộc: `presentation → domain ← data`. Domain không biết Drift hay Dio tồn tại. Nhờ vậy test use case chỉ cần một repo giả, không cần DB hay mạng.

---

### Domain Layer

**Entity.** Dart thuần, bất biến (mọi field `final`, đổi giá trị bằng `copyWith`):

```dart
// lib/domain/entity/srs_card.dart
class SrsCard {
  const SrsCard({
    required this.id,
    required this.vocabularyId,
    required this.easeFactor,
    required this.interval,
    required this.repetitions,
    required this.nextReviewAt,
    this.mastered = false,
    this.syncStatus = SyncStatus.synced,
    required this.updatedAt,
  });

  final int id;
  final int vocabularyId;
  final double easeFactor;
  final int interval;        // số ngày tới lần ôn sau
  final int repetitions;
  final DateTime nextReviewAt;
  final bool mastered;
  final SyncStatus syncStatus;
  final DateTime updatedAt;

  SrsCard copyWith({double? easeFactor, int? interval, /* ... */}) => /* ... */;
  Map<String, dynamic> toJson() => { /* ... */ };       // lưu vào hàng đợi sync
  factory SrsCard.fromJson(Map<String, dynamic> json) => /* ... */;
}

// Thẻ kèm chữ để màn SRS hiển thị (join srs_card + vocabulary)
class ReviewCard {
  const ReviewCard({required this.card, required this.kana, this.kanji,
                    required this.meaning, required this.romaji});
  final SrsCard card;
  final String kana;
  final String? kanji;
  final String meaning;
  final String romaji;
}
```

**Thuật toán SM-2** nằm ở `utils/srs_algorithm.dart`, không nằm trong entity. Có hai điểm đáng học:

```dart
// lib/utils/srs_algorithm.dart
static SrsCard calculateNextReview(SrsCard card, int quality, {DateTime? now}) {
  final at = now ?? DateTime.now();   // (1) giờ truyền vào được → test không phụ thuộc đồng hồ
  final q = quality.clamp(0, 5);
  var ease = card.easeFactor;
  var interval = card.interval;
  var reps = card.repetitions;

  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    interval = reps == 0 ? 1 : reps == 1 ? 6 : (interval * ease).round().clamp(1, 3650);
    reps += 1;
  }
  ease += 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  if (ease < 1.3) ease = 1.3;

  // (2) Cộng NGÀY LỊCH, không cộng Duration(days: n) (= đúng n×24 giờ): ngày đổi giờ mùa hè
  //     dài 23 hoặc 25 giờ → cộng giờ lệch một tiếng so với giờ người dùng ôn.
  final next = DateTime(at.year, at.month, at.day + interval, at.hour, at.minute, at.second);

  return card.copyWith(
    easeFactor: ease, interval: interval, repetitions: reps, nextReviewAt: next,
    mastered: reps >= 5 && interval >= 21,
    syncStatus: SyncStatus.pending, updatedAt: at,
  );
}
```

`DateTime(y, m, d + 40)` tự tràn sang tháng sau, nên không cần tự xử lý cuối tháng.

**Repository interface.** Domain định nghĩa, data implement. Đọc trả `Stream` (DB đổi thì UI tự cập nhật). Ghi trả `Result` (lỗi là giá trị trả về, không phải exception bay lên UI):

```dart
// lib/domain/repository/vocabulary_repository.dart
abstract interface class VocabularyRepository {
  Stream<List<Vocabulary>> watchVocabByLesson(int lessonNumber);
  Stream<List<ReviewCard>> watchReviewQueue();
  Future<Result<void>> updateSrsCard(SrsCard card);
  Future<Result<void>> syncLesson(int lessonNumber);
  Future<Result<void>> syncAllPending();
}

// lib/domain/repository/result.dart — sealed (Dart 3): switch phải xét đủ mọi trường hợp
sealed class Result<T> { const Result(); }
final class Success<T> extends Result<T> { const Success([this.value]); final T? value; }
final class Failure<T> extends Result<T> {
  const Failure(this.error, {this.stackTrace});
  final Object error;
  final StackTrace? stackTrace;
}
```

**UseCase.** Một class làm một việc nghiệp vụ. Ở đây là "thẻ nào đến hạn **ngay lúc này**":

```dart
// lib/domain/usecase/get_review_queue_usecase.dart
class GetReviewQueueUseCase {
  const GetReviewQueueUseCase(this._repo,
      {DateTime Function()? now, this.tick = const Duration(minutes: 1)})
      : _now = now ?? DateTime.now;

  final VocabularyRepository _repo;
  final DateTime Function() _now;
  final Duration tick;

  Stream<List<ReviewCard>> call() {
    late final StreamController<List<ReviewCard>> controller;
    StreamSubscription<List<ReviewCard>>? sub;
    Timer? timer;
    List<ReviewCard>? latest;

    void emit() {
      final cards = latest;
      if (cards == null || controller.isClosed) return;
      final now = _now();                       // giờ của LẦN PHÁT NÀY, không phải lúc gọi call()
      controller.add(cards.where((c) => !c.card.nextReviewAt.isAfter(now)).toList());
    }

    controller = StreamController<List<ReviewCard>>(
      onListen: () {
        sub = _repo.watchReviewQueue().listen((cards) { latest = cards; emit(); },
                                              onError: controller.addError);
        timer = Timer.periodic(tick, (_) => emit());   // DB không đổi vẫn lọc lại mỗi phút
      },
      onCancel: () async {                      // màn hình đóng → dừng timer, hủy subscription
        timer?.cancel();
        await sub?.cancel();
      },
    );
    return controller.stream;
  }
}
```

> **Bản cũ:** `final now = DateTime.now()` lấy một lần rồi dùng cho cả stream, và query DB cũng lọc `nextReviewAt <= now` theo giờ chốt sẵn. Mở màn SRS lúc 9:00, thẻ đến hạn lúc 9:05 không bao giờ hiện, phải thoát ra vào lại. Bài học: **giá trị "bây giờ" trong một stream sống lâu phải lấy lại mỗi lần phát**. Test dùng `fakeAsync` để tua đồng hồ (xem phần Testing).

---

### Data Layer — Offline-first

Ghi local trước, đưa vào hàng đợi (`sync_queue`), rồi gửi lên server ở nền:

```dart
// lib/data/repository/vocabulary_repository_impl.dart
@override
Future<Result<void>> updateSrsCard(SrsCard card) async {
  try {
    await _db.updateSrsAfterReview(id: card.id, easeFactor: card.easeFactor, /* ... */);

    // Mỗi thẻ chỉ giữ lần chấm MỚI NHẤT: chấm 3 lần lúc offline thì gửi 1 item
    await _db.deleteSyncByEntity(_srsOp, card.id);
    await _db.enqueueSync(operation: _srsOp, entityId: card.id, payload: jsonEncode(card.toJson()));

    // Gửi ở nền: ghi local xong là UI chuyển thẻ ngay, không chờ mạng
    unawaited(syncAllPending());
    return const Success(null);
  } catch (e, st) {
    return Failure(e, stackTrace: st);
  }
}
```

**Chỉ chạy một lượt sync tại một thời điểm.** Chấm thẻ liên tục sẽ gọi sync nhiều lần chồng nhau. Lượt gọi sau không chạy song song (hai lượt cùng đọc một hàng đợi sẽ gửi trùng): nó chờ chung lượt đang chạy, rồi lượt đó chạy thêm một vòng để gửi nốt item mới thêm vào:

```dart
Future<Result<void>>? _syncing;
bool _syncAgain = false;

@override
Future<Result<void>> syncAllPending() {
  final running = _syncing;
  if (running != null) {
    _syncAgain = true;
    return running;
  }
  final run = _syncLoop();
  _syncing = run;
  return run.whenComplete(() => _syncing = null);
}

Future<Result<void>> _syncLoop() async {
  Result<void> result;
  var rounds = 0;
  do {
    _syncAgain = false;
    result = await _syncOnce();
    rounds++;
  } while (_syncAgain && result is Success && rounds < 5);
  return result;
}
```

**Thứ tự quan trọng nhất: gửi trước, thành công mới xóa.**

```dart
Future<Result<void>> _syncOnce() async {
  if (!await _network.isOnline() || !await _isAuthenticated()) return const Success(null);
  try {
    final pending = await _db.getPendingSyncItems();
    final reviewItems = <Map<String, dynamic>>[];
    final sentRowIds = <int>[];
    final sentCards = <int, int>{};   // card id → id dòng hàng đợi đã gửi

    for (final item in pending) {
      if (item.operation != _srsOp) continue;
      final SrsCard card;
      try {
        card = SrsCard.fromJson(jsonDecode(item.payload) as Map<String, dynamic>);
      } catch (_) {
        await _db.deleteSyncItem(item.id);   // payload hỏng: bỏ, đừng để nó chặn cả hàng đợi
        continue;
      }
      final vocab = await (_db.select(_db.vocabularyTable)
            ..where((t) => t.id.equals(card.vocabularyId))).getSingleOrNull();
      if (vocab == null) { await _db.deleteSyncItem(item.id); continue; }
      reviewItems.add(reviewItemFor(card, vocab));
      sentRowIds.add(item.id);
      sentCards[card.id] = item.id;
    }
    if (reviewItems.isEmpty) return const Success(null);

    await _api.syncReviewBank(reviewItems);   // lỗi → ném ra, hàng đợi CÒN NGUYÊN

    for (final id in sentRowIds) {
      await _db.deleteSyncItem(id);           // chỉ xóa đúng các dòng vừa gửi
    }
    // Trong lúc chờ mạng người dùng có thể chấm lại thẻ → thẻ đó chưa được coi là synced
    final stillQueued = (await _db.getPendingSyncItems())
        .where((i) => i.operation == _srsOp).map((i) => i.entityId).toSet();
    final synced = sentCards.keys.where((id) => !stillQueued.contains(id)).toList();
    if (synced.isNotEmpty) await _db.markSrsSynced(synced);
    return const Success(null);
  } catch (e, st) {
    return Failure(e, stackTrace: st);
  }
}
```

> **Bản cũ:** vòng lặp đánh dấu "synced" và xóa từng dòng khỏi hàng đợi **trước khi** gọi API. Mất mạng giữa chừng hoặc server trả 500 thì toàn bộ lần ôn chưa gửi biến mất. Lỗi này không thấy được khi test tay lúc có mạng. Quy tắc chung của outbox: **xóa chỉ sau khi phía nhận xác nhận, và chỉ xóa đúng thứ đã gửi** (các dòng mới thêm trong lúc chờ phải giữ lại).

**Auth.** `AuthInterceptor` gắn token. Gặp 401 thì refresh **một lần cho mọi request** (10 request cùng 401 chỉ refresh một lần) rồi gửi lại:

```dart
// lib/data/remote/auth_interceptor.dart
@override
Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
  final req = err.requestOptions;
  // Đã gửi lại rồi, hoặc chính /auth/login trả 401 (sai mật khẩu) → không refresh
  if (err.response?.statusCode != 401 || req.extra[_retriedKey] == true || isAuthPath(req.path)) {
    return handler.next(err);
  }
  final sentToken = (req.headers['Authorization'] as String?)?.replaceFirst('Bearer ', '');
  final current = await _tokens.getAccessToken();
  // Luồng khác vừa refresh xong (token đã khác token của request lỗi) → gửi lại luôn
  final outcome = (current != null && current.isNotEmpty && current != sentToken)
      ? RefreshOutcome.refreshed
      : await _refreshOnce();
  if (outcome != RefreshOutcome.refreshed) return handler.next(err);

  final retry = req.copyWith(extra: {...req.extra, _retriedKey: true});
  retry.headers.remove('Authorization');   // onRequest gắn token mới
  try {
    handler.resolve(await _dio.fetch<dynamic>(retry));
  } on DioException catch (e) {
    handler.next(e);
  }
}

Future<RefreshOutcome> _refreshOnce() {
  final running = _inFlight;
  if (running != null) return running;          // đang refresh → chờ chung
  final run = _refresh().then((outcome) async {
    if (outcome == RefreshOutcome.rejected) await _tokens.clear();   // chỉ 400/401/403 mới đăng xuất
    return outcome;
  });
  _inFlight = run;
  return run.whenComplete(() => _inFlight = null);
}
```

Refresh token nằm trong cookie HttpOnly. Trên mobile không có trình duyệt giữ cookie, nên `TokenStore` tự lưu cookie từ `Set-Cookie` lúc login/refresh rồi gửi lại qua header `Cookie`. Trên web, trình duyệt tự gửi (`withCredentials`). Lỗi mạng hoặc 502 khi refresh thì **giữ phiên**, vì đăng xuất người dùng chỉ vì mạng chập chờn là sai.

---

### Presentation Layer — Riverpod

```dart
// lib/providers.dart — Provider đóng vai DI container
final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());
final dioProvider = Provider((ref) => createDio(ref.watch(tokenStoreProvider)));
final vocabularyApiProvider = Provider((ref) => VocabularyApi(ref.watch(dioProvider)));
final networkMonitorProvider = Provider((ref) => NetworkMonitor());

final vocabRepositoryProvider = Provider<VocabularyRepository>((ref) {
  final tokenStore = ref.watch(tokenStoreProvider);
  return VocabularyRepositoryImpl(
    db: ref.watch(appDatabaseProvider),
    api: ref.watch(vocabularyApiProvider),
    networkMonitor: ref.watch(networkMonitorProvider),
    isAuthenticated: tokenStore.isLoggedIn,   // truyền hàm, không truyền cả AuthRepository
  );
});

final getReviewQueueUseCaseProvider =
    Provider((ref) => GetReviewQueueUseCase(ref.watch(vocabRepositoryProvider)));

// StreamProvider: dữ liệu reactive từ DB
final reviewQueueProvider = StreamProvider<List<ReviewCard>>(
    (ref) => ref.watch(getReviewQueueUseCaseProvider)());

final vocabByLessonProvider = StreamProvider.family<List<Vocabulary>, int>(
    (ref, lessonNumber) => ref.watch(vocabRepositoryProvider).watchVocabByLesson(lessonNumber));

final isOnlineProvider = StreamProvider<bool>((ref) => ref.watch(networkMonitorProvider).onlineStream);
final isLoggedInProvider = FutureProvider<bool>((ref) => ref.watch(tokenStoreProvider).isLoggedIn());
final selectedLessonProvider = StateProvider<int>((ref) => 1);
```

Repo **không dùng StateNotifier**. Trạng thái phiên ôn (đang lật thẻ, số câu đúng) chỉ màn SRS cần, nên nằm trong `State` của widget. Danh sách thẻ lấy từ stream: chấm xong thì DB đổi, stream phát danh sách mới, thẻ tiếp theo tự hiện.

```dart
// lib/presentation/srs/srs_screen.dart (rút gọn)
class _SrsScreenState extends ConsumerState<SrsScreen> {
  bool _showAnswer = false;
  bool _submitting = false;
  int _sessionCorrect = 0;
  int _sessionTotal = 0;

  Future<void> _rate(int quality, List<ReviewCard> cards) async {
    if (_submitting || cards.isEmpty) return;      // chặn bấm 2 lần
    setState(() => _submitting = true);

    final updated = SrsAlgorithm.calculateNextReview(cards.first.card, quality);
    final result = await ref.read(vocabRepositoryProvider).updateSrsCard(updated);  // read: trong callback
    if (!mounted) return;                           // sau await, màn hình có thể đã đóng

    if (result is Failure) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi lưu: ${result.error}')));
    } else {
      if (quality >= 3) _sessionCorrect++;
      _sessionTotal++;
    }
    setState(() { _showAnswer = false; _submitting = false; });
  }

  @override
  Widget build(BuildContext context) {
    final cardsAsync = ref.watch(reviewQueueProvider);  // watch: trong build
    return Scaffold(
      body: cardsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Lỗi: $e')),
        data: (cards) => /* cards.isEmpty && _sessionTotal > 0 → màn hoàn thành; còn lại → thẻ đầu */,
      ),
    );
  }
}
```

Quy tắc `ref`: **`watch` trong `build`** (cần rebuild khi giá trị đổi), **`read` trong callback** (chỉ cần lấy một lần).

---

## GIAI ĐOẠN 3 — TÍNH NĂNG (tháng 5–6)

### Drift ORM (Local Database)

Có ba bảng, tất cả nằm trong `lib/data/local/app_database.dart`. Repo không tách DAO riêng: query viết thẳng trong `AppDatabase`. Giờ được lưu dạng `int` (millisecondsSinceEpoch):

```dart
class VocabularyTable extends Table {
  @override
  String get tableName => 'vocabulary';

  IntColumn get id => integer()();
  IntColumn get lessonNumber => integer().named('lesson_number')();
  TextColumn get kana => text()();
  TextColumn get kanji => text().nullable()();
  TextColumn get meaning => text()();
  TextColumn get romaji => text().withDefault(const Constant(''))();
  IntColumn get sortOrder => integer().named('sort_order')();
  TextColumn get syncStatus => text().named('sync_status').withDefault(const Constant('synced'))();
  IntColumn get updatedAt => integer().named('updated_at')();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class SrsCardTable extends Table {
  @override
  String get tableName => 'srs_card';

  IntColumn get id => integer()();
  IntColumn get vocabularyId => integer().named('vocabulary_id').references(VocabularyTable, #id)();
  RealColumn get easeFactor => real().named('ease_factor').withDefault(const Constant(2.5))();
  IntColumn get interval => integer().withDefault(const Constant(0))();
  IntColumn get repetitions => integer().withDefault(const Constant(0))();
  IntColumn get nextReviewAt => integer().named('next_review_at')();
  BoolColumn get mastered => boolean().withDefault(const Constant(false))();
  TextColumn get syncStatus => text().named('sync_status').withDefault(const Constant('synced'))();
  IntColumn get updatedAt => integer().named('updated_at')();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

// Outbox: mỗi dòng là một thay đổi chờ gửi lên server
class SyncQueueTable extends Table {
  @override
  String get tableName => 'sync_queue';

  IntColumn get id => integer().autoIncrement()();
  TextColumn get operation => text()();          // 'UPDATE_SRS'
  IntColumn get entityId => integer().named('entity_id')();
  TextColumn get payload => text()();            // JSON của SrsCard
  IntColumn get retryCount => integer().named('retry_count').withDefault(const Constant(0))();
  IntColumn get createdAt => integer().named('created_at')();
}

@DriftDatabase(tables: [VocabularyTable, SrsCardTable, SyncQueueTable])
class AppDatabase extends _$AppDatabase {
  // Truyền executor được → test dùng AppDatabase(NativeDatabase.memory())
  AppDatabase([QueryExecutor? executor]) : super(executor ?? _openConnection());
  // ...
}
```

Query join, trả stream:

```dart
Stream<List<({SrsCardTableData card, VocabularyTableData vocab})>> watchDueReviewCards({int limit = 30}) {
  // KHÔNG lọc theo giờ ở đây (lý do: xem GetReviewQueueUseCase). Sắp theo giờ đến hạn
  // → thẻ đến hạn luôn ở đầu; use case lọc lại theo giờ hiện tại.
  final query = select(srsCardTable).join([
    innerJoin(vocabularyTable, vocabularyTable.id.equalsExp(srsCardTable.vocabularyId)),
  ])
    ..orderBy([OrderingTerm.asc(srsCardTable.nextReviewAt)])
    ..limit(limit);

  return query.watch().map((rows) => rows
      .map((row) => (card: row.readTable(srsCardTable), vocab: row.readTable(vocabularyTable)))
      .toList());
}
```

Đổi bảng xong phải chạy `dart run build_runner build --delete-conflicting-outputs`. File `app_database.g.dart` được commit. CI chạy lại lệnh này và báo lỗi nếu file sinh ra khác với file đã commit.

---

### CustomPainter — Kanji Draw Screen

```dart
// lib/presentation/kanji_draw/kanji_draw_screen.dart (rút gọn)
typedef Stroke = List<Offset>;

class _KanjiDrawScreenState extends State<KanjiDrawScreen> {
  // Luôn thay bằng danh sách MỚI, không sửa tại chỗ (lý do: shouldRepaint bên dưới)
  List<Stroke> _strokes = const [];
  Stroke _current = const [];

  void _onPanStart(DragStartDetails d) => setState(() => _current = [d.localPosition]);
  void _onPanUpdate(DragUpdateDetails d) => setState(() => _current = [..._current, d.localPosition]);
  void _onPanEnd(DragEndDetails _) => setState(() {
        if (_current.length > 2) _strokes = [..._strokes, _current];
        _current = const [];
      });
  void _undo() => setState(() => _strokes = _strokes.sublist(0, _strokes.length - 1));
  void _clear() => setState(() => _strokes = const []);

  // trong build():
  Stack(children: [
    CustomPaint(painter: _GridPainter(color: scheme.outlineVariant), child: const SizedBox.expand()),
    CustomPaint(
      painter: _StrokePainter(strokes: _strokes, current: _current, strokeColor: scheme.primary),
      child: const SizedBox.expand(),
    ),
    GestureDetector(
      behavior: HitTestBehavior.opaque,   // con là SizedBox rỗng: phải opaque mới nhận chạm
      onPanStart: _onPanStart,
      onPanUpdate: _onPanUpdate,
      onPanEnd: _onPanEnd,
      child: const SizedBox.expand(),
    ),
  ]);
}

class _StrokePainter extends CustomPainter {
  _StrokePainter({required this.strokes, required this.current, required this.strokeColor});
  final List<Stroke> strokes;
  final Stroke current;
  final Color strokeColor;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = strokeColor
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    for (final stroke in [...strokes, current]) {
      if (stroke.length < 2) continue;
      final path = ui.Path()..moveTo(stroke[0].dx, stroke[0].dy);
      for (var i = 1; i < stroke.length; i++) {
        path.lineTo(stroke[i].dx, stroke[i].dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  // So sánh THAM CHIẾU (!=), không so nội dung → rẻ, nhưng chỉ đúng khi list bất biến
  @override
  bool shouldRepaint(_StrokePainter old) => old.strokes != strokes || old.current != current;
}
```

> **Bản cũ có hai lỗi chồng nhau**, và màn hình không vẽ được gì:
> 1. `_current.add(...)`, `_strokes.removeLast()`, `_strokes.clear()` sửa list **tại chỗ**. Painter mới nhận đúng object cũ, `shouldRepaint` trả `false`, nên nét đang vẽ không hiện, còn hoàn tác/xóa không vẽ lại. Sửa: luôn tạo list mới (`[..._current, p]`).
> 2. `GestureDetector` bọc một `SizedBox` rỗng với `behavior` mặc định (`deferToChild`). Con không vẽ gì nên hit test trượt, và **không nhận được chạm nào**. Sửa: `HitTestBehavior.opaque`.
>
> Test `test/presentation/kanji_draw_screen_test.dart` kéo qua canvas rồi kiểm tra `shouldRepaint` trả `true` ở mỗi bước. Chỉ sửa một trong hai lỗi thì test vẫn đỏ.

Lưới ô vuông vẽ bằng một painter riêng (`_GridPainter`, `shouldRepaint` chỉ so màu), để mỗi lần thêm điểm không phải vẽ lại lưới.

---

### GoRouter Navigation

Tên route gom vào một chỗ, tránh gõ sai chuỗi:

```dart
// lib/core/routes.dart
abstract final class Routes {
  static const home = '/';
  static const vocab = '/vocab';
  static const srs = '/srs';
  static const sentencePractice = '/sentence-practice';
  static const cameraTranslate = '/camera-translate';
  static const live = '/live';
  static const liveViewer = '/live/viewer';
  static const liveHost = '/live/host';
  static const login = '/login';
  static const aiTutor = '/ai-tutor';
  static const pronunciation = '/pronunciation';
  static const kanjiDraw = '/kanji-draw';
}
```

```dart
// lib/presentation/app.dart
final _router = GoRouter(
  initialLocation: Routes.home,
  routes: [
    GoRoute(path: Routes.home,             builder: (_, __) => const HomeScreen()),
    GoRoute(path: Routes.vocab,            builder: (_, __) => const VocabScreen()),
    GoRoute(path: Routes.srs,              builder: (_, __) => const SrsScreen()),
    GoRoute(path: Routes.sentencePractice, builder: (_, __) => const SentencePracticeScreen()),
    GoRoute(path: Routes.cameraTranslate,  builder: (_, __) => const CameraTranslateScreen()),
    GoRoute(path: Routes.live,             builder: (_, __) => const LiveListScreen()),
    GoRoute(
      path: Routes.liveViewer,
      builder: (_, state) => LiveViewerScreen(join: state.extra as LiveJoinResponse),
    ),
    GoRoute(
      path: Routes.liveHost,
      builder: (_, state) => LiveHostScreen(join: state.extra as LiveJoinResponse),
    ),
    GoRoute(path: Routes.login,   builder: (_, __) => const LoginScreen()),
    GoRoute(path: Routes.aiTutor, builder: (_, __) => const AiTutorScreen()),
    GoRoute(
      path: Routes.pronunciation,
      builder: (_, state) {
        final extra = state.extra as Map<String, dynamic>?;
        return PronunciationScreen(
          kana: extra?['kana'] as String? ?? '',
          meaning: extra?['meaning'] as String? ?? '',
        );
      },
    ),
    GoRoute(
      path: Routes.kanjiDraw,
      builder: (_, state) {
        final extra = state.extra as Map<String, dynamic>?;
        return KanjiDrawScreen(
          kanji: extra?['kanji'] as String? ?? '日',
          kana: extra?['kana'] as String? ?? 'にち',
        );
      },
    ),
  ],
);

// Điều hướng
context.push(Routes.pronunciation, extra: {'kana': 'おはよう', 'meaning': 'Chào buổi sáng'});
context.go(Routes.srs);
```

`push` chồng màn mới lên (có nút back). `go` thay cả stack theo URL. `extra` **không nằm trong URL**: deep link hay web reload sẽ mất nó, nên màn nhận `extra` phải có giá trị mặc định (như `?? '日'` ở trên). Route live dùng `state.extra as LiveJoinResponse` không có mặc định, nên chỉ vào được từ trong app. Đây là đánh đổi có chủ ý.

---

## GIAI ĐOẠN 4 — SENIOR FEATURES (tháng 7–8)

### Animation nâng cao

Màn SRS hiện dùng `AnimatedSwitcher` (implicit animation) để chuyển thẻ (`srs_screen.dart`). Màn gia sư AI dùng `AnimationController` cho hiệu ứng "đang gõ" (`ai_tutor_screen.dart`). **Bài tập** (chưa có trong repo): thẻ vuốt trái/phải để chấm, với explicit animation:

```dart
class SwipeCard extends StatefulWidget {
  const SwipeCard({super.key, required this.child, required this.onAnswer});
  final Widget child;
  final void Function(int quality) onAnswer;

  @override
  State<SwipeCard> createState() => _SwipeCardState();
}

class _SwipeCardState extends State<SwipeCard> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 300))
        ..addListener(_onTick);              // gắn listener MỘT lần
  Animation<Offset>? _flight;
  Offset _dragOffset = Offset.zero;

  @override
  void dispose() {
    _controller.dispose();                   // QUAN TRỌNG: tránh rò rỉ ticker
    super.dispose();
  }

  void _onTick() {
    final flight = _flight;
    if (flight != null) setState(() => _dragOffset = flight.value);
  }

  void _onDragEnd(DragEndDetails details) {
    final velocity = details.velocity.pixelsPerSecond.dx;
    if (_dragOffset.dx > 120 || velocity > 500) {
      _flyOff(1, quality: 4);                // phải: Good
    } else if (_dragOffset.dx < -120 || velocity < -500) {
      _flyOff(-1, quality: 1);               // trái: Again
    } else {
      setState(() => _dragOffset = Offset.zero);
    }
  }

  Future<void> _flyOff(double direction, {required int quality}) async {
    final width = MediaQuery.sizeOf(context).width;
    _flight = Tween(begin: _dragOffset, end: Offset(direction * width * 1.5, _dragOffset.dy))
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    await _controller.forward(from: 0);
    if (!mounted) return;                    // widget có thể đã bị gỡ trong 300ms
    _flight = null;
    _controller.reset();
    setState(() => _dragOffset = Offset.zero);
    widget.onAnswer(quality);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onHorizontalDragUpdate: (d) => setState(() => _dragOffset += Offset(d.delta.dx, 0)),
      onHorizontalDragEnd: _onDragEnd,
      child: Transform.translate(
        offset: _dragOffset,
        child: Transform.rotate(angle: _dragOffset.dx / 400, child: widget.child),
      ),
    );
  }
}
```

Lỗi hay gặp với kiểu code này: gọi `animation.addListener` **mỗi lần** vuốt. Listener cũ không bị gỡ, nên sau vài lần có nhiều listener cùng `setState` các giá trị khác nhau, thẻ giật. Cách đúng: gắn listener một lần vào controller và chỉ thay `Tween`.

---

### AI qua backend (gia sư AI, luyện câu)

App **không giữ API key nào**. Mọi lời gọi AI đi qua gateway (`/api/ai/...`) bằng Dio chung, nên token được gắn và refresh tự động. Response của gateway có dạng `{ success, data }`, nên dùng `unwrapEnvelope`:

```dart
// lib/data/remote/ai_tutor_api.dart
Future<String> ask({required String question, required List<AiMessage> history, String? vocabContext}) async {
  final res = await _dio.post<dynamic>(
    '/ai/chat',
    data: {
      'question': question,
      'history': history.map((m) => {'role': m.role, 'content': m.text}).toList(),
      if (vocabContext != null) 'context': vocabContext,
    },
    options: Options(sendTimeout: const Duration(seconds: 10), receiveTimeout: const Duration(seconds: 30)),
  );
  // Bản cũ đọc `answer` ở cấp ngoài cùng → luôn rỗng vì gateway bọc trong `data`
  final data = unwrapEnvelope(res.data);
  return (data is Map ? data['answer'] as String? : null)?.trim() ?? '';
}

// lib/data/remote/sentence_practice_api.dart — bản cũ gọi thẳng Gemini bằng
// --dart-define=GEMINI_API_KEY: key bị biên dịch vào app, giải nén là lấy được.
Future<SentenceFeedback> analyze(String sentence) async {
  final res = await _dio.post<dynamic>('/ai/sentence-feedback',
      data: {'sentence': sentence.trim()},
      options: Options(receiveTimeout: const Duration(seconds: 40)));
  final data = unwrapEnvelope(res.data);
  if (data is! Map<String, dynamic>) throw Exception('Máy chủ không trả kết quả');
  return SentenceFeedback.fromJson(data);
}
```

Phía màn hình (`ai_tutor_screen.dart`, rút gọn). Để ý `mounted` sau mỗi `await`:

```dart
Future<void> _send(String text) async {
  final trimmed = text.trim();
  if (trimmed.isEmpty || _loading) return;
  _controller.clear();
  setState(() {
    _messages.add(AiMessage(role: 'user', text: trimmed));
    _loading = true;
  });
  try {
    final answer = await ref.read(aiTutorApiProvider).ask(
      question: trimmed,
      history: _messages.sublist(0, _messages.length - 1),
      vocabContext: _buildVocabContext(),
    );
    if (!mounted) return;   // người dùng thoát màn trong lúc chờ AI (có thể tới 30 giây)
    setState(() => _messages.add(AiMessage(role: 'assistant', text: answer)));
  } catch (e) {
    if (!mounted) return;
    setState(() => _messages.add(const AiMessage(role: 'assistant', text: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.')));
  } finally {
    if (mounted) setState(() => _loading = false);
  }
}
```

---

### Testing

Repo **không dùng mocktail/mockito**. Thay vào đó dùng fake viết tay (một class `implements` interface) và DB thật chạy trong RAM. Có 34 test trong `apps/nihongo_flutter/test/`:

| File | Kiểm tra gì |
|---|---|
| `data/vocabulary_repository_sync_test.dart` | outbox: API lỗi thì hàng đợi còn nguyên; dedupe; sync chồng nhau; chấm lại trong lúc gửi |
| `data/auth_interceptor_test.dart` | 401 → refresh → gửi lại; 10 request chỉ refresh 1 lần; lỗi mạng thì giữ phiên |
| `domain/get_review_queue_usecase_test.dart` | thẻ đến hạn sau khi mở màn tự hiện (`fakeAsync`) |
| `presentation/kanji_draw_screen_test.dart` | canvas vẽ lại khi vẽ, nhấc tay, hoàn tác, xóa |
| `srs_algorithm_test.dart`, `ai_api_test.dart`, `data/api_config_test.dart`, `widget_test.dart` | SM-2, parse response AI, URL theo nền tảng, smoke test |
| `integration/auth_refresh_integration_test.dart` | chạy với backend thật, chỉ khi `INTEGRATION=1` |

**Fake + Drift in-memory.** Test chạy code SQL thật, không giả lập DB:

```dart
// test/data/vocabulary_repository_sync_test.dart (rút gọn)
class FakeApi implements VocabularyApi {
  final sent = <List<Map<String, dynamic>>>[];
  Object? failWith;

  @override
  Future<void> syncReviewBank(List<Map<String, dynamic>> items) async {
    sent.add(items);
    if (failWith != null) throw failWith!;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);  // method khác: không dùng
}

setUp(() async {
  db = AppDatabase(NativeDatabase.memory());
  api = FakeApi();
  network = FakeNetwork();
  repo = VocabularyRepositoryImpl(db: db, api: api, networkMonitor: network, isAuthenticated: () async => true);
  await seed(1);
  await seed(2);
});
tearDown(() => db.close());

test('API lỗi → hàng đợi CÒN NGUYÊN (bản cũ xóa trước khi gửi → mất dữ liệu)', () async {
  network.online = false;
  await repo.updateSrsCard(card(1));
  await repo.updateSrsCard(card(2));
  network.online = true;
  api.failWith = Exception('500');

  final result = await repo.syncAllPending();

  expect(result, isA<Failure<void>>());
  expect((await db.getPendingSyncItems()).length, 2);
});
```

**Tua đồng hồ với `fakeAsync`.** Không phải chờ 1 phút thật:

```dart
// test/domain/get_review_queue_usecase_test.dart
test('thẻ đến hạn SAU khi mở màn hình tự hiện ở lần tick kế tiếp', () {
  fakeAsync((async) {
    var clock = DateTime(2026, 10, 20, 9, 0);
    final repo = FakeRepo();
    final emitted = <List<int>>[];
    final sub = GetReviewQueueUseCase(repo, now: () => clock)()
        .listen((cards) => emitted.add(cards.map((c) => c.card.id).toList()));

    repo.queue.add([due(1, DateTime(2026, 10, 20, 8)), due(2, DateTime(2026, 10, 20, 9, 1, 30))]);
    async.flushMicrotasks();
    expect(emitted.last, [1]);                 // thẻ 2 chưa tới hạn

    clock = DateTime(2026, 10, 20, 9, 2);      // 2 phút sau, DB không đổi gì
    async.elapse(const Duration(minutes: 1));
    expect(emitted.last, [1, 2]);
    sub.cancel();
  });
});
```

**Fake HTTP cho Dio.** `ScriptedAdapter` (một `HttpClientAdapter` giả) trả response theo kịch bản và ghi lại mọi request. Nhờ vậy test kiểm tra được cả thứ tự gọi:

```dart
// test/data/auth_interceptor_test.dart
final res = await dio.get<dynamic>('/progress');
expect(server.requests.map((r) => r.path).toList(), ['/progress', '/auth/refresh', '/progress']);
expect(server.requests[1].headers['Cookie'], 'refresh_token=R1');   // gửi cookie đã lưu
expect(tokens.cookie, 'refresh_token=R2');                          // lưu cookie mới xoay vòng
```

**Test phải đỏ trên code lỗi.** Với mỗi lỗi đã sửa, chạy test mới trên code cũ (`git stash`, hoặc lấy file cũ từ `git show HEAD:...`) và xác nhận test fail. Test chỉ xanh trên code mới thì chưa chứng minh được gì.

Widget test có Riverpod thì override provider bằng fake:

```dart
await tester.pumpWidget(ProviderScope(
  overrides: [vocabRepositoryProvider.overrideWithValue(FakeRepo())],
  child: const MaterialApp(home: SrsScreen()),
));
```

---

### CI/CD

Flutter có một job trong file CI chung `.github/workflows/ci.yml` (không có file `flutter-ci.yml` riêng):

```yaml
  flutter:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/nihongo_flutter
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.47.6'
          channel: stable
          cache: true
      - run: flutter pub get
      # Code Drift tự sinh (*.g.dart) được commit: phải khớp với schema hiện tại
      - name: Generated code up to date
        run: |
          dart run build_runner build --delete-conflicting-outputs
          git diff --exit-code -- lib
      - run: flutter analyze
      # Test integration (cần backend thật) tự bỏ qua khi không đặt INTEGRATION=1
      - run: flutter test
```

Ghim `flutter-version` cụ thể để CI và máy dev cùng một bản. Bước `git diff --exit-code` bắt lỗi "sửa bảng Drift nhưng quên chạy build_runner".

Job build bản phát hành (chưa có trong repo) chạy `flutter build apk --release` / `appbundle` / `ipa`. Ký bản release cần keystore Android hoặc chứng chỉ Apple, lưu trong GitHub Secrets.

> EAS Build là tool của Expo/React Native, không dùng cho Flutter.

---

## CHECKLIST

```
Giai đoạn 1 — Dart + Flutter cơ bản:
  □ Dart null safety, sealed class (Dart 3), extension
  □ Chọn đúng Stateless / Stateful / Consumer / ConsumerStateful
  □ Column/Row/Wrap/Stack — giải thích vì sao
  □ ListView.builder vs ListView children vs Grid/Sliver
  □ Expanded/Flexible + hiểu bounded/unbounded constraints
  □ LayoutBuilder vs MediaQuery; SafeArea/AspectRatio
  □ AsyncValue loading/error/empty/data
  □ InkWell vs GestureDetector vs Material buttons
  □ Theme, context, const widget/key
  □ dispose() pattern: AnimationController, TextEditingController
  □ Camera/controller/stream lifecycle + mounted sau await

Giai đoạn 2 — Clean Architecture:
  □ Domain layer: Entity, Repository interface, UseCase
  □ Data layer: RepositoryImpl, Drift, outbox (gửi trước, thành công mới xóa)
  □ Presentation layer: ConsumerWidget, Provider
  □ Dependency direction: Presentation → Domain ← Data

Giai đoạn 3 — Features:
  □ Riverpod: Provider, StreamProvider(.family), FutureProvider, StateProvider
    (Notifier/AsyncNotifier: tự học thêm, repo chưa dùng)
  □ ref.watch vs ref.read
  □ Drift: Table, DAO, Stream query, upsert
  □ GoRouter: routes, push, extra params
  □ Dio + interceptor: gắn token, 401 → refresh một lần → gửi lại

Giai đoạn 4 — Senior:
  □ CustomPainter + shouldRepaint (list bất biến) + HitTestBehavior
  □ AnimationController + physics animation
  □ Platform Channel (MethodChannel)
  □ flutter_tts + speech_to_text
  □ Test bằng fake + Drift in-memory + fakeAsync; widget test + Riverpod override
  □ Test mới phải đỏ trên code lỗi
  □ flutter build apk/appbundle + GitHub Actions CI
  □ flutter_lints, analyze clean
```

---

## RESOURCES

- **Official**: flutter.dev/docs (Material 3, API reference)
- **Riverpod**: riverpod.dev (docs + examples)
- **Drift**: drift.simonbinder.eu
- **Architecture**: Very Good Ventures blog (VGV)
- **YouTube**: Reso Coder, Flutter Explained, Robert Brunhage
- **Book**: Flutter in Action (Manning)
- **Newsletter**: Flutter Weekly
- **Project thực tế**: apps/nihongo_flutter/ trong repo này
