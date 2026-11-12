# Android 5 (nâng cao): Framework, Binder/AIDL và Android Automotive

> **Mục tiêu:** Học xong bài này bạn:
> - vẽ được các tầng của Android và kể được quá trình khởi động: `init` → `zygote64` → `system_server` → app;
> - giải thích được một lời gọi như `notificationManager.notify(...)` thật ra là lời gọi Binder sang tiến trình khác;
> - viết, chạy và test được một bound service bằng **AIDL** ở tiến trình riêng (lab có sẵn trong `nihongo-android`), gồm cả gọi đồng bộ và `oneway` có callback;
> - biết các bẫy khi app có nhiều tiến trình, và các giới hạn của Binder;
> - nói được UID, quyền, `exported`, SELinux bảo vệ app thế nào;
> - nắm tổng quan HAL/Treble và Android Automotive OS (CarService, Car API, VHAL) để trả lời phỏng vấn vị trí Android ở công ty ô tô, điện tử.
>
> **Cần biết trước:** bài 1–3 của lộ trình Android: [learn-android-kotlin.md](./learn-android-kotlin.md), [learn-android-architecture.md](./learn-android-architecture.md), [learn-android-fundamentals.md](./learn-android-fundamentals.md). Biết dùng `adb` ở mức bài 3–4.
> **Thời gian:** 2–3 tuần.

Bốn bài trước dạy **tầng app**: viết code chạy trong tiến trình của mình. Bài này đi xuống **tầng framework**: những tiến trình hệ thống mà app nói chuyện cùng mỗi giây, và cơ chế Binder nối chúng lại. Đây là phần các vị trí Android ở công ty làm thiết bị (TV, ô tô, điện thoại) hỏi nhiều, và là phần mà app thông thường hiếm khi đụng tới.

Mọi output trong bài chạy thật ngày 10/11/2026 trên emulator `pixel_api_35` (Android 15, API 35), với bản debug của app.

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| Framework | Phần Android viết sẵn mà app gọi tới: `ActivityManager`, `NotificationManager`… |
| System service | Dịch vụ hệ thống chạy trong tiến trình khác app, phần lớn trong `system_server` |
| `system_server` | Tiến trình chứa hàng trăm system service: quản lý Activity, gói cài, thông báo, cửa sổ… |
| Zygote | Tiến trình nạp sẵn thư viện Java/Android, rồi "nhân bản" (fork) để tạo mọi tiến trình app |
| IPC | Inter-Process Communication: giao tiếp giữa hai tiến trình có bộ nhớ riêng |
| Binder | Cơ chế IPC của Android: một driver trong nhân Linux, cộng thư viện đóng gói lời gọi |
| AIDL | Ngôn ngữ khai báo interface. Build sinh code Stub (phía nhận) và Proxy (phía gọi) |
| Parcel | Gói dữ liệu được Binder chuyển giữa hai tiến trình |
| Bound service | Service mà client "nối" vào (`bindService`) để gọi hàm, khác service chỉ được "chạy" |
| `oneway` | Lời gọi Binder không chờ kết quả, trả về ngay |
| UID | Mã người dùng Linux. Mỗi app một UID riêng, ví dụ `u0_a212` |
| SELinux | Lớp kiểm soát truy cập bắt buộc của Linux. Android bật ở chế độ `Enforcing` |
| HAL | Hardware Abstraction Layer: lớp chuẩn giữa framework và driver phần cứng |
| AAOS | Android Automotive OS: Android chạy thẳng trên màn hình xe (khác Android Auto chiếu từ điện thoại) |
| VHAL | Vehicle HAL: HAL cung cấp "thuộc tính xe" như tốc độ, số, nhiệt độ |

---

## 1. Các tầng của Android

