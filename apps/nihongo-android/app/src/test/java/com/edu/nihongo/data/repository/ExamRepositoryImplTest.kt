package com.edu.nihongo.data.repository

import com.edu.nihongo.data.local.dao.ExamAttemptDao
import com.edu.nihongo.data.local.entity.ExamAttemptEntity
import com.edu.nihongo.data.remote.AnswersRequest
import com.edu.nihongo.data.remote.ApiEnvelope
import com.edu.nihongo.data.remote.MockExamApi
import com.edu.nihongo.data.remote.MockExamDto
import com.edu.nihongo.data.remote.MockExamResultDto
import com.edu.nihongo.data.remote.MockExamTemplateDto
import com.edu.nihongo.data.remote.MockOptionDto
import com.edu.nihongo.data.remote.MockQuestionDto
import com.edu.nihongo.data.remote.MockReviewDto
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.yield
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private class FakeAttemptDao : ExamAttemptDao {
    val rows = MutableStateFlow<Map<String, ExamAttemptEntity>>(emptyMap())
    override fun observeActive(): Flow<ExamAttemptEntity?> = rows.map { r -> r.values.filter { it.resultJson == null }.maxByOrNull { it.startedAt } }
    override fun observe(examId: String) = rows.map { it[examId] }
    override suspend fun get(examId: String): ExamAttemptEntity? { yield(); return rows.value[examId] } // yield: lộ race đọc-sửa-ghi
    override suspend fun upsert(attempt: ExamAttemptEntity) { rows.value = rows.value + (attempt.examId to attempt) }
    override suspend fun saveAnswers(examId: String, answersJson: String) {
        rows.value[examId]?.let { rows.value = rows.value + (examId to it.copy(answersJson = answersJson)) }
    }
    override suspend fun saveResult(examId: String, resultJson: String) {
        rows.value[examId]?.let { rows.value = rows.value + (examId to it.copy(resultJson = resultJson)) }
    }
}

private class FakeMockExamApi : MockExamApi {
    var submitCalls = 0
    var lastAnswers: Map<String, String>? = null
    override suspend fun templates() = ApiEnvelope(data = listOf(MockExamTemplateDto(1, slug = "n5", level = "n5", title = "N5", durationMinutes = 50, totalQuestions = 2)))
    override suspend fun start(key: String) = ApiEnvelope(
        data = MockExamDto(
            examId = "e1", title = "N5", level = "n5", durationMinutes = 50,
            questions = listOf(
                MockQuestionDto("q1", sectionName = "Từ vựng", question = "?", options = listOf(MockOptionDto("a"), MockOptionDto("b"))),
                MockQuestionDto("q2", sectionName = "Nghe", type = "listening", question = "?", options = listOf(MockOptionDto("c")), audioText = "あき"),
            ),
        ),
    )
    override suspend fun submit(examId: String, body: AnswersRequest): ApiEnvelope<MockExamResultDto> {
        submitCalls++
        lastAnswers = body.answers
        return ApiEnvelope(
            data = MockExamResultDto(
                correctCount = 1, total = 2, percent = 50, passed = false,
                review = listOf(MockReviewDto("q1", "?", correctAnswer = "a", userAnswer = "a"), MockReviewDto("q2", "?", correctAnswer = "c", userAnswer = null)),
            ),
        )
    }
}

class ExamRepositoryImplTest {
    private val dao = FakeAttemptDao()
    private val api = FakeMockExamApi()
    private val repo = ExamRepositoryImpl(api, dao, Gson()) { 1_000L }

    @Test
    fun start_persistsAttempt_withAbsoluteDeadline_andAudio() = runTest {
        val id = repo.start("n5").getOrThrow()
        val row = dao.rows.value.getValue(id)
        assertEquals(1_000L + 50 * 60_000, row.endsAt)
        assertTrue(row.questionsJson.contains("あき"))
    }

    @Test
    fun concurrentAnswers_areAllKept() = runTest {
        repo.start("n5")
        launch { repo.saveAnswer("e1", "q1", "a") }
        launch { repo.saveAnswer("e1", "q2", "c") }
        testScheduler.advanceUntilIdle()

        repo.submit("e1")
        assertEquals(mapOf("q1" to "a", "q2" to "c"), api.lastAnswers)
    }

    @Test
    fun submitTwice_callsServerOnce_andKeepsResult() = runTest {
        repo.start("n5")
        val first = repo.submit("e1").getOrThrow()
        val second = repo.submit("e1").getOrThrow()

        assertEquals(1, api.submitCalls)
        assertEquals(first, second)
        assertEquals(1, first.wrong.size) // chỉ câu q2 sai (bỏ trống)
    }

    @Test
    fun answersAfterSubmit_areIgnored() = runTest {
        repo.start("n5")
        repo.submit("e1")
        repo.saveAnswer("e1", "q1", "b")
        assertTrue(dao.rows.value.getValue("e1").answersJson == "{}")
    }
}
