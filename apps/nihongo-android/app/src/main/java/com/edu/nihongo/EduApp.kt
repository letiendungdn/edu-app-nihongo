package com.edu.nihongo

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.edu.nihongo.data.notifications.ReminderNotifier
import com.edu.nihongo.data.sync.ReminderScheduler
import com.edu.nihongo.data.sync.SyncScheduler
import com.edu.nihongo.utils.TtsHelper
import com.edu.nihongo.utils.currentProcessName
import com.edu.nihongo.utils.isMainProcess
import dagger.hilt.android.HiltAndroidApp
import io.livekit.android.LiveKit
import javax.inject.Inject

@HiltAndroidApp
class EduApp : Application(), Configuration.Provider {
    // Để Worker nhận dependency qua Hilt (@HiltWorker). Manifest tắt initializer mặc định.
    @Inject lateinit var workerFactory: HiltWorkerFactory
    @Inject lateinit var syncScheduler: SyncScheduler
    @Inject lateinit var reminderScheduler: ReminderScheduler
    @Inject lateinit var reminderNotifier: ReminderNotifier

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder().setWorkerFactory(workerFactory).build()

    override fun onCreate() {
        super.onCreate()
        // App có thêm tiến trình ":ipc" (DueCardsIpcService, lab AIDL). Mỗi tiến trình chạy lại
        // Application.onCreate: không chặn ở đây thì tiến trình phụ cũng khởi tạo LiveKit, TTS và
        // hẹn lại WorkManager, vừa tốn bộ nhớ vừa có hai nơi cùng hẹn việc nền.
        if (!isMainProcess(currentProcessName(), packageName)) return
        LiveKit.init(this)
        TtsHelper.init(this)
        // Gửi nốt lần ôn còn tồn từ phiên trước (chỉ chạy khi có mạng)
        syncScheduler.schedulePendingSync()
        // Nhắc ôn mỗi tối 20:00; quyền POST_NOTIFICATIONS xin ở màn Home
        reminderNotifier.ensureChannel()
        reminderScheduler.scheduleDaily()
    }
}