```text
┌──────────────────────────────────────────────────────────────┐
│ App: com.edu.nihongo (Kotlin, Compose)                        │  ← bài 1–4
├──────────────────────────────────────────────────────────────┤
│ Framework API (android.*): NotificationManager, ActivityManager│  ← thư viện chạy TRONG tiến trình app
│        │ Binder (IPC)                                          │
│        ▼                                                       │
│ System services trong system_server: notification, activity,   │  ← tiến trình hệ thống
│ package, window, alarm, jobscheduler… (297 service, mục 3)     │
├──────────────────────────────────────────────────────────────┤
│ Native: surfaceflinger, servicemanager, ART, thư viện C/C++    │
├──────────────────────────────────────────────────────────────┤
│ HAL: camera, audio, cảm biến, xe (VHAL)…                       │  ← mục 7, 8
├──────────────────────────────────────────────────────────────┤
│ Nhân Linux: driver Binder, driver phần cứng, quản lý tiến trình│
└──────────────────────────────────────────────────────────────┘
```

Ý quan trọng nhất: **hầu hết "hàm Android" mà app gọi không chạy trong app**. `notify(...)` trong `ReminderNotifier` chỉ đóng gói lời gọi rồi gửi qua Binder sang `system_server`. Chính `system_server` mới quyết định có hiện thông báo không (đã có quyền chưa, channel có bị tắt không).

---

## 2. Android khởi động thế nào

Xem cây tiến trình thật trên emulator:

```bash
adb shell ps -A -o USER,PID,PPID,NAME | grep -E "init|zygote64|system_server|servicemanager|surfaceflinger"
```

Output thật (rút gọn):

```text
USER           PID  PPID NAME
root             1     0 init
system         161     1 servicemanager
system         163     1 hwservicemanager
root           370     1 zygote64
system         418     1 surfaceflinger
system         569   370 system_server
```

Đọc theo cột `PPID` (tiến trình cha):

1. Nhân Linux chạy tiến trình đầu tiên là **`init`** (PID 1). `init` đọc các file `init.rc` và khởi động các dịch vụ native.
2. `init` khởi động **`servicemanager`** (danh bạ của mọi Binder service) và **`hwservicemanager`** (danh bạ HAL kiểu cũ).
3. `init` khởi động **`zygote64`**. Zygote nạp sẵn hàng nghìn class và tài nguyên của framework vào bộ nhớ.
4. Zygote **fork** ra **`system_server`** (PPID 569 → 370). `system_server` khởi động lần lượt các system service rồi đăng ký chúng với `servicemanager`.
5. Khi bạn mở app, `system_server` (ActivityManager) yêu cầu Zygote fork thêm một tiến trình. Tiến trình đó trở thành app của bạn.

Kiểm bước 5 bằng chính app này:

```text
u0_a212       8107   370 com.edu.nihongo
u0_a212       8147   370 com.edu.nihongo:ipc
```

Cả hai tiến trình của app đều có `PPID 370`, đúng PID của `zygote64`.

**Vì sao phải có Zygote?** Tạo một máy ảo Java mới rồi nạp lại toàn bộ framework mất vài giây. Fork từ Zygote thì tiến trình con **dùng chung** vùng nhớ đã nạp sẵn (copy-on-write: chỉ chép trang nhớ nào bị ghi). App mở nhanh hơn và tốn ít RAM hơn nhiều.

---

## 3. System service và ServiceManager

```bash
adb shell service list | wc -l
adb shell service list | grep -E "\b(activity|package|window|alarm|jobscheduler|notification|connectivity)\b:"
```

Output thật:

```text
     297
5	activity: [android.app.IActivityManager]
9	alarm: [android.app.IAlarmManager]
95	connectivity: [android.net.IConnectivityManager]
152	jobscheduler: [android.app.job.IJobScheduler]
194	notification: [android.app.INotificationManager]
200	package: [android.content.pm.IPackageManager]
295	window: [android.view.IWindowManager]
```

Mỗi dòng là một Binder service đã đăng ký với `servicemanager`: tên (`notification`) và interface AIDL của nó (`android.app.INotificationManager`). Emulator Android 15 có 297 service.

Đường đi của một lời gọi quen thuộc trong app:

```text
ReminderNotifier (app)
  context.getSystemService(NotificationManager::class.java)
     └─ NotificationManager: lớp bọc trong tiến trình app
          └─ INotificationManager.Stub.Proxy  ← code sinh từ AIDL
               └─ Binder ──(driver /dev/binder trong nhân)──▶ system_server
                                                                  └─ NotificationManagerService (Stub)
                                                                       kiểm quyền, channel → hiện thông báo
```

