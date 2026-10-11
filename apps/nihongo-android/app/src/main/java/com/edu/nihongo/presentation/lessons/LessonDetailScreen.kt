package com.edu.nihongo.presentation.lessons

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.edu.nihongo.domain.entity.Grammar
import com.edu.nihongo.domain.entity.Kanji
import com.edu.nihongo.presentation.common.BackScaffold
import com.edu.nihongo.presentation.common.LoadingBox
import com.edu.nihongo.presentation.common.MessageBox
import com.edu.nihongo.presentation.common.StaleBanner
import com.edu.nihongo.presentation.vocab.VocabTab

/**
 * Một bài học, ba tab. Ba ViewModel (vocab, grammar, kanji) cùng gắn với back stack entry
 * "vocab/{lesson}" nên cùng đọc được argument "lesson" từ SavedStateHandle.
 */
@Composable
fun LessonDetailScreen(lessonNumber: Int, onBack: () -> Unit) {
    // rememberSaveable: xoay màn hình vẫn ở đúng tab
    var tab by rememberSaveable { mutableIntStateOf(0) }
    val titles = listOf("Từ vựng", "Ngữ pháp", "Kanji")

    BackScaffold(title = "Bài $lessonNumber", onBack = onBack) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            TabRow(selectedTabIndex = tab) {
                titles.forEachIndexed { i, t ->
                    Tab(selected = tab == i, onClick = { tab = i }, text = { Text(t) })
                }
            }
            when (tab) {
                0 -> VocabTab()
                1 -> GrammarTab()
                else -> KanjiTab()
            }
        }
    }
}

@Composable
private fun GrammarTab(viewModel: GrammarViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    CachedList(state, "Chưa có ngữ pháp. Cần mạng để tải lần đầu.", viewModel::refresh) { GrammarCard(it) }
}

@Composable
private fun KanjiTab(viewModel: KanjiViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    CachedList(state, "Chưa có kanji cho bài này.", viewModel::refresh) { KanjiCard(it) }
}

@Composable
private fun <T> CachedList(
    state: CachedListState<T>,
    emptyText: String,
    onRetry: () -> Unit,
    item: @Composable (T) -> Unit,
) {
    when {
        state.isLoading -> LoadingBox()
        state.items.isEmpty() -> MessageBox(state.error ?: emptyText, onRetry = onRetry)
        else -> LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item { StaleBanner(state.error) }
            items(state.items) { item(it) }
        }
    }
}

@Composable
private fun GrammarCard(g: Grammar) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(g.pattern, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
            Text(g.meaning, style = MaterialTheme.typography.bodyLarge)
            g.explanation?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (g.examples.isNotEmpty()) HorizontalDivider(Modifier.padding(vertical = 6.dp))
            g.examples.forEach { ex ->
                Text(ex.jp, style = MaterialTheme.typography.bodyMedium)
                ex.vi?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
    }
}

@Composable
private fun KanjiCard(k: Kanji) {
    Card(Modifier.fillMaxWidth()) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(k.character, fontSize = 44.sp, color = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                k.hanViet?.let { Text(it, style = MaterialTheme.typography.titleSmall) }
                k.meaning?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
                k.onyomi?.takeIf { it.isNotBlank() }?.let { Text("On: $it", style = MaterialTheme.typography.bodySmall) }
                k.kunyomi?.takeIf { it.isNotBlank() }?.let { Text("Kun: $it", style = MaterialTheme.typography.bodySmall) }
                k.mnemonic?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}