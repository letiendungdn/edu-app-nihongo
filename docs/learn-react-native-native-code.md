# React Native CLI và code native: tự viết module bằng Kotlin và Swift

> **Mục tiêu:** Học xong bài này bạn làm được:
> - Tạo app React Native CLI mới, chạy trên máy ảo Android và Simulator iOS, kể cả khi cổng 8081 bị chiếm.
> - Hiểu JS nói chuyện với Kotlin/Swift thế nào trong kiến trúc mới (JSI, Turbo Module, Codegen).
> - Tự viết một **Turbo Module**: khai báo spec bằng TypeScript, cài đặt bằng Kotlin cho Android, Swift (kèm lớp vỏ Objective-C++) cho iOS.
> - Làm đủ 4 kiểu giao tiếp: hàm đồng bộ, Promise, Promise bị reject có mã lỗi, sự kiện từ native gửi lên JS.
> - Bọc module bằng hook, test bằng Jest mà không cần máy ảo, và xử lý được 7 lỗi build hay gặp.
>
> **Cần biết trước:** [learn-react-native.md](./learn-react-native.md) (component RN, chạy app). Biết đọc Kotlin cơ bản ([learn-android-kotlin.md](./learn-android-kotlin.md) mục đầu) và Swift cơ bản ([learn-swift-ios.md](./learn-swift-ios.md) mục đầu). Máy Mac có Android Studio (SDK + máy ảo), Xcode, CocoaPods — xem [run-mobile.md](./run-mobile.md).
>
> **Thời gian:** khoảng 8–10 giờ, chia 4 buổi. Lần build đầu mỗi nền tảng mất 5–15 phút.

Code đầy đủ: [examples/rn-native-module](../examples/rn-native-module). Đã chạy thử 13/11/2026 với React Native 0.88.1 (chỉ có kiến trúc mới), Kotlin, Swift, Xcode 27, máy ảo `pixel_api_35` và Simulator iPhone 18 Pro:

| Nền tảng | Kết quả trên màn hình |
|---|---|
| Android | `Máy: Google sdk_gphone64_arm64` · `Pin: 100%` → chạy `adb emu power capacity 37` → tự đổi thành `Pin: 37%` |
| iOS | `Máy: Apple arm64 iOS Version 27.0 (Build 24A434)` · `Pin: E_BATTERY_UNAVAILABLE: Không đọc được pin (Simulator không có pin)` |

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| React Native CLI | Cách làm RN "gốc": project có sẵn thư mục `android/` và `ios/`, bạn sửa thẳng code native. |
| Expo (managed) | Expo giữ phần native giúp bạn; muốn thêm code native thì dùng Expo Modules hoặc `expo prebuild`. |
| Native module | Đoạn code Kotlin/Swift mà JS gọi được như một hàm. |
| Turbo Module | Native module của kiến trúc mới: tải khi cần (lazy), gọi qua JSI, có kiểu nhờ Codegen. |
| JSI | JavaScript Interface: lớp C++ cho JS gọi thẳng hàm C++ (không qua chuỗi JSON như "bridge" cũ). |
| Codegen | Công cụ đọc file spec TypeScript và sinh code C++/Kotlin/Objective-C++ khớp với spec. |
| Spec | File TypeScript khai báo module có những hàm gì, nhận và trả kiểu gì. Là hợp đồng JS ↔ native. |
| Package (Android) | Lớp Kotlin khai báo "app có những module nào" để RN tạo module khi JS cần. |
| Objective-C++ (`.mm`) | Objective-C trộn được C++. iOS cần lớp này vì Codegen sinh C++, mà Swift không gọi thẳng C++ ở đây được. |
| Autolinking | RN tự tìm module trong `node_modules` và tự đăng ký. Module viết **ngay trong app** thì không được autolink. |
| Metro | Server gói code JS và gửi cho app khi dev. Mặc định cổng 8081. |
| Main thread | Luồng vẽ giao diện. UIKit (iOS) chỉ được gọi từ luồng này. |

## 1. Khi nào phải viết code native

Phần lớn app không cần: thư viện cộng đồng đã bọc sẵn camera, vị trí, thông báo… Bạn cần tự viết khi:

- **SDK của bên thứ ba chỉ có bản Android/iOS** (máy quét mã vạch công nghiệp, thanh toán ngân hàng, thiết bị BLE riêng của công ty, SDK eKYC).
- **API hệ điều hành chưa ai bọc**, hoặc thư viện có sẵn bỏ không cập nhật cho bản RN mới.
- **Hiệu năng:** xử lý ảnh, mã hóa, tính toán nặng chạy trong JS quá chậm.
- **Nhúng RN vào app native có sẵn** và cần gọi qua lại với màn hình native.

