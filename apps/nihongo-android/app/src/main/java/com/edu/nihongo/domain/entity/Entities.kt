package com.edu.nihongo.domain.entity

enum class SyncStatus {
    SYNCED,
    PENDING,
    CONFLICT,
}

data class Vocabulary(
    val id: Long,
    val lessonNumber: Int,
    val kana: String,
    val kanji: String?,
    val meaning: String,
    val romaji: String,
    val sortOrder: Int,
    val syncStatus: SyncStatus = SyncStatus.SYNCED,
    val meaningEn: String? = null,
    /** manual | jmdict | ai — "ai" thì UI ghi "dịch máy". */
    val meaningEnSource: String? = null,
    val hanViet: String? = null,
    /** Cặp (chữ, cách đọc); cách đọc rỗng = không cần furigana. Rỗng cả list = không tách được. */
    val furigana: List<Pair<String, String>> = emptyList(),
)

data class SrsCard(
    val id: Long,
    val vocabularyId: Long,
    val easeFactor: Float,
    val interval: Int,
    val repetitions: Int,
    val nextReviewAt: Long,
    val mastered: Boolean,
    val syncStatus: SyncStatus = SyncStatus.SYNCED,
    val updatedAt: Long = System.currentTimeMillis(),
)

data class ReviewCard(
    val card: SrsCard,
    val kana: String,
    val kanji: String?,
    val meaning: String,
    val romaji: String,
)

data class Lesson(
    val id: Long,
    val lessonNumber: Int,
    val title: String?,
    val description: String?,
    val vocabCount: Int?,
)
