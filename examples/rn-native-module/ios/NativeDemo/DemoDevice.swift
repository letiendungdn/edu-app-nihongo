import Foundation
import UIKit

/// Logic native viết bằng Swift. JS không gọi thẳng lớp này: lớp vỏ RCTNativeDemoDevice.mm gọi nó.
/// `@objc public` để Objective-C++ thấy được qua header tự sinh "NativeDemo-Swift.h".
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

  @objc public func startUpdates(_ onChange: @escaping (Double) -> Void) {
    DispatchQueue.main.async {
      guard self.observer == nil else { return }
      UIDevice.current.isBatteryMonitoringEnabled = true
      self.observer = NotificationCenter.default.addObserver(
        forName: UIDevice.batteryLevelDidChangeNotification, object: nil, queue: .main
      ) { _ in
        let level = UIDevice.current.batteryLevel
        if level >= 0 { onChange(Double(level) * 100) }
      }
    }
  }

  @objc public func stopUpdates() {
    DispatchQueue.main.async {
      if let observer = self.observer { NotificationCenter.default.removeObserver(observer) }
      self.observer = nil
    }
  }
}
