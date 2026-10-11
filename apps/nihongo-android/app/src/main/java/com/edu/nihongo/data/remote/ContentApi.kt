package com.edu.nihongo.data.remote

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

// DTO khớp đúng JSON thật của gateway (đã lấy mẫu bằng curl). Mọi field có thể vắng nên đều nullable;
// mapper sang domain quyết định giá trị mặc định.

// ── Tiến độ học: GET /api/learning-progress ─────────────────────────────────

data class LearningProgressDto(
    val summary: ProgressSummaryDto? = null,
    val recentDays: List<StudyDayDto>? = null,
)

data class ProgressSummaryDto(
    val userId: Long? = null,
    val currentStreak: Int? = null,
    val longestStreak: Int? = null,
    val totalSeconds: Int? = null,
    val totalCards: Int? = null,
    val vocabTotal: Int? = null,
    val kanjiTotal: Int? = null,
)

data class StudyDayDto(
    val studyDate: String? = null,
    val seconds: Int? = null,
    val cardsReviewed: Int? = null,
    val vocabCount: Int? = null,
    val kanjiCount: Int? = null,
)

interface LearningProgressApi {
    @GET("learning-progress")
    suspend fun mine(): ApiEnvelope<LearningProgressDto>
}

// ── Ngữ pháp, Kanji, Đọc hiểu ───────────────────────────────────────────────

data class GrammarDto(
    val id: Long,
    val pattern: String? = null,
    val meaning: String? = null,
    val explanation: String? = null,
    val jlptLevel: String? = null,
    val sortOrder: Int? = null,
    val examples: List<GrammarExampleDto>? = null,
)

data class GrammarExampleDto(
    val id: Long,
    val jp: String? = null,
    val romaji: String? = null,
    val vi: String? = null,
    val sortOrder: Int? = null,
)

data class GrammarPageDto(val data: List<GrammarDto>? = null, val total: Int? = null)

data class KanjiDto(
    val id: Long,
    val character: String? = null,
    val hanViet: String? = null,
    val onyomi: String? = null,
    val kunyomi: String? = null,
    val meaningVi: String? = null,
    val mnemonicVi: String? = null,
    val sortOrder: Int? = null,
)

data class ReadingSummaryDto(
    val id: Long,
    val title: String? = null,
    val jlptLevel: String? = null,
    val estimatedMin: Int? = null,
    val sortOrder: Int? = null,
    @SerializedName("_count") val count: ReadingCountDto? = null,
)

data class ReadingCountDto(val questions: Int? = null)

data class ReadingDetailDto(
    val id: Long,
    val title: String? = null,
    val content: String? = null,
    val jlptLevel: String? = null,
    val estimatedMin: Int? = null,
    val sortOrder: Int? = null,
    val questions: List<ReadingQuestionDto>? = null,
)

data class ReadingQuestionDto(
    val id: Long,
    val question: String? = null,
    val answer: String? = null,
    val explanation: String? = null,
    val sortOrder: Int? = null,
    val options: List<ReadingOptionDto>? = null,
)

data class ReadingOptionDto(val text: String? = null, val sortOrder: Int? = null)

/** answers: id câu hỏi (dạng chuỗi) → nội dung lựa chọn. */
data class AnswersRequest(val answers: Map<String, String>)

data class ReadingResultDto(
    val correct: Int? = null,
    val total: Int? = null,
    val percent: Int? = null,
)

interface ContentApi {
    @GET("grammars")
    suspend fun grammars(
        @Query("lessonNumber") lessonNumber: Int,
        @Query("limit") limit: Int = 100,
    ): ApiEnvelope<GrammarPageDto>

    @GET("kanji")
    suspend fun kanji(@Query("lessonNumber") lessonNumber: Int): ApiEnvelope<List<KanjiDto>>

    @GET("reading")
    suspend fun readingList(): ApiEnvelope<List<ReadingSummaryDto>>

    @GET("reading/{id}")
    suspend fun reading(@Path("id") id: Long): ApiEnvelope<ReadingDetailDto>

