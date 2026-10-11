package com.edu.nihongo.utils

import java.util.Calendar
import java.util.TimeZone

/**
 * Bao lâu nữa tới lần [hour]:[minute] kế tiếp theo giờ địa phương. Hàm thuần để test được.
 * Dùng Calendar (không phải java.time) vì minSdk 24 chưa có java.time.
 * Đúng cả ngày đổi giờ mùa hè: Calendar cộng "1 ngày lịch", không phải cứng 24 giờ.
 */
fun millisUntilNext(nowMillis: Long, hour: Int, minute: Int, zone: TimeZone = TimeZone.getDefault()): Long {
    val target = Calendar.getInstance(zone).apply {
        timeInMillis = nowMillis
        set(Calendar.HOUR_OF_DAY, hour)
        set(Calendar.MINUTE, minute)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
        if (timeInMillis <= nowMillis) add(Calendar.DAY_OF_YEAR, 1)
    }
    return target.timeInMillis - nowMillis
}
