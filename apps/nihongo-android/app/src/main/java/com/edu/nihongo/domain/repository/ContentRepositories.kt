package com.edu.nihongo.domain.repository

import com.edu.nihongo.domain.entity.ChatEvent
import com.edu.nihongo.domain.entity.ChatMessage
import com.edu.nihongo.domain.entity.ChatRoom
import com.edu.nihongo.domain.entity.ChatUser
import com.edu.nihongo.domain.entity.ExamAttempt
import com.edu.nihongo.domain.entity.ExamResult
import com.edu.nihongo.domain.entity.Grammar
import com.edu.nihongo.domain.entity.Kanji
import com.edu.nihongo.domain.entity.LearnerProgress
import com.edu.nihongo.domain.entity.MockExamTemplate
import com.edu.nihongo.domain.entity.QuizScore
import com.edu.nihongo.domain.entity.ReadingPassage
import com.edu.nihongo.domain.entity.ReadingQuestion
import com.edu.nihongo.domain.entity.StudyDay
import kotlinx.coroutines.flow.Flow

interface ProgressRepository {
    fun observeProgress(): Flow<LearnerProgress?>
    fun observeRecentDays(limit: Int): Flow<List<StudyDay>>
    suspend fun refresh(): Result<Unit>
}

/** Ngữ pháp, kanji, đọc hiểu: cùng khuôn với từ vựng (Room là nguồn cho UI, mạng chỉ ghi vào Room). */
interface ContentRepository {
    fun observeGrammar(lessonNumber: Int): Flow<List<Grammar>>
    suspend fun refreshGrammar(lessonNumber: Int): Result<Unit>

    fun observeKanji(lessonNumber: Int): Flow<List<Kanji>>
    suspend fun refreshKanji(lessonNumber: Int): Result<Unit>

    fun observeReadingList(): Flow<List<ReadingPassage>>
    suspend fun refreshReadingList(): Result<Unit>
    fun observeReading(id: Long): Flow<ReadingPassage?>
    suspend fun refreshReading(id: Long): Result<Unit>

    /** Chấm ở server (ghi nhận tiến độ); mất mạng thì tự chấm bằng đáp án đã lưu. */
    suspend fun submitReading(passage: ReadingPassage, answers: Map<Long, String>): SubmitOutcome
}

data class SubmitOutcome(val score: QuizScore, val gradedOffline: Boolean)

/** Chấm thuần, không I/O: dùng khi offline và để test. */
fun gradeReading(questions: List<ReadingQuestion>, answers: Map<Long, String>): QuizScore =
    QuizScore(
        correct = questions.count { q -> answers[q.id]?.trim() == q.answer.trim() },
        total = questions.size,
    )

interface ExamRepository {
    suspend fun templates(): Result<List<MockExamTemplate>>
    fun observeActive(): Flow<ExamAttempt?>
    fun observe(examId: String): Flow<ExamAttempt?>
    /** Tạo đề mới ở server và lưu vào máy. Trả về examId. */
    suspend fun start(key: String): Result<String>
    suspend fun saveAnswer(examId: String, questionId: String, option: String)
    suspend fun submit(examId: String): Result<ExamResult>
}

interface ChatRepository {
    suspend fun currentUserId(): Result<Long>
    suspend fun rooms(): Result<List<ChatRoom>>
    suspend fun history(roomId: Long): Result<List<ChatMessage>>
    /** Tin mới của phòng qua SSE. Tự nối lại khi rớt mạng; dừng khi không còn ai collect. */
    fun live(roomId: Long): Flow<ChatEvent>
    suspend fun send(roomId: Long, content: String): Result<ChatMessage>
    suspend fun markRead(roomId: Long)
    suspend fun searchUsers(query: String): Result<List<ChatUser>>
    /** Mở (hoặc tạo) phòng 1:1. Trả về id phòng. */
    suspend fun openDirect(userId: Long): Result<Long>
}