    @POST("reading/{id}/submit")
    suspend fun submitReading(@Path("id") id: Long, @Body body: AnswersRequest): ApiEnvelope<ReadingResultDto>
}

// ── Thi thử JLPT ────────────────────────────────────────────────────────────

data class MockExamTemplateDto(
    val id: Long,
    val slug: String? = null,
    val level: String? = null,
    val title: String? = null,
    val durationMinutes: Int? = null,
    val totalQuestions: Int? = null,
    val scope: String? = null,
)

data class MockExamDto(
    val examId: String,
    val title: String? = null,
    val level: String? = null,
    val durationMinutes: Int? = null,
    val questions: List<MockQuestionDto>? = null,
)

data class MockQuestionDto(
    val id: String,
    val sectionId: String? = null,
    val sectionName: String? = null,
    val type: String? = null,
    val question: String? = null,
    val options: List<MockOptionDto>? = null,
    /** Câu nghe: app đọc bằng TTS. */
    val audioText: String? = null,
)

data class MockOptionDto(val text: String? = null)

data class MockExamResultDto(
    val correctCount: Int? = null,
    val total: Int? = null,
    val percent: Int? = null,
    val passThreshold: Int? = null,
    val passed: Boolean? = null,
    val sectionScores: List<SectionScoreDto>? = null,
    val review: List<MockReviewDto>? = null,
)

data class SectionScoreDto(
    val sectionId: String? = null,
    val sectionName: String? = null,
    val correct: Int? = null,
    val total: Int? = null,
)

data class MockReviewDto(
    val id: String,
    val question: String? = null,
    val correctAnswer: String? = null,
    val userAnswer: String? = null,
)

interface MockExamApi {
    @GET("mock-exams")
    suspend fun templates(): ApiEnvelope<List<MockExamTemplateDto>>

    @POST("mock-exams/{key}/start")
    suspend fun start(@Path("key") key: String): ApiEnvelope<MockExamDto>

    @POST("mock-exams/{examId}/submit")
    suspend fun submit(@Path("examId") examId: String, @Body body: AnswersRequest): ApiEnvelope<MockExamResultDto>
}

// ── Chat cộng đồng ──────────────────────────────────────────────────────────

data class ChatUserDto(
    val id: Long,
    val name: String? = null,
    val email: String? = null,
)

data class ChatMessageDto(
    val id: Long,
    val roomId: Long,
    val senderId: Long,
    val content: String? = null,
    val createdAt: String? = null,
    val sender: ChatUserDto? = null,
)

data class ChatRoomDto(
    val id: Long,
    val name: String? = null,
    val type: String? = null,
    val lastMessage: ChatMessageDto? = null,
    val unreadCount: Int? = null,
)

data class ChatRoomInfoDto(val id: Long, val name: String? = null)

data class ChatRoomDetailDto(
    val room: ChatRoomInfoDto,
    val messages: List<ChatMessageDto>? = null,
)

data class SendMessageRequest(val content: String)

data class SentMessageDto(val message: ChatMessageDto)

data class DirectChatRequest(val userId: Long)

data class MeDto(val id: Long, val name: String? = null, val email: String? = null)

interface CommunityApi {
    @GET("community/rooms")
    suspend fun rooms(): ApiEnvelope<List<ChatRoomDto>>

    @GET("community/rooms/{id}")
    suspend fun room(@Path("id") id: Long): ApiEnvelope<ChatRoomDetailDto>

    @POST("community/rooms/{id}/messages")
    suspend fun send(@Path("id") id: Long, @Body body: SendMessageRequest): ApiEnvelope<SentMessageDto>

    @PATCH("community/rooms/{id}/read")
    suspend fun markRead(@Path("id") id: Long)

    @GET("community/users")
    suspend fun searchUsers(@Query("q") q: String): ApiEnvelope<List<ChatUserDto>>

    @POST("community/rooms/direct")
    suspend fun direct(@Body body: DirectChatRequest): ApiEnvelope<ChatRoomDetailDto>

    @GET("auth/me")
    suspend fun me(): ApiEnvelope<MeDto>
}
