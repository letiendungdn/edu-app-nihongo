package com.edu.nihongo.data.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.edu.nihongo.MainActivity
import com.edu.nihongo.R
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/** Deep link mở thẳng màn ôn tập; NavHost khai báo cùng URI này cho route SRS. */
const val SRS_DEEP_LINK = "nihongo://srs"

@Singleton
class ReminderNotifier @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    /**
     * Android 8+: thông báo phải thuộc một channel. Tạo nhiều lần không sao (idempotent),
     * người dùng tắt channel trong Settings thì app không bật lại được, đúng ý muốn.
     */
    fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Nhắc ôn tập",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = "Nhắc khi có thẻ SRS đến hạn ôn" }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    /** Android 13+ cần quyền POST_NOTIFICATIONS lúc chạy; chưa cấp thì im lặng bỏ qua. */
    fun canNotify(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED

    fun showDueCards(count: Int) {
        if (count <= 0 || !canNotify()) return
        ensureChannel()

        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(SRS_DEEP_LINK), context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        val pending = PendingIntent.getActivity(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Ôn tập hôm nay")
            .setContentText("Bạn có $count thẻ cần ôn. Ôn ngay để giữ chuỗi ngày học!")
            .setContentIntent(pending)
            .setAutoCancel(true)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
        } catch (_: SecurityException) {
            // Người dùng thu hồi quyền giữa lúc kiểm tra và lúc gửi
        }
    }

    private companion object {
        const val CHANNEL_ID = "srs-reminder"
        const val NOTIFICATION_ID = 1001
        const val REQUEST_CODE = 1001
    }
}
