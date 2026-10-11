package com.edu.nihongo.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.edu.nihongo.data.local.entity.ExamAttemptEntity
import com.edu.nihongo.data.local.entity.GrammarEntity
import com.edu.nihongo.data.local.entity.GrammarExampleEntity
import com.edu.nihongo.data.local.entity.GrammarWithExamples
import com.edu.nihongo.data.local.entity.KanjiEntity
import com.edu.nihongo.data.local.entity.ProgressSummaryEntity
import com.edu.nihongo.data.local.entity.ReadingPassageEntity
import com.edu.nihongo.data.local.entity.ReadingQuestionEntity
import com.edu.nihongo.data.local.entity.ReadingWithQuestions
import com.edu.nihongo.data.local.entity.StudyDayEntity
import kotlinx.coroutines.flow.Flow

@Dao
abstract class ProgressDao {
    @Query("SELECT * FROM progress_summary WHERE id = 0")
    abstract fun observeSummary(): Flow<ProgressSummaryEntity?>

    @Query("SELECT * FROM study_day ORDER BY study_date DESC LIMIT :limit")
    abstract fun observeRecentDays(limit: Int): Flow<List<StudyDayEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract suspend fun upsertSummary(summary: ProgressSummaryEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract suspend fun insertDays(days: List<StudyDayEntity>)

    @Query("DELETE FROM study_day")
    protected abstract suspend fun clearDays()

    @Query("DELETE FROM progress_summary")
    protected abstract suspend fun clearSummary()

    /** Thay toàn bộ trong một transaction: UI không bao giờ thấy nửa cũ nửa mới. */
    @Transaction
    open suspend fun replace(summary: ProgressSummaryEntity, days: List<StudyDayEntity>) {
        upsertSummary(summary)
        clearDays()
        insertDays(days)
    }

    @Transaction
    open suspend fun clear() {
        clearSummary()
        clearDays()
    }
}

@Dao
abstract class GrammarDao {
    @Transaction
    @Query("SELECT * FROM grammar WHERE lesson_number = :lessonNumber ORDER BY sort_order ASC")
    abstract fun observeByLesson(lessonNumber: Int): Flow<List<GrammarWithExamples>>

    @Query("DELETE FROM grammar WHERE lesson_number = :lessonNumber")
    protected abstract suspend fun deleteLesson(lessonNumber: Int)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract suspend fun insertGrammar(items: List<GrammarEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract suspend fun insertExamples(items: List<GrammarExampleEntity>)

    /** Xóa rồi chèn lại cả bài: mẫu ngữ pháp bị xóa trên server cũng biến mất ở máy. CASCADE xóa example. */
    @Transaction
    open suspend fun replaceLesson(lessonNumber: Int, grammar: List<GrammarEntity>, examples: List<GrammarExampleEntity>) {
        deleteLesson(lessonNumber)
        insertGrammar(grammar)
        insertExamples(examples)
    }
}

@Dao
abstract class KanjiDao {
    @Query("SELECT * FROM kanji WHERE lesson_number = :lessonNumber ORDER BY sort_order ASC")
    abstract fun observeByLesson(lessonNumber: Int): Flow<List<KanjiEntity>>

    @Query("DELETE FROM kanji WHERE lesson_number = :lessonNumber")
    protected abstract suspend fun deleteLesson(lessonNumber: Int)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract suspend fun insertAll(items: List<KanjiEntity>)

    @Transaction
    open suspend fun replaceLesson(lessonNumber: Int, items: List<KanjiEntity>) {
        deleteLesson(lessonNumber)
        insertAll(items)
    }
}

@Dao
abstract class ReadingDao {
    @Query("SELECT * FROM reading_passage ORDER BY sort_order ASC, id ASC")
    abstract fun observePassages(): Flow<List<ReadingPassageEntity>>

    @Transaction
    @Query("SELECT * FROM reading_passage WHERE id = :id")
    abstract fun observePassage(id: Long): Flow<ReadingWithQuestions?>

    /** Cập nhật danh sách nhưng giữ `content` đã tải (danh sách không trả nội dung). */
    @Transaction
    open suspend fun upsertSummaries(items: List<ReadingPassageEntity>) {
        for (item in items) {
            val existing = getPassage(item.id)
            upsertPassage(item.copy(content = existing?.content))
        }
    }

    @Transaction
    open suspend fun saveDetail(passage: ReadingPassageEntity, questions: List<ReadingQuestionEntity>) {
        upsertPassage(passage)
        deleteQuestions(passage.id)
        insertQuestions(questions)
    }

    @Query("SELECT * FROM reading_passage WHERE id = :id")
    protected abstract suspend fun getPassage(id: Long): ReadingPassageEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract suspend fun upsertPassage(item: ReadingPassageEntity)

    @Query("DELETE FROM reading_question WHERE passage_id = :passageId")
    protected abstract suspend fun deleteQuestions(passageId: Long)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract suspend fun insertQuestions(items: List<ReadingQuestionEntity>)
}

@Dao
interface ExamAttemptDao {
    /** Bài đang làm dở (chưa có kết quả), mới nhất trước. */
    @Query("SELECT * FROM exam_attempt WHERE result_json IS NULL ORDER BY started_at DESC LIMIT 1")
    fun observeActive(): Flow<ExamAttemptEntity?>

    @Query("SELECT * FROM exam_attempt WHERE exam_id = :examId")
    fun observe(examId: String): Flow<ExamAttemptEntity?>

    @Query("SELECT * FROM exam_attempt WHERE exam_id = :examId")
    suspend fun get(examId: String): ExamAttemptEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(attempt: ExamAttemptEntity)

    @Query("UPDATE exam_attempt SET answers_json = :answersJson WHERE exam_id = :examId")
    suspend fun saveAnswers(examId: String, answersJson: String)

    @Query("UPDATE exam_attempt SET result_json = :resultJson WHERE exam_id = :examId")
    suspend fun saveResult(examId: String, resultJson: String)
}