Project Nihongo có ví dụ thật: app React Native dịch chữ qua camera bằng ML Kit — đó là code native do thư viện cung cấp. App Android Kotlin và iOS Swift của project ([learn-android-framework.md](./learn-android-framework.md), [learn-swift-ios.md](./learn-swift-ios.md)) cho bạn thấy code native "thuần" trông thế nào.

### CLI hay Expo?

| | React Native CLI (bài này) | Expo (app `nihongo-mobile`) |
|---|---|---|
| Thư mục `android/`, `ios/` | Có sẵn, commit vào git, bạn sửa trực tiếp | Không commit; sinh ra bằng `npx expo prebuild` |
| Viết module native | Turbo Module (bài này) | **Expo Modules API**: Kotlin + Swift thuần, không cần Objective-C++ |
| Khi nào chọn | Nhúng SDK native phức tạp, sửa sâu Gradle/Xcode, nhúng RN vào app native có sẵn | App mới, muốn build/OTA/cập nhật dễ |

Kiến thức trong bài dùng được cho cả hai: spec, kiểu dữ liệu, luồng, sự kiện, Gradle, Xcode là như nhau. Với Expo, lệnh tạo module là `npx create-expo-module@latest --local` (sinh sẵn khung Kotlin + Swift trong thư mục `modules/`); bài này **chưa chạy thử** lệnh đó.

## 2. JS gọi native đi qua những đâu

```text
App.tsx ── NativeDemoDevice.getBatteryLevel() ──▶ JSI (C++)
                                                   │  code C++ do Codegen sinh từ spec
                         ┌─────────────────────────┴──────────────────────────┐
                         ▼ Android                                            ▼ iOS
        NativeDemoDeviceSpec (Java, Codegen sinh)          NativeDemoDeviceSpecBase (ObjC++, Codegen sinh)
                         ▲ kế thừa                                            ▲ kế thừa
        NativeDemoDeviceModule.kt  (bạn viết)              RCTNativeDemoDevice.mm (bạn viết, lớp vỏ)
                                                                              │ gọi
                                                           DemoDevice.swift   (bạn viết, logic)
```

Điều cần nhớ: bạn viết **spec TypeScript trước**. Codegen sinh lớp cha cho Kotlin và Objective-C++; bạn chỉ điền phần thân hàm. Quên cài một hàm hoặc sai kiểu → **lỗi biên dịch**, không phải lỗi lúc người dùng bấm.

Kiến trúc cũ ("bridge") gửi mọi lời gọi thành chuỗi JSON qua hàng đợi; tài liệu và bài viết cũ dùng `NativeModules.X`, `RCT_EXPORT_METHOD`, `ReactContextBaseJavaModule`. React Native 0.88 chỉ còn kiến trúc mới — gặp hướng dẫn dùng các tên đó là hướng dẫn cũ.

## 3. Tạo app và chạy lần đầu

```bash
npx @react-native-community/cli@latest init NativeDemo --skip-git-init --install-pods false
cd NativeDemo
npm test
```

Cấu trúc chính:

```
App.tsx, index.js                ← JS
android/app/src/main/java/com/nativedemo/
  MainActivity.kt, MainApplication.kt
ios/NativeDemo/
  AppDelegate.swift, SceneDelegate.swift, Info.plist
ios/Podfile                      ← thư viện native iOS (CocoaPods)
package.json                     ← thêm "codegenConfig" ở mục 4
```

**Android.** Bật máy ảo trong Android Studio (hoặc `emulator -avd <tên>`), rồi:

```bash
npx react-native start --port 8082              # terminal 1: Metro
npx react-native run-android --port 8082 --no-packager --active-arch-only   # terminal 2
```

- `--port 8082`: trên máy dev của project, cổng 8081 thường bị container Docker chiếm (`lsof -nP -iTCP:8081 -sTCP:LISTEN` để xem ai chiếm). Lệnh `run-android` tự `adb reverse` cổng này.
- `--active-arch-only`: chỉ build cho kiến trúc của máy ảo đang chạy, nhanh hơn nhiều lần build đầu.

**iOS.**

```bash
cd ios && pod install && cd ..                  # mỗi khi thêm thư viện native hoặc đổi spec
npx react-native run-ios --port 8082
```

