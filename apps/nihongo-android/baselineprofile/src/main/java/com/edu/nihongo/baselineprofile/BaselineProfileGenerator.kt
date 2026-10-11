package com.edu.nihongo.baselineprofile

import androidx.benchmark.macro.junit4.BaselineProfileRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Direction
import androidx.test.uiautomator.Until
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Chạy các luồng người dùng hay đi nhất; ART ghi lại class/method được dùng. Danh sách đó
 * (baseline-prof.txt) được biên dịch AOT lúc cài, nên lần mở đầu không phải chạy thông dịch/JIT.
 *
 *   sh ./gradlew :app:generateReleaseBaselineProfile
 *
 * Kết quả: app/src/release/generated/baselineProfiles/baseline-prof.txt (commit vào git).
 */
@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {
    @get:Rule val rule = BaselineProfileRule()

    @Test
    fun generate() = rule.collect(packageName = PACKAGE) {
        pressHome()
        startActivityAndWait()

        // Home: cuộn danh sách tính năng
        device.wait(Until.hasObject(By.text("Bài học")), 5_000)
        device.findObject(By.scrollable(true))?.fling(Direction.DOWN)
        device.findObject(By.scrollable(true))?.fling(Direction.UP)

        // Luyện kana: hoàn toàn offline, không phụ thuộc backend
        device.findObject(By.scrollable(true))?.scrollUntil(Direction.DOWN, Until.findObject(By.text("Luyện kana")))?.click()
        device.wait(Until.hasObject(By.text("Hiragana")), 5_000)
        device.pressBack()
    }
}

const val PACKAGE = "com.edu.nihongo"
