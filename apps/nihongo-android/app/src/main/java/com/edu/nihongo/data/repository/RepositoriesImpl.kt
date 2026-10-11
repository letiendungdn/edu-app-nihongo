package com.edu.nihongo.data.repository

import com.edu.nihongo.data.NetworkStatus
import com.edu.nihongo.data.local.TokenStorage
import com.edu.nihongo.data.local.dao.LessonDao
import com.edu.nihongo.data.local.dao.ProgressDao
import com.edu.nihongo.data.local.dao.SrsCardDao
import com.edu.nihongo.data.local.dao.SyncQueueDao
import com.edu.nihongo.data.local.dao.VocabularyDao
import com.edu.nihongo.data.local.entity.LessonEntity
import com.edu.nihongo.data.local.entity.SrsCardEntity
import com.edu.nihongo.data.local.entity.SyncQueueEntity
import com.edu.nihongo.data.local.entity.VocabularyEntity
import com.edu.nihongo.data.local.toDomain
import com.edu.nihongo.data.remote.AuthApi
import com.edu.nihongo.data.remote.LessonsApi
import com.edu.nihongo.data.remote.LoginRequest
import com.edu.nihongo.data.remote.OidcRequest
import com.edu.nihongo.data.remote.ReviewSyncItem
import com.edu.nihongo.data.remote.TranslateApi
import com.edu.nihongo.data.remote.TranslateRequest
import com.edu.nihongo.data.remote.VocabularyRemoteDataSource
import com.edu.nihongo.data.sync.SyncScheduler
import com.edu.nihongo.data.sync.WidgetRefresher
import com.edu.nihongo.domain.TimeSource
import com.edu.nihongo.domain.entity.Lesson
import com.edu.nihongo.domain.entity.ReviewCard
import com.edu.nihongo.domain.entity.SrsCard
import com.edu.nihongo.domain.repository.AuthRepository
import com.edu.nihongo.domain.repository.LessonRepository
import com.edu.nihongo.domain.repository.TranslateRepository
import com.edu.nihongo.domain.repository.VocabularyRepository
import com.edu.nihongo.utils.runCatchingCancellable
import com.google.gson.Gson
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.text.SimpleDateFormat
import java.util.Collections
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val authApi: AuthApi,
    private val tokenStore: TokenStorage,
    private val syncScheduler: SyncScheduler,
    private val progressDao: ProgressDao,
) : AuthRepository {
    override suspend fun login(email: String, password: String): Result<Unit> = runCatchingCancellable {
        val res = authApi.login(LoginRequest(email, password))
        val token = res.data?.accessToken
        require(!token.isNullOrBlank()) { "Không nhận được access token" }
        tokenStore.save(token)
        // Lần ôn offline trước khi đăng nhập giờ mới gửi được
        syncScheduler.schedulePendingSync()
    }

    override suspend fun loginWithOidc(accessToken: String, idToken: String?): Result<Unit> =
        runCatchingCancellable {
            val res = authApi.loginOidc(OidcRequest(accessToken, idToken))
            val token = res.data?.accessToken
            require(!token.isNullOrBlank()) { "Không nhận được access token từ OIDC" }
            tokenStore.save(token)
            syncScheduler.schedulePendingSync()
        }

    override suspend fun logout() {
        try {
            authApi.logout() // cookie refresh token đi kèm → server thu hồi
        } finally {
            tokenStore.clear()
            tokenStore.clearRefreshCookie()
            // Tiến độ là của người vừa đăng xuất: không để người đăng nhập sau nhìn thấy
            progressDao.clear()
        }
    }

    override suspend fun isLoggedIn(): Boolean = tokenStore.isLoggedIn()
}

@Singleton
class TranslateRepositoryImpl @Inject constructor(
    private val api: TranslateApi,
) : TranslateRepository {
    // Camera gọi liên tục: giới hạn kích thước (LRU) và an toàn khi nhiều luồng cùng dùng
    private val cache: MutableMap<String, String> = Collections.synchronizedMap(
        object : LinkedHashMap<String, String>(64, 0.75f, true) {
            override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, String>) =
                size > MAX_CACHE
        },
    )

    override suspend fun translateJapanese(text: String): String {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return ""

        cache[trimmed]?.let { return it }

        val res = api.translate(TranslateRequest(text = trimmed))
        val translated = res.translation?.trim().orEmpty().ifEmpty { trimmed }
        cache[trimmed] = translated
        return translated
    }

    private companion object {
        const val MAX_CACHE = 200
    }
}

@Singleton
class LessonRepositoryImpl @Inject constructor(
    private val api: LessonsApi,
    private val dao: LessonDao,
    private val timeSource: TimeSource,
) : LessonRepository {
    override fun observeLessons(): Flow<List<Lesson>> =
        dao.observeAll().map { rows -> rows.map { it.toDomain() } }

    override suspend fun refreshLessons(): Result<Unit> = runCatchingCancellable {
        val now = timeSource.now()
        val lessons = api.list().data.orEmpty().map { dto ->
            LessonEntity(
                id = dto.id,
                lessonNumber = dto.lessonNumber,
                title = dto.title,
                description = dto.description,
                vocabCount = dto.count?.vocabularies,
                updatedAt = now,
            )
        }
        dao.upsertAll(lessons)
    }
}

