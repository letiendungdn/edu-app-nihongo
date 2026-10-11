package com.edu.nihongo.data.sync

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.work.ListenableWorker
import androidx.work.WorkerFactory
import androidx.work.WorkerParameters
import androidx.work.testing.TestListenableWorkerBuilder
import com.edu.nihongo.data.local.AppDatabase
import com.edu.nihongo.data.local.entity.SrsCardEntity
import com.edu.nihongo.data.local.entity.VocabularyEntity
import com.edu.nihongo.data.notifications.ReminderNotifier
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Chạy SrsReminderWorker thật (Room in-memory thật, NotificationManager thật). Không chờ tới 20:00:
 * TestListenableWorkerBuilder gọi doWork() ngay. Ép job bằng `cmd jobscheduler run -f` không được,
 * vì WorkManager tự kiểm tra lịch và dừng ngay nếu work định kỳ chưa tới giờ.
 */
@RunWith(AndroidJUnit4::class)
class SrsReminderWorkerTest {
    private val context: Context = InstrumentationRegistry.getInstrumentation().targetContext
    private lateinit var db: AppDatabase
    private val notifications get() = context.getSystemService(NotificationManager::class.java)
    private val now = 1_800_000_000_000L
    private var widgetRefreshed = 0

    @Before
    fun setUp() {
        InstrumentationRegistry.getInstrumentation().uiAutomation
            .grantRuntimePermission(context.packageName, Manifest.permission.POST_NOTIFICATIONS)
        notifications.cancelAll()
        db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java).build()
    }

    @After
    fun tearDown() {
        db.close()
        notifications.cancelAll()
    }

    private fun worker(): SrsReminderWorker =
        TestListenableWorkerBuilder<SrsReminderWorker>(context)
            .setWorkerFactory(object : WorkerFactory() {
                override fun createWorker(appContext: Context, workerClassName: String, params: WorkerParameters): ListenableWorker =
                    SrsReminderWorker(
                        appContext, params, db.srsDao(), ReminderNotifier(appContext), { now },
                        object : WidgetRefresher { override suspend fun refresh() { widgetRefreshed++ } },
                    )
            })
            .build()

    private suspend fun seed(dueCount: Int, futureCount: Int) {
        val total = dueCount + futureCount
        db.vocabDao().upsertAll((1..total).map { VocabularyEntity(it.toLong(), 1, "か$it", null, "m", "ka", it) })
        db.srsDao().insertIfMissing(
            (1..total).map { i ->
                SrsCardEntity(id = i.toLong(), vocabularyId = i.toLong(), nextReviewAt = if (i <= dueCount) now - 1 else now + 86_400_000)
            },
        )
    }

    /** notify() đi qua hàng đợi của system_server: activeNotifications có thể chậm vài trăm ms. */
    private fun awaitNotifications(timeoutMs: Long = 3_000): List<android.service.notification.StatusBarNotification> {
        val end = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < end) {
            val active = notifications.activeNotifications
            if (active.isNotEmpty()) return active.toList()
            Thread.sleep(100)
        }
        return emptyList()
    }

    @Test
    fun dueCards_postNotificationWithCount() = runBlocking {
        seed(dueCount = 3, futureCount = 2)

        assertEquals(ListenableWorker.Result.success(), worker().doWork())

        assertTrue("app phải được phép gửi thông báo", ReminderNotifier(context).canNotify())
        val posted = awaitNotifications().single()
        assertTrue(posted.notification.extras.getString("android.text")!!.contains("3 thẻ"))
        assertEquals(1, widgetRefreshed)
    }

    @Test
    fun noDueCards_postsNothing() = runBlocking {
        seed(dueCount = 0, futureCount = 4)

        worker().doWork()

        assertTrue(awaitNotifications(timeoutMs = 1_000).isEmpty())
    }
}
