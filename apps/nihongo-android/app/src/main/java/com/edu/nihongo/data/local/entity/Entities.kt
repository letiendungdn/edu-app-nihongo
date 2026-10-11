package com.edu.nihongo.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "vocabulary",
    indices = [
        Index("lesson_number"),
        Index("sync_status"),
    ],
)
data class VocabularyEntity(
    @PrimaryKey val id: Long,
    @ColumnInfo(name = "lesson_number") val lessonNumber: Int,
    val kana: String,
    val kanji: String?,
    val meaning: String,
    val romaji: String,
    @ColumnInfo(name = "sort_order") val sortOrder: Int,
    @ColumnInfo(name = "sync_status") val syncStatus: String = "SYNCED",
    @ColumnInfo(name = "updated_at") val updatedAt: Long = System.currentTimeMillis(),
)

@Entity(
    tableName = "srs_card",
    foreignKeys = [
        ForeignKey(
            entity = VocabularyEntity::class,
            parentColumns = ["id"],
            childColumns = ["vocabulary_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [
        Index("vocabulary_id"),
        Index("next_review_at"),
        Index("sync_status"),
    ],
)
data class SrsCardEntity(
    @PrimaryKey val id: Long,
    @ColumnInfo(name = "vocabulary_id") val vocabularyId: Long,
    @ColumnInfo(name = "ease_factor") val easeFactor: Float = 2.5f,
    val interval: Int = 0,
    val repetitions: Int = 0,
    @ColumnInfo(name = "next_review_at") val nextReviewAt: Long = System.currentTimeMillis(),
    val mastered: Boolean = false,
    @ColumnInfo(name = "sync_status") val syncStatus: String = "SYNCED",
    @ColumnInfo(name = "updated_at") val updatedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "sync_queue")
data class SyncQueueEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val operation: String,
    @ColumnInfo(name = "entity_id") val entityId: Long,
    val payload: String,
    @ColumnInfo(name = "retry_count") val retryCount: Int = 0,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis(),
)

/** Cache danh sách bài để màn chọn bài chạy offline (thêm ở DB version 2). */
@Entity(
    tableName = "lesson",
    indices = [Index(value = ["lesson_number"], unique = true)],
)
data class LessonEntity(
    @PrimaryKey val id: Long,
    @ColumnInfo(name = "lesson_number") val lessonNumber: Int,
    val title: String?,
    val description: String?,
    @ColumnInfo(name = "vocab_count") val vocabCount: Int?,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)
