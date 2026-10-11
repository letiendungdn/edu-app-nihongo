package com.edu.nihongo.presentation.reading

import androidx.lifecycle.SavedStateHandle
import com.edu.nihongo.domain.entity.Grammar
import com.edu.nihongo.domain.entity.Kanji
import com.edu.nihongo.domain.entity.ReadingPassage
import com.edu.nihongo.domain.entity.ReadingQuestion
import com.edu.nihongo.domain.repository.ContentRepository
import com.edu.nihongo.domain.repository.SubmitOutcome
import com.edu.nihongo.domain.repository.gradeReading
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

private val passage = ReadingPassage(
    id = 1, title = "メール", jlptLevel = "N5", estimatedMin = 3, questionCount = 2, content = "本文",
    questions = listOf(
        ReadingQuestion(10, "Q1", listOf("A", "B"), answer = "A", explanation = null),
        ReadingQuestion(11, "Q2", listOf("C", "D"), answer = "D", explanation = null),
    ),
)

private class FakeContent : ContentRepository {
    val reading = MutableStateFlow<ReadingPassage?>(passage)
    var offline = false
    var submitted: Map<Long, String>? = null
    override fun observeGrammar(lessonNumber: Int): Flow<List<Grammar>> = emptyFlow()
    override suspend fun refreshGrammar(lessonNumber: Int) = Result.success(Unit)
    override fun observeKanji(lessonNumber: Int): Flow<List<Kanji>> = emptyFlow()
    override suspend fun refreshKanji(lessonNumber: Int) = Result.success(Unit)
    override fun observeReadingList(): Flow<List<ReadingPassage>> = emptyFlow()
    override suspend fun refreshReadingList() = Result.success(Unit)
    override fun observeReading(id: Long) = reading
    override suspend fun refreshReading(id: Long) = Result.success(Unit)
    override suspend fun submitReading(passage: ReadingPassage, answers: Map<Long, String>): SubmitOutcome {
        submitted = answers
        return SubmitOutcome(gradeReading(passage.questions, answers), gradedOffline = offline)
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class ReadingDetailViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    private fun kotlinx.coroutines.test.TestScope.vm(repo: FakeContent, saved: SavedStateHandle = SavedStateHandle(mapOf("id" to 1L))) =
        ReadingDetailViewModel(saved, repo).also { v -> backgroundScope.launch { v.uiState.collect {} } }

    @Test
    fun cannotSubmit_untilEveryQuestionAnswered() = runTest(main.dispatcher) {
        val vm = vm(FakeContent())
        vm.choose(10, "A")
        advanceUntilIdle()
        assertFalse(vm.uiState.value.canSubmit)

        vm.choose(11, "C")
        advanceUntilIdle()
        assertTrue(vm.uiState.value.canSubmit)
    }

    @Test
    fun answers_surviveProcessDeath() = runTest(main.dispatcher) {
        val saved = SavedStateHandle(mapOf("id" to 1L))
        vm(FakeContent(), saved).choose(10, "B")
        advanceUntilIdle()

        val restored = vm(FakeContent(), saved) // cùng SavedStateHandle = hệ thống khôi phục sau khi giết process
        advanceUntilIdle()
        assertEquals("B", restored.uiState.value.answers[10])
    }

    @Test
    fun offlineSubmit_showsScore_andFlag() = runTest(main.dispatcher) {
        val repo = FakeContent().apply { offline = true }
        val vm = vm(repo)
        vm.choose(10, "A"); vm.choose(11, "C")
        advanceUntilIdle()
        vm.submit()
        advanceUntilIdle()

        assertEquals(1, vm.uiState.value.score?.correct)
        assertTrue(vm.uiState.value.gradedOffline)
        assertEquals(mapOf(10L to "A", 11L to "C"), repo.submitted)
    }

    @Test
    fun gradeReading_trimsAndCounts() {
        val score = gradeReading(passage.questions, mapOf(10L to " A ", 11L to "C"))
        assertEquals(1, score.correct)
        assertEquals(50, score.percent)
    }
}
