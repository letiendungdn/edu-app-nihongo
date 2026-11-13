# NativeDemo — Turbo Module bằng Kotlin và Swift

App React Native CLI (0.88) đi kèm [docs/learn-react-native-native-code.md](../../docs/learn-react-native-native-code.md).

```bash
npm install
npm test                                   # test JS (không cần máy ảo)

npx react-native start --port 8082         # Metro
npx react-native run-android --port 8082 --no-packager --active-arch-only

cd ios && pod install && cd ..
npx react-native run-ios --port 8082
```

| File | Vai trò |
|---|---|
| `specs/NativeDemoDevice.ts` | Spec cho Codegen (hợp đồng JS ↔ native) |
| `android/app/src/main/java/com/nativedemo/device/` | Module + Package bằng Kotlin |
| `ios/NativeDemo/DemoDevice.swift` | Logic iOS bằng Swift |
| `ios/NativeDemo/RCTNativeDemoDevice.{h,mm}` | Lớp vỏ Objective-C++ nối Codegen với Swift |
| `add_ios_files.rb` | Thêm 3 file iOS vào target Xcode (thay cho kéo thả) |
| `src/useBattery.ts`, `__tests__/` | Hook bọc module và test Jest |
