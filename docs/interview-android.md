# Phỏng vấn Android: câu hỏi và đáp án theo code `nihongo-android`

> **Dùng khi nào:** sau khi học xong lộ trình Android 4 bài (và bài nâng cao [framework](./learn-android-framework.md)) ([kotlin](./learn-android-kotlin.md) → [kiến trúc](./learn-android-architecture.md) → [nền tảng](./learn-android-fundamentals.md) → [tính năng](./learn-android-features.md)), để ôn lại và luyện trả lời bằng ví dụ của chính app.
> **Cách dùng:** tự trả lời thành tiếng trước, rồi mới đọc đáp án. Mỗi đáp án dẫn về mục có giải thích và code thật.

Câu hỏi mobile chung (Flutter, kiến trúc, hiệu năng): [interview-mobile.md](./interview-mobile.md). Câu hỏi Android lẫn backend: [interview-backend-android-rn-swift.md](./interview-backend-android-rn-swift.md).

## Kotlin, coroutine, Compose và kiến trúc

Từ bài 1 và bài 2.

**1. Kể vòng đời một lần bấm, từ UI tới DB và quay lại.**
[learn-android-kotlin.md](./learn-android-kotlin.md) mục 3. Ý chính: UI chỉ đọc Room; mạng chỉ ghi vào Room; Room phát Flow mới làm UI cập nhật.

**2. StateFlow khác SharedFlow khác Channel?**
StateFlow luôn có giá trị, bỏ qua giá trị trùng, dùng cho state. SharedFlow phát cho nhiều người, cấu hình được replay và buffer. Channel: mỗi phần tử chỉ một người nhận, có buffer, hợp cho event một lần. Kể L7, L8: bản cũ dùng lambda và `MutableSharedFlow()` không buffer, cả hai đều mất hoặc gọi sai sự kiện khi xoay màn hình; đã đổi sang `Channel.BUFFERED` + `receiveAsFlow()`.

**3. `WhileSubscribed(5_000)` để làm gì?**
Sống qua lúc xoay màn hình mà không khởi động lại Flow gốc; vào nền quá 5 giây thì dừng để tiết kiệm pin ([learn-android-kotlin.md](./learn-android-kotlin.md) mục 16). Hệ quả khi test: phải có collector (`backgroundScope.launch { uiState.collect {} }`).

**4. Vì sao không dùng `runCatching` bừa trong coroutine?**
Nó nuốt `CancellationException`, phá cơ chế hủy ([learn-android-kotlin.md](./learn-android-kotlin.md) mục 10, L5). Project có `runCatchingCancellable`.

**5. Default argument trong hàm trả Flow có gì nguy hiểm?**
Default argument tính một lần lúc gọi hàm; Flow chạy lại query mãi với giá trị cũ (L1). Đưa thời gian vào bằng ticker + `flatMapLatest`.

**6. `remember` khác `rememberSaveable`? Khi nào state nên ở ViewModel?**
[learn-android-kotlin.md](./learn-android-kotlin.md) mục 20. State của UI thuần (ô đang mở, chữ đang gõ) để ở Composable bằng `rememberSaveable`; riêng mật khẩu không nên lưu vào Bundle. State nghiệp vụ hoặc dữ liệu tải về để ở ViewModel.

**7. ViewModel sống bao lâu? Không được giữ gì trong ViewModel?**
Sống qua xoay màn hình, chết khi route bị pop. Không giữ View, Activity, Context của Activity, hay lambda của Composable (L7); chỉ giữ `@ApplicationContext`.

**8. Offline-first thiết kế thế nào? Đồng bộ ra sao?**
Room là nguồn sự thật cho UI; ghi máy trước, đẩy hàng đợi lên server sau (outbox phía client). Kể bản sửa ở [learn-android-architecture.md](./learn-android-architecture.md) mục 30: gộp theo thẻ, `Mutex`, WorkManager với ràng buộc mạng và backoff, lý do chọn `KEEP`. Nêu luôn việc còn thiếu: xử lý xung đột. Đây là câu ghi điểm.

**9. Room migration làm sao cho an toàn?**
Export schema **trước khi** đổi (để có `1.json`), `AutoMigration` hoặc `Migration` tay, test bằng `MigrationTestHelper` trên thiết bị, commit file schema. Giải thích vì sao `fallbackToDestructiveMigration` nguy hiểm với dữ liệu chưa sync (L3).

