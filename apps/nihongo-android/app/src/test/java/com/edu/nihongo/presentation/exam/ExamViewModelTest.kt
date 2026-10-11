package com.edu.nihongo.presentation.exam

import androidx.lifecycle.SavedStateHandle
import com.edu.nihongo.domain.entity.ExamAttempt
import com.edu.nihongo.domain.entity.ExamQuestion
import com.edu.nihongo.domain.entity.ExamResult
import com.edu.nihongo.domain.entity.MockExamTemplate
import com.edu.nihongo.domain.repository.ExamRepository
import com.edu.nihongo.testing.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Rule
import org.junit.Test

private class FakeExams(endsAt: Long) : ExamRepository {
    val attempt = MutableStateFlow(
        ExamAttempt(
            examId = "e1", title = "N5", level = "N5", endsAt = endsAt,
            questions = listOf(ExamQuestion("q1", "Từ vựng", "?", listOf("a", "b"), null)),
            answers = emptyMap(), result = null,
        ),
    )
    var submits = 0
    override suspend fun templates() = Result.success(emptyList<MockExamTemplate>())
    override fun observeActive() = attempt.map { it }
    override fun observe(examId: String) = attempt
    override suspend fun start(key: String) = Result.success("e1")
    override suspend fun saveAnswer(examId: String, questionId: String, option: String) {
        attempt.value = attempt.value.copy(answers = attempt.value.answers + (questionId to option))
    }
    override suspend fun submit(examId: String): Result<ExamResult> {
        submits++
        val r = ExamResult(1, 1, 100, true, emptyList(), emptyList())
        attempt.value = attempt.value.copy(result = r)
        return Result.success(r)
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class ExamViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val start = 1_700_000_000_000L

    private fun TestScope.vm(repo: FakeExams, saved: SavedStateHandle = SavedStateHandle(mapOf("examId" to "e1"))) =
        ExamViewModel(saved, repo) { start + testScheduler.currentTime }
            .also { v -> backgroundScope.launch { v.uiState.collect {} } }

    @Test
    fun countdown_isComputedFromEndsAt() = runTest(main.dispatcher) {
        val vm = vm(FakeExams(endsAt = start + 50 * 60_000))
        runCurrent()
        assertEquals("50:00", formatRemaining(vm.uiState.value.remainingMs))

        advanceTimeBy(65_000)
        runCurrent()
        assertEquals("48:55", formatRemaining(vm.uiState.value.remainingMs))
    }

    @Test
    fun timeUp_autoSubmitsExactlyOnce() = runTest(main.dispatcher) {
        val repo = FakeExams(endsAt = start + 10_000)
        vm(repo)
        advanceTimeBy(9_000); runCurrent()
        assertEquals(0, repo.submits)

        advanceTimeBy(2_000); runCurrent()
        assertEquals(1, repo.submits)
        advanceTimeBy(60_000); runCurrent()
        assertEquals(1, repo.submits)
        assertNotNull(repo.attempt.value.result)
    }

    @Test
    fun reopenedAfterDeadline_submitsImmediately() = runTest(main.dispatcher) {
        val repo = FakeExams(endsAt = start - 1) // mở lại app khi đã quá giờ
        vm(repo)
        runCurrent()
        assertEquals(1, repo.submits)
    }

    @Test
    fun currentQuestion_survivesProcessDeath() = runTest(main.dispatcher) {
        val saved = SavedStateHandle(mapOf("examId" to "e1"))
        vm(FakeExams(start + 60_000), saved).goTo(0)
        assertEquals(0, saved.get<Int>("index"))
    }

    // Đo trên emulator: force-stop bỏ saved state → bản cũ quay về câu 1 dù đã làm 2 câu
    @Test
    fun withoutSavedIndex_opensFirstUnansweredQuestion() {
        val qs = (1..5).map { ExamQuestion("q$it", "S", "?", listOf("a"), null) }
        val attempt = ExamAttempt("e1", "N5", "N5", 0, qs, answers = mapOf("q1" to "a", "q2" to "a"), result = null)
        assertEquals(2, resolveIndex(-1, attempt))
        assertEquals(4, resolveIndex(9, attempt))      // index đã lưu bị kẹp vào khoảng hợp lệ
        assertEquals(4, resolveIndex(-1, attempt.copy(answers = qs.associate { it.id to "a" })))
    }

    @Test
    fun formatsRemaining() {
        assertEquals("00:00", formatRemaining(-5))
        assertEquals("01:05", formatRemaining(65_999))
    }
}
