package com.edu.nihongo.data.sync

/** Hẹn giờ gửi hàng đợi ôn tập lên server. Bản thật dùng WorkManager. */
interface SyncScheduler {
    fun schedulePendingSync()
}