**10. Token hết hạn thì app xử lý thế nào?**
`RefreshCookieJar` giữ refresh token (server gửi bằng cookie httpOnly); `TokenAuthenticator` nhận 401, refresh một lần cho nhiều request đồng thời, gửi lại, đăng xuất khi refresh bị từ chối, giữ phiên khi chỉ là lỗi mạng, và không lặp vô hạn ([learn-android-architecture.md](./learn-android-architecture.md) mục 31). Kể thêm lỗi cookie `Secure` chỉ lộ ra khi thử với backend thật.

**11. `@Provides` khác `@Binds`? Vì sao project có nhiều interface nhỏ như `TokenStorage`, `NetworkStatus`?**
[learn-android-architecture.md](./learn-android-architecture.md) mục 31. Interface nhỏ để thay class cần `Context` bằng bản giả trong unit test JVM.

**12. Camera xử lý frame thế nào để không lag? Có vấn đề đa luồng nào?**
`KEEP_ONLY_LATEST`, `AtomicBoolean.compareAndSet` làm cờ đang xử lý, throttle 900 ms, OCR chạy trên máy, luôn `imageProxy.close()` ([learn-android-architecture.md](./learn-android-architecture.md) mục 33).

**13. px, dp, sp?**
[learn-android-kotlin.md](./learn-android-kotlin.md) mục 25, kèm L4: toạ độ từ CameraX/ML Kit là px, dùng `Modifier.offset { IntOffset(...) }` hoặc đổi qua `LocalDensity`.

**14. Vì sao đăng nhập OAuth qua trình duyệt chứ không phải WebView? PKCE để làm gì?**
App không thấy mật khẩu, dùng lại SSO, Google cấm WebView. PKCE chống việc app khác chặn được `code` trên thiết bị (redirect bằng custom scheme có thể bị app khác đăng ký trùng).

**15. Test ViewModel và repository có coroutine thế nào?**
`MainDispatcherRule`, `StandardTestDispatcher`, `runTest`, `advanceUntilIdle`, thời gian ảo với `advanceTimeBy`, fake thay cho Room và mạng, `CompletableDeferred` để giữ trạng thái loading ([learn-android-architecture.md](./learn-android-architecture.md) Phần G).

**16. Kể một lỗi mà unit test không bắt được.**
Cookie `Secure` qua HTTP ([learn-android-architecture.md](./learn-android-architecture.md) Phần H). Bài học: dữ liệu giả phải lấy từ hệ thống thật; và luôn chạy thử với backend và thiết bị thật sau khi unit test đã xanh.

## Nền tảng Android

Từ bài 3.

### Tiến trình và vòng đời của app ([bài 3](./learn-android-fundamentals.md) mục 1)

**ViewModel sống qua xoay màn hình bằng cách nào?**
`ComponentActivity` giữ một `ViewModelStore` qua `onRetainNonConfigurationInstance`. Khi Activity được tạo lại do đổi cấu hình, store cũ được trao cho Activity mới. `onCleared()` chỉ chạy khi Activity kết thúc thật (`isFinishing`), không chạy khi xoay màn hình.

**Lưu trạng thái form đang nhập dở ở đâu?**
Phụ thuộc mức độ quan trọng. Nhỏ và chấp nhận mất khi người dùng tự tắt: `SavedStateHandle` hoặc `rememberSaveable`. Không được mất (bài thi, tin nhắn đang soạn dài): ghi nháp vào Room hoặc DataStore.

### Activity, Fragment và vòng đời UI ([bài 3](./learn-android-fundamentals.md) mục 2)

**Chuyển từ Activity A sang B: thứ tự callback?**
`A.onPause` → `B.onCreate` → `B.onStart` → `B.onResume` → `A.onStop`. A chỉ `onStop` sau khi B đã hiện, vì nếu B trong suốt thì A vẫn còn được thấy.

**`onSaveInstanceState` được gọi khi nào?**
Khi Activity có thể bị hủy rồi tạo lại: xoay màn hình, hoặc xuống nền (để phòng process death). Không gọi khi người dùng bấm Back để thoát hẳn.

