package com.edu.nihongo.presentation.ai_tutor

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.AssistChip
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import com.edu.nihongo.data.remote.AiChatMessage
import com.edu.nihongo.data.remote.AiChatRequest
import com.edu.nihongo.data.remote.AiTutorApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatMsg(val role: String, val text: String)

@HiltViewModel
class AiTutorViewModel @Inject constructor(
    private val api: AiTutorApi,
) : ViewModel() {
    suspend fun ask(question: String, history: List<ChatMsg>): String {
        val res = api.chat(
            AiChatRequest(
                question = question,
                history = history.map { AiChatMessage(it.role, it.text) },
            ),
        )
        return res.data?.answer.orEmpty().trim().ifBlank { "Không có câu trả lời." }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiTutorScreen(
    onBack: () -> Unit,
    viewModel: AiTutorViewModel = hiltViewModel(),
) {
    val messages = remember { mutableStateListOf<ChatMsg>() }
    var input by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val suggestions = listOf(
        "から vs ので khác nhau thế nào?",
        "て-form dùng khi nào?",
        "Giải thích は vs が",
    )

    fun send(text: String) {
        val q = text.trim()
        if (q.isEmpty() || loading) return
        input = ""
        messages += ChatMsg("user", q)
        loading = true
        scope.launch {
            val answer = runCatching {
                viewModel.ask(q, messages.dropLast(1))
            }.getOrElse { "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại." }
            messages += ChatMsg("assistant", answer)
            loading = false
            listState.animateScrollToItem(messages.lastIndex.coerceAtLeast(0))
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI Tutor") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (messages.isEmpty()) {
                    item {
                        Text("Xin chào! Hỏi bất cứ điều gì về tiếng Nhật.")
                        Spacer(Modifier.height(12.dp))
                        suggestions.forEach { s ->
                            AssistChip(onClick = { send(s) }, label = { Text(s) })
                            Spacer(Modifier.height(4.dp))
                        }
                    }
                }
                items(messages) { msg ->
                    val isUser = msg.role == "user"
                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = if (isUser) Alignment.CenterEnd else Alignment.CenterStart,
                    ) {
                        Text(
                            msg.text,
                            modifier = Modifier
                                .widthIn(max = 320.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(
                                    if (isUser) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.surfaceVariant,
                                )
                                .padding(12.dp),
                            color = if (isUser) MaterialTheme.colorScheme.onPrimary
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                if (loading) {
                    item { CircularProgressIndicator(modifier = Modifier.padding(8.dp)) }
                }
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedTextField(
                    value = input,
                    onValueChange = { input = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Hỏi về ngữ pháp...") },
                    enabled = !loading,
                )
                IconButton(onClick = { send(input) }, enabled = !loading) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send")
                }
            }
        }
    }
}
