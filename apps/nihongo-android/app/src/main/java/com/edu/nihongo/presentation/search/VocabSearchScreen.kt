package com.edu.nihongo.presentation.search

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.edu.nihongo.domain.entity.Vocabulary
import com.edu.nihongo.presentation.common.BackScaffold
import com.edu.nihongo.presentation.common.LoadingBox
import com.edu.nihongo.presentation.common.MessageBox
import com.edu.nihongo.utils.TtsHelper

@Composable
fun VocabSearchScreen(onBack: () -> Unit, viewModel: VocabSearchViewModel = hiltViewModel()) {
    val query by viewModel.query.collectAsStateWithLifecycle()
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    BackScaffold(title = "Tra từ (romaji)", onBack = onBack) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
            OutlinedTextField(
                value = query,
                onValueChange = viewModel::onQueryChange,
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp).testTag("search_input"),
                singleLine = true,
                leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
                label = { Text("Gõ romaji, ví dụ: tabe, kandou") },
            )
            VocabSearchContent(state = state)
        }
    }
}

/** Tách khỏi ViewModel để test UI bằng dữ liệu giả. */
@Composable
fun VocabSearchContent(state: VocabSearchUiState) {
    when {
        state.isIndexing -> LoadingBox(text = "Đang dựng chỉ mục…")
        state.indexedCount == 0 -> MessageBox("Chưa có từ vựng trên máy. Mở một bài học khi có mạng để tải từ vựng về.")
        state.query.isBlank() -> MessageBox("Tìm trong ${state.indexedCount} từ đã có trên máy, không cần mạng.")
        state.results.isEmpty() -> MessageBox("Không có từ nào bắt đầu bằng \"${state.query}\".")
        else -> LazyColumn(
            contentPadding = PaddingValues(vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(state.results, key = { it.id }) { vocab -> SearchResultCard(vocab) }
        }
    }
}

@Composable
private fun SearchResultCard(vocab: Vocabulary) {
    Card(modifier = Modifier.fillMaxWidth().clickable { TtsHelper.speak(vocab.kana) }) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(vocab.kana) }
                    vocab.kanji?.takeIf { it.isNotBlank() }?.let { append("  ·  $it") }
                },
                style = MaterialTheme.typography.titleMedium,
            )
            Text(vocab.romaji, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
            Text(vocab.meaning, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Bài ${vocab.lessonNumber}", style = MaterialTheme.typography.labelSmall)
        }
    }
}
