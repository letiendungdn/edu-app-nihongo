package com.edu.nihongo.presentation.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.Composable
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.Action
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.edu.nihongo.MainActivity
import com.edu.nihongo.data.local.dao.SrsCardDao
import com.edu.nihongo.data.notifications.SRS_DEEP_LINK
import com.edu.nihongo.data.sync.WidgetRefresher
import com.edu.nihongo.domain.TimeSource
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Widget "Thẻ cần ôn". Viết bằng Glance (API giống Compose) nhưng chạy trong process của
 * launcher qua RemoteViews: chỉ dùng được composable của `androidx.glance`, không dùng được
 * Material của app. Bấm vào mở thẳng màn SRS bằng deep link.
 */
class DueCardsWidget : GlanceAppWidget() {

    /** Widget không phải Activity/Fragment nên không có @AndroidEntryPoint: lấy dependency qua EntryPoint. */
    @EntryPoint
    @InstallIn(SingletonComponent::class)
    interface Dependencies {
        fun srsCardDao(): SrsCardDao
        fun timeSource(): TimeSource
    }

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val deps = EntryPointAccessors.fromApplication(context, Dependencies::class.java)
        val due = deps.srsCardDao().countDue(deps.timeSource().now())
        val open = Intent(Intent.ACTION_VIEW, Uri.parse(SRS_DEEP_LINK), context, MainActivity::class.java)

        provideContent {
            GlanceTheme { DueCardsContent(due, actionStartActivity(open)) }
        }
    }
}

/** Tách khỏi provideGlance để test riêng phần hiển thị (glance-appwidget-testing). */
@Composable
fun DueCardsContent(due: Int, onClick: Action) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.primaryContainer)
            .cornerRadius(16.dp)
            .padding(12.dp)
            .clickable(onClick),
        verticalAlignment = Alignment.CenterVertically,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = due.toString(),
            style = TextStyle(
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = GlanceTheme.colors.onPrimaryContainer,
            ),
        )
        Text(
            text = if (due > 0) "thẻ cần ôn" else "Đã ôn xong hôm nay",
            style = TextStyle(fontSize = 13.sp, color = GlanceTheme.colors.onPrimaryContainer),
        )
    }
}

class DueCardsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = DueCardsWidget()
}

@Singleton
class GlanceWidgetRefresher @Inject constructor(
    @ApplicationContext private val context: Context,
) : WidgetRefresher {
    override suspend fun refresh() {
        DueCardsWidget().updateAll(context)
    }
}