Đúng cùng mô hình Proxy/Stub này là cái bạn sẽ tự viết ở mục 5.

`dumpsys <tên service>` hỏi service đó in trạng thái nội bộ, rất hữu ích để gỡ lỗi:

```bash
adb shell dumpsys notification | head -40          # thông báo đang hiện, channel
adb shell dumpsys jobscheduler | grep -A3 com.edu.nihongo   # việc WorkManager đã hẹn
adb shell dumpsys activity services com.edu.nihongo         # service của app đang chạy
```

---

## 4. Binder: những điều phải biết

| Ý | Chi tiết |
|---|---|
| Vì sao không dùng socket, pipe | Binder chép dữ liệu **một lần** qua nhân (socket chép hai lần), mang theo danh tính người gọi (UID, PID), và tự báo khi tiến trình bên kia chết |
| Proxy và Stub | Client giữ **Proxy**: đóng gói tham số vào `Parcel`, gửi đi. Service cài đặt **Stub**: mở `Parcel`, gọi hàm thật, đóng gói kết quả |
| Luồng chạy | Hàm của Stub chạy trên **thread pool Binder** của tiến trình service (mặc định tối đa khoảng 15–16 luồng), **không** chạy trên main thread |
| Gọi đồng bộ | Luồng của client **đứng chờ** tới khi có kết quả. Gọi từ main thread mà service chậm là app bị ANR |
| `oneway` | Gửi rồi trả về ngay, không có kết quả trả về. Các lời gọi `oneway` từ cùng một client tới cùng một Binder được xử lý **theo thứ tự**, lần lượt |
| Giới hạn dữ liệu | Bộ đệm giao dịch khoảng **1 MB mỗi tiến trình**, dùng chung cho mọi giao dịch đang chạy. Gửi quá nhiều thì nhận `TransactionTooLargeException`. Không gửi ảnh hay danh sách lớn qua Binder; gửi đường dẫn file hoặc dùng `ContentProvider` |
| Bên kia chết | Gọi vào Binder của tiến trình đã chết thì nhận `DeadObjectException` (một loại `RemoteException`). `linkToDeath` để được báo trước |
| Danh tính người gọi | Trong hàm Stub, `Binder.getCallingUid()` cho biết UID của client, dùng để kiểm quyền |
| Cùng tiến trình | Client và service cùng tiến trình thì không có IPC: gọi hàm trực tiếp, chạy trên luồng của người gọi |

---

## 5. Lab: bound service bằng AIDL ở tiến trình riêng

Lab có sẵn trong app. Service trả về **số thẻ SRS đến hạn**, chạy ở tiến trình riêng `com.edu.nihongo:ipc`, và chỉ chính app bind được. Đây là lab học, không phải tính năng người dùng thấy.

| File | Vai trò |
|---|---|
| [IDueCardsService.aidl](../apps/nihongo-android/app/src/main/aidl/com/edu/nihongo/ipc/IDueCardsService.aidl) | Hợp đồng: `getDueCount`, `getServicePid`, `requestDueCount` (`oneway`) |
| [IDueCountCallback.aidl](../apps/nihongo-android/app/src/main/aidl/com/edu/nihongo/ipc/IDueCountCallback.aidl) | Callback mà service gọi ngược về client |
| [DueCardsIpcService.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/data/ipc/DueCardsIpcService.kt) | Cài đặt Stub, đọc Room |
| `AndroidManifest.xml` | Khai báo service, `android:process=":ipc"`, `exported="false"` |
| `app/build.gradle.kts` | `buildFeatures { aidl = true }`: AGP 8 tắt AIDL mặc định |
| [EduApp.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/EduApp.kt), [ProcessInfo.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/utils/ProcessInfo.kt) | Chỉ khởi tạo nặng ở tiến trình chính (mục 5.3) |
| [DueCardsIpcServiceTest.kt](../apps/nihongo-android/app/src/androidTest/java/com/edu/nihongo/data/ipc/DueCardsIpcServiceTest.kt) | 3 test chạy trên emulator |

