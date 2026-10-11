package com.edu.nihongo.presentation.reading

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.edu.nihongo.domain.entity.ReadingQuestion
import com.edu.nihongo.presentation.common.BackScaffold
import com.edu.nihongo.presentation.common.LoadingBox
import com.edu.nihongo.presentation.common.MessageBox
import com.edu.nihongo.presentation.common.StaleBanner

@Composable
fun ReadingListScreen(
    onBack: () -> Unit,
    onOpen: (Long) -> Unit,
    viewModel: ReadingListViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    BackScaffold("Đọc hiểu", onBack) { padding ->
        val modifier = Modifier.padding(padding)
        when {
            state.isLoading -> LoadingBox(modifier)
            state.items.isEmpty() -> MessageBox(state.error ?: "Chưa có bài đọc.", modifier, viewModel::refresh)
            else -> LazyColumn(modifier, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { StaleBanner(state.error) }
                items(state.items, key = { it.id }) { p ->
                    Card(Modifier.fillMaxWidth().clickable { onOpen(p.id) }) {
                        Column(Modifier.padding(14.dp)) {
                            Text(p.title, style = MaterialTheme.typography.titleMedium)
                            Text(
                                "${p.jlptLevel ?: ""} · ${p.estimatedMin} phút · ${p.questionCount} câu" +
                                    if (p.content != null) " · đã tải" else "",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ReadingDetailScreen(onBack: () -> Unit, viewModel: ReadingDetailViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val passage = state.passage
    BackScaffold(passage?.title ?: "Đọc hiểu", onBack) { padding ->
        val modifier = Modifier.padding(padding)
        when {
            state.isLoading -> LoadingBox(modifier)
            passage?.content == null -> MessageBox(state.error ?: "Cần mạng để tải bài lần đầu.", modifier)
            else -> LazyColumn(modifier, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item { Card { Text(passage.content, Modifier.padding(16.dp), style = MaterialTheme.typography.bodyLarge) } }
                items(passage.questions, key = { it.id }) { q ->
                    QuestionCard(q, state.answers[q.id], showAnswer = state.score != null) { viewModel.choose(q.id, it) }
                }
                item {
                    state.score?.let { s ->
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp)) {
                                Text("Đúng ${s.correct}/${s.total} (${s.percent}%)", style = MaterialTheme.typography.titleLarge)
                                if (state.gradedOffline) {
                                    Text("Chấm offline bằng đáp án đã lưu. Kết quả chưa gửi lên server.", style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    } ?: Button(onClick = viewModel::submit, enabled = state.canSubmit, modifier = Modifier.fillMaxWidth()) {
                        Text(if (state.submitting) "Đang nộp…" else "Nộp bài")
                    }
                    state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
            }
        }
    }
}

@Composable
private fun QuestionCard(q: ReadingQuestion, selected: String?, showAnswer: Boolean, onChoose: (String) -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            Text(q.question, style = MaterialTheme.typography.titleSmall)
            q.options.forEach { option ->
                val isCorrect = showAnswer && option == q.answer
                Row(
                    Modifier
                        .fillMaxWidth()
                        // selectable + Role.RadioButton: TalkBack đọc "đã chọn / chưa chọn, nút radio"
                        .selectable(selected = selected == option, enabled = !showAnswer, role = Role.RadioButton) { onChoose(option) }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    RadioButton(selected = selected == option, onClick = null)
                    Text(
                        option + if (isCorrect) "  ✓" else "",
                        color = if (isCorrect) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
            if (showAnswer) q.explanation?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
        }
    }
}
