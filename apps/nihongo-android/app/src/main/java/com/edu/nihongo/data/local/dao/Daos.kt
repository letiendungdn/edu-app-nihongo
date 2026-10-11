package com.edu.nihongo.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.edu.nihongo.data.local.entity.LessonEntity
import com.edu.nihongo.data.local.entity.SrsCardEntity
import com.edu.nihongo.data.local.entity.SyncQueueEntity
import com.edu.nihongo.data.local.entity.VocabularyEntity
import kotlinx.coroutines.flow.Flow

data class ReviewRow(
    val id: Long,
    val vocabularyId: Long,
    val easeFactor: Float,
    val interval: Int,
    val repetitions: Int,
    val nextReviewAt: Long,
    val mastered: Boolean,
    val syncStatus: String,
    val updatedAt: Long,
    val kana: String,
    val kanji: String?,
    val meaning: String,
    val romaji: String,
)

@Dao
interface VocabularyDao {
    @Query(
        """
        SELECT * FROM vocabulary
        WHERE lesson_number = :lessonNumber
        ORDER BY sort_order ASC
        """,
    )
    fun getByLesson(lessonNumber: Int): Flow<List<VocabularyEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<VocabularyEntity>)

    @Query("SELECT * FROM vocabulary WHERE id = :id LIMIT 1")
    suspend fun getById(id: Long): VocabularyEntity?
}

@Dao
interface SrsCardDao {
    @Query(
        """
        SELECT s.id, s.vocabulary_id AS vocabularyId, s.ease_factor AS easeFactor,
               s.interval, s.repetitions, s.next_review_at AS nextReviewAt,
               s.mastered, s.sync_status AS syncStatus, s.updated_at AS updatedAt,
               v.kana, v.kanji, v.meaning, v.romaji
        FROM srs_card s
        INNER JOIN vocabulary v ON v.id = s.vocabulary_id
        WHERE s.next_review_at <= :now
        ORDER BY s.next_review_at ASC
        LIMIT :limit
        """,
    )
    // Không để `now` có giá trị mặc định: default argument chỉ tính một lần lúc gọi hàm,
    // Flow sẽ chạy lại query mãi với mốc thời gian cũ. Repository truyền `now` theo nhịp.
    fun getReviewQueue(now: Long, limit: Int = 20): Flow<List<ReviewRow>>

    /** Số thẻ đến hạn: cho thông báo nhắc ôn (một lần) và widget (theo dõi liên tục). */
    @Query("SELECT COUNT(*) FROM srs_card WHERE next_review_at <= :now")
    suspend fun countDue(now: Long): Int

    @Query("SELECT * FROM srs_card WHERE vocabulary_id = :vocabId LIMIT 1")
    suspend fun getByVocabId(vocabId: Long): SrsCardEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(card: SrsCardEntity)

    /** Tạo thẻ cho từ mới, giữ nguyên tiến độ thẻ đã có. Một lệnh, một transaction. */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertIfMissing(cards: List<SrsCardEntity>)

    @Query(
        """
        UPDATE srs_card
        SET ease_factor = :easeFactor,
            interval = :interval,
            repetitions = :repetitions,
            next_review_at = :nextReviewAt,
            mastered = :mastered,
            sync_status = 'PENDING',
            updated_at = :updatedAt
        WHERE id = :id
        """,
    )
    suspend fun updateAfterReview(
        id: Long,
        easeFactor: Float,
        interval: Int,
        repetitions: Int,
        nextReviewAt: Long,
        mastered: Boolean,
        updatedAt: Long = System.currentTimeMillis(),
    )

    @Query("SELECT * FROM srs_card WHERE sync_status = 'PENDING'")
    suspend fun getPendingSync(): List<SrsCardEntity>

    /** Chỉ đánh dấu SYNCED khi thẻ không còn lần chấm mới hơn nằm trong hàng đợi. */
    @Query(
        """
        UPDATE srs_card SET sync_status = 'SYNCED'
        WHERE id IN (:ids)
          AND id NOT IN (SELECT entity_id FROM sync_queue WHERE operation = 'UPDATE_SRS')
        """,
    )
    suspend fun markSynced(ids: List<Long>)
}

@Dao
abstract class SyncQueueDao {
    @Insert
    abstract suspend fun enqueue(item: SyncQueueEntity)

    @Query("SELECT * FROM sync_queue ORDER BY created_at ASC")
    abstract suspend fun getPending(): List<SyncQueueEntity>

    @Query("DELETE FROM sync_queue WHERE id = :id")
    abstract suspend fun delete(id: Long)

    @Query("DELETE FROM sync_queue WHERE operation = :operation AND entity_id = :entityId")
    abstract suspend fun deleteByEntityId(operation: String, entityId: Long)

    /** Một thẻ chỉ giữ lần chấm mới nhất: chấm 3 lần offline thì gửi 1 item, không phải 3. */
    @Transaction
    open suspend fun replace(item: SyncQueueEntity) {
        deleteByEntityId(item.operation, item.entityId)
        enqueue(item)
    }
}

@Dao
interface LessonDao {
    @Query("SELECT * FROM lesson ORDER BY lesson_number ASC")
    fun observeAll(): Flow<List<LessonEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<LessonEntity>)
}