Nếu build bằng Xcode/xcodebuild rồi mở app mà gặp màn đỏ `No script URL provided`: app đang tìm Metro ở cổng mặc định. Chỉ cho app sang cổng 8082 (Simulator nhớ cài đặt này):

```bash
xcrun simctl spawn booted defaults write org.reactjs.native.example.NativeDemo RCT_jsLocation localhost:8082
```

rồi mở lại app. Trong app dev, lắc máy (⌘D trên Simulator, ⌘M trên máy ảo Android) → **Change Bundle Location** làm được việc tương tự bằng tay.

## 4. Bước 1: viết spec và bật Codegen

[specs/NativeDemoDevice.ts](../examples/rn-native-module/specs/NativeDemoDevice.ts):

```ts
import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Đồng bộ: JS chờ native trả về ngay. Chỉ dùng cho việc rất nhanh.
  getDeviceName(): string;
  // Bất đồng bộ: native trả kết quả sau, hoặc reject kèm mã lỗi.
  getBatteryLevel(): Promise<number>;
  // Native chủ động gửi sự kiện lên JS.
  startBatteryUpdates(): void;
  stopBatteryUpdates(): void;
  readonly onBatteryChanged: CodegenTypes.EventEmitter<number>;
}

// Tên phải RIÊNG: RN đã có module lõi 'NativeDeviceInfo', đặt trùng là lỗi C++ "redefinition".
export default TurboModuleRegistry.getEnforcing<Spec>('NativeDemoDevice');
```

Quy tắc của file spec (Codegen đọc file này, không phải trình biên dịch TypeScript, nên khắt khe hơn):

- Tên file bắt đầu bằng `Native`, export `default` đúng dạng `TurboModuleRegistry.getEnforcing<Spec>('Tên')`.
- Chỉ dùng kiểu Codegen hiểu được (bảng dưới). Không dùng kiểu import từ file khác một cách phức tạp, không dùng `any`.
- `getEnforcing` ném lỗi ngay khi mở app nếu native không có module tên này — tốt hơn `get` (trả `null`, lỗi lộ ra muộn).

Thêm vào `package.json`:

```json
"codegenConfig": {
  "name": "NativeDemoDeviceSpec",
  "type": "modules",
  "jsSrcsDir": "specs",
  "android": { "javaPackageName": "com.nativedemo.device" },
  "ios": { "modulesProvider": { "NativeDemoDevice": "RCTNativeDemoDevice" } }
}
```

- `name`: tên thư viện code sinh ra (Android: tên lớp Java; iOS: tên thư mục header `NativeDemoDeviceSpec/NativeDemoDeviceSpec.h`).
- `javaPackageName`: package Kotlin của module bạn viết.
- `modulesProvider`: iOS ánh xạ tên module (`NativeDemoDevice`) sang lớp Objective-C (`RCTNativeDemoDevice`).

Kiểu dữ liệu đổi qua lại (tham khảo khi bạn viết module của mình):

| Spec TypeScript | Kotlin | Objective-C | Ghi chú |
|---|---|---|---|
| `string` | `String` | `NSString *` | |
| `number` | `Double` | `double` / `NSNumber *` | Luôn là số thực, kể cả khi bạn gửi 37 |
| `boolean` | `Boolean` | `BOOL` | |
| `Object` / kiểu object có tên | `ReadableMap` | `NSDictionary *` / struct C++ | Object có khai báo field rõ thì Codegen sinh kiểu chặt hơn |
| `Array<T>` | `ReadableArray` | `NSArray *` | |
| `Promise<T>` | tham số cuối `promise: Promise` | `resolve:` + `reject:` | JS nhận Promise |
| `(x: T) => void` | `Callback` | `RCTResponseSenderBlock` | Callback chỉ gọi được **một lần** |
| `CodegenTypes.EventEmitter<T>` | hàm `emitOnX(value)` có sẵn | `[self emitOnX:value]` | Gửi nhiều lần, JS đăng ký/hủy |

## 5. Bước 2: Android bằng Kotlin

**Module** — [NativeDemoDeviceModule.kt](../examples/rn-native-module/android/app/src/main/java/com/nativedemo/device/NativeDemoDeviceModule.kt):

