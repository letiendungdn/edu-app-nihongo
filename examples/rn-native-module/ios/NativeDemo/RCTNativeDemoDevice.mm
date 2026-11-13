#import "RCTNativeDemoDevice.h"
// Header Swift tự sinh chứa MỌI lớp @objc của app, kể cả SceneDelegate (kế thừa lớp React).
// File .mm không bật Clang module nên `@import React_RCTAppDelegate` trong header đó bị bỏ qua:
// phải import header React này TRƯỚC, nếu không sẽ lỗi "cannot find interface declaration".
#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "NativeDemo-Swift.h" // header Xcode tự sinh, chứa lớp Swift DemoDevice

// Lớp vỏ Objective-C++: nhận lời gọi từ JS (qua C++ Codegen), chuyển sang Swift.
@implementation RCTNativeDemoDevice {
  DemoDevice *_impl;
}

+ (NSString *)moduleName
{
  return @"NativeDemoDevice"; // khớp TurboModuleRegistry.getEnforcing('NativeDemoDevice')
}

- (instancetype)init
{
  if (self = [super init]) {
    _impl = [DemoDevice new];
  }
  return self;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeDemoDeviceSpecJSI>(params);
}

- (NSString *)getDeviceName
{
  return [_impl deviceName];
}

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
  __weak RCTNativeDemoDevice *weakSelf = self;
  [_impl startUpdates:^(double level) {
    [weakSelf emitOnBatteryChanged:@(level)]; // hàm emit do Codegen sinh trong SpecBase
  }];
}

- (void)stopBatteryUpdates
{
  [_impl stopUpdates];
}

- (void)invalidate
{
  [_impl stopUpdates];
}

@end
