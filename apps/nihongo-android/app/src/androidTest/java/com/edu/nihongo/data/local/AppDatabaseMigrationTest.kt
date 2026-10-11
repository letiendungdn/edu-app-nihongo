package com.edu.nihongo.data.local

import androidx.room.testing.MigrationTestHelper
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * L3: nâng DB phải giữ nguyên dữ liệu người dùng, nhất là thẻ SRS chưa sync và sync_queue.
 * Trước đây fallbackToDestructiveMigration sẽ xóa sạch chúng.
 *
 * Chạy trên emulator/máy thật: sh ./gradlew connectedDebugAndroidTest
 */
@RunWith(AndroidJUnit4::class)
class AppDatabaseMigrationTest {
    @get:Rule
    val helper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        AppDatabase::class.java,
    )

    @Test
    fun migrate1To2_keepsPendingReviewsAndQueue() {
        helper.createDatabase(TEST_DB, 1).apply {
            execSQL(
                "INSERT INTO vocabulary (id, lesson_number, kana, kanji, meaning, romaji, sort_order, sync_status, updated_at) " +
                    "VALUES (1, 1, 'ねこ', '猫', 'con mèo', 'neko', 0, 'SYNCED', 0)",
            )
            execSQL(
                "INSERT INTO srs_card (id, vocabulary_id, ease_factor, interval, repetitions, next_review_at, mastered, sync_status, updated_at) " +
                    "VALUES (1, 1, 2.6, 6, 2, 0, 0, 'PENDING', 0)",
            )
            execSQL(
                "INSERT INTO sync_queue (operation, entity_id, payload, retry_count, created_at) " +
                    "VALUES ('UPDATE_SRS', 1, '{}', 0, 0)",
            )
            close()
        }

        // validateDroppedTables = true: schema sau migration phải khớp đúng 2.json
        val db = helper.runMigrationsAndValidate(TEST_DB, 2, true)

        db.query("SELECT sync_status, repetitions, interval FROM srs_card WHERE id = 1").use { c ->
            c.moveToFirst()
            assertEquals("PENDING", c.getString(0))
            assertEquals(2, c.getInt(1))
            assertEquals(6, c.getInt(2))
        }
        db.query("SELECT COUNT(*) FROM sync_queue").use { c ->
            c.moveToFirst()
            assertEquals(1, c.getInt(0))
        }
        db.query("SELECT COUNT(*) FROM lesson").use { c ->
            c.moveToFirst()
            assertEquals(0, c.getInt(0)) // bảng mới, trống
        }
    }

    /** Người dùng đang ở v1 nhảy thẳng lên v3 (bỏ qua bản v2): Room chạy nối 1→2→3. */
    @Test
    fun migrate1To3_keepsData_andCreatesNewTables() {
        helper.createDatabase(TEST_DB, 1).apply {
            execSQL(
                "INSERT INTO vocabulary (id, lesson_number, kana, kanji, meaning, romaji, sort_order, sync_status, updated_at) " +
                    "VALUES (1, 1, 'ねこ', '猫', 'con mèo', 'neko', 0, 'SYNCED', 0)",
            )
            execSQL(
                "INSERT INTO srs_card (id, vocabulary_id, ease_factor, interval, repetitions, next_review_at, mastered, sync_status, updated_at) " +
                    "VALUES (1, 1, 2.6, 6, 2, 0, 0, 'PENDING', 0)",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 3, true)

        db.query("SELECT sync_status FROM srs_card WHERE id = 1").use { c ->
            c.moveToFirst()
            assertEquals("PENDING", c.getString(0))
        }
        for (table in listOf("progress_summary", "study_day", "grammar", "grammar_example", "kanji", "reading_passage", "reading_question", "exam_attempt")) {
            db.query("SELECT COUNT(*) FROM $table").use { c ->
                c.moveToFirst()
                assertEquals("bảng $table phải tồn tại và trống", 0, c.getInt(0))
            }
        }
    }

    private companion object {
        const val TEST_DB = "migration-test.db"
    }
}