```kotlin
class NativeDemoDeviceModule(private val reactContext: ReactApplicationContext) :
  NativeDemoDeviceSpec(reactContext) {

  private var receiver: BroadcastReceiver? = null

  override fun getName() = NAME

  override fun getDeviceName(): String = "${Build.MANUFACTURER} ${Build.MODEL}"

  override fun getBatteryLevel(promise: Promise) {
    val bm = reactContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
    val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    if (level < 0) {
      promise.reject("E_BATTERY_UNAVAILABLE", "Không đọc được pin")
    } else {
      promise.resolve(level.toDouble())
    }
  }

  override fun startBatteryUpdates() {
    if (receiver != null) return
    receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100)
        if (level >= 0) emitOnBatteryChanged(level * 100.0 / scale) // hàm emit do Codegen sinh
      }
    }
    reactContext.registerReceiver(receiver, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
  }

  override fun stopBatteryUpdates() {
    receiver?.let { reactContext.unregisterReceiver(it) }
    receiver = null
  }

  override fun invalidate() {   // app tắt hoặc reload JS: dọn listener
    stopBatteryUpdates()
    super.invalidate()
  }

  companion object {
    const val NAME = "NativeDemoDevice"
  }
}
```

- `NativeDemoDeviceSpec` là lớp **Codegen sinh ra**. Bạn `override` từng hàm trong spec. Spec có `Promise<number>` → Kotlin nhận thêm tham số `promise: Promise`.
- `promise.reject("MÃ", "thông điệp")`: phía JS nhận `error.code === 'E_BATTERY_UNAVAILABLE'`. Luôn đặt mã lỗi ổn định để JS xử lý theo mã, không theo câu chữ.
- `emitOnBatteryChanged(...)` cũng do Codegen sinh từ dòng `onBatteryChanged` trong spec.
- `invalidate()`: RN gọi khi module bị hủy (reload JS khi dev, tắt app). Không gỡ listener ở đây là rò rỉ.

**Package** — [NativeDemoDevicePackage.kt](../examples/rn-native-module/android/app/src/main/java/com/nativedemo/device/NativeDemoDevicePackage.kt):

```kotlin
class NativeDemoDevicePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == NativeDemoDeviceModule.NAME) NativeDemoDeviceModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      NativeDemoDeviceModule.NAME to ReactModuleInfo(
        name = NativeDemoDeviceModule.NAME,
        className = NativeDemoDeviceModule.NAME,
        canOverrideExistingModule = false,
        needsEagerInit = false,   // false: chỉ tạo khi JS gọi lần đầu
        isCxxModule = false,
        isTurboModule = true,
      ),
    )
  }
}
```

**Đăng ký** trong [MainApplication.kt](../examples/rn-native-module/android/app/src/main/java/com/nativedemo/MainApplication.kt) — module viết trong app không được autolink:

```kotlin
packageList =
  PackageList(this).packages.apply {
    // Module viết ngay trong app không được autolink: phải thêm tay.
    add(NativeDemoDevicePackage())
  },
```

Kiểm biên dịch mà chưa cần máy ảo:

```bash
cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

```
BUILD SUCCESSFUL
```

Code Codegen sinh ra nằm ở `android/app/build/generated/source/codegen/` — mở ra đọc khi không chắc chữ ký hàm phải viết thế nào.

## 6. Bước 3: iOS bằng Swift + lớp vỏ Objective-C++

Turbo Module trên iOS phải có một lớp Objective-C++ kế thừa lớp Codegen sinh ra. Logic thì viết bằng Swift; lớp vỏ chỉ chuyển lời gọi.

**Logic Swift** — [DemoDevice.swift](../examples/rn-native-module/ios/NativeDemo/DemoDevice.swift):

```swift
@objc(DemoDevice)
public final class DemoDevice: NSObject {
  private var observer: NSObjectProtocol?

  /// Gọi đồng bộ từ luồng JS, nên chỉ dùng API an toàn với mọi luồng (không đụng UIKit).
  @objc public func deviceName() -> String {
    var info = utsname()
    uname(&info)
    let machine = withUnsafeBytes(of: &info.machine) { raw in
      String(decoding: raw.prefix(while: { $0 != 0 }), as: UTF8.self)
    }
    return "Apple \(machine) iOS \(ProcessInfo.processInfo.operatingSystemVersionString)"
  }

  /// UIDevice là UIKit: phải đọc trên main thread, trả kết quả qua callback.
  /// Simulator không có pin nên batteryLevel = -1.
  @objc public func batteryLevel(completion: @escaping (Double) -> Void) {
    DispatchQueue.main.async {
      UIDevice.current.isBatteryMonitoringEnabled = true
      let level = UIDevice.current.batteryLevel
      completion(level < 0 ? -1 : Double(level) * 100)
    }
  }