### 5.1 Hợp đồng AIDL

```aidl
// app/src/main/aidl/com/edu/nihongo/ipc/IDueCardsService.aidl
package com.edu.nihongo.ipc;

import com.edu.nihongo.ipc.IDueCountCallback;

interface IDueCardsService {
    int getDueCount(long nowMillis);                                  // đồng bộ: client chờ
    int getServicePid();
    oneway void requestDueCount(long nowMillis, IDueCountCallback callback);  // không chờ
}
```

Khi build, Gradle sinh class Java `IDueCardsService` có hai lớp con:

- `IDueCardsService.Stub`: abstract, service kế thừa và viết thân hàm.
- `IDueCardsService.Stub.Proxy`: client dùng, mỗi hàm đóng gói tham số vào `Parcel` rồi gửi qua Binder.

Xem code sinh ra ở `app/build/generated/aidl_source_output_dir/debug/out/com/edu/nihongo/ipc/IDueCardsService.java`. Đọc hàm `onTransact` của `Stub` để thấy mỗi hàm được đánh số (`TRANSACTION_getDueCount`…) và mở `Parcel` thế nào.

### 5.2 Phía service

```kotlin
// data/ipc/DueCardsIpcService.kt
@AndroidEntryPoint
class DueCardsIpcService : Service() {
    @Inject lateinit var srsDao: SrsCardDao
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val binder = object : IDueCardsService.Stub() {
        // Chạy trên thread pool Binder của tiến trình :ipc, KHÔNG phải main thread
        override fun getDueCount(nowMillis: Long): Int = runBlocking { srsDao.countDue(nowMillis) }
        override fun getServicePid(): Int = Process.myPid()
        override fun requestDueCount(nowMillis: Long, callback: IDueCountCallback?) {
            if (callback == null) return
            scope.launch {
                val count = srsDao.countDue(nowMillis)
                try { callback.onResult(count, Process.myPid()) }
                catch (e: RemoteException) { /* client đã chết */ }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder = binder
    override fun onDestroy() { scope.cancel(); super.onDestroy() }
}
```

- **`runBlocking` ở đây được phép**: nó chặn một luồng Binder trong tiến trình service, không chặn giao diện. So với [bài 1](./learn-android-kotlin.md) mục 19, đây là trường hợp thứ hai `runBlocking` chấp nhận được, và vì cùng một lý do: không ở main thread.
- **Hàm `oneway` phải trả về ngay**: service tự `launch` việc đọc DB, xong thì gọi ngược `callback.onResult`. Callback cũng là một Binder (do client tạo), nên lời gọi ngược này cũng là IPC.
- **`RemoteException` khi gọi ngược**: client có thể đã chết trong lúc chờ. Không bắt thì service crash.
- **Hilt vẫn dùng được** trong tiến trình phụ: tiến trình mới có `Application` riêng, Hilt tạo bộ object riêng. Nghĩa là **tiến trình `:ipc` có Room, DAO riêng**, không dùng chung object với tiến trình chính, chỉ dùng chung file database trên đĩa.

### 5.3 Bẫy multi-process: `Application.onCreate` chạy lại

```xml
<!-- AndroidManifest.xml -->
<service
    android:name=".data.ipc.DueCardsIpcService"
    android:exported="false"
    android:process=":ipc" />
```

`android:process=":ipc"` bảo hệ thống chạy service trong tiến trình riêng tên `com.edu.nihongo:ipc` (dấu `:` nghĩa là tiến trình riêng tư của app). Tiến trình mới đi đúng đường của mục 2: fork từ Zygote, tạo `Application`, gọi `EduApp.onCreate()`.

Bản đầu của `EduApp.onCreate()` khởi tạo LiveKit, TTS, tạo notification channel và hẹn WorkManager. Không chặn thì **tiến trình `:ipc` làm lại tất cả**: tốn bộ nhớ, và có hai tiến trình cùng hẹn việc nền. Bản sửa:

```kotlin
// EduApp.kt
override fun onCreate() {
    super.onCreate()
    if (!isMainProcess(currentProcessName(), packageName)) return   // tiến trình phụ: dừng ở đây
    LiveKit.init(this)
    ...
}
```

`currentProcessName()` dùng `Application.getProcessName()` trên Android 9+, và đọc `/proc/self/cmdline` trên máy cũ hơn (app hỗ trợ từ API 24).

Các bẫy khác khi có nhiều tiến trình:

| Bẫy | Vì sao |
|---|---|
| Biến `object`/singleton không dùng chung | Mỗi tiến trình có bộ nhớ riêng, singleton ở tiến trình chính không tồn tại ở `:ipc` |
| `SharedPreferences`/DataStore ghi từ hai tiến trình | Không đồng bộ giữa tiến trình, dễ ghi đè. DataStore có `MultiProcessDataStoreFactory` riêng cho trường hợp này |
| Room ở hai tiến trình | Đọc/ghi file được (SQLite khóa ở mức file), nhưng Flow ở tiến trình này **không biết** tiến trình kia vừa ghi, trừ khi bật `enableMultiInstanceInvalidation()`. Lab chỉ đọc theo yêu cầu nên không cần |
| WorkManager | Mặc định chỉ chạy việc ở tiến trình chính. Hẹn việc từ tiến trình phụ cần cấu hình thêm |

### 5.4 Phía client và test

Client bind service, nhận một `IBinder` (thật ra là `BinderProxy`), rồi bọc thành Proxy bằng `Stub.asInterface`:

```kotlin
// androidTest/.../data/ipc/DueCardsIpcServiceTest.kt (rút gọn)
val conn = object : ServiceConnection {
    override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
        service = IDueCardsService.Stub.asInterface(binder)
        connected.countDown()
    }
    override fun onServiceDisconnected(name: ComponentName?) = Unit
}
context.bindService(Intent(context, DueCardsIpcService::class.java), conn, Context.BIND_AUTO_CREATE)
```

`bindService` **bất đồng bộ**: hệ thống phải tạo tiến trình `:ipc` trước, rồi mới gọi `onServiceConnected` trên main thread. Test chờ bằng `CountDownLatch`.

Ba test:

| Test | Chứng minh |
|---|---|
| `serviceRunsInItsOwnProcess` | PID của service khác PID của test; đọc `/proc/<pid>/cmdline` ra đúng `com.edu.nihongo:ipc` |
| `syncCall_seesRowsWrittenByAnotherProcess` | Tiến trình test ghi 2 thẻ đến hạn vào file DB; service ở tiến trình kia đếm thấy thêm đúng 2 |
| `onewayCall_returnsThroughCallback` | Gọi `oneway`, kết quả về qua callback, khớp với lời gọi đồng bộ, đến từ PID khác |

Chạy:

```bash
cd apps/nihongo-android
./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.edu.nihongo.data.ipc.DueCardsIpcServiceTest
```

Kết quả thật: `Starting 3 tests on pixel_api_35(AVD) - 15`, rồi `BUILD SUCCESSFUL`.

### 5.5 Quan sát bằng `adb`

Trong lúc test đang chạy, ở một terminal khác:

```bash
adb shell ps -A -o USER,PID,PPID,NAME | grep nihongo
```

```text
u0_a212       8107   370 com.edu.nihongo
u0_a212       8147   370 com.edu.nihongo:ipc
```

Hai tiến trình, **cùng UID** `u0_a212` (cùng một app), PID khác nhau, cùng cha là Zygote. (Nếu máy bạn có thêm app Flutter `com.edu.nihongo_app`, nó mang UID khác, vì là app khác.)

```bash
adb shell dumpsys activity services com.edu.nihongo
```

```text
  * ServiceRecord{45231df u0 com.edu.nihongo/.data.ipc.DueCardsIpcService c:com.edu.nihongo}
    processName=com.edu.nihongo:ipc
    * IntentBindRecord{5863118 CREATE}:
      ConnectionRecord{d4087e u0 CR com.edu.nihongo/.data.ipc.DueCardsIpcService:@af8aa39 flags=0x1}
```