### Context ([bài 3](./learn-android-fundamentals.md) mục 3)

**Vì sao không nên hiện hộp thoại bằng Application context?**
Nó không mang theme của Activity và không có cửa sổ (window token) để gắn vào. Kết quả là crash `BadTokenException`, hoặc hộp thoại sai giao diện.

### Intent, task và deep link ([bài 3](./learn-android-fundamentals.md) mục 4)

**Bấm thông báo khi app đang mở: Activity mới hay cũ?**
Với `launchMode="standard"` và không có cờ nào, hệ thống tạo **Activity mới** chồng lên trên. Muốn dùng lại Activity đang có thì dùng `singleTop` (hoặc cờ `CLEAR_TOP|SINGLE_TOP`) và xử lý Intent mới trong `onNewIntent`.

### Việc chạy nền ([bài 3](./learn-android-fundamentals.md) mục 6)

**Coroutine trong `GlobalScope` khác WorkManager thế nào?**
Coroutine chết cùng tiến trình. Bị hệ thống giết hay khởi động lại máy là mất việc. WorkManager lưu việc vào database riêng của nó và chạy lại khi có cơ hội.

### Kể ba lỗi nền tảng theo STAR

- **Situation:** app học tiếng Nhật, có đăng nhập, sync dữ liệu và gọi video.
- **Task:** tự soát nền tảng trước khi phát hành.
- **Action:** đối chiếu manifest và cách lưu dữ liệu với các thay đổi của Android 6, 9 và 14; tìm thấy ba lỗi ([bài 3](./learn-android-fundamentals.md) mục 13: token theo bản sao lưu, HTTP mở cho mọi domain, gọi video thiếu foreground service); sửa và viết test cho từng cái, kể cả chạy một lần sao lưu thật để chứng minh token không còn nằm trong đó.
- **Result:** token không còn rời khỏi máy; bản release chỉ dùng HTTPS; cuộc gọi không bị ngắt khi app xuống nền.

## Làm tính năng thật

Từ bài 4.

**1. Thiết kế chat realtime trên mobile thế nào để không mất tin?**
SSE hoặc WebSocket để nhận nhanh; mỗi lần (nối lại) kết nối thì tải lại lịch sử bằng REST; gộp và loại trùng theo id; gửi lạc quan có trạng thái và nút thử lại; nối lại có backoff, dừng hẳn khi gặp 4xx. Kể lỗi logging interceptor nuốt stream.

**2. Vì sao lưu mốc `endsAt` chứ không lưu "còn bao nhiêu giây"?**
Coroutine và timer dừng khi app ở nền hoặc bị giết; tính lại từ mốc tuyệt đối thì luôn đúng.

**3. `SavedStateHandle` khác Room thế nào khi app bị giết?**
Bảng ở [learn-android-features.md](./learn-android-features.md) mục 5. Hệ thống giết thì `SavedStateHandle` còn; người dùng force-stop thì mất. Dữ liệu không được phép mất phải nằm trong Room.

**4. WorkManager khác AlarmManager?**
WorkManager: bền qua khởi động lại máy, có ràng buộc (mạng, pin), không đúng tới từng phút. AlarmManager exact: đúng giờ, nhưng cần quyền và tốn pin. Nhắc học bài thì chọn WorkManager.

**5. R8 làm hỏng app ở đâu, phát hiện thế nào?**
Reflection: Gson, Retrofit, và các thư viện tự đọc class. Triệu chứng là dữ liệu ra null chứ không crash. Phát hiện: build release trong CI và chạy thử bản release.

**6. Baseline Profile để làm gì?**
Biên dịch trước (AOT) code của các luồng hay dùng, giúp mở app lần đầu và cuộn mượt hơn. Đo bằng Macrobenchmark, so sánh `CompilationMode.None` với `Partial(BaselineProfileMode.Require)`.

**7. Test Compose thế nào? Liên quan gì tới trợ năng?**
Tách composable khỏi ViewModel để truyền dữ liệu giả vào; tìm node theo chữ hoặc `contentDescription`. Node tìm được bằng semantics thì TalkBack cũng đọc được.

