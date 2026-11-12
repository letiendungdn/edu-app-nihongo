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

    /** v3→v4 thêm 4 cột nullable cho vocabulary: dữ liệu cũ giữ nguyên, cột mới là NULL tới lần sync sau. */
    @Test
    fun migrate3To4_addsVocabReadingColumns() {
        helper.createDatabase(TEST_DB, 3).apply {
            execSQL(
                "INSERT INTO vocabulary (id, lesson_number, kana, kanji, meaning, romaji, sort_order, sync_status, updated_at) " +
                    "VALUES (1, 1, 'ねこ', '猫', 'con mèo', 'neko', 0, 'SYNCED', 0)",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 4, true)

        db.query("SELECT kana, meaning_en, meaning_en_source, han_viet, furigana FROM vocabulary WHERE id = 1").use { c ->
            c.moveToFirst()
            assertEquals("ねこ", c.getString(0))
            for (i in 1..4) assertEquals(true, c.isNull(i))
        }
    }

    /** v4→v5 thêm cột meaning_en cho kanji: dòng cũ giữ nguyên, cột mới NULL tới lần tải sau. */
    @Test
    fun migrate4To5_addsKanjiMeaningEn() {
        helper.createDatabase(TEST_DB, 4).apply {
            execSQL(
                "INSERT INTO kanji (id, lesson_number, character, han_viet, onyomi, kunyomi, meaning_vi, mnemonic_vi, sort_order) " +
                    "VALUES (1, 1, '一', 'NHẤT', 'いち', 'ひと', 'một', NULL, 0)",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 5, true)

        db.query("SELECT character, meaning_en FROM kanji WHERE id = 1").use { c ->
            c.moveToFirst()
            assertEquals("一", c.getString(0))
            assertEquals(true, c.isNull(1))
        }
    }

        private companion object {
        const val TEST_DB = "migration-test.db"
    }
}