`ServiceRecord` là bản ghi của `ActivityManagerService` trong `system_server` về service này. `processName` xác nhận tiến trình riêng. `ConnectionRecord` là kết nối đang mở từ client; `flags=0x1` là `BIND_AUTO_CREATE`.

Test xong, client unbind; service không còn ai bind nên bị hủy, và tiến trình `:ipc` có thể bị hệ thống thu hồi bất cứ lúc nào.

---

## 6. Bảo mật: UID, quyền, `exported`, SELinux

Android chồng nhiều lớp bảo vệ:

1. **Mỗi app một UID Linux** (`u0_a212`). File riêng của app (database, DataStore) chỉ UID đó đọc được. Vì vậy test ở mục 5 đọc được `/proc/<pid>/cmdline` của tiến trình `:ipc`: cùng UID.
2. **`android:exported`**: `false` nghĩa là chỉ app cùng UID mới bind hay mở được thành phần đó. Thử từ `adb shell` (UID `shell`) sẽ bị từ chối. Service lab không cần tự kiểm quyền vì đã `exported="false"`. Service mở cho app khác (`exported="true"`) **phải** kiểm: khai báo `android:permission`, hoặc kiểm `Binder.getCallingUid()` trong từng hàm.
3. **Quyền (permission)**: `system_server` kiểm quyền của **người gọi** trong từng lời gọi Binder. Đó là lý do quyền thông báo, camera được thực thi ở phía hệ thống chứ không phải trong app.
4. **SELinux**: ngay cả khi quyền Linux cho phép, chính sách SELinux vẫn có thể chặn.

```bash
adb shell getenforce
adb shell ps -A -Z | grep -E "com.edu.nihongo$|system_server"
```

```text
Enforcing
u:r:system_server:s0                      system    system_server
u:r:untrusted_app:s0:c212,c256,c512,c768  u0_a212   com.edu.nihongo
```

App bình thường chạy với nhãn `untrusted_app`; `system_server` có nhãn riêng với quyền rộng hơn nhiều. Phần `c212,c256,…` (category) tách các app với nhau thêm một lớp nữa.

---

## 7. HAL và Project Treble

Framework không nói chuyện thẳng với driver phần cứng. Giữa hai bên là **HAL**: một interface chuẩn cho từng loại phần cứng (camera, âm thanh, cảm biến, xe…), do nhà sản xuất chip hoặc thiết bị cài đặt.

- **Project Treble** (từ Android 8): tách HAL thành tiến trình riêng, giao tiếp qua Binder. Nhờ vậy nâng cấp framework Android mà không phải viết lại phần của nhà sản xuất. Đó là lý do có `hwservicemanager` (mục 2): danh bạ cho HAL kiểu **HIDL**.
- **HIDL → AIDL**: từ Android 11, HAL mới viết bằng **AIDL** (chính ngôn ngữ ở mục 5, bản "stable AIDL"), HIDL dần bị thay thế.
- **Vendor/system tách biệt**: phân vùng `/vendor` chứa HAL của nhà sản xuất, `/system` chứa framework Google.

Repo này không có code HAL: viết HAL cần build cả cây mã nguồn Android (AOSP) và chạy trên thiết bị hoặc emulator tự build. Phỏng vấn thường hỏi ở mức khái niệm: HAL ở đâu trong các tầng, vì sao có Treble, HIDL khác AIDL HAL thế nào.

---

## 8. Android Automotive OS (AAOS)

| | Android Auto | Android Automotive OS |
|---|---|---|
| Chạy ở đâu | Trên điện thoại, chiếu lên màn hình xe | Chạy thẳng trên máy tính của xe |
| Ai làm | Google | Hãng xe hoặc nhà cung cấp (Tier 1) tùy biến từ AOSP |
| Truy cập dữ liệu xe | Rất hạn chế | Có, qua Car API |

Các khối chính của AAOS:

```text
App (ví dụ: app điều hòa, app hiển thị tốc độ)
  └─ Car API: Car.createCar(context) → CarPropertyManager, CarUxRestrictionsManager…
       └─ Binder ──▶ CarService (tiến trình hệ thống của AAOS)
                         └─ Binder ──▶ Vehicle HAL (VHAL)
                                          └─ mạng xe (CAN, LIN…) qua phần cứng của hãng
```