@Singleton
class VocabularyRepositoryImpl @Inject constructor(
    private val vocabDao: VocabularyDao,
    private val srsDao: SrsCardDao,
    private val syncQueueDao: SyncQueueDao,
    private val remote: VocabularyRemoteDataSource,
    private val network: NetworkStatus,
    private val tokenStore: TokenStorage,
    private val gson: Gson,
    private val timeSource: TimeSource,
    private val syncScheduler: SyncScheduler,
    private val widgetRefresher: WidgetRefresher,
) : VocabularyRepository {

    // Worker, syncLesson và test có thể gọi flush cùng lúc → không gửi trùng
    private val flushMutex = Mutex()

    override fun getVocabByLesson(lessonNumber: Int) =
        vocabDao.getByLesson(lessonNumber).map { list -> list.map { it.toDomain() } }

    /**
     * Mỗi nhịp lấy `now` mới rồi chạy lại query, nên thẻ đến hạn trong lúc đang mở
     * màn hình cũng hiện ra. `flatMapLatest` hủy query của nhịp cũ.
     */
    @OptIn(ExperimentalCoroutinesApi::class)
    override fun getReviewQueue(): Flow<List<ReviewCard>> =
        ticker()
            .flatMapLatest { now -> srsDao.getReviewQueue(now = now) }
            .map { rows -> rows.map { it.toDomain() } }
            .distinctUntilChanged()

    private fun ticker(): Flow<Long> = flow {
        while (true) {
            emit(timeSource.now())
            delay(REVIEW_TICK_MS)
        }
    }

    /**
     * Ghi máy trước, hẹn gửi sau. Việc gửi lên server không còn nằm ở đây, nên mất mạng
     * hay server lỗi cũng không làm lần chấm báo thất bại.
     */
    override suspend fun updateSrsCard(card: SrsCard): Result<Unit> = runCatchingCancellable {
        srsDao.updateAfterReview(
            id = card.id,
            easeFactor = card.easeFactor,
            interval = card.interval,
            repetitions = card.repetitions,
            nextReviewAt = card.nextReviewAt,
            mastered = card.mastered,
            updatedAt = card.updatedAt,
        )
        syncQueueDao.replace(
            SyncQueueEntity(
                operation = OP_UPDATE_SRS,
                entityId = card.id,
                payload = gson.toJson(card),
                createdAt = timeSource.now(),
            ),
        )
        syncScheduler.schedulePendingSync()
        // Số thẻ cần ôn vừa giảm: widget màn hình chính vẽ lại
        runCatchingCancellable { widgetRefresher.refresh() }
    }

    override suspend fun syncLesson(lessonNumber: Int): Result<Unit> = runCatchingCancellable {
        if (!network.isOnline()) error("Không có mạng")

        val remoteList = remote.fetchAllForLesson(lessonNumber)
        val now = timeSource.now()
        val entities = remoteList.mapIndexed { index, dto ->
            VocabularyEntity(
                id = dto.id,
                lessonNumber = lessonNumber,
                kana = dto.kana.orEmpty(),
                kanji = dto.kanji,
                meaning = dto.meaning.orEmpty(),
                romaji = dto.romaji.orEmpty(),
                sortOrder = index,
                updatedAt = now,
            )
        }

        if (entities.isNotEmpty()) {
            vocabDao.upsertAll(entities)
            // Một lệnh INSERT OR IGNORE thay cho 2 query mỗi từ
            srsDao.insertIfMissing(
                entities.map { SrsCardEntity(id = it.id, vocabularyId = it.id, nextReviewAt = now, updatedAt = now) },
            )
        }

        syncScheduler.schedulePendingSync()
    }

    override suspend fun syncPendingReviews(): Result<Unit> = runCatchingCancellable {
        if (!tokenStore.isLoggedIn()) return@runCatchingCancellable
        flushMutex.withLock {
            // Lặp tới khi hết hàng: item thêm vào trong lúc đang gửi cũng được gửi luôn
            var rounds = 0
            while (rounds < MAX_FLUSH_ROUNDS && flushSyncQueue()) rounds++
        }
    }

    /** Gửi một lượt. Trả `true` nếu đã gửi được gì đó. Server lỗi → ném lỗi, hàng đợi giữ nguyên. */
    private suspend fun flushSyncQueue(): Boolean {
        val pending = syncQueueDao.getPending().filter { it.operation == OP_UPDATE_SRS }
        if (pending.isEmpty()) return false

        val reviewItems = mutableListOf<ReviewSyncItem>()
        val doneQueueIds = mutableListOf<Long>()
        val sentCardIds = mutableListOf<Long>()
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        for (item in pending) {
            val card = runCatching { gson.fromJson(item.payload, SrsCard::class.java) }.getOrNull()
            val vocab = card?.let { vocabDao.getById(it.vocabularyId) }
            if (card == null || vocab == null) {
                doneQueueIds += item.id // payload hỏng hoặc từ đã bị xóa: bỏ, không thử mãi
                continue
            }
            reviewItems += ReviewSyncItem(
                kana = vocab.kana,
                kanji = vocab.kanji,
                meaning = vocab.meaning,
                lessonNumber = vocab.lessonNumber,
                wrongCount = if (card.repetitions == 0) 1 else 0,
                reviewStreak = card.repetitions,
                mastered = card.mastered,
                lastReviewedAt = isoFormat.format(Date(card.updatedAt)),
            )
            doneQueueIds += item.id
            sentCardIds += card.id
        }

        remote.syncReviewBank(reviewItems)
        doneQueueIds.forEach { syncQueueDao.delete(it) }
        if (sentCardIds.isNotEmpty()) srsDao.markSynced(sentCardIds)
        return true
    }

    companion object {
        const val OP_UPDATE_SRS = "UPDATE_SRS"
        const val REVIEW_TICK_MS = 60_000L
        private const val MAX_FLUSH_ROUNDS = 5
    }
}
