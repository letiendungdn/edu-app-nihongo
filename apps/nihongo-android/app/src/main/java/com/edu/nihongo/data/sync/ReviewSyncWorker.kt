package com.edu.nihongo.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.edu.nihongo.domain.repository.VocabularyRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Gửi hàng đợi ôn tập. WorkManager chỉ chạy khi có mạng, chạy được cả khi app đã đóng,
 * và tự thử lại (backoff tăng dần) khi server lỗi.
 */
@HiltWorker
class ReviewSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val repository: VocabularyRepository,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result =
        repository.syncPendingReviews().fold(
            onSuccess = { Result.success() },
            onFailure = { if (runAttemptCount < MAX_ATTEMPTS) Result.retry() else Result.failure() },
        )

    private companion object {
        const val MAX_ATTEMPTS = 8
    }
}

@Singleton
class WorkManagerSyncScheduler @Inject constructor(
    @ApplicationContext private val context: Context,
) : SyncScheduler {
    override fun schedulePendingSync() {
        val request = OneTimeWorkRequestBuilder<ReviewSyncWorker>()
            .setConstraints(
                Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build(),
            )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        // KEEP: đã có lượt chờ thì thôi. Lượt đó đọc hàng đợi lúc chạy nên gửi luôn item mới;
        // item thêm vào giữa lúc đang gửi thì syncPendingReviews tự lặp thêm vòng.
        WorkManager.getInstance(context)
            .enqueueUniqueWork(UNIQUE_NAME, ExistingWorkPolicy.KEEP, request)
    }

    private companion object {
        const val UNIQUE_NAME = "srs-review-sync"
    }
}
