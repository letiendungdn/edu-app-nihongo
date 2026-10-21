package com.edu.nihongo_app

import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine

// flutter_stripe cần FragmentActivity để mở bảng Google Pay
class MainActivity : FlutterFragmentActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        NativePerfPlugin.register(flutterEngine)
    }
}
