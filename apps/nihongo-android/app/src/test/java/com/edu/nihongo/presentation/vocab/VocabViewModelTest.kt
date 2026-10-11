package com.edu.nihongo.presentation.vocab

import androidx.lifecycle.SavedStateHandle
import com.edu.nihongo.domain.entity.ReviewCard
import com.edu.nihongo.domain.entity.SrsCard
import com.edu.nihongo.domain.entity.Vocabulary
import com.edu.nihongo.domain.repository.VocabularyRepository
import com.edu.nihongo.domain.usecase.GetVocabByLessonUseCase
import com.edu.nihongo.domain.usecase.SyncLessonUseCase
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** Repository giả: Room được thay bằng MutableStateFlow, sync chờ tới khi test cho kết quả. */
private class FakeVocabRepository : VocabularyRepository {
    val vocab = MutableStateFlow<List<Vocabulary>>(emptyList())
    val syncResult = CompletableDeferred<Result<Unit>>()
    var syncedLesson: Int? = null

    override fun getVocabByLesson(lessonNumber: Int): Flow<List<Vocabulary>> = vocab

    override fun getReviewQueue(): Flow<List<ReviewCard>> = emptyFlow()

    override suspend fun updateSrsCard(card: SrsCard): Result<Unit> = Result.success(Unit)

    override suspend fun syncPendingReviews(): Result<Unit> = Result.success(Unit)

    override suspend fun syncLesson(lessonNumber: Int): Result<Unit> {
        syncedLesson = lessonNumber
        return syncResult.await()
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class VocabViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private lateinit var repo: FakeVocabRepository

    // viewModelScope chạy trên Dispatchers.Main; unit test JVM không có main looper.
    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        repo = FakeVocabRepository()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    /** uiState dùng stateIn(WhileSubscribed): phải có người collect thì mới chạy, như UI thật. */
    private fun TestScope.createViewModel(lesson: Int = 3) = VocabViewModel(
        savedStateHandle = SavedStateHandle(mapOf("lesson" to lesson)),
        getVocabByLesson = GetVocabByLessonUseCase(repo),
        syncLesson = SyncLessonUseCase(repo),
    ).also { vm -> backgroundScope.launch { vm.uiState.collect {} } }

    private fun vocab(id: Long) = Vocabulary(
        id = id,
        lessonNumber = 3,
        kana = "ねこ",
        kanji = "猫",
        meaning = "con mèo",
        romaji = "neko",
        sortOrder = id.toInt(),
    )

    @Test
    fun readsLessonFromSavedStateHandle_andSyncsThatLesson() = runTest(dispatcher) {
        createViewModel(lesson = 7)
        advanceUntilIdle()
        assertEquals(7, repo.syncedLesson)
    }

    @Test
    fun roomEmission_updatesItems() = runTest(dispatcher) {
        val vm = createViewModel()
        repo.vocab.value = listOf(vocab(1), vocab(2))
        advanceUntilIdle()

        assertEquals(listOf(1L, 2L), vm.uiState.value.items.map { it.id })
        assertFalse(vm.uiState.value.isLoading)
    }

    @Test
    fun syncFailure_showsError() = runTest(dispatcher) {
        val vm = createViewModel()
        repo.syncResult.complete(Result.failure(IllegalStateException("Không có mạng")))
        advanceUntilIdle()

        assertEquals("Không có mạng", vm.uiState.value.error)
        assertFalse(vm.uiState.value.isLoading)
    }

    // L2: Room phát list rỗng ngay, nhưng sync chưa xong thì vẫn phải là "đang tải"
    @Test
    fun emptyRoom_whileSyncing_staysLoading() = runTest(dispatcher) {
        val vm = createViewModel()
        advanceUntilIdle()

        assertTrue(vm.uiState.value.isLoading)
        assertFalse(repo.syncResult.isCompleted)
    }

    @Test
    fun cachedItems_showImmediately_whileSyncing() = runTest(dispatcher) {
        repo.vocab.value = listOf(vocab(1))
        val vm = createViewModel()
        advanceUntilIdle()

        assertFalse(vm.uiState.value.isLoading)
        assertEquals(1, vm.uiState.value.items.size)
    }

    @Test
    fun emptyAfterSyncFinished_isNotLoading() = runTest(dispatcher) {
        val vm = createViewModel()
        repo.syncResult.complete(Result.success(Unit))
        advanceUntilIdle()

        assertFalse(vm.uiState.value.isLoading)
        assertTrue(vm.uiState.value.items.isEmpty())
    }

    @Test
    fun syncSuccess_clearsError() = runTest(dispatcher) {
        val vm = createViewModel()
        repo.syncResult.complete(Result.success(Unit))
        advanceUntilIdle()

        assertNull(vm.uiState.value.error)
        assertTrue(vm.uiState.value.items.isEmpty())
    }
}
