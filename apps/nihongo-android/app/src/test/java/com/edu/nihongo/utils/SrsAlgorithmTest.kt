package com.edu.nihongo.utils

import com.edu.nihongo.domain.entity.SrsCard
import com.edu.nihongo.domain.entity.SyncStatus
import com.edu.nihongo.utils.SrsAlgorithm.DAY_MS
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SrsAlgorithmTest {
    // Thời gian cố định: kết quả chính xác tuyệt đối, không cần sai số
    private val now = 1_700_000_000_000L

    private fun card(
        easeFactor: Float = 2.5f,
        interval: Int = 0,
        repetitions: Int = 0,
        mastered: Boolean = false,
    ) = SrsCard(
        id = 1L,
        vocabularyId = 10L,
        easeFactor = easeFactor,
        interval = interval,
        repetitions = repetitions,
        nextReviewAt = 0L,
        mastered = mastered,
        syncStatus = SyncStatus.SYNCED,
        updatedAt = 0L,
    )

    private fun review(card: SrsCard, quality: Int) =
        SrsAlgorithm.calculateNextReview(card, quality, now)

    @Test
    fun qualityBelowThree_resetsRepetitionsAndInterval() {
        val next = review(card(repetitions = 4, interval = 15), quality = 2)
        assertEquals(0, next.repetitions)
        assertEquals(1, next.interval)
        assertFalse(next.mastered)
        assertEquals(SyncStatus.PENDING, next.syncStatus)
    }

    @Test
    fun clampsNegativeQualityAsAgain() {
        val next = review(card(repetitions = 3, interval = 10), quality = -2)
        assertEquals(0, next.repetitions)
        assertEquals(1, next.interval)
    }

    @Test
    fun firstSuccess_usesIntervalOne() {
        val next = review(card(), quality = 4)
        assertEquals(1, next.repetitions)
        assertEquals(1, next.interval)
    }

    @Test
    fun secondSuccess_usesIntervalSix() {
        val next = review(card(repetitions = 1, interval = 1), quality = 4)
        assertEquals(2, next.repetitions)
        assertEquals(6, next.interval)
    }

    @Test
    fun laterSuccess_multipliesByEase() {
        val next = review(card(repetitions = 2, interval = 6, easeFactor = 2.5f), quality = 4)
        assertEquals(3, next.repetitions)
        assertEquals(15, next.interval)
    }

    @Test
    fun easeFactor_neverBelowMinimum() {
        val next = review(card(easeFactor = 1.3f), quality = 0)
        assertEquals(1.3f, next.easeFactor, 0f)
    }

    @Test
    fun mastered_whenRepsAndIntervalMeetThreshold() {
        val next = review(card(repetitions = 4, interval = 21, easeFactor = 2.5f), quality = 5)
        assertEquals(5, next.repetitions)
        assertTrue(next.interval >= 21)
        assertTrue(next.mastered)
    }

    @Test
    fun nextReviewAt_isExactlyIntervalDaysAfterNow() {
        val next = review(card(repetitions = 1, interval = 1), quality = 4)
        assertEquals(now + 6 * DAY_MS, next.nextReviewAt)
        assertEquals(now, next.updatedAt)
    }
}
