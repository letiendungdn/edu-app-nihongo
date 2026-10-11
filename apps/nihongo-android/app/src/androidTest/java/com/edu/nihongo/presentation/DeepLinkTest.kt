package com.edu.nihongo.presentation

import android.content.Intent
import android.net.Uri
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.edu.nihongo.MainActivity
import com.edu.nihongo.data.notifications.SRS_DEEP_LINK
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * End-to-end trên app thật (Hilt, Room, NavHost thật): intent mà thông báo nhắc ôn và widget
 * gửi đi phải mở thẳng màn SRS, không dừng ở Home.
 */
@RunWith(AndroidJUnit4::class)
class DeepLinkTest {
    @get:Rule val compose = createEmptyComposeRule()

    @Test
    fun srsDeepLink_opensReviewScreen() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(SRS_DEEP_LINK), context, MainActivity::class.java)

        ActivityScenario.launch<MainActivity>(intent).use {
            compose.onNodeWithText("Ôn tập SRS").assertIsDisplayed()
        }
    }
}