**8. Kể một lỗi mà unit test không bắt được.**
[learn-android-features.md](./learn-android-features.md) mục 10, chọn lỗi SSE: nói được triệu chứng (200 OK nhưng im lặng), cách tìm (logcat), nguyên nhân (interceptor đọc hết body), cách sửa và test tái hiện (body chảy chậm, đỏ trước khi sửa).

## Framework, Binder và Android Automotive

Từ bài nâng cao [learn-android-framework.md](./learn-android-framework.md).

**1. Kể quá trình từ lúc bật máy tới lúc app chạy.**
`init` (PID 1) khởi động `servicemanager` và `zygote64`; Zygote fork `system_server`, nơi khởi động các system service; khi mở app, ActivityManager nhờ Zygote fork tiến trình app. Kể thêm cách đã kiểm bằng `adb shell ps -A -o USER,PID,PPID,NAME`: PPID của app và `system_server` đều là PID của `zygote64` ([learn-android-framework.md](./learn-android-framework.md) mục 2).

**2. Binder là gì, vì sao Android không dùng socket?**
Driver IPC trong nhân: chép dữ liệu một lần, mang theo UID/PID người gọi để kiểm quyền, báo khi bên kia chết. Mọi system service đều là Binder service (mục 3–4).

**3. Đã viết AIDL chưa? Kể lại.**
Lab trong app: `DueCardsIpcService` ở tiến trình `:ipc`, hợp đồng `IDueCardsService.aidl` có hàm đồng bộ và hàm `oneway` trả kết quả qua callback; 3 test trên emulator chứng minh khác tiến trình, đọc được dữ liệu tiến trình kia ghi, và callback hoạt động. Kể bẫy `Application.onCreate` chạy lại ở tiến trình phụ và cách chặn (mục 5).

**4. Hàm AIDL chạy trên luồng nào? Gọi từ main thread có sao không?**
Phía service: thread pool Binder. Phía client gọi đồng bộ thì luồng gọi đứng chờ; gọi từ main thread mà service chậm là ANR. Dùng luồng nền hoặc `oneway` + callback (mục 4).

**5. `TransactionTooLargeException` là gì?**
Bộ đệm Binder khoảng 1 MB mỗi tiến trình, dùng chung; gửi dữ liệu lớn (kể cả qua `Intent` extras hay `onSaveInstanceState`) là vượt. Gửi id hoặc đường dẫn file thay vào đó.

**6. Bảo vệ một service mở cho app khác thế nào?**
`exported="true"` kèm `android:permission`, hoặc kiểm `Binder.getCallingUid()`/`checkCallingPermission` trong từng hàm. Lab dùng `exported="false"` nên chỉ cùng UID gọi được (mục 6).

**7. HAL, Treble, HIDL khác AIDL HAL?**
HAL là interface chuẩn giữa framework và driver. Treble (Android 8) tách HAL ra tiến trình riêng để nâng cấp framework không cần viết lại phần nhà sản xuất. HAL mới viết bằng stable AIDL thay HIDL (mục 7).

**8. Android Automotive OS khác Android Auto? Đọc tốc độ xe thế nào?**
AAOS chạy thẳng trên xe, Android Auto chiếu từ điện thoại. Đọc tốc độ: `Car.createCar` → `CarPropertyManager` → property `PERF_VEHICLE_SPEED`, cần quyền `android.car.permission.CAR_SPEED`; dữ liệu đi CarService → VHAL → mạng xe (mục 8).

Câu hỏi Java, OOP và thuật toán: [interview-java-dsa.md](./interview-java-dsa.md).

<!-- nav:start -->

---

## Đi tiếp

Tài liệu tham khảo thuộc **13. Phỏng vấn**. Cùng nhóm:

- [interview-questions.md](./interview-questions.md) — Bộ câu hỏi Senior chung
- [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md) — Backend NestJS, MQTT, DB
- [interview-devops.md](./interview-devops.md) — DevOps
- [interview-backend-android-rn-swift.md](./interview-backend-android-rn-swift.md) — Backend, Android, React Native, Swift
- [interview-mobile.md](./interview-mobile.md) — Senior Mobile
- [interview-java-dsa.md](./interview-java-dsa.md) — Java, OOP và 10 bài thuật toán gắn với app (lời giải Java đã chạy), kế hoạch luyện bài test lập trình
- [interview-react-native-senior.md](./interview-react-native-senior.md) — Senior React Native

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
