# Nền Tảng Android — Ôn Phỏng Vấn Qua Code Của `nihongo-android`

[learn-android-kotlin.md](./learn-android-kotlin.md) dạy Kotlin, Coroutines, Compose, kiến trúc. File này lấp phần còn thiếu: **hệ điều hành Android chạy app của bạn thế nào**. Đây là phần interviewer dùng để phân biệt người "viết được màn hình" với người "hiểu nền tảng".

Mỗi mục có ba phần:

- **Kiến thức:** điều cần nói được.
- **Trong repo:** đoạn code thật minh họa, để bạn trả lời bằng ví dụ của chính mình.
- **Câu hỏi hay gặp:** kèm ý trả lời.

Cuối file có [ba vấn đề thật trong app](#13-ba-vấn-đề-thật-trong-app--dùng-làm-câu-chuyện-phỏng-vấn) tìm được khi viết tài liệu này, kèm cách đã sửa và cách đã kiểm chứng. Kể được cách bạn phát hiện và sửa chúng là điểm cộng lớn.

## Mục lục

1. [Tiến trình và vòng đời của app](#1-tiến-trình-và-vòng-đời-của-app)
2. [Activity, Fragment và vòng đời UI](#2-activity-fragment-và-vòng-đời-ui)
3. [Context](#3-context)
4. [Intent, task và deep link](#4-intent-task-và-deep-link)
5. [Bốn thành phần của Android](#5-bốn-thành-phần-của-android)
6. [Việc chạy nền](#6-việc-chạy-nền)
7. [Quyền runtime](#7-quyền-runtime)
8. [Main thread và ANR](#8-main-thread-và-anr)
9. [Bộ nhớ và rò rỉ](#9-bộ-nhớ-và-rò-rỉ)
10. [Lưu trữ và bảo mật](#10-lưu-trữ-và-bảo-mật)
11. [Thay đổi theo từng phiên bản Android](#11-thay-đổi-theo-từng-phiên-bản-android)
12. [Gradle và build](#12-gradle-và-build)
13. [Ba vấn đề thật trong app](#13-ba-vấn-đề-thật-trong-app--dùng-làm-câu-chuyện-phỏng-vấn)
14. [Bộ câu hỏi tự kiểm tra](#14-bộ-câu-hỏi-tự-kiểm-tra)

---

## 1. Tiến trình và vòng đời của app

### Kiến thức

Mỗi app chạy trong **một tiến trình Linux riêng**, với một user id riêng. Hệ thống có thể **giết tiến trình bất cứ lúc nào** khi app chạy nền và máy cần bộ nhớ. App không được báo trước, không có callback nào chạy.

Thứ tự ưu tiên giữ lại, từ cao xuống thấp:

1. **Foreground:** Activity đang hiện, hoặc foreground service.
2. **Visible:** đang thấy nhưng không tương tác, ví dụ bị một hộp thoại che.
3. **Service:** started service đang chạy.
4. **Cached:** app ở nền. Đây là nhóm bị giết đầu tiên.

Có ba tình huống khác nhau mà nhiều người nhầm thành một:

| Tình huống | Activity | ViewModel | `SavedStateHandle` / `rememberSaveable` | Room / DataStore |
|---|---|---|---|---|
| **Xoay màn hình** (configuration change) | Hủy và tạo lại | **Còn** | Còn | Còn |
| **Process death** (hệ thống giết app ở nền) | Tạo lại khi quay về | **Mất** | **Còn** (lưu qua Bundle) | Còn |
| **Người dùng tự vuốt tắt** từ màn đa nhiệm | Mất | Mất | **Mất** | Còn |

Rút ra:
- **ViewModel không đủ** để giữ thứ người dùng đang làm dở: nó sống qua lần xoay màn hình, nhưng không sống qua process death.
- **`SavedStateHandle`** chỉ hợp với dữ liệu nhỏ (giới hạn khoảng 500 KB cho cả Bundle) và mất khi người dùng tự tắt app.
- **Dữ liệu không được mất** phải ghi vào Room/DataStore ngay khi người dùng thao tác.

### Trong repo

Bài thi thử có đếm giờ dùng cả ba lớp ([learn-android-features.md](./learn-android-features.md) mục 5):

- **Đáp án đã chọn:** ghi vào Room ngay khi bấm, nên sống qua cả ba tình huống.
- **Câu đang xem:** `SavedStateHandle`, sống qua process death.
- **Thời điểm hết giờ:** lưu mốc tuyệt đối `endsAt` vào Room, không lưu "còn bao nhiêu giây". Nhờ vậy, mở lại sau 10 phút thì đồng hồ đã chạy đúng 10 phút.

### Cách tự thử process death

```bash
# 1. Mở app, vào bài thi, chọn vài đáp án
# 2. Bấm Home để app xuống nền (lệnh dưới chỉ giết được app đang ở NỀN)
adb shell am kill com.edu.nihongo
# 3. Mở lại app từ màn đa nhiệm → phải quay đúng câu đang làm, đúng giờ còn lại
```

Tùy chọn "Don't keep activities" trong Developer options chỉ hủy Activity, **không** giết tiến trình. Đó là thử nghiệm khác, đừng nhầm hai cái.

### Câu hỏi hay gặp

**ViewModel sống qua xoay màn hình bằng cách nào?**
`ComponentActivity` giữ một `ViewModelStore` qua `onRetainNonConfigurationInstance`. Khi Activity được tạo lại do đổi cấu hình, store cũ được trao cho Activity mới. `onCleared()` chỉ chạy khi Activity kết thúc thật (`isFinishing`), không chạy khi xoay màn hình.

**Lưu trạng thái form đang nhập dở ở đâu?**
Phụ thuộc mức độ quan trọng. Nhỏ và chấp nhận mất khi người dùng tự tắt: `SavedStateHandle` hoặc `rememberSaveable`. Không được mất (bài thi, tin nhắn đang soạn dài): ghi nháp vào Room hoặc DataStore.

---

## 2. Activity, Fragment và vòng đời UI

### Kiến thức

Vòng đời Activity:

```
onCreate → onStart → onResume  (đang tương tác)
                     onPause   (bị che một phần, hộp thoại hệ thống, đa cửa sổ)
           onStop              (không còn thấy)
onDestroy                      (kết thúc, hoặc tạo lại do đổi cấu hình)
```

- **`onPause` phải nhanh.** Activity tiếp theo chưa `onResume` được cho tới khi `onPause` của Activity hiện tại chạy xong.
- **Dừng việc tốn tài nguyên (camera, cảm biến, animation) ở `onStop`** (hoặc `onPause` nếu cần trả tài nguyên ngay); khởi động lại ở `onStart`.
- **Không có gì bảo đảm `onDestroy` được gọi.** Process death xảy ra mà không có callback nào. Đừng đặt việc lưu dữ liệu quan trọng ở đó.

**Fragment** có hai vòng đời: của Fragment, và của **view** bên trong nó. Fragment nằm trong back stack thì view bị hủy (`onDestroyView`) nhưng Fragment vẫn sống. Vì thế khi collect Flow trong Fragment phải dùng `viewLifecycleOwner`, không dùng `this`; nếu không, mỗi lần quay lại sẽ đăng ký thêm một collector.

**Thu dữ liệu theo vòng đời:**

```kotlin
// Compose: dừng thu khi app xuống nền (lifecycle dưới STARTED)
val state by viewModel.uiState.collectAsStateWithLifecycle()

// View/Fragment
viewLifecycleOwner.lifecycleScope.launch {
    viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.uiState.collect { render(it) }
    }
}
```

`lifecycleScope.launch { flow.collect {} }` (không có `repeatOnLifecycle`) vẫn **tiếp tục thu khi app ở nền**: tốn pin, và có thể cập nhật UI không còn hiển thị.

### Trong repo

App dùng **một Activity duy nhất**: [MainActivity.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/MainActivity.kt) chỉ gọi `enableEdgeToEdge()` và `setContent { NihongoApp() }`. Mọi màn hình là composable, điều hướng bằng Navigation Compose. Không có Fragment.

**Lợi ích của single-activity:**
- một chỗ xử lý deep link;
- chia sẻ ViewModel giữa các màn dễ;
- chuyển màn không phải tạo Activity mới.

**Cái giá phải trả:** mọi thứ phụ thuộc vào cách tổ chức navigation graph.

### Câu hỏi hay gặp

**Chuyển từ Activity A sang B: thứ tự callback?**
`A.onPause` → `B.onCreate` → `B.onStart` → `B.onResume` → `A.onStop`. A chỉ `onStop` sau khi B đã hiện, vì nếu B trong suốt thì A vẫn còn được thấy.

**`onSaveInstanceState` được gọi khi nào?**
Khi Activity có thể bị hủy rồi tạo lại: xoay màn hình, hoặc xuống nền (để phòng process death). Không gọi khi người dùng bấm Back để thoát hẳn.

---

## 3. Context

### Kiến thức

`Context` là cửa để truy cập tài nguyên và dịch vụ hệ thống. Có hai loại hay dùng:

| | Sống bao lâu | Dùng cho |
|---|---|---|
| `Application` context | Bằng cả tiến trình | Singleton, repository, `getSystemService`, WorkManager, DataStore |
| `Activity` context | Bằng Activity | Mọi thứ liên quan UI: theme, inflate view, hộp thoại, `startActivity` không cần cờ `NEW_TASK` |

Lỗi kinh điển: một object sống lâu (singleton, biến `static`, callback đăng ký với hệ thống) giữ tham chiếu tới **Activity** context. Activity bị hủy rồi mà vẫn không được thu hồi, kéo theo cả cây view: rò rỉ bộ nhớ.

### Trong repo

Mọi singleton đều nhận `@ApplicationContext` qua Hilt, ví dụ [NetworkMonitor.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/data/NetworkMonitor.kt):

```kotlin
@Singleton
class NetworkMonitor @Inject constructor(
    @ApplicationContext context: Context,   // KHÔNG phải Activity
) : NetworkStatus {
    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
```

Hilt bắt buộc ghi rõ `@ApplicationContext` hoặc `@ActivityContext`, nên khó vô tình tiêm nhầm Activity vào singleton.

### Câu hỏi hay gặp

**Vì sao không nên hiện hộp thoại bằng Application context?**
Nó không mang theme của Activity và không có cửa sổ (window token) để gắn vào. Kết quả là crash `BadTokenException`, hoặc hộp thoại sai giao diện.

---

## 4. Intent, task và deep link

### Kiến thức

- **Intent tường minh (explicit):** chỉ đích danh class cần mở, ví dụ `Intent(context, MainActivity::class.java)`.
- **Intent ngầm (implicit):** chỉ mô tả hành động (`ACTION_VIEW` + URI); hệ thống tìm component có `intent-filter` khớp.
- **`android:exported`:** component có `intent-filter` mà target Android 12 trở lên thì **bắt buộc** khai báo. `true` nghĩa là app khác mở được. Đây là chỗ cần cân nhắc về bảo mật.
- **Task và back stack:** `launchMode` (`standard`, `singleTop`, `singleTask`, `singleInstance`) và các cờ (`FLAG_ACTIVITY_NEW_TASK`, `CLEAR_TOP`, `CLEAR_TASK`) quyết định có tạo Activity mới không, và nút Back quay về đâu.
- **PendingIntent:** "giấy ủy quyền" để hệ thống (thông báo, widget, AlarmManager) mở app thay bạn. Từ Android 12 **bắt buộc** khai báo `FLAG_IMMUTABLE` hoặc `FLAG_MUTABLE`. Mặc định nên dùng `IMMUTABLE`, để app khác không sửa được Intent bên trong.
- **Deep link tự đặt scheme (`nihongo://`)** khác **App Links (`https://` đã xác minh domain)**. Custom scheme thì app nào cũng khai báo trùng được. App Links cần file `assetlinks.json` trên domain, mở thẳng vào app không qua hộp thoại chọn, và không bị app khác giả mạo.

### Trong repo

Thông báo nhắc ôn và widget cùng mở `nihongo://srs`:

```xml
<!-- AndroidManifest.xml -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="nihongo" android:host="srs" />
</intent-filter>
```

```kotlin
// ReminderNotifier.kt
val intent = Intent(Intent.ACTION_VIEW, Uri.parse(SRS_DEEP_LINK), context, MainActivity::class.java)
    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
val pending = PendingIntent.getActivity(context, 0, intent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
```

```kotlin
// NihongoApp.kt: Navigation Compose tự đọc Intent và mở đúng màn
composable(Routes.SRS, deepLinks = listOf(navDeepLink { uriPattern = SRS_DEEP_LINK })) { ... }
```

Đáng để thảo luận khi phỏng vấn: `CLEAR_TASK` xóa back stack hiện có. Bấm thông báo khi đang ở màn đọc hiểu thì vào thẳng SRS, nhưng bấm Back thì thoát app chứ không quay lại màn đọc hiểu. Đó là một lựa chọn có chủ ý. Cách khác là `TaskStackBuilder`, dựng sẵn back stack Home → SRS.

### Câu hỏi hay gặp

**Bấm thông báo khi app đang mở: Activity mới hay cũ?**
Với `launchMode="standard"` và không có cờ nào, hệ thống tạo **Activity mới** chồng lên trên. Muốn dùng lại Activity đang có thì dùng `singleTop` (hoặc cờ `CLEAR_TOP|SINGLE_TOP`) và xử lý Intent mới trong `onNewIntent`.

---

## 5. Bốn thành phần của Android

| Thành phần | Dùng khi | Ghi chú |
|---|---|---|
| **Activity** | Màn hình người dùng tương tác | Trong repo: chỉ có một, `MainActivity` |
| **Service** | Việc chạy dài, không có UI | Started, bound, hoặc **foreground** (có thông báo đang chạy) |
| **BroadcastReceiver** | Nhận sự kiện hệ thống hoặc của app | `onReceive` phải xong nhanh (trong khoảng 10 giây) |
| **ContentProvider** | Chia sẻ dữ liệu có cấu trúc giữa các app | Được khởi tạo **trước** `Application.onCreate` |

### Service

- **Started service:** từ Android 8, app ở nền không được `startService`, phải dùng foreground service hoặc WorkManager.
- **Foreground service:** bắt buộc hiện một thông báo. Từ Android 14 phải khai báo **loại** (`camera`, `microphone`, `mediaPlayback`, `dataSync`, `location`…), kèm quyền tương ứng (`FOREGROUND_SERVICE_MICROPHONE`…).
- **Bound service:** client giữ kết nối qua `bindService`; service sống khi còn client kết nối.

### BroadcastReceiver

- Có hai cách đăng ký: **trong manifest**, hoặc **lúc chạy** (`registerReceiver`, phải gỡ đăng ký đúng chỗ).
- Từ Android 8, receiver khai báo trong manifest **không nhận được phần lớn broadcast ngầm** (implicit broadcast) nữa. Ví dụ `CONNECTIVITY_ACTION` không còn tới; phải dùng `ConnectivityManager.registerNetworkCallback` như `NetworkMonitor` của app này.
- Trong repo, widget là một receiver: `DueCardsWidgetReceiver` nhận `APPWIDGET_UPDATE`.

### ContentProvider và `androidx.startup`

Thư viện hay dùng một ContentProvider rỗng để tự khởi tạo, vì provider chạy trước `Application.onCreate`. Nhiều thư viện như vậy làm chậm lần mở app đầu tiên. `androidx.startup` gom tất cả về **một** provider duy nhất.

Trong repo, manifest **gỡ** bộ khởi tạo mặc định của WorkManager:

```xml
<provider android:name="androidx.startup.InitializationProvider" tools:node="merge">
    <meta-data android:name="androidx.work.WorkManagerInitializer"
               android:value="androidx.startup" tools:node="remove" />
</provider>
```

Lý do: bộ khởi tạo mặc định tạo WorkManager **trước** khi Hilt sẵn sàng, nên Worker không nhận được dependency. `EduApp` tự cấu hình bằng `Configuration.Provider` cùng `HiltWorkerFactory` ([EduApp.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/EduApp.kt)). Thiếu dòng `tools:node="remove"` thì Worker crash vì không có constructor mặc định.

---

## 6. Việc chạy nền

### Chọn công cụ

| Việc | Dùng | Vì sao |
|---|---|---|
| Gọi API khi người dùng đang ở màn hình | Coroutine trong `viewModelScope` | Tự hủy khi rời màn |
| Phải chạy xong kể cả khi app đóng, chờ được (sync, upload log) | **WorkManager** | Chạy lại sau khi khởi động máy, có điều kiện (mạng, sạc), có backoff |
| Người dùng đang thấy, không được ngắt (gọi video, phát nhạc, chỉ đường) | **Foreground service** | Hệ thống gần như không giết; có thông báo đang chạy |
| Đúng giờ tuyệt đối (báo thức, lịch) | `AlarmManager.setExact…` | Từ Android 12 cần quyền `SCHEDULE_EXACT_ALARM` |
| Server muốn đánh thức app | Push (FCM) | Không phải giữ kết nối chạy nền |

### Doze và App Standby

- **Doze:** máy nằm yên, màn hình tắt một lúc. Hệ thống gom job, chặn mạng, hoãn alarm thường; thỉnh thoảng mở "cửa sổ bảo trì" ngắn để các việc chờ chạy.
- **App Standby Buckets:** app càng ít được mở, việc nền càng bị giới hạn chặt.
- **Hệ quả thực tế:** WorkManager **không chạy đúng giờ**. Việc định kỳ có chu kỳ tối thiểu **15 phút**, và có thể bị trễ nhiều hơn.

### Trong repo

[ReviewSyncWorker.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/data/sync/ReviewSyncWorker.kt):

```kotlin
val request = OneTimeWorkRequestBuilder<ReviewSyncWorker>()
    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
    .build()
WorkManager.getInstance(context)
    .enqueueUniqueWork("srs-review-sync", ExistingWorkPolicy.KEEP, request)
```

Bốn chi tiết đáng nói khi phỏng vấn:

- **`enqueueUniqueWork` kèm `KEEP`:** chấm 10 thẻ thì gọi lên lịch 10 lần, nhưng chỉ có **một** lượt chờ. Lượt đó đọc hàng đợi lúc chạy, nên gửi luôn mọi thứ.
- **Điều kiện `CONNECTED`:** đang offline thì việc ở yên trong hàng đợi, có mạng là tự chạy.
- **`Result.retry()` với backoff tăng dần,** dừng sau 8 lần thử.
- **Nhắc ôn 20:00 dùng WorkManager,** chấp nhận trễ vài phút; nhắc học không cần đúng tới từng giây như báo thức. App iOS làm khác hẳn: hẹn sẵn một thông báo cục bộ, vì iOS không cho app tự chạy code đúng giờ.

### Câu hỏi hay gặp

**Coroutine trong `GlobalScope` khác WorkManager thế nào?**
Coroutine chết cùng tiến trình. Bị hệ thống giết hay khởi động lại máy là mất việc. WorkManager lưu việc vào database riêng của nó và chạy lại khi có cơ hội.

---

## 7. Quyền runtime

### Kiến thức

Quyền "nguy hiểm" (camera, micro, vị trí, thông báo từ Android 13…) phải được xin **lúc chạy**:

1. Kiểm tra trạng thái quyền.
2. Nếu `shouldShowRequestPermissionRationale` là `true`, giải thích vì sao cần quyền, rồi mới xin.
3. Xin quyền bằng `ActivityResultContracts.RequestPermission`.
4. Người dùng từ chối **hai lần** thì hệ thống không hiện hộp thoại nữa. Lúc đó chỉ còn cách dẫn người dùng tới màn Settings của app.

**Nguyên tắc:** xin quyền **đúng lúc cần** (bấm nút camera mới xin camera), không xin dồn lúc mở app.

### Trong repo

[HomeScreen.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/presentation/home/HomeScreen.kt), quyền thông báo:

```kotlin
@Composable
private fun NotificationPermissionCard() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return  // < Android 13: không cần xin
    val permission = rememberPermissionState(Manifest.permission.POST_NOTIFICATIONS)
    if (permission.status.isGranted) return
    NavCard(title = "Bật nhắc ôn tập", subtitle = "Mỗi tối 20:00 nhắc khi có thẻ SRS đến hạn",
            onClick = { permission.launchPermissionRequest() })
}
```

App hiện một thẻ giải thích lợi ích trên Home thay vì bật hộp thoại xin quyền ngay khi mở. Cách này cho tỷ lệ đồng ý cao hơn, và không phí mất một trong hai lần được hỏi.

---

## 8. Main thread và ANR

### Kiến thức

- **Main thread** vẽ UI và xử lý chạm. Máy 60 Hz có khoảng **16 ms** cho mỗi khung hình; quá thời gian đó là giật.
- **ANR (Application Not Responding)** xảy ra khi main thread bị chặn: không phản hồi thao tác trong khoảng **5 giây**, hoặc `BroadcastReceiver.onReceive` chạy quá lâu (khoảng 10 giây).
- **Nguyên nhân hay gặp:**
  - I/O trên main thread (đọc file, query DB, gọi mạng);
  - `runBlocking` trên main;
  - lock bị giữ bởi luồng khác;
  - parse JSON lớn;
  - phải chờ kết quả từ một Binder call lâu.
- **Công cụ:**
  - `StrictMode` khi dev: báo lỗi khi làm I/O trên main thread;
  - Android Vitals trên Play Console: tỷ lệ ANR thật của người dùng;
  - file `traces.txt` hoặc Perfetto để xem main thread đang bị chặn ở đâu.

### Trong repo

[learn-android-kotlin.md](./learn-android-kotlin.md) mục 19 phân tích `runBlocking` trong OkHttp interceptor. Điều đó chấp nhận được **chỉ vì** interceptor chạy trên luồng của OkHttp, không phải main thread. Nếu ai đó gọi `execute()` đồng bộ trên main thread thì interceptor đó trở thành nguồn gây ANR.

Room mặc định **ném lỗi** nếu query trên main thread. Đó là một hàng rào tốt; đừng tắt nó bằng `allowMainThreadQueries()`.

---

## 9. Bộ nhớ và rò rỉ

### Kiến thức

**Năm kiểu rò rỉ hay gặp:**

1. **Object sống lâu giữ Activity, View hoặc Fragment:** biến `static`, singleton, companion object.
2. **Listener hoặc callback đăng ký với hệ thống mà không gỡ:** sensor, `ConnectivityManager`, `BroadcastReceiver`.
3. **Coroutine hay thread sống lâu hơn màn hình:** `GlobalScope`, scope tự tạo mà không hủy.
4. **Handler hoặc Runnable trì hoãn** (`postDelayed`) giữ tham chiếu tới Activity.
5. **Fragment giữ binding của view** sau `onDestroyView`.

**Cách tìm:** LeakCanary (thêm dependency cho bản debug; nó tự báo khi phát hiện object bị giữ), hoặc Memory Profiler để chụp heap dump.

**Bitmap:** ảnh lớn là nguyên nhân OOM phổ biến nhất. Nên giải mã ở kích thước hiển thị (Coil/Glide tự làm), không giải mã nguyên ảnh 12 MP để hiện một ô 100 dp.

### Trong repo

`NetworkMonitor` gỡ callback đúng chỗ nhờ `callbackFlow` cùng `awaitClose`:

```kotlin
override val isOnlineFlow: Flow<Boolean> = callbackFlow {
    val callback = object : ConnectivityManager.NetworkCallback() { /* trySend(...) */ }
    connectivityManager.registerDefaultNetworkCallback(callback)
    awaitClose { connectivityManager.unregisterNetworkCallback(callback) }  // collector hủy → tự gỡ
}
```

Không có `awaitClose` thì callback ở lại mãi trong hệ thống, giữ cả object bên trong. Chi tiết ở [learn-android-kotlin.md](./learn-android-kotlin.md) mục 17.

---

## 10. Lưu trữ và bảo mật

### Chọn chỗ lưu

| Dữ liệu | Dùng | Ghi chú |
|---|---|---|
| Cài đặt nhỏ dạng key-value | DataStore Preferences | Thay SharedPreferences: bất đồng bộ, không chặn main thread |
| Dữ liệu có cấu trúc, cần query | Room | Có migration, có Flow |
| File | `filesDir` (riêng của app) / `cacheDir` (hệ thống được xóa) | Từ Android 10 có scoped storage cho bộ nhớ ngoài |
| **Bí mật** (token, khóa) | Mã hóa bằng khóa trong **Android Keystore** | Khóa không ra khỏi phần cứng bảo mật; không lưu dạng thường |

### Những điểm hay bị hỏi

- **Sao lưu tự động (Auto Backup, Android 6+):** với `android:allowBackup="true"`, hệ thống sao lưu file của app (kể cả DataStore, SharedPreferences, database) lên Google Drive, rồi khôi phục khi cài lại hoặc chuyển sang máy mới. Token mà nằm trong đó thì cũng được sao lưu và khôi phục. Kiểm soát bằng `dataExtractionRules` (Android 12+) và `fullBackupContent`.
- **Network Security Config:** từ Android 9, khi target 28 trở lên, HTTP thường (cleartext) bị chặn mặc định. Chỉ nên mở cho đúng địa chỉ dev (`10.0.2.2`, `localhost`), và chỉ trong bản debug.
- **Component `exported`:** Activity hay receiver `exported="true"` thì app khác gọi được. Phải kiểm tra dữ liệu nhận qua Intent, không được tin.
- **Không nhúng secret vào APK.** Giải nén APK (`apktool`, `jadx`) là đọc được `BuildConfig`. Repo từng có key Gemini trong `BuildConfig`, giờ đã chuyển về gateway. Đây là câu chuyện tốt để kể.
- **R8 không phải là bảo mật.** Rút gọn và đổi tên code chỉ làm khó đọc hơn; chuỗi hằng vẫn đọc được.

Đọc thêm: [security-owasp-mobile.md](./security-owasp-mobile.md).

---

## 11. Thay đổi theo từng phiên bản Android

Interviewer hay hỏi "bản Android X thay đổi gì ảnh hưởng tới app?". Bảng tóm tắt, chỉ giữ những thay đổi có tác động thực tế:

| Phiên bản | API | Thay đổi đáng nhớ |
|---|---|---|
| 6 | 23 | Quyền runtime; Doze; Auto Backup |
| 7 | 24 | Network Security Config; đa cửa sổ |
| 8 | 26 | Giới hạn chạy nền (cấm `startService` khi ở nền); **notification channel** bắt buộc; manifest receiver không nhận broadcast ngầm |
| 9 | 28 | **Cleartext HTTP tắt mặc định** |
| 10 | 29 | Scoped storage; quyền vị trí chạy nền tách riêng; cử chỉ điều hướng |
| 11 | 30 | Package visibility (cần `<queries>` để thấy app khác); quyền chỉ cấp một lần |
| 12 | 31 | **`exported` bắt buộc**; **PendingIntent phải khai báo mutability**; quyền báo thức chính xác; splash screen API |
| 13 | 33 | **Quyền thông báo `POST_NOTIFICATIONS`**; chọn ngôn ngữ riêng cho từng app; quyền ảnh/video chi tiết |
| 14 | 34 | **Foreground service phải khai báo loại**; báo thức chính xác bị từ chối mặc định với cài đặt mới; giới hạn chặt hơn việc mở Activity từ nền |
| 15 | 35 | **Edge-to-edge bắt buộc** khi target 35 |

Repo đang target 35 và gọi `enableEdgeToEdge()` trong `MainActivity`. Nghĩa là UI phải tự chừa chỗ cho thanh trạng thái và thanh điều hướng (`WindowInsets`), nếu không nội dung sẽ nằm đè dưới chúng.

---

## 12. Gradle và build

### Ba con số SDK

- **`minSdk` (24 trong repo):** máy thấp nhất cài được app.
- **`compileSdk` (35):** bộ API dùng để biên dịch; cho phép gọi API mới (bọc trong kiểm tra `Build.VERSION.SDK_INT`).
- **`targetSdk` (35):** "app đã được kiểm tra với hành vi của phiên bản này". Tăng `targetSdk` là **bật** các thay đổi hành vi trong bảng mục 11. Google Play buộc tăng dần theo từng năm.

### Gradle wrapper và sự tương thích

- **`gradle/wrapper/gradle-wrapper.properties`** ghim phiên bản Gradle cho cả nhóm và CI: ai chạy `./gradlew` cũng dùng đúng một phiên bản, không phụ thuộc Gradle cài trên máy.
- **Phải khớp bốn thứ:** phiên bản **Gradle**, **Android Gradle Plugin (AGP)**, **Kotlin** và **JDK** phải tương thích với nhau. Repo từng gặp lỗi build vì máy dùng JDK 25 trong khi AGP 8.7 và Kotlin 2.0 cần JDK 17 ([learn-android-kotlin.md](./learn-android-kotlin.md) Phần 0). CI ghim `java-version: '17'` vì lý do này.
- **Build type** (`debug` / `release`) khác **product flavor** (`free` / `pro`, `staging` / `prod`). Kết hợp hai thứ thành **build variant**, ví dụ `stagingRelease`.
- **Version catalog** (`libs.versions.toml`) giữ phiên bản thư viện ở một chỗ.
- **Release:** bật R8 (`isMinifyEnabled`), ký bằng keystore riêng của release, phát hành dạng App Bundle (`.aab`). Play tự cắt APK theo từng máy.

---

## 13. Ba vấn đề thật trong app — dùng làm câu chuyện phỏng vấn

Ba vấn đề này được tìm ra khi viết tài liệu, và **đã sửa** kèm test. Phần "Bản cũ" giữ lại để bạn kể được trước và sau. Test nằm ở `app/src/androidTest/.../platform/PlatformHardeningTest.kt` (chạy trên emulator) và `app/src/test/.../data/local/TokenCodecTest.kt` (JVM).

### Vấn đề 1: Refresh token đi theo bản sao lưu

```xml
<!-- AndroidManifest.xml -->
<application android:allowBackup="true" ...>
```

```kotlin
// TokenStore.kt: lưu dạng thường trong DataStore "auth"
private val refreshCookieKey = stringPreferencesKey("refresh_cookie")
override suspend fun saveRefreshCookie(raw: String) {
    context.tokenDataStore.edit { it[refreshCookieKey] = raw }
}
```

- **Hậu quả:** Auto Backup sao lưu file DataStore lên Google Drive. Khi cài app trên máy khác bằng cùng tài khoản Google, refresh token cũ được khôi phục: người dùng tự động "đăng nhập" trên máy mới, và token còn tồn tại ở một nơi ngoài máy.
- **Đã sửa:**
  1. `res/xml/data_extraction_rules.xml` (Android 12+) và `res/xml/backup_rules.xml` (bản cũ hơn) loại file `datastore/auth.preferences_pb` khỏi cả sao lưu đám mây lẫn chuyển máy. Tiến độ học vẫn được sao lưu.
  2. `TokenCipher.kt`: token được mã hóa AES-256-GCM bằng khóa trong Android Keystore trước khi ghi, theo định dạng `v1:` + base64(IV ‖ ciphertext). File có bị chép đi, máy khác cũng không giải mã được, vì khóa không rời khỏi phần cứng.
  3. **Chuyển đổi từ bản cũ:** giá trị không có tiền tố `v1:` là token dạng thường của bản cũ. App vẫn dùng được (người dùng không bị đăng xuất) và ghi lại ngay dạng mã hóa. Không giải mã được (khóa mất) thì xóa, coi như chưa đăng nhập.
  4. Interceptor đọc token ở mỗi request, nên token đã giải mã được giữ trong RAM, tránh gọi Keystore liên tục.
- **Đã kiểm chứng:** chạy sao lưu thật bằng `adb shell bmgr backupnow` với transport cục bộ trên emulator Android 15. File token không có trong bản sao lưu, file DataStore khác vẫn có. Test trên emulator còn đọc thẳng file trên đĩa để chắc không còn token dạng thường.

### Vấn đề 2: Cho phép HTTP với mọi domain

```xml
<!-- res/xml/network_security_config.xml -->
<base-config cleartextTrafficPermitted="true" />   <!-- MỌI domain, kể cả trên bản release -->
<domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">10.0.2.2</domain> ...
</domain-config>
```

`AndroidManifest.xml` còn đặt thêm `android:usesCleartextTraffic="true"`.

- **Hậu quả:** khối `domain-config` mở cho các địa chỉ local là đủ dùng khi dev. Nhưng `base-config` lại mở HTTP cho **mọi** domain, và cấu hình này nằm cả trong bản release. Nếu có URL nào vô tình dùng `http://`, token sẽ đi trên đường truyền không mã hóa.
- **Đã sửa:** `base-config cleartextTrafficPermitted="false"`, chỉ chừa `10.0.2.2`, `localhost`, `127.0.0.1`; bỏ `usesCleartextTraffic` khỏi manifest (từ API 24, tức `minSdk` của app, file cấu hình mạng được ưu tiên hơn).
- **Vì sao chưa chuyển hẳn sang `src/debug/`:** bản release hiện vẫn dùng URL `http://10.0.2.2:8080` và được cài lên emulator để kiểm tra R8. Khi có URL production (`https://`), hãy chuyển khối `domain-config` sang `src/debug/res/xml/network_security_config.xml` để bản release chặn HTTP hoàn toàn.
- **Đã kiểm chứng:** test trên emulator gọi `NetworkSecurityPolicy.isCleartextTrafficPermitted`: `example.com` bị chặn, `10.0.2.2` được phép.

### Vấn đề 3: Gọi video không có foreground service

Màn LiveKit (`LiveHostScreen`) xin quyền camera và micro, nhưng app không có foreground service nào.

- **Hậu quả:** người dùng đang gọi mà bấm Home, app xuống nền. Từ Android 14, app ở nền không còn quyền dùng micro/camera nếu không chạy foreground service loại `camera`/`microphone`: cuộc gọi bị mất tiếng hoặc mất hình, và tiến trình có thể bị giết.
- **Đã sửa:** `data/live/LiveCallService.kt` là foreground service loại `camera|microphone`, có thông báo "Đang phát live" (channel mức thấp, không kêu). Manifest khai báo `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CAMERA`, `FOREGROUND_SERVICE_MICROPHONE`.
- **Thứ tự quan trọng:** Android 14 ném `SecurityException` nếu khởi động service loại camera/micro khi **chưa có quyền**; Android 12+ ném lỗi nếu khởi động khi app **đã ở nền**. Vì vậy `LiveCallKeeper.start()` kiểm tra quyền trước, và chỉ được gọi khi người dùng đang ở màn live.
- **Sửa thêm một lỗi cũ trong cùng màn:** `LiveHostViewModel` bật camera/micro ngay sau khi kết nối, kể cả khi người dùng chưa kịp cấp quyền. Lỗi bị bắt chung thành "Không phát live được", và cấp quyền xong cũng không bật lại. Giờ màn hình báo trạng thái quyền cho ViewModel, và camera/micro (cùng service) chỉ bật khi vừa kết nối xong, vừa đã có quyền.
- **Đã kiểm chứng:** test trên emulator bật service rồi kiểm tra thông báo đang chạy xuất hiện, tắt service rồi kiểm tra thông báo biến mất.

### Cách kể theo STAR

- **Situation:** app học tiếng Nhật, có đăng nhập, sync dữ liệu và gọi video.
- **Task:** tự soát nền tảng trước khi phát hành.
- **Action:** đối chiếu manifest và cách lưu dữ liệu với các thay đổi của Android 6, 9 và 14; tìm thấy ba vấn đề trên; sửa và viết test cho từng cái, kể cả chạy một lần sao lưu thật để chứng minh token không còn nằm trong đó.
- **Result:** token không còn rời khỏi máy; bản release chỉ dùng HTTPS; cuộc gọi không bị ngắt khi app xuống nền.

---

## 14. Bộ câu hỏi tự kiểm tra

Tự trả lời thành tiếng trước, rồi mới đối chiếu với mục được ghi trong ngoặc.

1. Xoay màn hình, process death và người dùng tự tắt app: mỗi trường hợp mất dữ liệu gì? (mục 1)
2. ViewModel sống qua xoay màn hình bằng cách nào? `onCleared` gọi khi nào? (mục 1)
3. Cách tự tái hiện process death trên máy thật? (mục 1)
4. Vì sao collect Flow trong Fragment phải dùng `viewLifecycleOwner`? (mục 2)
5. `lifecycleScope.launch { collect }` khác `repeatOnLifecycle(STARTED)` thế nào? (mục 2)
6. Khi nào dùng Application context, khi nào dùng Activity context? Rò rỉ xảy ra thế nào? (mục 3)
7. `FLAG_IMMUTABLE` của PendingIntent để làm gì? Vì sao Android 12 bắt buộc? (mục 4)
8. Custom scheme khác App Links thế nào? Cái nào an toàn hơn, vì sao? (mục 4)
9. Bấm thông báo khi app đang mở thì có tạo Activity mới không? Làm sao để dùng lại Activity cũ? (mục 4)
10. Vì sao repo gỡ bộ khởi tạo mặc định của WorkManager? (mục 5)
11. Từ Android 8, vì sao manifest receiver không nhận `CONNECTIVITY_ACTION`? Thay bằng gì? (mục 5)
12. Chọn coroutine, WorkManager, foreground service hay AlarmManager cho từng tình huống: sync nền, gọi video, báo thức 6:00? (mục 6)
13. Doze ảnh hưởng tới WorkManager thế nào? Vì sao không thể chạy việc định kỳ mỗi 1 phút? (mục 6)
14. Người dùng từ chối quyền hai lần thì sao? Xử lý thế nào trong UI? (mục 7)
15. ANR là gì, ngưỡng bao lâu, tìm nguyên nhân bằng gì? (mục 8)
16. Kể năm kiểu rò rỉ bộ nhớ, và cách `callbackFlow` cùng `awaitClose` tránh một kiểu trong đó. (mục 9)
17. Lưu token ở đâu? Liên quan gì tới `allowBackup`? (mục 10, 13)
18. Tăng `targetSdk` từ 33 lên 35 cần kiểm tra những gì? (mục 11)
19. `minSdk`, `compileSdk`, `targetSdk` khác nhau thế nào? (mục 12)
20. Gradle wrapper giải quyết vấn đề gì? Vì sao build lỗi khi đổi JDK? (mục 12)
21. Kể một vấn đề nền tảng bạn đã tìm và sửa trong app của mình. (mục 13)
