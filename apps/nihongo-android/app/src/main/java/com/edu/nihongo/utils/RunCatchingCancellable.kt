package com.edu.nihongo.utils

import kotlin.coroutines.cancellation.CancellationException

/**
 * Giống `runCatching` nhưng ném lại [CancellationException].
 *
 * `runCatching` bắt mọi Throwable, kể cả tín hiệu hủy của coroutine: coroutine đã bị hủy
 * (rời màn hình) sẽ chạy tiếp như chưa có gì. Dùng hàm này trong mọi code `suspend`.
 */
inline fun <T> runCatchingCancellable(block: () -> T): Result<T> =
    try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(e)
    }
