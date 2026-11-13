package com.edu.nihongo.presentation.mywords

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.edu.nihongo.domain.repository.PersonalWord
import com.edu.nihongo.presentation.common.LoadingBox
import com.edu.nihongo.presentation.common.MessageBox

private val LESSONS = listOf(null, 1, 2, 3, 6)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PersonalWordsScreen(
    onBack: () -> Unit,
    onLogin: () -> Unit,
    viewModel: PersonalWordsViewModel = hiltViewModel(),
) {
    val s by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    var pendingDelete by remember { mutableStateOf<PersonalWord?>(null) }

    // Quay lại màn này (vd sau khi đăng nhập xong) → tải lại
    LifecycleResumeEffect(Unit) {
        viewModel.refresh()
        onPauseOrDispose { }
    }
    // Thông báo là sự kiện một lần: hiện xong báo ViewModel xóa, xoay màn hình không hiện lại
    LaunchedEffect(s.message) {
        s.message?.let {
            snackbar.showSnackbar(it)
            viewModel.messageShown()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sổ từ của tôi") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại") }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        val modifier = Modifier.padding(padding)
        when (val c = s.content) {
            WordsContent.Loading -> LoadingBox(modifier)
            WordsContent.NeedsLogin -> Column(
                modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("Đăng nhập để lưu từ vựng của riêng bạn.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Button(onClick = onLogin) { Text("Đăng nhập") }
            }
            is WordsContent.Error -> MessageBox(c.message, modifier, onRetry = viewModel::refresh)
            is WordsContent.Data -> Column(modifier.fillMaxSize().imePadding()) {
                AddWordForm(s, onAdd = viewModel::add)
                Row(Modifier.padding(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    LESSONS.forEach { l ->
                        FilterChip(
                            selected = s.lesson == l,
                            onClick = { viewModel.selectLesson(l) },
                            label = { Text(if (l == null) "Tất cả" else "Bài $l") },
                        )
                    }
                }
                PullToRefreshBox(isRefreshing = s.refreshing, onRefresh = viewModel::refresh, modifier = Modifier.fillMaxSize()) {
                    WordList(c.words, emptyText = s.lesson?.let { "Chưa có từ nào trong bài $it." } ?: "Chưa có từ nào.") {
                        pendingDelete = it
                    }
                }
            }
        }
    }

    pendingDelete?.let { w ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Xóa từ") },
            text = { Text("Xóa \"${w.kana}\" khỏi sổ?") },
            confirmButton = { TextButton(onClick = { viewModel.delete(w); pendingDelete = null }) { Text("Xóa") } },
            dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text("Hủy") } },
        )
    }
}

@Composable
private fun AddWordForm(s: PersonalWordsUiState, onAdd: (String, String, String, () -> Unit) -> Unit) {
    // rememberSaveable: xoay màn hình không mất chữ đang gõ
    var kana by rememberSaveable { mutableStateOf("") }
    var meaning by rememberSaveable { mutableStateOf("") }
    var lesson by rememberSaveable { mutableStateOf("1") }
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        OutlinedTextField(kana, { kana = it }, label = { Text("Cách đọc") }, singleLine = true,
            isError = s.formErrors.kana != null, supportingText = s.formErrors.kana?.let { { Text(it) } },
            modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Cách đọc" })
        OutlinedTextField(meaning, { meaning = it }, label = { Text("Nghĩa") }, singleLine = true,
            isError = s.formErrors.meaning != null, supportingText = s.formErrors.meaning?.let { { Text(it) } },
            modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Nghĩa" })
        OutlinedTextField(lesson, { lesson = it }, label = { Text("Bài") }, singleLine = true,
            isError = s.formErrors.lesson != null, supportingText = s.formErrors.lesson?.let { { Text(it) } },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Bài" })
        s.serverError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(
            onClick = { onAdd(kana, meaning, lesson) { kana = ""; meaning = "" } },
            enabled = !s.saving,
            modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Thêm vào sổ" },
        ) { Text(if (s.saving) "Đang lưu…" else "Thêm vào sổ") }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun WordList(words: List<PersonalWord>, emptyText: String, onLongPress: (PersonalWord) -> Unit) {
    LazyColumn(Modifier.fillMaxSize()) {
        if (words.isEmpty()) item { Text(emptyText, Modifier.padding(24.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) }
        // key theo id: xóa một dòng không vẽ lại cả danh sách
        items(words, key = { it.id }) { w ->
            Column(
                Modifier.fillMaxWidth().combinedClickable(onClick = {}, onLongClick = { onLongPress(w) }).padding(16.dp),
            ) {
                Text(w.kana, style = MaterialTheme.typography.titleLarge)
                Text("${w.meaning} · Bài ${w.lesson}", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            HorizontalDivider()
        }
    }
}
