package com.edu.nihongo.utils

import kotlinx.coroutines.CancellationException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RunCatchingCancellableTest {
    @Test
    fun wrapsOrdinaryException() {
        val result = runCatchingCancellable { error("boom") }
        assertTrue(result.isFailure)
        assertEquals("boom", result.exceptionOrNull()?.message)
    }

    // L5: runCatching thường sẽ biến tín hiệu hủy thành Result.failure
    @Test(expected = CancellationException::class)
    fun rethrowsCancellation() {
        runCatchingCancellable { throw CancellationException("rời màn hình") }
    }
}
