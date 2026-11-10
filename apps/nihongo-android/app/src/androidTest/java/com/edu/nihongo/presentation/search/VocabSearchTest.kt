package com.edu.nihongo.presentation.search

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.room.Room
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.edu.nihongo.MainActivity
import com.edu.nihongo.data.local.AppDatabase
import com.edu.nihongo.data.local.entity.VocabularyEntity
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * End-to-end trên app thật: từ vựng nằm trong Room (như sau khi đã mở bài), vào Home → "Tra từ",
 * gõ kiểu bàn phím "kandou" (dữ liệu lưu "kandō shimasu") → thấy đúng từ, không cần mạng.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
class VocabSearchTest {
    @get:Rule val compose = createEmptyComposeRule()

    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private lateinit var db: AppDatabase

    @Before
    fun seed() = runBlocking {
        db = Room.databaseBuilder(context, AppDatabase::class.java, AppDatabase.DB_NAME).build()
        cleanUp()
        db.vocabDao().upsertAll(
            listOf(
                VocabularyEntity(BASE_ID + 1, TEST_LESSON, "かんどうします", "感動します", "cảm động", "kandō shimasu", 0),
                VocabularyEntity(BASE_ID + 2, TEST_LESSON, "かんじ", "漢字", "chữ Hán", "kanji", 1),
            ),
        )
    }

    @After
    fun tearDown() {
        cleanUp()
        db.close()
    }

    @Test
    fun typingRomaji_showsMatchingVocabularyOffline() {
        ActivityScenario.launch(MainActivity::class.java).use {
            compose.onNodeWithText("Tra từ").performClick()
            compose.onNodeWithTag("search_input").performTextInput("kandou")
            compose.waitUntilAtLeastOneExists(hasText("cảm động"), timeoutMillis = 5_000)
            compose.onNodeWithText("cảm động").assertIsDisplayed()
            compose.onNodeWithText("chữ Hán").assertDoesNotExist()
        }
    }

    private fun cleanUp() {
        db.openHelper.writableDatabase.execSQL("DELETE FROM vocabulary WHERE id > $BASE_ID AND id < ${BASE_ID + 100}")
    }

    private companion object {
        const val BASE_ID = 9_200_000L
        const val TEST_LESSON = 9_998
    }
}
