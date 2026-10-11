package com.edu.nihongo.presentation.progress

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.edu.nihongo.domain.entity.LearnerProgress
import com.edu.nihongo.domain.entity.StudyDay
import com.edu.nihongo.presentation.common.BackScaffold
import com.edu.nihongo.presentation.common.LoadingBox
import com.edu.nihongo.presentation.common.MessageBox
import com.edu.nihongo.presentation.common.StaleBanner

@Composable
fun ProgressScreen(
    onBack: () -> Unit,
    onLogin: () -> Unit,
    viewModel: ProgressViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    BackScaffold(
        title = "Tiến độ học",
        onBack = onBack,
        actions = {
            IconButton(onClick = viewModel::refresh) { Icon(Icons.Default.Refresh, contentDescription = "Làm mới") }
        },
    ) { padding ->
        val modifier = Modifier.padding(padding)
        val progress = state.progress
        when {
            state.isLoading -> LoadingBox(modifier)
            state.needsLogin -> MessageBox("Đăng nhập để xem tiến độ học.", modifier, onRetry = onLogin)
            progress == null -> MessageBox(state.error ?: "Chưa có dữ liệu.", modifier, onRetry = viewModel::refresh)
            else -> ProgressContent(progress, state.days, state.error, modifier)
        }
    }
}

/** Không phụ thuộc ViewModel: preview và test giao diện truyền dữ liệu giả vào thẳng. */
@Composable
fun ProgressContent(progress: LearnerProgress, days: List<StudyDay>, error: String?, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        StaleBanner(error)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard("Chuỗi hiện tại", "${progress.currentStreak} ngày", Modifier.weight(1f))
            StatCard("Dài nhất", "${progress.longestStreak} ngày", Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard("Từ vựng", progress.vocabTotal.toString(), Modifier.weight(1f))
            StatCard("Kanji", progress.kanjiTotal.toString(), Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard("Thẻ đã ôn", progress.totalCards.toString(), Modifier.weight(1f))
            StatCard("Thời gian", formatStudyTime(progress.totalSeconds), Modifier.weight(1f))
        }
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("${ProgressViewModel.CHART_DAYS} ngày gần nhất", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Từ vựng + kanji + thẻ ôn mỗi ngày có học",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (days.isEmpty()) {
                    Text("Chưa có ngày học nào.", modifier = Modifier.padding(top = 12.dp))
                } else {
                    ActivityChart(days, Modifier.fillMaxWidth().height(160.dp).padding(top = 12.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(days.first().date.drop(5), style = MaterialTheme.typography.labelSmall)
                        Text(days.last().date.drop(5), style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier) {
        Column(Modifier.padding(16.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.headlineSmall)
        }
    }
}

/**
 * Biểu đồ cột vẽ tay bằng Canvas (không thêm thư viện chart). Canvas không có chữ để trình đọc
 * màn hình đọc, nên gắn contentDescription tóm tắt bằng lời.
 */
@Composable
private fun ActivityChart(days: List<StudyDay>, modifier: Modifier = Modifier) {
    val barColor = MaterialTheme.colorScheme.primary
    val max = days.maxOf { it.activity }.coerceAtLeast(1)
    val summary = days.joinToString { "${it.date.drop(5)}: ${it.activity}" }
    Canvas(modifier.semantics { contentDescription = "Biểu đồ hoạt động. $summary" }) {
        val slot = size.width / days.size
        val barWidth = slot * 0.6f
        days.forEachIndexed { i, day ->
            val h = size.height * day.activity / max
            drawRoundRect(
                color = barColor,
                topLeft = Offset(i * slot + (slot - barWidth) / 2, size.height - h),
                size = Size(barWidth, h),
                cornerRadius = CornerRadius(6f, 6f),
            )
        }
    }
}