  @objc public func startUpdates(_ onChange: @escaping (Double) -> Void) { /* NotificationCenter, xem file */ }
  @objc public func stopUpdates() { /* gỡ observer */ }
}
```

- `@objc public`: Objective-C chỉ thấy lớp/hàm Swift có hai từ khóa này.
- **Luồng:** hàm đồng bộ chạy trên luồng JS, Promise chạy trên hàng đợi của module — **không** phải main thread. API UIKit (`UIDevice`, `UIApplication`, mọi thứ vẽ giao diện) phải bọc `DispatchQueue.main.async`. Không bọc thì Xcode báo "Main Thread Checker" hoặc app thỉnh thoảng crash.
- Swift tự đổi tên `batteryLevel(completion:)` thành `batteryLevelWithCompletion:` khi Objective-C gọi.

**Lớp vỏ** — [RCTNativeDemoDevice.h](../examples/rn-native-module/ios/NativeDemo/RCTNativeDemoDevice.h) và [RCTNativeDemoDevice.mm](../examples/rn-native-module/ios/NativeDemo/RCTNativeDemoDevice.mm):

```objc
// .h
#import <NativeDemoDeviceSpec/NativeDemoDeviceSpec.h>
@interface RCTNativeDemoDevice : NativeDemoDeviceSpecBase <NativeDemoDeviceSpec>
@end
```

```objc
// .mm
#import "RCTNativeDemoDevice.h"
#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h> // phải đứng TRƯỚC header Swift (xem mục Lỗi)
#import "NativeDemo-Swift.h" // header Xcode tự sinh, chứa lớp Swift DemoDevice

@implementation RCTNativeDemoDevice {
  DemoDevice *_impl;
}

+ (NSString *)moduleName { return @"NativeDemoDevice"; }

- (instancetype)init
{
  if (self = [super init]) { _impl = [DemoDevice new]; }
  return self;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeDemoDeviceSpecJSI>(params);
}

- (NSString *)getDeviceName { return [_impl deviceName]; }

- (void)getBatteryLevel:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_impl batteryLevelWithCompletion:^(double level) {
    if (level < 0) {
      reject(@"E_BATTERY_UNAVAILABLE", @"Không đọc được pin (Simulator không có pin)", nil);
    } else {
      resolve(@(level));
    }
  }];
}

- (void)startBatteryUpdates
{
  __weak RCTNativeDemoDevice *weakSelf = self;   // tránh giữ module mãi trong closure
  [_impl startUpdates:^(double level) { [weakSelf emitOnBatteryChanged:@(level)]; }];
}

- (void)stopBatteryUpdates { [_impl stopUpdates]; }
- (void)invalidate { [_impl stopUpdates]; }

@end
```

- `getTurboModule:` là câu thần chú bắt buộc, chỉ đổi tên `NativeDemoDeviceSpecJSI` theo module của bạn.
- Chữ ký các hàm (`getBatteryLevel:reject:`, `emitOnBatteryChanged:(NSNumber *)`) lấy từ header Codegen sinh ra: `ios/build/generated/ios/ReactCodegen/NativeDemoDeviceSpec/NativeDemoDeviceSpec.h`.

**Thêm file vào Xcode.** File nằm trong thư mục chưa đủ — phải nằm trong **target** thì Xcode mới biên dịch. Cách tay: Xcode → chuột phải nhóm `NativeDemo` → *Add Files to "NativeDemo"…* → chọn 3 file, tick target `NativeDemo`. Lần đầu thêm file Swift vào project chỉ có Objective-C, Xcode hỏi tạo *bridging header*: project mẫu đã có `AppDelegate.swift` nên không hỏi.

Project mẫu làm bước này bằng script [add_ios_files.rb](../examples/rn-native-module/add_ios_files.rb) (gem `xcodeproj` đi kèm CocoaPods) để chạy lại được:

```bash
ruby add_ios_files.rb
cd ios && pod install     # chạy Codegen cho iOS
xcodebuild -workspace NativeDemo.xcworkspace -scheme NativeDemo -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 18 Pro' -derivedDataPath build build
```

```
** BUILD SUCCEEDED **
```

Luôn mở `.xcworkspace` (có Pods), không mở `.xcodeproj`.

## 7. Bước 4: dùng từ JS, bọc trong hook

[src/useBattery.ts](../examples/rn-native-module/src/useBattery.ts):

```ts
export function useBattery() {
  const [level, setLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    NativeDemoDevice.getBatteryLevel()
      .then(setLevel)
      .catch((e: { code?: string; message: string }) => setError(`${e.code ?? 'ERR'}: ${e.message}`));

    const sub = NativeDemoDevice.onBatteryChanged((value) => setLevel(value));
    NativeDemoDevice.startBatteryUpdates();
    return () => {
      sub.remove();                          // hủy đăng ký phía JS
      NativeDemoDevice.stopBatteryUpdates(); // hủy listener phía native
    };
  }, []);

  return { level, error };
}
```

Màn hình ([App.tsx](../examples/rn-native-module/App.tsx)) chỉ gọi `useBattery()` và `NativeDemoDevice.getDeviceName()`. Lý do bọc trong hook: màn hình không biết chi tiết native, và test chỉ cần giả **một** module.

Hàm dọn dẹp phải dọn **cả hai phía**. Chỉ `sub.remove()` thì BroadcastReceiver Android vẫn chạy và tốn pin; chỉ `stopBatteryUpdates()` thì JS vẫn giữ hàm cũ.

## 8. Bước 5: test bằng Jest, không cần máy ảo

Test chạy trên Node — không có Kotlin, không có Swift. Giả module theo đúng spec — [__tests__/useBattery.test.tsx](../examples/rn-native-module/__tests__/useBattery.test.tsx):

```tsx
// Biến dùng trong jest.mock() phải bắt đầu bằng `mock` (Jest đưa jest.mock lên đầu file).
let mockEmit: (v: number) => void = () => {};
const mockRemove = jest.fn();
const mockStop = jest.fn();
jest.mock('../specs/NativeDemoDevice', () => ({
  __esModule: true,
  default: {
    getDeviceName: () => 'Test Phone',
    getBatteryLevel: jest.fn(() => Promise.resolve(80)),
    startBatteryUpdates: jest.fn(),
    stopBatteryUpdates: () => mockStop(),
    onBatteryChanged: (cb: (v: number) => void) => {
      mockEmit = cb;
      return { remove: mockRemove };
    },
  },
}));

