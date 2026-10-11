package com.edu.nihongo.presentation.community

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.edu.nihongo.domain.entity.ChatMessage
import com.edu.nihongo.presentation.common.BackScaffold
import com.edu.nihongo.presentation.common.LoadingBox
import com.edu.nihongo.presentation.common.MessageBox

@Composable
fun RoomsScreen(
    onBack: () -> Unit,
    onOpenRoom: (Long) -> Unit,
    onLogin: () -> Unit,
    viewModel: RoomsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(viewModel) { viewModel.openRoom.collect(onOpenRoom) }

    BackScaffold("Cộng đồng", onBack) { padding ->
        val modifier = Modifier.padding(padding)
        when {
            state.needsLogin -> MessageBox("Đăng nhập để chat với học viên khác.", modifier, onRetry = onLogin)
            state.isLoading -> LoadingBox(modifier)
            else -> LazyColumn(modifier, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    OutlinedTextField(
                        value = state.query,
                        onValueChange = viewModel::onQueryChange,
                        label = { Text("Tìm học viên để nhắn tin") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                items(state.results, key = { "u${it.id}" }) { u ->
                    Text(
                        "💬 ${u.displayName}",
                        Modifier.fillMaxWidth().clickable { viewModel.startChat(u) }.padding(12.dp),
                    )
                }
                if (state.results.isNotEmpty()) item { HorizontalDivider() }
                if (state.rooms.isEmpty()) item { Text(state.error ?: "Chưa có cuộc trò chuyện nào.") }
                items(state.rooms, key = { it.id }) { r ->
                    Card(Modifier.fillMaxWidth().clickable { onOpenRoom(r.id) }) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(r.name, style = MaterialTheme.typography.titleMedium)
                                r.lastMessage?.let { Text(it, maxLines = 1, style = MaterialTheme.typography.bodySmall) }
                            }
                            if (r.unreadCount > 0) Badge { Text(r.unreadCount.toString()) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ChatScreen(onBack: () -> Unit, viewModel: ChatViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val draft by viewModel.draft.collectAsStateWithLifecycle()
    val listState = rememberLazyListState()

    // Có tin mới thì cuộn xuống cuối
    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) listState.animateScrollToItem(state.messages.lastIndex)
    }

    BackScaffold(if (state.connected) "Phòng chat · trực tuyến" else "Phòng chat · đang kết nối…", onBack) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().imePadding()) {
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(8.dp)) }
            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                items(state.messages, key = { it.id?.toString() ?: it.localId.orEmpty() }) { m ->
                    Bubble(m, mine = m.senderId == state.myId, onRetry = { m.localId?.let(viewModel::retry) })
                }
            }
            Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = draft,
                    onValueChange = viewModel::onDraftChange,
                    placeholder = { Text("Nhắn tin…") },
                    modifier = Modifier.weight(1f),
                )
                Button(onClick = viewModel::send, enabled = draft.isNotBlank(), modifier = Modifier.padding(start = 8.dp)) {
                    Text("Gửi")
                }
            }
        }
    }
}

@Composable
private fun Bubble(m: ChatMessage, mine: Boolean, onRetry: () -> Unit) {
    Box(Modifier.fillMaxWidth(), contentAlignment = if (mine) Alignment.CenterEnd else Alignment.CenterStart) {
        Column(
            Modifier
                .widthIn(max = 300.dp)
                .background(
                    if (mine) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                    RoundedCornerShape(12.dp),
                )
                .padding(10.dp),
        ) {
            if (!mine) Text(m.senderName, style = MaterialTheme.typography.labelSmall)
            Text(m.content)
            when (m.status) {
                ChatMessage.Status.SENDING -> Text("Đang gửi…", style = MaterialTheme.typography.labelSmall)
                ChatMessage.Status.FAILED -> Text(
                    "Gửi lỗi · chạm để thử lại",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.clickable(onClick = onRetry),
                )
                ChatMessage.Status.SENT -> Unit
            }
        }
    }
}
