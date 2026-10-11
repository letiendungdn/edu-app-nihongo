package com.edu.nihongo.utils

import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

class ReminderTimeTest {
    private val hcm = TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
    private val hour = 3_600_000L

    private fun at(zone: TimeZone, y: Int, m: Int, d: Int, h: Int, min: Int = 0): Long =
        Calendar.getInstance(zone).apply { clear(); set(y, m - 1, d, h, min) }.timeInMillis

    @Test
    fun beforeTarget_waitsUntilTonight() {
        assertEquals(2 * hour, millisUntilNext(at(hcm, 2026, 10, 11, 18), 20, 0, hcm))
    }

    @Test
    fun afterTarget_waitsUntilTomorrow() {
        assertEquals(23 * hour, millisUntilNext(at(hcm, 2026, 10, 11, 21), 20, 0, hcm))
    }

    @Test
    fun exactlyAtTarget_schedulesNextDay_notZero() {
        assertEquals(24 * hour, millisUntilNext(at(hcm, 2026, 10, 11, 20), 20, 0, hcm))
    }

    // Châu Âu đổi giờ mùa hè đêm 29/3/2026: ngày đó chỉ có 23 giờ. Vẫn nhắc đúng 20:00 giờ địa phương.
    @Test
    fun daylightSavingDay_keepsLocalTime() {
        val berlin = TimeZone.getTimeZone("Europe/Berlin")
        val now = at(berlin, 2026, 3, 28, 21)
        assertEquals(22 * hour, millisUntilNext(now, 20, 0, berlin))
    }
}
