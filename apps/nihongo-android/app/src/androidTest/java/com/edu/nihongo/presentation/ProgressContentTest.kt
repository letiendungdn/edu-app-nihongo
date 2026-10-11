package com.edu.nihongo.presentation

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.edu.nihongo.domain.entity.LearnerProgress
import com.edu.nihongo.domain.entity.StudyDay
import com.edu.nihongo.presentation.progress.ProgressContent
import com.edu.nihongo.presentation.theme.NihongoTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Test giao diện cho composable không phụ thuộc ViewModel: truyền dữ liệu giả vào thẳng. */
@RunWith(AndroidJUnit4::class)
class ProgressContentTest {
    @get:Rule val compose = createComposeRule()

    private val progress = LearnerProgress(3, 7, 3_900, 40, 44, 5, fetchedAt = 0)

    @Test
    fun showsStats_andAccessibleChart() {
        compose.setContent {
            NihongoTheme {
                ProgressContent(
                    progress,
                    listOf(StudyDay("2026-10-04", 0, 0, 2, 0), StudyDay("2026-10-05", 0, 0, 5, 2)),
                    error = null,
                )
            }
        }

        compose.onNodeWithText("3 ngày").assertIsDisplayed()
        compose.onNodeWithText("1 giờ 5 phút").assertIsDisplayed()
        // Canvas không có chữ: TalkBack đọc được nhờ contentDescription
        compose.onNodeWithContentDescription("Biểu đồ hoạt động", substring = true).assertIsDisplayed()
    }

    @Test
    fun offline_showsStaleBanner() {
        compose.setContent { NihongoTheme { ProgressContent(progress, emptyList(), error = "Không có mạng") } }

        compose.onNodeWithText("Đang hiện dữ liệu đã lưu", substring = true).assertIsDisplayed()
        compose.onNodeWithText("Chưa có ngày học nào.").assertIsDisplayed()
    }
}
