package com.edu.nihongo.presentation.community

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.domain.TimeSource
import com.edu.nihongo.domain.entity.ChatEvent
import com.edu.nihongo.domain.entity.ChatMessage
import com.edu.nihongo.domain.entity.ChatRoom
import com.edu.nihongo.domain.entity.ChatUser
import com.edu.nihongo.domain.repository.AuthRepository
import com.edu.nihongo.domain.repository.ChatRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.mapLatest
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import com.edu.nihongo.utils.userMessage
import javax.inject.Inject

data class RoomsState(
    val rooms: List<ChatRoom> = emptyList(),
    val query: String = "",
    val results: List<ChatUser> = emptyList(),
    val isLoading: Boolean = true,
    val needsLogin: Boolean = false,
    val error: String? = null,
)

@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
@HiltViewModel
class RoomsViewModel @Inject constructor(
    private val chat: ChatRepository,
    private val auth: AuthRepository,
) : ViewModel() {
    private val local = MutableStateFlow(RoomsState())
    private val query = MutableStateFlow("")

    /** Gõ tới đâu tìm tới đó, nhưng chờ 300 ms ngừng gõ; mapLatest hủy lần tìm cũ (giống switchMap). */
    private val results: Flow<List<ChatUser>> = query
        .debounce(300)
        .distinctUntilChanged()
        .mapLatest { q -> if (q.length < 2) emptyList() else chat.searchUsers(q).getOrDefault(emptyList()) }

    val uiState: StateFlow<RoomsState> = combine(local, query, results) { s, q, r -> s.copy(query = q, results = r) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), RoomsState())

    private val _openRoom = Channel<Long>(Channel.BUFFERED)
    val openRoom: Flow<Long> = _openRoom.receiveAsFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            if (!auth.isLoggedIn()) {
                local.update { it.copy(isLoading = false, needsLogin = true) }
                return@launch
            }
            local.update { it.copy(isLoading = true, needsLogin = false, error = null) }
            chat.rooms()
                .onSuccess { list -> local.update { it.copy(rooms = list, isLoading = false) } }
                .onFailure { e -> local.update { it.copy(isLoading = false, error = e.userMessage()) } }
        }
    }

    fun onQueryChange(q: String) { query.value = q }

    fun startChat(user: ChatUser) {
        viewModelScope.launch {
            chat.openDirect(user.id)
                .onSuccess { _openRoom.send(it) }
                .onFailure { e -> local.update { it.copy(error = e.userMessage()) } }
        }
    }
}

data class ChatState(
    val messages: List<ChatMessage> = emptyList(),
    val myId: Long? = null,
    val connected: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val savedState: SavedStateHandle,
    private val chat: ChatRepository,
    private val timeSource: TimeSource,
) : ViewModel() {
    private val roomId: Long = savedState.get<Long>("roomId") ?: 0L

    private val history = MutableStateFlow<List<ChatMessage>>(emptyList())
    private val live = MutableStateFlow<List<ChatMessage>>(emptyList())
    private val pending = MutableStateFlow<List<ChatMessage>>(emptyList())
    private val status = MutableStateFlow(Status())
    /** Chữ đang gõ: SavedStateHandle để xoay màn hình hay bị giết process không mất. */
    val draft: StateFlow<String> = savedState.getStateFlow(KEY_DRAFT, "")

    private data class Status(val myId: Long? = null, val connected: Boolean = false, val error: String? = null)

    /**
     * Stream SSE chỉ chạy khi có người xem (WhileSubscribed): rời màn hình hoặc app vào nền
     * quá 5 giây là đóng kết nối. Mỗi lần (nối lại) mở stream → tải lại lịch sử để lấp chỗ hổng.
     */
    private val stream: Flow<Unit> = chat.live(roomId).onEach { event ->
        when (event) {
            ChatEvent.Connected -> {
                status.update { it.copy(connected = true, error = null) }
                loadHistory()
            }
            ChatEvent.Disconnected -> status.update { it.copy(connected = false) }
            is ChatEvent.Received -> live.update { it + event.message }
        }
    }
        .map { }
        // combine chỉ phát khi mọi nguồn đã phát ít nhất một lần: không chờ SSE mới hiện lịch sử
        .onStart { emit(Unit) }

    val uiState: StateFlow<ChatState> = combine(history, live, pending, status, stream) { h, l, p, s, _ ->
        ChatState(mergeMessages(h, l, p), s.myId, s.connected, s.error)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ChatState())

    init {
        viewModelScope.launch {
            chat.currentUserId().onSuccess { id -> status.update { it.copy(myId = id) } }
            loadHistory()
            chat.markRead(roomId)
        }
    }

    fun onDraftChange(text: String) { savedState[KEY_DRAFT] = text }

    fun send() {
        val text = draft.value.trim()
        if (text.isEmpty()) return
        savedState[KEY_DRAFT] = ""
        val me = status.value.myId ?: return
        // Lạc quan: hiện ngay với trạng thái SENDING, không chờ server
        val optimistic = ChatMessage(
            id = null,
            localId = UUID.randomUUID().toString(),
            roomId = roomId,
            senderId = me,
            senderName = "Bạn",
            content = text,
            createdAt = "~" + timeSource.now(), // "~" > mọi ngày ISO: luôn xếp cuối cho tới khi có giờ thật
            status = ChatMessage.Status.SENDING,
        )
        pending.update { it + optimistic }
        deliver(optimistic)
    }

    fun retry(localId: String) {
        val msg = pending.value.firstOrNull { it.localId == localId } ?: return
        pending.update { list -> list.map { if (it.localId == localId) it.copy(status = ChatMessage.Status.SENDING) else it } }
        deliver(msg)
    }

    private fun deliver(msg: ChatMessage) {
        viewModelScope.launch {
            chat.send(roomId, msg.content)
                .onSuccess { sent ->
                    // Thay tin lạc quan bằng tin thật. SSE cũng sẽ đẩy tin này về: mergeMessages loại trùng theo id.
                    pending.update { list -> list.filterNot { it.localId == msg.localId } }
                    history.update { it + sent }
                }
                .onFailure {
                    pending.update { list ->
                        list.map { if (it.localId == msg.localId) it.copy(status = ChatMessage.Status.FAILED) else it }
                    }
                }
        }
    }

    private suspend fun loadHistory() {
        chat.history(roomId)
            .onSuccess { history.value = it }
            .onFailure { e -> status.update { it.copy(error = e.userMessage()) } }
    }

    private companion object {
        const val KEY_DRAFT = "draft"
    }
}

/**
 * Gộp tin từ lịch sử (REST), stream (SSE) và tin đang gửi. Cùng một tin có thể tới từ cả REST
 * lẫn SSE (nhất là sau khi nối lại) nên loại trùng theo id. Tin đang gửi (chưa có id) luôn ở cuối.
 * Hàm thuần để test.
 */
fun mergeMessages(
    history: List<ChatMessage>,
    live: List<ChatMessage>,
    pending: List<ChatMessage>,
): List<ChatMessage> {
    val confirmed = (history + live)
        .filter { it.id != null }
        .associateBy { it.id }
        .values
        .sortedWith(compareBy<ChatMessage> { it.createdAt }.thenBy { it.id })
    return confirmed + pending
}
