# Hỏi đáp Mobile

Các câu hỏi thực tế khi làm app mobile trong project, kèm câu trả lời bám theo code. Áp dụng cho cả 5 app: Flutter, Android, iOS, Expo, React Native CLI.

**Mục lục**

- [1. Lưu ảnh trên mobile thì lưu vào đâu?](#1-lưu-ảnh-trên-mobile-thì-lưu-vào-đâu)
- [2. Lưu vào cache có bị tràn không?](#2-lưu-vào-cache-có-bị-tràn-không)
- [3. Giải quyết tràn cache thế nào?](#3-giải-quyết-tràn-cache-thế-nào)
- [4. Có 1000 user, hiện 5 cái, kéo xuống tải tiếp thế nào?](#4-có-1000-user-hiện-5-cái-kéo-xuống-tải-tiếp-thế-nào)

---

## 1. Lưu ảnh trên mobile thì lưu vào đâu?

**Hiện trạng (06/11/2026):** các app mobile chưa lưu ảnh. Chưa có code upload, chưa hiển thị ảnh từ server, chưa có thư viện cache ảnh. Chỉ có hai chỗ liên quan: trường `avatarUrl` của coach trong API livestream (Android, Expo), và ảnh chụp tạm ở màn dịch camera của Expo.

Khi cần làm, chỗ lưu tùy loại ảnh:

| Loại ảnh | Lưu ở đâu | Ghi chú |
|---|---|---|
| Ảnh người dùng gửi lên (avatar, ảnh chat) | **S3**, DB server chỉ giữ URL | Dùng `/api/upload/presigned-url` có sẵn, app đẩy file thẳng lên S3 |
| Ảnh tải về để hiển thị | **Thư mục cache**, do thư viện ảnh quản lý | Hệ điều hành có thể xóa, mất thì tải lại |
| Ảnh phải xem được khi offline | **Thư mục documents**, DB trên máy giữ đường dẫn | Không tự bị xóa; phải có cách dọn dung lượng |
| Ảnh chụp tạm | **Thư mục cache**, xử lý xong thì xóa | Không giữ lại |
| Người dùng bấm "Lưu ảnh" | **Thư viện ảnh** của máy | Chỉ khi người dùng yêu cầu, phải xin quyền |

| App | Cache | Lâu dài | Thư viện nên dùng |
|---|---|---|---|
| Flutter | `getTemporaryDirectory()` | `getApplicationDocumentsDirectory()` | `cached_network_image` |
| Android | `context.cacheDir` | `context.filesDir` | Coil |
| iOS | `.cachesDirectory` | `.documentDirectory` | Kingfisher |
| Expo | `Paths.cache` | `Paths.document` | `expo-image` |

**Nên tránh:**

- Lưu ảnh base64 trong SQLite/Drift: DB phình to, đọc chậm. Lưu file ra thư mục, DB chỉ giữ đường dẫn.
- Lưu đường dẫn đầy đủ: trên iOS, đường dẫn thư mục của app có thể đổi sau khi cập nhật. Lưu đường dẫn tương đối, ví dụ `images/abc.png`.
- Dùng secure storage cho ảnh: nó chỉ dành cho dữ liệu nhỏ như token.

**Vấn đề sẽ gặp khi làm upload:** S3 giả lập trả URL dạng `http://localhost:8080/s3/...`. Trong máy ảo Android, `localhost` là chính máy ảo, nên app không upload được và không xem được ảnh. Khi làm, phải đổi `AWS_PUBLIC_ENDPOINT_URL` sang địa chỉ dùng được cho cả web và máy ảo, ví dụ IP LAN của máy tính.

Chỗ lưu ảnh phía server: [media-storage.md](./media-storage.md).

---

## 2. Lưu vào cache có bị tràn không?

**Có thể, tùy ai quản lý cache.**

Thư viện ảnh tự giới hạn dung lượng và tự xóa ảnh cũ. Mức mặc định dưới đây cần xem lại theo đúng phiên bản dùng:

| Thư viện | Giới hạn mặc định |
|---|---|
| Coil (Android) | Khoảng 2% dung lượng ổ, từ 10 MB đến 250 MB |
| `cached_network_image` (Flutter) | 200 ảnh, ảnh quá 30 ngày thì bị xóa |
| Kingfisher (iOS) | **Không giới hạn dung lượng**, chỉ xóa ảnh quá 7 ngày |

Hệ điều hành chỉ là lớp dự phòng: Android và iOS xóa thư mục cache khi máy sắp hết dung lượng, nhưng không có lịch cố định.

**Tự ghi file vào cache thì không có gì giới hạn.** Không ai dọn nếu code không tự xóa.

**Lỗi thật trong repo:** [camera-translate.tsx](../apps/nihongo-mobile/app/camera-translate.tsx) của app Expo chụp khoảng mỗi giây một ảnh bằng `takePictureAsync` khi quét, nhận chữ xong nhưng không xóa file. Chưa sửa tính đến 06/11/2026.

---

## 3. Giải quyết tràn cache thế nào?

Ba lớp: ảnh tải về thì để thư viện giới hạn, file tạm thì xóa ngay, ảnh tự lưu thì tự dọn theo hạn mức.

### Lớp 1: đặt giới hạn cho thư viện ảnh

```dart
// Flutter
final imageCache = CacheManager(Config(
  'nihongoImages',
  stalePeriod: const Duration(days: 14),
  maxNrOfCacheObjects: 300,
));

CachedNetworkImage(imageUrl: url, cacheManager: imageCache);
```

```kotlin
// Android (Coil)
ImageLoader.Builder(context)
    .diskCache {
        DiskCache.Builder()
            .directory(context.cacheDir.resolve("images"))
            .maxSizeBytes(100L * 1024 * 1024)
            .build()
    }
    .build()
```

```swift
// iOS (Kingfisher): phải tự đặt vì mặc định không giới hạn dung lượng
ImageCache.default.diskStorage.config.sizeLimit = 100 * 1024 * 1024
ImageCache.default.diskStorage.config.expiration = .days(14)
```

### Lớp 2: xóa file tạm trong `finally`

```ts
import { File } from 'expo-file-system';

let uri: string | undefined;
try {
  const photo = await cameraRef.current.takePictureAsync({ /* ... */ });
  uri = photo?.uri;
  // ... nhận chữ, dịch
} finally {
  if (uri) {
    try {
      new File(uri).delete();
    } catch {
      // xóa lỗi cũng không được làm hỏng lượt quét
    }
  }
}
```

Đặt trong `finally` để nhánh `return` sớm hoặc lỗi giữa chừng vẫn xóa được.

### Lớp 3: tự đặt hạn mức cho ảnh offline

1. Thu nhỏ trước khi lưu: ảnh từ vựng chỉ cần khoảng 800 px.
2. Đặt hạn mức, ví dụ 200 MB, lưu `size` và `lastUsedAt` của từng ảnh trong DB trên máy.
3. Vượt hạn mức thì xóa ảnh lâu chưa dùng nhất (LRU) tới khi đủ chỗ.
4. Trong cài đặt, hiện dung lượng đang dùng, có nút "Xóa bộ nhớ đệm".

### Kiểm tra cache có phình không

```bash
adb shell run-as com.edu.nihongo_app du -sh cache
```

Lệnh này cần bản debug; app khác thì đổi tên gói. Dùng app càng lâu mà con số cứ tăng, không dừng ở mức giới hạn, thì vẫn còn chỗ chưa dọn.

Code ở mục này là mẫu, chưa chạy thử trong app.

---

## 4. Có 1000 user, hiện 5 cái, kéo xuống tải tiếp thế nào?

Kỹ thuật này gọi là **phân trang kết hợp cuộn vô hạn** (infinite scroll). Không tải cả 1000 user một lần, mà xin từng trang:

```text
Mở màn hình     → GET /api/users?page=1&limit=5   → hiện 5 user
Gần cuối list   → GET /api/users?page=2&limit=5   → nối thêm, thành 10
Gần cuối list   → GET /api/users?page=3&limit=5   → nối thêm, thành 15
Đủ 1000         → dừng, không gọi nữa
```

`/api/users` ở đây là ví dụ. API của project đang trả theo dạng này, ví dụ `GET /api/vocabularies?lessonNumber=1&page=2&limit=5`:

```json
{ "success": true, "data": { "data": [ ... ], "total": 50, "page": 2, "limit": 5 } }
```

### 5 việc phải xử lý, ở mọi nền tảng

| Việc | Nếu bỏ qua |
|---|---|
| **Không tải chồng:** đang tải thì bỏ qua | Cuộn nhanh gọi cùng một trang nhiều lần, list bị trùng |
| **Biết khi nào hết:** `đã có >= total`, hoặc trang trả rỗng | Gọi API mãi ở cuối danh sách |
| **Tải trước khi chạm đáy:** còn cách đáy khoảng 300 px đã tải | Người dùng phải dừng chờ ở cuối list |
| **Xử lý lỗi:** dừng, hiện nút "Thử lại" | Lỗi mạng làm app gọi lại liên tục |
| **Danh sách ngắn:** tự tải tiếp khi chưa lấp đầy màn hình | 5 dòng không đủ cao thì không cuộn được, nên không bao giờ tải tiếp |
| **Ngưỡng tải trước nhỏ hơn vùng đệm** (riêng Flutter, xem dưới) | Tải liên tục tới hết dữ liệu dù người dùng không cuộn |

Việc cuối là bẫy lớn nhất của con số 5: điện thoại thường hiện được hơn 5 dòng. **Nên dùng `limit=20`** để bớt số lần gọi API.

### Flutter

**Đã có trong app:** màn **Từ điển N5–N1** của `nihongo_flutter` (Home → "Từ điển N5–N1") dùng đúng kỹ thuật này với API thật, 30 từ mỗi trang. Code: [dictionary_controller.dart](../apps/nihongo_flutter/lib/presentation/dictionary/dictionary_controller.dart) (trạng thái, Riverpod `Notifier`), [dictionary_screen.dart](../apps/nihongo_flutter/lib/presentation/dictionary/dictionary_screen.dart) (màn hình), test [dictionary_test.dart](../apps/nihongo_flutter/test/presentation/dictionary_test.dart).

Đoạn dưới đây là bản rút gọn, không dùng Riverpod, để dễ đọc.

```dart
class _UserListScreenState extends State<UserListScreen> {
  final _scroll = ScrollController();
  final _users = <User>[];
  final _seenIds = <int>{};
  int _nextPage = 1;
  bool _loading = false;
  bool _hasMore = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_loadIfNearEnd);
    _loadMore();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  static const _preloadDistance = 300.0;

  void _loadIfNearEnd() {
    if (!_scroll.hasClients) return;
    if (_scroll.position.extentAfter < _preloadDistance) _loadMore();
  }

  Future<void> _loadMore() async {
    if (_loading || !_hasMore || _error != null) return;
    setState(() => _loading = true);
    try {
      final page = await widget.fetchUsers(_nextPage, widget.pageSize);
      if (!mounted) return;
      setState(() {
        _users.addAll(page.items.where((u) => _seenIds.add(u.id)));
        _nextPage++;
        _hasMore = page.items.isNotEmpty && _users.length < page.total;
        _loading = false;
      });
      // Danh sách chưa lấp đầy màn hình thì không cuộn được: tự kiểm tra lại sau khi vẽ xong.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _loadIfNearEnd();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  void _retry() {
    setState(() => _error = null);
    _loadMore();
  }

  @override
  Widget build(BuildContext context) {
    final showFooter = _loading || _error != null;
    return ListView.builder(
      controller: _scroll,
      // Vùng đệm phải LỚN HƠN ngưỡng tải trước (xem giải thích bên dưới).
      // Flutter 3.41+: scrollCacheExtent (import 'package:flutter/rendering.dart').
      // Bản cũ hơn: cacheExtent: _preloadDistance * 2.
      scrollCacheExtent: const ScrollCacheExtent.pixels(_preloadDistance * 2),
      itemCount: _users.length + (showFooter ? 1 : 0),
      itemBuilder: (context, index) {
        if (index < _users.length) {
          return ListTile(title: Text(_users[index].name));
        }
        if (_error != null) {
          return TextButton(onPressed: _retry, child: const Text('Thử lại'));
        }
        return const Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: CircularProgressIndicator()),
        );
      },
    );
  }
}
```

- **`ListView.builder`** chỉ dựng những dòng đang thấy, nên list dài vẫn mượt. Đừng dùng `ListView(children: ...)` cho danh sách dài.
- **`extentAfter`** là số pixel còn lại phía dưới vùng đang thấy.
- **`addPostFrameCallback`** xử lý trường hợp danh sách ngắn. Bỏ đoạn này thì test "5 dòng chưa lấp đầy màn hình" đỏ.
- **Bẫy vùng đệm (tìm ra khi đưa vào app thật):** `ListView.builder` chỉ dựng các dòng trong vùng nhìn thấy cộng một vùng đệm, mặc định 250 px. Vì vậy `extentAfter` không bao giờ lớn hơn khoảng 250 px cộng phần dòng dở dang. Nếu ngưỡng tải trước lớn hơn con số đó (ví dụ 400), điều kiện "gần cuối" luôn đúng, và app tải liên tục tới hết dữ liệu dù người dùng không cuộn. Cách sửa: đặt vùng đệm rõ ràng, lớn hơn ngưỡng. Test màn Từ điển bắt được lỗi này: bỏ vùng đệm thì nó tải đủ 34 trang thay vì dừng khi đầy màn hình.
- Muốn đưa vào app thật theo kiểu Riverpod: chuyển phần trạng thái sang một `Notifier`, màn hình chỉ `ref.watch` và gọi `loadMore()`.

### Các nền tảng khác

Các đoạn dưới đây là mẫu, chưa chạy thử trong repo. `loadMore()` phải có đủ 5 việc ở trên.

**Expo / React Native:** dùng `FlatList`.

```tsx
<FlatList
  data={users}
  keyExtractor={(u) => String(u.id)}
  renderItem={({ item }) => <UserRow user={item} />}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  ListFooterComponent={loading ? <ActivityIndicator /> : null}
/>
```

Dùng TanStack Query thì `useInfiniteQuery` đã lo sẵn phần chống tải chồng và biết khi nào hết.

**Android (Compose):** dùng `LazyColumn`.

```kotlin
val listState = rememberLazyListState()

LaunchedEffect(listState) {
    snapshotFlow {
        val info = listState.layoutInfo
        (info.visibleItemsInfo.lastOrNull()?.index ?: 0) >= info.totalItemsCount - 3
    }.distinctUntilChanged().filter { it }.collect { viewModel.loadMore() }
}

LazyColumn(state = listState) {
    items(users, key = { it.id }) { UserRow(it) }
}
```

Danh sách phức tạp thì dùng thư viện **Paging 3** của Android.

**iOS (SwiftUI):** tải khi dòng gần cuối xuất hiện.

```swift
List(users) { user in
    UserRow(user: user)
        .task {
            if user.id == users.suffix(3).first?.id { await viewModel.loadMore() }
        }
}
```

Dòng gần cuối xuất hiện ngay cả khi danh sách ngắn, nên cách này tự xử lý được việc thứ 5.

### `page` hay `cursor`?

Dùng `page` có một lỗi: nếu có user mới chen vào đầu danh sách trong lúc đang cuộn, mọi user bị đẩy xuống, và trang sau lặp lại user cuối của trang trước. Code Flutter ở trên lọc trùng bằng `_seenIds` để tránh hiện hai lần.

| | `page` + `limit` | `cursor` |
|---|---|---|
| Cách gọi | `?page=3&limit=20` | `?cursor=1234&limit=20` (lấy các dòng sau id 1234) |
| Nhảy tới trang bất kỳ | Được | Không |
| Dữ liệu đổi liên tục | Dễ trùng hoặc sót | Không trùng, không sót |
| Tốc độ ở trang rất sâu | Chậm dần | Ổn định |
| Hợp với | Danh sách ít đổi: user, từ vựng | Chat, feed |

Chat của project đang dùng `cursor`: xem `getHistory` trong `services/api-gateway/src/realtime/group-chat.service.ts`.

### Nên làm ở cả server

Server phải giới hạn `limit`, ví dụ tối đa 100. Nếu không, gọi `?limit=1000000` sẽ tải cả bảng và làm server chậm đi.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **9. Mobile** — bài 13/13.

- Bài trước: [security-owasp-mobile.md](./security-owasp-mobile.md) — Bảo mật mobile theo OWASP
- Xong nhóm này. **Nhóm tiếp: 10. Tích hợp: đăng nhập, mail, thanh toán** — bắt đầu bằng [keycloak-setup.md](./keycloak-setup.md) (Cài Keycloak (local/Docker))

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
