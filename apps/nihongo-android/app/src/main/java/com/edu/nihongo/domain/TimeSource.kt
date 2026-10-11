package com.edu.nihongo.domain

/**
 * Nguồn thời gian (epoch millis). Inject thay vì gọi thẳng `System.currentTimeMillis()`
 * để test điều khiển được thời gian.
 */
fun interface TimeSource {
    fun now(): Long
}
