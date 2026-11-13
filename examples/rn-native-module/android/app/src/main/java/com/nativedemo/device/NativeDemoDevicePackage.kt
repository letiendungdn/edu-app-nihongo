package com.nativedemo.device

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

// Package cho React Native biết module nào tồn tại và tạo nó khi JS gọi lần đầu (lazy).
class NativeDemoDevicePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == NativeDemoDeviceModule.NAME) NativeDemoDeviceModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      NativeDemoDeviceModule.NAME to ReactModuleInfo(
        name = NativeDemoDeviceModule.NAME,
        className = NativeDemoDeviceModule.NAME,
        canOverrideExistingModule = false,
        needsEagerInit = false,
        isCxxModule = false,
        isTurboModule = true,
      ),
    )
  }
}
