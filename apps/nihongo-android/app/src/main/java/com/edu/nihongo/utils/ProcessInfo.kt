package com.edu.nihongo.utils

import android.app.Application
import android.os.Build
import java.io.File

/**
 * Tên tiến trình hiện tại, ví dụ "com.edu.nihongo" hoặc "com.edu.nihongo:ipc".
 * API 28+ có sẵn Application.getProcessName(); minSdk 24 nên bản cũ đọc /proc/self/cmdline.
 */
fun currentProcessName(): String =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        Application.getProcessName()
    } else {
        File("/proc/self/cmdline").readText().trimEnd(Char(0))
    }

/** Tiến trình chính là tiến trình có tên đúng bằng applicationId (không có hậu tố ":tên"). */
fun isMainProcess(processName: String, packageName: String): Boolean = processName == packageName
