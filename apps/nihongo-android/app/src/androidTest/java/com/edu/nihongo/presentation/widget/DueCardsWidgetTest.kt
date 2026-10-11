package com.edu.nihongo.presentation.widget

import android.content.Intent
import android.net.Uri
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.testing.unit.runGlanceAppWidgetUnitTest
import androidx.glance.testing.unit.hasClickAction
import androidx.glance.testing.unit.hasText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.edu.nihongo.data.notifications.SRS_DEEP_LINK
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DueCardsWidgetTest {
    private val open = Intent(Intent.ACTION_VIEW, Uri.parse(SRS_DEEP_LINK))

    @Test
    fun showsDueCount_andOpensSrsOnTap() = runGlanceAppWidgetUnitTest {
        provideComposable { DueCardsContent(12, actionStartActivity(open)) }

        onNode(hasText("12")).assertExists()
        onNode(hasText("thẻ cần ôn")).assertExists()
        // Đích của click (nihongo://srs → màn SRS) do DeepLinkTest kiểm tra trên app thật
        onNode(hasClickAction()).assertExists()
    }

    @Test
    fun allDone_message() = runGlanceAppWidgetUnitTest {
        provideComposable { DueCardsContent(0, actionStartActivity(open)) }

        onNode(hasText("Đã ôn xong hôm nay")).assertExists()
    }
}
