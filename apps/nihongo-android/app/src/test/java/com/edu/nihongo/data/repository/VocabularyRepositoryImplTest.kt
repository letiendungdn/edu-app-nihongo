package com.edu.nihongo.data.repository

import com.edu.nihongo.data.local.entity.SrsCardEntity
import com.edu.nihongo.data.local.entity.VocabularyEntity
import com.edu.nihongo.data.local.toDomain
import com.edu.nihongo.data.remote.VocabDto
import com.edu.nihongo.data.remote.VocabularyRemoteDataSource
import com.edu.nihongo.data.repository.VocabularyRepositoryImpl.Companion.REVIEW_TICK_MS
import com.edu.nihongo.testing.FakeNetworkStatus
import com.edu.nihongo.testing.FakeSrsCardDao
import com.edu.nihongo.testing.FakeSyncQueueDao
import com.edu.nihongo.testing.FakeSyncScheduler
import com.edu.nihongo.testing.FakeTokenStorage
import com.edu.nihongo.testing.FakeVocabularyApi
import com.edu.nihongo.testing.FakeVocabularyDao
import com.edu.nihongo.testing.FakeWidgetRefresher
import com.edu.nihongo.utils.SrsAlgorithm
import com.google.gson.Gson
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class VocabularyRepositoryImplTest {
    private val start = 1_700_000_000_000L

    private val vocabDao = FakeVocabularyDao()
    private val queueDao = FakeSyncQueueDao()
    private val srsDao = FakeSrsCardDao(vocabDao, queueDao)
    private val api = FakeVocabularyApi()
    private val network = FakeNetworkStatus()
    private val tokens = FakeTokenStorage()
    private val scheduler = FakeSyncScheduler()
    private val widget = FakeWidgetRefresher()

    private fun TestScope.repository() = VocabularyRepositoryImpl(
        vocabDao = vocabDao,
        srsDao = srsDao,
        syncQueueDao = queueDao,
        remote = VocabularyRemoteDataSource(api),
        network = network,
        tokenStore = tokens,
        gson = Gson(),
        // thời gian ảo của runTest: advanceTimeBy làm đồng hồ chạy theo
        timeSource = { start + testScheduler.currentTime },
        syncScheduler = scheduler,
        widgetRefresher = widget,
    )

    private suspend fun seedCard(id: Long, nextReviewAt: Long) {
        vocabDao.upsertAll(
            listOf(VocabularyEntity(id, 1, "ねこ", "猫", "con mèo", "neko", id.toInt(), updatedAt = start)),
        )
        srsDao.upsert(SrsCardEntity(id = id, vocabularyId = id, nextReviewAt = nextReviewAt, updatedAt = start))
    }

    // L1
    @Test
    fun reviewQueue_showsCardThatBecomesDueWhileScreenIsOpen() = runTest {
        seedCard(id = 1, nextReviewAt = start + 90_000) // đến hạn sau 1,5 phút
        val repo = repository()
        val emissions = mutableListOf<List<Long>>()
        backgroundScope.launch { repo.getReviewQueue().collect { list -> emissions += list.map { it.card.id } } }

        runCurrent()
        assertEquals(listOf(emptyList<Long>()), emissions)

        advanceTimeBy(2 * REVIEW_TICK_MS + 1)
        assertEquals(listOf(1L), emissions.last())
        assertTrue("query phải chạy lại với `now` mới", srsDao.queriedAt.distinct().size >= 3)
    }

    // L12: lưu máy không phụ thuộc mạng
    @Test
    fun updateSrsCard_savesLocallyAndSchedules_withoutCallingServer() = runTest {
        seedCard(id = 1, nextReviewAt = start)
        network.online = false
        val repo = repository()
        val card = srsDao.cards.value.getValue(1).toDomain()

        val result = repo.updateSrsCard(SrsAlgorithm.calculateNextReview(card, quality = 4, now = start))

        assertTrue(result.isSuccess)
        assertEquals("PENDING", srsDao.cards.value.getValue(1).syncStatus)
        assertEquals(1, queueDao.items.size)
        assertEquals(1, scheduler.scheduled)
        assertEquals("widget vẽ lại số thẻ cần ôn", 1, widget.refreshed)
        assertTrue(api.syncRequests.isEmpty())
    }

    // L12: chấm một thẻ nhiều lần chỉ giữ lần mới nhất
    @Test
    fun reviewingSameCardTwice_keepsOneQueueItem() = runTest {
        seedCard(id = 1, nextReviewAt = start)
        val repo = repository()
        val card = srsDao.cards.value.getValue(1).toDomain()

        repo.updateSrsCard(SrsAlgorithm.calculateNextReview(card, quality = 1, now = start))
        repo.updateSrsCard(SrsAlgorithm.calculateNextReview(card, quality = 5, now = start + 1))

        assertEquals(1, queueDao.items.size)
        repo.syncPendingReviews()
        assertEquals(1, api.syncRequests.single().items.size)
    }

    // L12: server lỗi thì giữ hàng đợi để lần sau gửi lại
    @Test
    fun serverError_keepsQueue_thenRetrySucceeds() = runTest {
        seedCard(id = 1, nextReviewAt = start)
        val repo = repository()
        repo.updateSrsCard(srsDao.cards.value.getValue(1).toDomain().copy(repetitions = 1))

        api.failSync = IllegalStateException("503")
        assertTrue(repo.syncPendingReviews().isFailure)
        assertEquals(1, queueDao.items.size)

        api.failSync = null
        assertTrue(repo.syncPendingReviews().isSuccess)
        assertTrue(queueDao.items.isEmpty())
        assertEquals("SYNCED", srsDao.cards.value.getValue(1).syncStatus)
    }

    // L12: hai lượt gửi cùng lúc không gửi trùng (Mutex)
    @Test
    fun concurrentSync_sendsOnce() = runTest {
        seedCard(id = 1, nextReviewAt = start)
        val repo = repository()
        repo.updateSrsCard(srsDao.cards.value.getValue(1).toDomain())
        api.onSync = { delay(1_000) } // giữ lượt đầu đang gửi

        launch { repo.syncPendingReviews() }
        launch { repo.syncPendingReviews() }
        advanceUntilIdle()

        assertEquals(1, api.syncRequests.size)
    }

    @Test
    fun notLoggedIn_doesNotCallServer() = runTest {
        seedCard(id = 1, nextReviewAt = start)
        tokens.token = null
        val repo = repository()
        repo.updateSrsCard(srsDao.cards.value.getValue(1).toDomain())

        assertTrue(repo.syncPendingReviews().isSuccess)
        assertTrue(api.syncRequests.isEmpty())
        assertEquals(1, queueDao.items.size)
    }

    @Test
    fun syncLesson_keepsProgressOfExistingCards() = runTest {
        seedCard(id = 1, nextReviewAt = start + 5 * SrsAlgorithm.DAY_MS)
        srsDao.upsert(srsDao.cards.value.getValue(1).copy(repetitions = 3, interval = 15))
        api.lessonItems = listOf(
            VocabDto(1, "ねこ", "猫", "con mèo", "neko"),
            VocabDto(2, "いぬ", "犬", "con chó", "inu"),
        )
        val repo = repository()

        assertTrue(repo.syncLesson(1).isSuccess)

        assertEquals(3, srsDao.cards.value.getValue(1).repetitions) // không bị ghi đè
        assertEquals(0, srsDao.cards.value.getValue(2).repetitions) // thẻ mới
    }

    @Test
    fun syncLesson_offline_fails() = runTest {
        network.online = false
        assertTrue(repository().syncLesson(1).isFailure)
    }
}
