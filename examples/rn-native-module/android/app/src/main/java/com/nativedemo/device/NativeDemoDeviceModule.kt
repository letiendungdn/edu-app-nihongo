package com.nativedemo.device

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

// NativeDemoDeviceSpec do Codegen sinh ra từ specs/NativeDemoDevice.ts.
// Thiếu hàm nào trong spec thì Kotlin báo lỗi biên dịch ngay — đó là lợi ích của Codegen.
class NativeDemoDeviceModule(private val reactContext: ReactApplicationContext) :
  NativeDemoDeviceSpec(reactContext) {

  private var receiver: BroadcastReceiver? = null

  override fun getName() = NAME

  override fun getDeviceName(): String = "${Build.MANUFACTURER} ${Build.MODEL}"

  override fun getBatteryLevel(promise: Promise) {
    val bm = reactContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
    val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    if (level < 0) {
      // Mã lỗi đến JS dưới dạng error.code
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

  // App tắt hoặc reload JS: dọn listener, không rò rỉ.
  override fun invalidate() {
    stopBatteryUpdates()
    super.invalidate()
  }

  companion object {
    const val NAME = "NativeDemoDevice"
  }
}
