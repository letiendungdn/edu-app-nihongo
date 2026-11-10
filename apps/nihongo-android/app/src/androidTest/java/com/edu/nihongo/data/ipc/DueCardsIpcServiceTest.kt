package com.edu.nihongo.data.ipc

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.os.Process
import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.edu.nihongo.data.local.AppDatabase
import com.edu.nihongo.data.local.entity.SrsCardEntity
import com.edu.nihongo.data.local.entity.VocabularyEntity
import com.edu.nihongo.ipc.IDueCardsService
import com.edu.nihongo.ipc.IDueCountCallback
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

/**
 * Lab Binder/AIDL chạy thật: test ở tiến trình chính, service ở tiến trình "com.edu.nihongo:ipc".
 * Dữ liệu ghi vào file DB thật từ tiến trình này; service đọc bằng Room của tiến trình kia.
 */
@RunWith(AndroidJUnit4::class)
class DueCardsIpcServiceTest {
    private val context: Context = InstrumentationRegistry.getInstrumentation().targetContext
    private lateinit var db: AppDatabase
    private var connection: ServiceConnection? = null

    @Before
    fun openDb() {
        db = Room.databaseBuilder(context, AppDatabase::class.java, AppDatabase.DB_NAME).build()
        cleanUp()
    }

    @After
    fun tearDown() {
        connection?.let { context.unbindService(it) }
        cleanUp()
        db.close()
    }

    /** bindService là bất đồng bộ: hệ thống tạo tiến trình :ipc, rồi mới gọi onServiceConnected. */
    private fun bind(): IDueCardsService {
        val connected = CountDownLatch(1)
        var service: IDueCardsService? = null
        val conn = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
                service = IDueCardsService.Stub.asInterface(binder) // binder là BinderProxy → bọc thành Proxy
                connected.countDown()
            }
            override fun onServiceDisconnected(name: ComponentName?) = Unit
        }
        assertTrue(context.bindService(Intent(context, DueCardsIpcService::class.java), conn, Context.BIND_AUTO_CREATE))
        assertTrue("Không kết nối được service trong 15 giây", connected.await(15, TimeUnit.SECONDS))
        connection = conn
        return service!!
    }

    @Test
    fun serviceRunsInItsOwnProcess() {
        val servicePid = bind().servicePid
        assertNotEquals("Service phải chạy ở tiến trình khác", Process.myPid(), servicePid)
        // Cùng UID nên đọc được /proc/<pid>/cmdline của tiến trình kia
        val name = File("/proc/$servicePid/cmdline").readText().trimEnd(Char(0))
        assertEquals("${context.packageName}:ipc", name)
    }

    @Test
    fun syncCall_seesRowsWrittenByAnotherProcess() {
        val service = bind()
        val now = System.currentTimeMillis()
        val before = service.getDueCount(now)

        seed(now, dueCount = 2, futureCount = 1)

        assertEquals(before + 2, service.getDueCount(now))
    }

    @Test
    fun onewayCall_returnsThroughCallback() {
        val service = bind()
        val now = System.currentTimeMillis()
        seed(now, dueCount = 3, futureCount = 0)
        val expected = service.getDueCount(now)

        val done = CountDownLatch(1)
        val result = AtomicInteger(-1)
        val pid = AtomicInteger(-1)
        // Callback là Binder do tiến trình test tạo; service gọi ngược về trên luồng Binder của tiến trình này
        service.requestDueCount(now, object : IDueCountCallback.Stub() {
            override fun onResult(dueCount: Int, servicePid: Int) {
                result.set(dueCount)
                pid.set(servicePid)
                done.countDown()
            }
        })

        assertTrue("Callback không về trong 10 giây", done.await(10, TimeUnit.SECONDS))
        assertEquals(expected, result.get())
        assertNotEquals(Process.myPid(), pid.get())
    }

    private fun seed(now: Long, dueCount: Int, futureCount: Int) = runBlocking {
        val ids = (1..dueCount + futureCount).map { BASE_ID + it }
        db.vocabDao().upsertAll(ids.mapIndexed { i, id -> VocabularyEntity(id, TEST_LESSON, "か$i", null, "m", "ka", i) })
        db.srsDao().insertIfMissing(
            ids.mapIndexed { i, id ->
                SrsCardEntity(id = id, vocabularyId = id, nextReviewAt = if (i < dueCount) now - 1 else now + 86_400_000)
            },
        )
    }

    private fun cleanUp() {
        val sql = db.openHelper.writableDatabase
        sql.execSQL("DELETE FROM srs_card WHERE id > $BASE_ID AND id < ${BASE_ID + 100}")
        sql.execSQL("DELETE FROM vocabulary WHERE id > $BASE_ID AND id < ${BASE_ID + 100}")
    }

    private companion object {
        /** Id riêng của test, không đụng dữ liệu thật đã sync. */
        const val BASE_ID = 9_100_000L
        const val TEST_LESSON = 9_999
    }
}