- **CarService**: system service riêng của AAOS, cùng mô hình Binder như mục 3.
- **CarPropertyManager**: đọc/ghi/đăng ký nhận **vehicle property**, ví dụ tốc độ (`PERF_VEHICLE_SPEED`), cần số (`GEAR_SELECTION`), nhiệt độ điều hòa. Mỗi property có quyền riêng, ví dụ `android.car.permission.CAR_SPEED`.
- **VHAL**: HAL cung cấp các property đó cho CarService. Nhà sản xuất cài đặt VHAL để nối với mạng của xe.
- **Hạn chế khi đang lái** (UX restrictions): khi xe chạy, hệ thống giới hạn những gì app được hiện (không bàn phím, không video…) để tài xế không bị phân tâm.

Kiến thức của bài 1–4 vẫn dùng nguyên: AAOS vẫn là Android, app vẫn viết bằng Kotlin, Compose, ViewModel, Room. Phần thêm là Car API, quyền của xe, và yêu cầu an toàn khi lái.

Thực hành thêm (ngoài repo): trong Android Studio, **Device Manager → Create Device → Automotive** để tạo emulator AAOS. Tài liệu chính thức: <https://source.android.com/docs/automotive> và <https://developer.android.com/training/cars>.

---

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| Build báo `aidl` không được bật, hoặc không sinh class `IDueCardsService` | AGP 8 tắt AIDL mặc định | `buildFeatures { aidl = true }` |
| `bindService` trả `false` | Sai tên class, thiếu khai báo `<service>` trong manifest, hoặc service `exported="false"` mà bind từ app khác | Kiểm manifest và `Intent` |
| App đứng hình (ANR) khi gọi service | Gọi hàm AIDL đồng bộ từ main thread, mà service chậm | Gọi từ luồng nền, hoặc dùng `oneway` + callback |
| `DeadObjectException` | Tiến trình service (hoặc client) đã chết | Bắt `RemoteException`, bind lại; dùng `linkToDeath` để được báo |
| `TransactionTooLargeException` | Gửi dữ liệu lớn qua Binder (kể cả qua `Intent` extras, `onSaveInstanceState`) | Gửi id hoặc đường dẫn file, không gửi cả dữ liệu |
| Tiến trình phụ cũng khởi tạo SDK, hẹn việc nền | `Application.onCreate` chạy ở mọi tiến trình | Kiểm tên tiến trình như `EduApp` (mục 5.3) |
| Biến singleton "mất" giá trị ở service | Service chạy tiến trình khác, singleton là bản khác | Truyền dữ liệu qua Binder, file hoặc database |

## Tự kiểm tra

1. Kể các tiến trình từ lúc bật máy tới lúc app chạy, và cách bạn kiểm điều đó bằng `adb`.
2. Vì sao Android dùng Zygote thay vì tạo máy ảo mới cho mỗi app?
3. `notificationManager.notify(...)` thật ra chạy ở đâu? Ai kiểm quyền thông báo?
4. Proxy và Stub khác nhau thế nào? Hàm của Stub chạy trên luồng nào?
5. `oneway` khác gọi đồng bộ thế nào? Có lấy được giá trị trả về không?
6. Vì sao `runBlocking` trong `DueCardsIpcService` chấp nhận được?
7. Thêm `android:process=":ipc"` thì có bẫy gì với `Application.onCreate` và singleton?
8. Vì sao không được gửi một ảnh 5 MB qua Binder?
9. `exported="false"` bảo vệ gì? Service mở cho app khác thì phải làm thêm gì?
10. VHAL, CarService, CarPropertyManager nằm ở tầng nào, nối với nhau ra sao?

<details>
<summary>Đáp án</summary>

