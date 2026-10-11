package com.edu.nihongo.testing

import com.edu.nihongo.data.NetworkStatus
import com.edu.nihongo.data.local.TokenStorage
import com.edu.nihongo.data.local.dao.ReviewRow
import com.edu.nihongo.data.local.dao.SrsCardDao
import com.edu.nihongo.data.local.dao.SyncQueueDao
import com.edu.nihongo.data.local.dao.VocabularyDao
import com.edu.nihongo.data.local.entity.SrsCardEntity
import com.edu.nihongo.data.local.entity.SyncQueueEntity
import com.edu.nihongo.data.local.entity.VocabularyEntity
import com.edu.nihongo.data.remote.ApiEnvelope
import com.edu.nihongo.data.remote.ReviewSyncRequest
import com.edu.nihongo.data.remote.VocabDto
import com.edu.nihongo.data.remote.VocabPageDto
import com.edu.nihongo.data.remote.VocabularyApi
import com.edu.nihongo.data.sync.SyncScheduler
import com.edu.nihongo.data.sync.WidgetRefresher
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map

class FakeTokenStorage(var token: String? = "token", var refreshCookie: String? = null) : TokenStorage {
    override suspend fun get(): String? = token
    override suspend fun save(token: String) { this.token = token }
    override suspend fun clear() { token = null }
    override suspend fun getRefreshCookie(): String? = refreshCookie
    override suspend fun saveRefreshCookie(raw: String) { refreshCookie = raw }
    override suspend fun clearRefreshCookie() { refreshCookie = null }
}

class FakeNetworkStatus(var online: Boolean = true) : NetworkStatus {
    override fun isOnline(): Boolean = online
    override val isOnlineFlow: Flow<Boolean> get() = flowOf(online)
}

class FakeSyncScheduler : SyncScheduler {
    var scheduled = 0
    override fun schedulePendingSync() { scheduled++ }
}

class FakeWidgetRefresher : WidgetRefresher {
    var refreshed = 0
    override suspend fun refresh() { refreshed++ }
}

class FakeVocabularyDao : VocabularyDao {
    val rows = MutableStateFlow<Map<Long, VocabularyEntity>>(emptyMap())

    override fun getByLesson(lessonNumber: Int): Flow<List<VocabularyEntity>> =
        rows.map { all -> all.values.filter { it.lessonNumber == lessonNumber }.sortedBy { it.sortOrder } }

    override suspend fun upsertAll(items: List<VocabularyEntity>) {
        rows.value = rows.value + items.associateBy { it.id }
    }

    override suspend fun getById(id: Long): VocabularyEntity? = rows.value[id]
}

class FakeSyncQueueDao : SyncQueueDao() {
    val items = mutableListOf<SyncQueueEntity>()
    private var nextId = 1L

    override suspend fun enqueue(item: SyncQueueEntity) {
        items += item.copy(id = nextId++)
    }

    override suspend fun getPending(): List<SyncQueueEntity> = items.sortedBy { it.createdAt }

    override suspend fun delete(id: Long) {
        items.removeAll { it.id == id }
    }

    override suspend fun deleteByEntityId(operation: String, entityId: Long) {
        items.removeAll { it.operation == operation && it.entityId == entityId }
    }
}

/** Mô phỏng SQL của SrsCardDao trên bộ nhớ, kể cả điều kiện `next_review_at <= :now`. */
class FakeSrsCardDao(
    private val vocab: FakeVocabularyDao,
    private val queue: FakeSyncQueueDao,
) : SrsCardDao {
    val cards = MutableStateFlow<Map<Long, SrsCardEntity>>(emptyMap())
    val queriedAt = mutableListOf<Long>()

    override fun getReviewQueue(now: Long, limit: Int): Flow<List<ReviewRow>> {
        queriedAt += now
        return cards.map { all ->
            all.values
                .filter { it.nextReviewAt <= now }
                .sortedBy { it.nextReviewAt }
                .take(limit)
                .mapNotNull { card ->
                    val v = vocab.rows.value[card.vocabularyId] ?: return@mapNotNull null
                    ReviewRow(
                        id = card.id, vocabularyId = card.vocabularyId, easeFactor = card.easeFactor,
                        interval = card.interval, repetitions = card.repetitions,
                        nextReviewAt = card.nextReviewAt, mastered = card.mastered,
                        syncStatus = card.syncStatus, updatedAt = card.updatedAt,
                        kana = v.kana, kanji = v.kanji, meaning = v.meaning, romaji = v.romaji,
                    )
                }
        }
    }

    override suspend fun countDue(now: Long): Int = cards.value.values.count { it.nextReviewAt <= now }

    override suspend fun getByVocabId(vocabId: Long): SrsCardEntity? =
        cards.value.values.firstOrNull { it.vocabularyId == vocabId }

    override suspend fun upsert(card: SrsCardEntity) {
        cards.value = cards.value + (card.id to card)
    }

    override suspend fun insertIfMissing(cards: List<SrsCardEntity>) {
        val current = this.cards.value
        this.cards.value = current + cards.filter { it.id !in current }.associateBy { it.id }
    }

    override suspend fun updateAfterReview(
        id: Long, easeFactor: Float, interval: Int, repetitions: Int,
        nextReviewAt: Long, mastered: Boolean, updatedAt: Long,
    ) {
        val card = cards.value[id] ?: return
        upsert(
            card.copy(
                easeFactor = easeFactor, interval = interval, repetitions = repetitions,
                nextReviewAt = nextReviewAt, mastered = mastered, syncStatus = "PENDING",
                updatedAt = updatedAt,
            ),
        )
    }

    override suspend fun getPendingSync(): List<SrsCardEntity> =
        cards.value.values.filter { it.syncStatus == "PENDING" }

    override suspend fun markSynced(ids: List<Long>) {
        val stillQueued = queue.items.filter { it.operation == "UPDATE_SRS" }.map { it.entityId }.toSet()
        cards.value = cards.value.mapValues { (id, card) ->
            if (id in ids && id !in stillQueued) card.copy(syncStatus = "SYNCED") else card
        }
    }
}

class FakeVocabularyApi : VocabularyApi {
    var lessonItems: List<VocabDto> = emptyList()
    val syncRequests = mutableListOf<ReviewSyncRequest>()
    var failSync: Exception? = null
    var onSync: suspend () -> Unit = {}

    override suspend fun list(lessonNumber: Int, page: Int, limit: Int): ApiEnvelope<VocabPageDto> {
        val pageItems = lessonItems.drop((page - 1) * limit).take(limit)
        return ApiEnvelope(success = true, data = VocabPageDto(data = pageItems, total = lessonItems.size))
    }

    override suspend fun syncReviewBank(body: ReviewSyncRequest) {
        onSync()
        failSync?.let { throw it }
        syncRequests += body
    }
}
