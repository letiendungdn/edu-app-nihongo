package com.edu.nihongo.data.live

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.edu.nihongo.MainActivity
import com.edu.nihongo.R
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Giữ cuộc gọi live khi app xuống nền.
 *
 * Bản cũ không có service: người dùng bấm Home giữa buổi live → từ Android 14 app ở nền mất quyền
 * dùng camera/micro (mất hình, mất tiếng) và tiến trình dễ bị giết. Foreground service loại
 * camera|microphone cho hệ thống biết app đang dùng chúng có chủ đích, kèm thông báo đang chạy.
 */
class LiveCallService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        ensureChannel(this)
        val open = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Đang phát live")
            .setContentText("Camera và micro đang bật. Mở app để kết thúc.")
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setContentIntent(open)
            .build()
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, foregroundTypes())
        } catch (e: RuntimeException) {
            // Android 14: thiếu quyền CAMERA/RECORD_AUDIO lúc này → SecurityException;
            // Android 12+: gọi khi app đã ở nền → ForegroundServiceStartNotAllowedException.
            stopSelf()
        }
        return START_NOT_STICKY // tiến trình bị giết thì cuộc gọi cũng đã mất, không tự khởi động lại
    }

    private fun foregroundTypes(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
        } else {
            0
        }

    companion object {
        const val CHANNEL_ID = "live-call"
        const val NOTIFICATION_ID = 2001

        fun ensureChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val channel = NotificationChannel(CHANNEL_ID, "Buổi live", NotificationManager.IMPORTANCE_LOW)
                .apply { description = "Hiện khi đang phát live (camera và micro đang bật)" }
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}

/** Bật / tắt việc giữ cuộc gọi chạy nền. Interface để ViewModel test được bằng bản giả. */
interface LiveCallKeeper {
    /** false = chưa đủ quyền camera/micro nên không bật (Android 14 sẽ ném SecurityException). */
    fun start(): Boolean
    fun stop()
}

@Singleton
class ServiceLiveCallKeeper @Inject constructor(
    @ApplicationContext private val context: Context,
) : LiveCallKeeper {
    override fun start(): Boolean {
        val granted = listOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO).all {
            ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
        }
        if (!granted) return false
        return runCatching {
            ContextCompat.startForegroundService(context, Intent(context, LiveCallService::class.java))
        }.isSuccess
    }

    override fun stop() {
        context.stopService(Intent(context, LiveCallService::class.java))
    }
}
