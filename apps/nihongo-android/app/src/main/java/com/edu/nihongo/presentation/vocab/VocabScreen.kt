package com.edu.nihongo.presentation.vocab

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.edu.nihongo.presentation.common.LoadingBox
import com.edu.nihongo.presentation.common.MessageBox
import com.edu.nihongo.presentation.common.StaleBanner
import com.edu.nihongo.utils.TtsHelper

/** Tab "Từ vựng" trong LessonDetailScreen. ViewModel đọc số bài từ argument "lesson" của route. */
@Composable
fun VocabTab(viewModel: VocabViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    when {
        uiState.isLoading -> LoadingBox(text = "Đang tải / sync…")
        uiState.items.isEmpty() -> MessageBox(uiState.error ?: "Chưa có từ vựng. Cần mạng để sync lần đầu.")
        else -> LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item { StaleBanner(uiState.error) }
            items(uiState.items, key = { it.id }) { vocab ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { TtsHelper.speak(vocab.kana) },
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(vocab.kana, style = MaterialTheme.typography.titleMedium)
                        vocab.kanji?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
                        Text(vocab.meaning, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            "🔊 Chạm để nghe",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }
        }
    }
}
