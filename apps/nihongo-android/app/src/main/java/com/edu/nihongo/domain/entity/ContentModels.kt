package com.edu.nihongo.domain.entity

// Model thuần Kotlin cho các tính năng mới. Không phụ thuộc Room, Retrofit hay Android.

data class LearnerProgress(
    val currentStreak: Int,
    val longestStreak: Int,
    val totalSeconds: Int,
    val totalCards: Int,
    val vocabTotal: Int,
    val kanjiTotal: Int,
    val fetchedAt: Long,
)

data class StudyDay(
    val date: String,
    val seconds: Int,
    val cardsReviewed: Int,
    val vocabCount: Int,
    val kanjiCount: Int,
) {
    /** Lượng học trong ngày dùng cho biểu đồ: từ vựng + kanji + thẻ đã ôn. */
    val activity: Int get() = vocabCount + kanjiCount + cardsReviewed
}

data class Grammar(
    val id: Long,
    val pattern: String,
    val meaning: String,
    val explanation: String?,
    val examples: List<GrammarExample>,
)

data class GrammarExample(val jp: String, val romaji: String?, val vi: String?)

data class Kanji(
    val id: Long,
    val character: String,
    val hanViet: String?,
    val onyomi: String?,
    val kunyomi: String?,
    val meaning: String?,
    val mnemonic: String?,
)

data class ReadingPassage(
    val id: Long,
    val title: String,
    val jlptLevel: String?,
    val estimatedMin: Int,
    val questionCount: Int,
    val content: String?,
    val questions: List<ReadingQuestion> = emptyList(),
)

data class ReadingQuestion(
    val id: Long,
    val question: String,
    val options: List<String>,
    val answer: String,
    val explanation: String?,
)

data class QuizScore(val correct: Int, val total: Int) {
    val percent: Int get() = if (total == 0) 0 else correct * 100 / total
}

data class MockExamTemplate(
    val key: String,
    val title: String,
    val level: String,
    val durationMinutes: Int,
    val totalQuestions: Int,
    val scope: String?,
)

data class ExamQuestion(
    val id: String,
    val sectionName: String,
    val question: String,
    val options: List<String>,
    val audioText: String?,
)

data class ExamAttempt(
    val examId: String,
    val title: String,
    val level: String,
    val endsAt: Long,
    val questions: List<ExamQuestion>,
    val answers: Map<String, String>,
    val result: ExamResult?,
) {
    fun remainingMs(now: Long): Long = (endsAt - now).coerceAtLeast(0)
    fun isTimeUp(now: Long): Boolean = now >= endsAt
}

data class ExamResult(
    val correct: Int,
    val total: Int,
    val percent: Int,
    val passed: Boolean,
    val sections: List<SectionScore>,
    val wrong: List<ExamReviewItem>,
)

data class SectionScore(val name: String, val correct: Int, val total: Int)

data class ExamReviewItem(val question: String, val correctAnswer: String, val userAnswer: String?)

data class ChatRoom(
    val id: Long,
    val name: String,
    val lastMessage: String?,
    val unreadCount: Int,
)

data class ChatUser(val id: Long, val displayName: String)

sealed interface ChatEvent {
    /** Stream vừa mở hoặc nối lại: nên tải lại lịch sử để lấp tin lỡ trong lúc mất kết nối. */
    data object Connected : ChatEvent
    data object Disconnected : ChatEvent
    data class Received(val message: ChatMessage) : ChatEvent
}

/** [localId] chỉ có ở tin đang gửi (chưa có id từ server): tin "lạc quan". */
data class ChatMessage(
    val id: Long?,
    val localId: String?,
    val roomId: Long,
    val senderId: Long,
    val senderName: String,
    val content: String,
    val createdAt: String,
    val status: Status = Status.SENT,
) {
    enum class Status { SENDING, SENT, FAILED }
}