it('đọc pin lần đầu rồi cập nhật theo sự kiện native', async () => {
  const view = await render(<Probe />); // bản mới: render là async
  expect(await screen.findByText('80')).toBeTruthy();
  await act(async () => mockEmit(42));  // giả native bắn sự kiện
  expect(screen.getByText('42')).toBeTruthy();
  await view.unmount();
  expect(mockRemove).toHaveBeenCalled();
  expect(mockStop).toHaveBeenCalled();
});
```

```bash
npm test
```

```
  ✓ đọc pin lần đầu rồi cập nhật theo sự kiện native
  ✓ native reject: hiện mã lỗi
Tests:       2 passed, 2 total
```

Test thứ hai giả native `reject` với `code: 'E_BATTERY_UNAVAILABLE'` và kiểm màn hình hiện mã lỗi — đúng nhánh mà Simulator iOS chạy thật.

Jest chỉ chứng minh **phần JS** đúng. Phần native phải kiểm trên máy (mục 9), hoặc viết unit test native riêng (JUnit cho Kotlin, XCTest cho Swift) — tách logic khỏi lớp module để test được, giống cách project tách logic khỏi màn hình ở [learn-android-architecture.md](./learn-android-architecture.md).

## 9. Kiểm trên máy thật/máy ảo

Android — đọc chữ trên màn hình bằng `uiautomator` và đổi pin giả lập:

```bash
adb shell uiautomator dump /sdcard/ui.xml && adb shell cat /sdcard/ui.xml | grep -o 'text="[^"]*"'
adb emu power capacity 37      # đổi pin máy ảo → Android phát ACTION_BATTERY_CHANGED
```

Màn hình đổi từ `Pin: 100%` sang `Pin: 37%` mà JS không gọi gì: đó là sự kiện native gửi lên.

iOS — Simulator không có pin, nên bạn thấy nhánh lỗi. Thử nhánh có pin cần iPhone thật (Xcode → chọn máy → Run, cần tài khoản Apple để ký).

Debug native: Android Studio → *Open* thư mục `android/` → đặt breakpoint trong `NativeDemoDeviceModule.kt` → *Attach Debugger to Android Process*. Xcode → mở `ios/NativeDemo.xcworkspace` → breakpoint trong `DemoDevice.swift` → Run. Log: `Log.d("NativeDemo", …)` xem bằng `adb logcat -s NativeDemo`; Swift `print`/`os_log` xem trong cửa sổ Xcode.

## 10. Khi nào phải build lại

| Bạn sửa | Cần làm |
|---|---|
| File JS/TS bình thường | Không gì cả, Metro tự nạp lại |
| File spec (`specs/*.ts`) hoặc `codegenConfig` | Android: build lại. iOS: `pod install` rồi build lại |
| Kotlin / Swift / Objective-C++ | Build lại app (`run-android` / `run-ios`) |
| Thêm thư viện có code native | `npm install`, iOS `pod install`, build lại |
| Thêm file mới vào iOS | Thêm vào target trong Xcode, rồi build |

Lỗi "đã sửa mà không thấy gì" gần như luôn là sửa native mà chỉ reload JS.

## 11. Bước tiếp theo

- **Native UI component** (một `View` native nhúng vào màn hình RN, ví dụ bản đồ, trình phát video): cùng quy trình spec + Codegen nhưng `type: "components"` và spec dùng `codegenNativeComponent`. Chưa có trong project mẫu.
- **Đóng gói thành thư viện** dùng cho nhiều app: `npx create-react-native-library@latest`, chọn Turbo Module; khi đó autolinking tự đăng ký, không cần `add(...)` trong `MainApplication`.
- **Release build và ký app:** keystore Android, chứng chỉ iOS, Fastlane — xem [interview-react-native-senior.md](./interview-react-native-senior.md) mục 15–16.

## Lỗi hay gặp

Bảy lỗi đầu xuất hiện thật khi làm project mẫu.

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Build Android lỗi C++: `error: redefinition of 'NativeDeviceInfoSpecJSI'` … `FBReactNativeSpec.h: note: previous definition is here` | Đặt tên module trùng module lõi của RN (`NativeDeviceInfo`) | Đặt tên riêng có tiền tố (`NativeDemoDevice`), đổi đồng bộ spec, `codegenConfig`, Kotlin, iOS; xóa `android/app/build` rồi build lại |
| Xcode: `Build input file cannot be found: '…/ios/DemoDevice.swift'` | Thêm file vào nhóm Xcode với sai đường dẫn | Đường dẫn file tính từ `ios/`: `NativeDemo/DemoDevice.swift` |
| Xcode: `cannot find interface declaration for 'RCTDefaultReactNativeFactoryDelegate', superclass of 'SceneDelegate'` | `NativeDemo-Swift.h` chứa cả `SceneDelegate`; file `.mm` không bật Clang module nên `@import React_RCTAppDelegate` bị bỏ qua | `#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>` **trước** `#import "NativeDemo-Swift.h"` |
| iOS màn đỏ `No script URL provided … unsanitizedScriptURLString = (null)` | App tìm Metro ở 8081, Metro chạy cổng khác (hoặc chưa chạy) | `run-ios --port 8082`, hoặc `defaults write <bundle id> RCT_jsLocation localhost:8082` |
| `Port 8081 is being used by another process` | Docker/app khác chiếm cổng | `--port 8082` cho cả `start` và `run-android`/`run-ios` |
| Jest: `The module factory of jest.mock() is not allowed to reference any out-of-scope variables` | Dùng biến ngoài trong `jest.mock` | Đặt tên biến bắt đầu bằng `mock` |
| TypeScript: `Property 'unmount' does not exist on type 'Promise<…>'` | @testing-library/react-native mới: `render` trả Promise | `const view = await render(...)`, `await view.unmount()` |
| JS: `TurboModuleRegistry.getEnforcing(...): 'NativeDemoDevice' could not be found` | Android quên `add(Package())`; iOS thiếu `modulesProvider`, quên `pod install`, hoặc file `.mm` không nằm trong target | Kiểm lần lượt ba chỗ; build lại (không chỉ reload JS) |
| Kotlin: `Class 'XModule' is not abstract and does not implement abstract member` | Spec có hàm mà Kotlin chưa cài | Cài đủ hàm; đọc chữ ký trong `build/generated/source/codegen` |
| Xcode cảnh báo "Main Thread Checker: UI API called on a background thread" | Gọi UIKit từ luồng module | Bọc `DispatchQueue.main.async` |
| Sự kiện vẫn tới sau khi rời màn, pin tụt | Không gỡ listener native | Hàm dọn dẹp gọi `stop…`, cài `invalidate()` |

## Tự kiểm tra

1. Vì sao viết spec TypeScript trước khi viết Kotlin/Swift?
<details><summary>Đáp án</summary>Codegen sinh lớp cha cho Kotlin và Objective-C++ từ spec. Thiếu hàm hoặc sai kiểu thành lỗi biên dịch thay vì lỗi lúc chạy.</details>

2. Spec có `getBatteryLevel(): Promise<number>`. Hàm Kotlin trông thế nào?
<details><summary>Đáp án</summary>`override fun getBatteryLevel(promise: Promise)` — Promise thành tham số cuối; gọi `promise.resolve(...)` hoặc `promise.reject("MÃ", "thông điệp")`.</details>

3. Vì sao iOS cần file `.mm` dù logic viết bằng Swift?
<details><summary>Đáp án</summary>Codegen sinh lớp cơ sở và JSI bằng C++/Objective-C++. Lớp module phải kế thừa lớp đó và trả về đối tượng C++ trong `getTurboModule:` — Swift không làm được trực tiếp, nên cần lớp vỏ Objective-C++ gọi sang Swift.</details>

4. Hàm `getDeviceName()` đồng bộ có được gọi `UIDevice.current` không?
<details><summary>Đáp án</summary>Không nên: nó chạy trên luồng JS, còn UIDevice là UIKit (chỉ main thread). Project mẫu dùng `uname` và `ProcessInfo` an toàn với mọi luồng.</details>

5. Module viết trong `android/app/src/...` có được autolink không?
<details><summary>Đáp án</summary>Không. Autolink chỉ quét thư viện trong `node_modules`. Phải `add(NativeDemoDevicePackage())` trong `MainApplication`.</details>

6. Sửa spec thêm một hàm, nhấn reload trong app mà JS báo hàm không tồn tại. Vì sao?
<details><summary>Đáp án</summary>Spec đổi thì code native sinh ra phải sinh lại và biên dịch lại. Phải build lại app (iOS thêm `pod install`).</details>

7. Callback và EventEmitter khác nhau thế nào?
<details><summary>Đáp án</summary>Callback chỉ gọi được một lần cho một lời gọi. EventEmitter gửi được nhiều lần, JS đăng ký và hủy đăng ký (`sub.remove()`).</details>

## Bài tập

1. **Thêm hàm có tham số:** thêm `vibrate(ms: number): void` vào spec, cài Android bằng `Vibrator` (cần quyền `VIBRATE` trong `AndroidManifest.xml`), iOS bằng `UIImpactFeedbackGenerator` (trên main thread). Tự kiểm: build cả hai nền tảng thành công; Android rung trên máy ảo (xem `adb logcat`).
2. **Trả object:** thêm `getStorageInfo(): Promise<{ freeBytes: number; totalBytes: number }>`. Android: `StatFs(Environment.getDataDirectory().path)`, trả `Arguments.createMap()`; iOS: `FileManager.default.attributesOfFileSystem`. Tự kiểm: màn hình hiện dung lượng trống bằng GB.
3. **Lỗi có chủ đích:** xóa dòng `add(NativeDemoDevicePackage())`, build, mở app. Ghi lại thông báo lỗi trên màn hình, giải thích vì sao lỗi xuất hiện ngay khi mở (gợi ý: `getEnforcing`). Trả lại dòng đó.
4. **Kiểm rò rỉ:** comment dòng `NativeDemoDevice.stopBatteryUpdates()` trong hook, thêm `Log.d` trong `onReceive`. Mở/đóng màn hình nhiều lần (bọc `DeviceScreen` trong một nút ẩn/hiện) và đếm số dòng log mỗi lần đổi pin. Giải thích kết quả rồi sửa lại.
5. **Chuyển sang Expo:** trong một app Expo mới, chạy `npx create-expo-module@latest --local`, chuyển hàm `getDeviceName` và `getBatteryLevel` sang Expo Modules API (Kotlin + Swift, không cần `.mm`). So sánh số file và số dòng với bản Turbo Module.

## Luyện phỏng vấn

Câu hỏi về kiến trúc mới, Turbo Module, luồng, sự kiện: [interview-react-native-senior.md](./interview-react-native-senior.md#20-kiến-trúc-mới-và-native-module) (mục 20); Expo hay CLI: mục 1. Câu hỏi Android/iOS native: [interview-android.md](./interview-android.md), [interview-backend-android-rn-swift.md](./interview-backend-android-rn-swift.md#swift--ios).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **9. Mobile** — bài 13/16.

- Bài trước: [learn-react-native-build-app.md](./learn-react-native-build-app.md) — Làm một màn hình Expo trọn vẹn (Sổ từ của tôi): gọi API qua axios, đăng nhập, danh sách, form, test, chạy trên máy ảo
- **Bài tiếp: [learn-ml-mobile.md](./learn-ml-mobile.md)** — Machine learning trong app mobile: on-device, LLM, SRS thông minh

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
