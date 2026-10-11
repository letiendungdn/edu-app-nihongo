package com.edu.nihongo.presentation.exam

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.edu.nihongo.domain.entity.ExamAttempt
import com.edu.nihongo.domain.entity.ExamResult
import com.edu.nihongo.presentation.common.BackScaffold
import com.edu.nihongo.presentation.common.LoadingBox
import com.edu.nihongo.presentation.common.MessageBox
import com.edu.nihongo.utils.TtsHelper

@Composable
fun ExamListScreen(
    onBack: () -> Unit,
    onOpenExam: (String) -> Unit,
    viewModel: ExamListViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(viewModel) { viewModel.openExam.collect(onOpenExam) }

    BackScaffold("Thi thử JLPT", onBack) { padding ->
        LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            state.active?.let { a ->
                item {
                    Card(
                        Modifier.fillMaxWidth().clickable { onOpenExam(a.examId) },
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Text("Làm tiếp: ${a.title}", style = MaterialTheme.typography.titleMedium)
                            Text("Đã trả lời ${a.answers.size}/${a.questions.size} câu", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
            when {
                state.isLoading -> item { LoadingBox(Modifier.padding(32.dp)) }
                state.templates.isEmpty() -> item { MessageBox(state.error ?: "Chưa có đề.", onRetry = viewModel::load) }
                else -> items(state.templates, key = { it.key }) { t ->
                    Card(Modifier.fillMaxWidth().clickable(enabled = !state.starting) { viewModel.start(t.key) }) {
                        Column(Modifier.padding(16.dp)) {
                            Text("${t.level} · ${t.title}", style = MaterialTheme.typography.titleMedium)
                            Text(
                                "${t.totalQuestions} câu · ${t.durationMinutes} phút" + (t.scope?.let { " · $it" } ?: ""),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
            state.error?.takeIf { state.templates.isNotEmpty() }?.let { item { Text(it, color = MaterialTheme.colorScheme.error) } }
        }
    }
}

@Composable
fun ExamScreen(onBack: () -> Unit, viewModel: ExamViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val attempt = state.attempt
    BackScaffold(attempt?.title ?: "Bài thi", onBack) { padding ->
        val modifier = Modifier.padding(padding)
        when {
            attempt == null -> LoadingBox(modifier)
            attempt.result != null -> ResultContent(attempt.result, modifier)
            attempt.questions.isEmpty() -> MessageBox("Đề không có câu hỏi.", modifier)
            else -> QuestionContent(state, attempt, viewModel, modifier)
        }
    }
}

@Composable
private fun QuestionContent(state: ExamState, attempt: ExamAttempt, viewModel: ExamViewModel, modifier: Modifier) {
    val q = attempt.questions[state.index]
    val selected = attempt.answers[q.id]
    Column(modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Câu ${state.index + 1}/${attempt.questions.size} · ${q.sectionName}", Modifier.weight(1f))
            // liveRegion Polite: TalkBack đọc thời gian khi nó đổi, không cắt ngang việc khác
            Text(
                formatRemaining(state.remainingMs),
                style = MaterialTheme.typography.titleMedium,
                color = if (state.remainingMs < 5 * 60_000) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
        }
        LinearProgressIndicator(progress = { state.answeredCount / attempt.questions.size.toFloat() }, modifier = Modifier.fillMaxWidth())

        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(q.question, style = MaterialTheme.typography.titleMedium)
            q.audioText?.let { text ->
                OutlinedButton(onClick = { TtsHelper.speak(text) }) { Text("🔊 Nghe") }
            }
            q.options.forEach { option ->
                Row(
                    Modifier.fillMaxWidth()
                        .selectable(selected = selected == option, role = Role.RadioButton) { viewModel.choose(q.id, option) }
                        .padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    RadioButton(selected = selected == option, onClick = null)
                    Text(option)
                }
            }
        }

        state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = { viewModel.goTo(state.index - 1) }, enabled = state.index > 0) { Text("← Trước") }
            Spacer(Modifier.weight(1f))
            if (state.index < attempt.questions.lastIndex) {
                Button(onClick = { viewModel.goTo(state.index + 1) }) { Text("Tiếp →") }
            } else {
                Button(onClick = viewModel::submit, enabled = !state.submitting) {
                    Text(if (state.submitting) "Đang nộp…" else "Nộp bài (${state.answeredCount}/${attempt.questions.size})")
                }
            }
        }
    }
}

@Composable
private fun ResultContent(result: ExamResult, modifier: Modifier) {
    LazyColumn(modifier, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text(if (result.passed) "Đạt 🎉" else "Chưa đạt", style = MaterialTheme.typography.headlineSmall)
                    Text("Đúng ${result.correct}/${result.total} (${result.percent}%)", style = MaterialTheme.typography.titleMedium)
                    result.sections.forEach { Text("${it.name}: ${it.correct}/${it.total}") }
                }
            }
        }
        if (result.wrong.isNotEmpty()) item { Text("Câu sai (${result.wrong.size})", style = MaterialTheme.typography.titleMedium) }
        items(result.wrong) { w ->
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(12.dp)) {
                    Text(w.question)
                    Text("Đáp án: ${w.correctAnswer}", color = MaterialTheme.colorScheme.primary)
                    Text("Bạn chọn: ${w.userAnswer ?: "(bỏ trống)"}", color = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}
