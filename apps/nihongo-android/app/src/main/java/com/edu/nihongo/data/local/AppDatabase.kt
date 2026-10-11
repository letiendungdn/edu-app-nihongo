package com.edu.nihongo.data.local

import androidx.room.AutoMigration
import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.edu.nihongo.data.local.dao.ExamAttemptDao
import com.edu.nihongo.data.local.dao.GrammarDao
import com.edu.nihongo.data.local.dao.KanjiDao
import com.edu.nihongo.data.local.dao.ProgressDao
import com.edu.nihongo.data.local.dao.ReadingDao
import com.edu.nihongo.data.local.entity.ExamAttemptEntity
import com.edu.nihongo.data.local.entity.GrammarEntity
import com.edu.nihongo.data.local.entity.GrammarExampleEntity
import com.edu.nihongo.data.local.entity.KanjiEntity
import com.edu.nihongo.data.local.entity.ProgressSummaryEntity
import com.edu.nihongo.data.local.entity.ReadingPassageEntity
import com.edu.nihongo.data.local.entity.ReadingQuestionEntity
import com.edu.nihongo.data.local.entity.StudyDayEntity
import com.edu.nihongo.data.local.dao.LessonDao
import com.edu.nihongo.data.local.dao.SrsCardDao
import com.edu.nihongo.data.local.dao.SyncQueueDao
import com.edu.nihongo.data.local.dao.VocabularyDao
import com.edu.nihongo.data.local.entity.LessonEntity
import com.edu.nihongo.data.local.entity.SrsCardEntity
import com.edu.nihongo.data.local.entity.SyncQueueEntity
import com.edu.nihongo.data.local.entity.VocabularyEntity

@Database(
    entities = [
        VocabularyEntity::class,
        SrsCardEntity::class,
        SyncQueueEntity::class,
        LessonEntity::class,
        ProgressSummaryEntity::class,
        StudyDayEntity::class,
        GrammarEntity::class,
        GrammarExampleEntity::class,
        KanjiEntity::class,
        ReadingPassageEntity::class,
        ReadingQuestionEntity::class,
        ExamAttemptEntity::class,
    ],
    // Mỗi lần đổi schema: tăng version + khai báo migration. Schema JSON từng version
    // nằm ở app/schemas/ và được test trong androidTest/.../AppDatabaseMigrationTest.
    version = 3,
    exportSchema = true,
    autoMigrations = [
        AutoMigration(from = 1, to = 2), // thêm bảng lesson
        AutoMigration(from = 2, to = 3), // tiến độ, ngữ pháp, kanji, đọc hiểu, bài thi
    ],
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun vocabDao(): VocabularyDao
    abstract fun srsDao(): SrsCardDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun lessonDao(): LessonDao
    abstract fun progressDao(): ProgressDao
    abstract fun grammarDao(): GrammarDao
    abstract fun kanjiDao(): KanjiDao
    abstract fun readingDao(): ReadingDao
    abstract fun examAttemptDao(): ExamAttemptDao

    companion object {
        const val DB_NAME = "edu_app.db"
    }
}