1. `init` (PID 1) → `servicemanager`, `zygote64` → Zygote fork `system_server` → khi mở app, Zygote fork tiến trình app. Kiểm bằng `adb shell ps -A -o USER,PID,PPID,NAME`: PPID của app và của `system_server` đều là PID của `zygote64`.
2. Zygote nạp sẵn framework một lần; fork cho tiến trình con dùng chung bộ nhớ đó (copy-on-write), nên app mở nhanh và tốn ít RAM.
3. Lời gọi đi qua Binder sang `NotificationManagerService` trong `system_server`. `system_server` kiểm quyền và channel.
4. Proxy (phía client) đóng gói tham số vào `Parcel` rồi gửi; Stub (phía service) mở `Parcel` và gọi hàm thật. Hàm của Stub chạy trên thread pool Binder của tiến trình service.
5. Gọi đồng bộ: client chờ kết quả. `oneway`: trả về ngay, không có giá trị trả về; muốn có kết quả thì truyền callback (một Binder khác) để service gọi ngược.
6. Nó chạy trên luồng Binder của tiến trình service, không chặn main thread của ai.
7. `Application.onCreate` chạy lại ở tiến trình mới, nên phải kiểm tên tiến trình trước khi khởi tạo. Singleton ở mỗi tiến trình là bản riêng, không dùng chung giá trị.
8. Bộ đệm giao dịch Binder khoảng 1 MB mỗi tiến trình, dùng chung; vượt quá thì `TransactionTooLargeException`. Gửi đường dẫn file thay vào đó.
9. Chỉ app cùng UID mới truy cập được. Mở cho app khác thì phải khai báo `android:permission` hoặc kiểm `Binder.getCallingUid()`.
10. App dùng `CarPropertyManager` (Car API, trong tiến trình app) → Binder → `CarService` (system service của AAOS) → Binder → VHAL (tầng HAL) → mạng xe.

</details>

## Bài tập

1. **Chạy lab.** Chạy 3 test IPC (mục 5.4). Trong lúc chạy, ở terminal khác gọi `adb shell ps -A -o USER,PID,PPID,NAME | grep nihongo` vài lần cho tới khi thấy `com.edu.nihongo:ipc`. Kiểm: cùng UID, PPID là PID của `zygote64`.
2. **Đọc code sinh ra.** Mở `app/build/generated/aidl_source_output_dir/debug/out/com/edu/nihongo/ipc/IDueCardsService.java`. Tìm `TRANSACTION_requestDueCount` và trong `Proxy`, tìm cờ `FLAG_ONEWAY`. Giải thích vì sao hàm `oneway` không đọc `reply`.
3. **Gây ANR có chủ ý.** Trên branch riêng, thêm `Thread.sleep(8_000)` vào `getDueCount`, rồi gọi `getDueCount` từ main thread trong một test nhỏ. Quan sát và giải thích. Sửa bằng cách gọi từ `Dispatchers.IO`.
4. **Thêm một hàm vào hợp đồng.** Thêm `int getMasteredCount()` vào `.aidl` (đếm thẻ `mastered = 1`), cài đặt trong Stub, viết test. Lưu ý: thêm hàm ở **cuối** interface để giữ tương thích với client cũ, vì Binder gọi hàm theo số thứ tự.
5. **Thấy `Application.onCreate` chạy hai lần.** Tạm thêm `Log.d("EduApp", "onCreate in ${currentProcessName()}")` làm dòng đầu của `EduApp.onCreate()`, cài lại, chạy test IPC, rồi `adb logcat -s EduApp`. Kiểm: một dòng cho `com.edu.nihongo`, một dòng cho `com.edu.nihongo:ipc`. Hoàn tác.
6. **AAOS (ngoài repo).** Tạo emulator Automotive trong Android Studio. Viết app nhỏ dùng `CarPropertyManager` đọc `PERF_VEHICLE_SPEED` (cần khai báo quyền `android.car.permission.CAR_SPEED`) và đổi tốc độ giả lập bằng bảng điều khiển của emulator.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **9. Mobile** — bài 7/13.

- Bài trước: [learn-android-features.md](./learn-android-features.md) — Android 4/4: nhật ký làm 9 tính năng và 5 lỗi chỉ lộ ra khi chạy thật
- **Bài tiếp: [learn-swift-ios.md](./learn-swift-ios.md)** — Swift/SwiftUI qua nihongo-ios

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
