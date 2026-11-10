package com.edu.nihongo.data.ipc

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.os.Process
import android.os.RemoteException
import android.util.Log
import com.edu.nihongo.data.local.dao.SrsCardDao
import com.edu.nihongo.ipc.IDueCardsService
import com.edu.nihongo.ipc.IDueCountCallback
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import javax.inject.Inject

/**
 * Bound service chạy ở tiến trình riêng `com.edu.nihongo:ipc` (manifest: android:process=":ipc").
 * Mục đích là LAB học Binder/AIDL (docs/learn-android-framework.md), không phải tính năng cho người dùng.
 *
 * - Hilt vẫn dùng được: tiến trình mới có Application riêng (EduApp chạy lại onCreate), Hilt tạo
 *   component riêng cho tiến trình đó, nên đây là MỘT bản Room/DAO khác với tiến trình chính.
 * - exported=false: chỉ app cùng UID (chính app này) bind được. Không cần tự kiểm quyền người gọi.
 */
@AndroidEntryPoint
class DueCardsIpcService : Service() {

    @Inject lateinit var srsDao: SrsCardDao

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val binder = object : IDueCardsService.Stub() {
        // Các hàm Stub chạy trên THREAD POOL CỦA BINDER trong tiến trình :ipc, không phải main thread.
        // Vì vậy runBlocking ở đây chấp nhận được: nó chặn một luồng Binder, không chặn giao diện.
        override fun getDueCount(nowMillis: Long): Int = runBlocking { srsDao.countDue(nowMillis) }

        override fun getServicePid(): Int = Process.myPid()

        override fun requestDueCount(nowMillis: Long, callback: IDueCountCallback?) {
            if (callback == null) return
            scope.launch {
                val count = srsDao.countDue(nowMillis)
                try {
                    callback.onResult(count, Process.myPid())
                } catch (e: RemoteException) {
                    // DeadObjectException: tiến trình client đã chết trước khi nhận kết quả. Bỏ qua.
                    Log.w(TAG, "Client không còn để nhận kết quả", e)
                }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private companion object {
        const val TAG = "DueCardsIpcService"
    }
}
