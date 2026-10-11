package com.edu.nihongo.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.Relation

// Các bảng thêm ở DB version 3 (AutoMigration 2 → 3).

/** Tiến độ của người đang đăng nhập. Một dòng duy nhất (id = 0), xóa khi đăng xuất. */
@Entity(tableName = "progress_summary")
data class ProgressSummaryEntity(
    @PrimaryKey val id: Int = 0,
    @ColumnInfo(name = "user_id") val userId: Long,
    @ColumnInfo(name = "current_streak") val currentStreak: Int,
    @ColumnInfo(name = "longest_streak") val longestStreak: Int,
    @ColumnInfo(name = "total_seconds") val totalSeconds: Int,
    @ColumnInfo(name = "total_cards") val totalCards: Int,
    @ColumnInfo(name = "vocab_total") val vocabTotal: Int,
    @ColumnInfo(name = "kanji_total") val kanjiTotal: Int,
    @ColumnInfo(name = "fetched_at") val fetchedAt: Long,
)

@Entity(tableName = "study_day")
data class StudyDayEntity(
    /** YYYY-MM-DD; so sánh chuỗi đúng thứ tự ngày nên ORDER BY được. */
    @PrimaryKey @ColumnInfo(name = "study_date") val studyDate: String,
    val seconds: Int,
    @ColumnInfo(name = "cards_reviewed") val cardsReviewed: Int,
    @ColumnInfo(name = "vocab_count") val vocabCount: Int,
    @ColumnInfo(name = "kanji_count") val kanjiCount: Int,
)

@Entity(tableName = "grammar", indices = [Index("lesson_number")])
data class GrammarEntity(
    @PrimaryKey val id: Long,
    @ColumnInfo(name = "lesson_number") val lessonNumber: Int,
    val pattern: String,
    val meaning: String,
    val explanation: String?,
    @ColumnInfo(name = "jlpt_level") val jlptLevel: String?,
    @ColumnInfo(name = "sort_order") val sortOrder: Int,
)

@Entity(
    tableName = "grammar_example",
    foreignKeys = [
        ForeignKey(
            entity = GrammarEntity::class,
            parentColumns = ["id"],
            childColumns = ["grammar_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("grammar_id")],
)
data class GrammarExampleEntity(
    @PrimaryKey val id: Long,
    @ColumnInfo(name = "grammar_id") val grammarId: Long,
    val jp: String,
    val romaji: String?,
    val vi: String?,
    @ColumnInfo(name = "sort_order") val sortOrder: Int,
)

/** Room tự JOIN theo khóa ngoại: một query cho grammar, một query cho mọi example. */
data class GrammarWithExamples(
    @Embedded val grammar: GrammarEntity,
    @Relation(parentColumn = "id", entityColumn = "grammar_id")
    val examples: List<GrammarExampleEntity>,
)

@Entity(tableName = "kanji", indices = [Index("lesson_number")])
data class KanjiEntity(
    @PrimaryKey val id: Long,
    @ColumnInfo(name = "lesson_number") val lessonNumber: Int,
    val character: String,
    @ColumnInfo(name = "han_viet") val hanViet: String?,
    val onyomi: String?,
    val kunyomi: String?,
    @ColumnInfo(name = "meaning_vi") val meaningVi: String?,
    @ColumnInfo(name = "mnemonic_vi") val mnemonicVi: String?,
    @ColumnInfo(name = "sort_order") val sortOrder: Int,
)

@Entity(tableName = "reading_passage")
data class ReadingPassageEntity(
    @PrimaryKey val id: Long,
    val title: String,
    @ColumnInfo(name = "jlpt_level") val jlptLevel: String?,
    @ColumnInfo(name = "estimated_min") val estimatedMin: Int,
    @ColumnInfo(name = "sort_order") val sortOrder: Int,
    @ColumnInfo(name = "question_count") val questionCount: Int,
    /** null cho tới khi mở bài lần đầu (danh sách không trả nội dung). */
    val content: String?,
)

@Entity(
    tableName = "reading_question",
    foreignKeys = [
        ForeignKey(
            entity = ReadingPassageEntity::class,
            parentColumns = ["id"],
            childColumns = ["passage_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("passage_id")],
)
data class ReadingQuestionEntity(
    @PrimaryKey val id: Long,
    @ColumnInfo(name = "passage_id") val passageId: Long,
    val question: String,
    /** Đáp án đúng: cho phép tự chấm khi offline. */
    val answer: String,
    val explanation: String?,
    /** Danh sách lựa chọn, lưu bằng TypeConverter (JSON). */
    val options: List<String>,
    @ColumnInfo(name = "sort_order") val sortOrder: Int,
)

data class ReadingWithQuestions(
    @Embedded val passage: ReadingPassageEntity,
    @Relation(parentColumn = "id", entityColumn = "passage_id")
    val questions: List<ReadingQuestionEntity>,
)

/**
 * Bài thi đang làm. Lưu trong Room (không chỉ trong ViewModel) để tắt app, hết pin hay
 * hệ điều hành giết process giữa giờ thi vẫn làm tiếp được, đồng hồ vẫn đúng.
 */
@Entity(tableName = "exam_attempt")
data class ExamAttemptEntity(
    @PrimaryKey @ColumnInfo(name = "exam_id") val examId: String,
    val title: String,
    val level: String,
    @ColumnInfo(name = "started_at") val startedAt: Long,
    /** Mốc tuyệt đối, không lưu "còn bao nhiêu giây": app ở nền vẫn tính đúng. */
    @ColumnInfo(name = "ends_at") val endsAt: Long,
    @ColumnInfo(name = "questions_json") val questionsJson: String,
    @ColumnInfo(name = "answers_json") val answersJson: String,
    @ColumnInfo(name = "result_json") val resultJson: String?,
)
