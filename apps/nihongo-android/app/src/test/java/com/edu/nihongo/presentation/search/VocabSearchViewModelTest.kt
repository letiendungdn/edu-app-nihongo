package com.edu.nihongo.presentation.search

import com.edu.nihongo.domain.entity.ReviewCard
import com.edu.nihongo.domain.entity.SrsCard
import com.edu.nihongo.domain.entity.Vocabulary
import com.edu.nihongo.domain.repository.VocabularyRepository
import com.edu.nihongo.testing.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

private class FakeRepo : VocabularyRepository {
    val all = MutableStateFlow<List<Vocabulary>>(emptyList())
    override fun getVocabByLesson(lessonNumber: Int): Flow<List<Vocabulary>> = emptyFlow()
    override fun observeAllVocab(): Flow<List<Vocabulary>> = all
    override fun getReviewQueue(): Flow<List<ReviewCard>> = emptyFlow()
    override suspend fun updateSrsCard(card: SrsCard): Result<Unit> = Result.success(Unit)
    override suspend fun syncLesson(lessonNumber: Int): Result<Unit> = Result.success(Unit)
    override suspend fun syncPendingReviews(): Result<Unit> = Result.success(Unit)
}

private fun vocab(id: Long, kana: String, romaji: String, lesson: Int = 1) =
    Vocabulary(id = id, lessonNumber = lesson, kana = kana, kanji = null, meaning = "m$id", romaji = romaji, sortOrder = id.toInt())

@OptIn(ExperimentalCoroutinesApi::class)
class VocabSearchViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    @Test
    fun emptyDevice_reportsNothingIndexed() = runTest(main.dispatcher) {
        val vm = VocabSearchViewModel(FakeRepo(), main.dispatcher)
        backgroundScope.launch { vm.uiState.collect {} }
        advanceUntilIdle()

        assertFalse(vm.uiState.value.isIndexing)
        assertEquals(0, vm.uiState.value.indexedCount)
    }

    @Test
    fun typing_filtersByRomajiPrefix() = runTest(main.dispatcher) {
        val repo = FakeRepo().apply {
            all.value = listOf(vocab(1, "たべます", "tabemasu"), vocab(2, "たかい", "takai"), vocab(3, "のみます", "nomimasu"))
        }
        val vm = VocabSearchViewModel(repo, main.dispatcher)
        backgroundScope.launch { vm.uiState.collect {} }

        vm.onQueryChange("ta")
        advanceUntilIdle()
        assertEquals(listOf("たかい", "たべます"), vm.uiState.value.results.map { it.kana })
        assertEquals("ta", vm.query.value)

        vm.onQueryChange("tab")
        advanceUntilIdle()
        assertEquals(listOf("たべます"), vm.uiState.value.results.map { it.kana })
    }

    @Test
    fun newLessonSynced_isSearchableWithoutReopeningScreen() = runTest(main.dispatcher) {
        val repo = FakeRepo().apply { all.value = listOf(vocab(1, "たべます", "tabemasu")) }
        val vm = VocabSearchViewModel(repo, main.dispatcher)
        backgroundScope.launch { vm.uiState.collect {} }
        vm.onQueryChange("kando")
        advanceUntilIdle()
        assertTrue(vm.uiState.value.results.isEmpty())

        // Room phát list mới khi một bài khác vừa sync xong → Trie được dựng lại
        repo.all.value = repo.all.value + vocab(2, "かんどうします", "kandō shimasu", lesson = 30)
        advanceUntilIdle()

        assertEquals(listOf("かんどうします"), vm.uiState.value.results.map { it.kana })
        assertEquals(2, vm.uiState.value.indexedCount)
    }
}
