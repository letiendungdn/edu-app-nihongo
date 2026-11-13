import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Hợp đồng giữa JS và native. Codegen đọc file này để sinh code Kotlin/Java và Objective-C++.
// Đổi file này thì phải build lại app (không chỉ reload JS).
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
// Tên 'NativeDemoDevice' phải khớp với NAME bên Kotlin và khóa modulesProvider bên iOS.
export default TurboModuleRegistry.getEnforcing<Spec>('NativeDemoDevice');
