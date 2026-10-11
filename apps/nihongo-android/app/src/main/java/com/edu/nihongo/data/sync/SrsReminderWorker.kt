package com.edu.nihongo.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.edu.nihongo.data.local.dao.SrsCardDao
import com.edu.nihongo.data.notifications.ReminderNotifier
import com.edu.nihongo.domain.TimeSource
import com.edu.nihongo.utils.millisUntilNext
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/** Mỗi tối: đếm thẻ đến hạn trong Room (không cần mạng) và nhắc nếu có. */
@HiltWorker
class SrsReminderWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val srsDao: SrsCardDao,
    private val notifier: ReminderNotifier,
    private val timeSource: TimeSource,
    private val widgetRefresher: WidgetRefresher,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val due = srsDao.countDue(timeSource.now())
        notifier.showDueCards(due)
        widgetRefresher.refresh()
        return Result.success()
    }
}

@Singleton
class ReminderScheduler @Inject constructor(
    @ApplicationContext private val context: Context,
    private val timeSource: TimeSource,
) {
    /**
     * Lặp mỗi 24 giờ, lần đầu vào [hour]:[minute] tối nay (hoặc mai). KEEP: mở app nhiều lần
     * không tạo thêm lịch và không làm lệch giờ nhắc.
     * WorkManager không hứa đúng phút (Doze có thể dời vài phút): với lời nhắc học bài là đủ;
     * cần đúng giờ tuyệt đối (báo thức) thì phải dùng AlarmManager.
     */
    fun scheduleDaily(hour: Int = DEFAULT_HOUR, minute: Int = 0) {
        val request = PeriodicWorkRequestBuilder<SrsReminderWorker>(24, TimeUnit.HOURS)
            .setInitialDelay(millisUntilNext(timeSource.now(), hour, minute), TimeUnit.MILLISECONDS)
            .build()
        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(UNIQUE_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    private companion object {
        const val UNIQUE_NAME = "srs-daily-reminder"
        const val DEFAULT_HOUR = 20
    }
}
