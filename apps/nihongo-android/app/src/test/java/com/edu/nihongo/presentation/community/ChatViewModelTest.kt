package com.edu.nihongo.presentation.community

import androidx.lifecycle.SavedStateHandle
import com.edu.nihongo.domain.entity.ChatEvent
import com.edu.nihongo.domain.entity.ChatMessage
import com.edu.nihongo.domain.entity.ChatRoom
import com.edu.nihongo.domain.entity.ChatUser
import com.edu.nihongo.domain.repository.ChatRepository
import com.edu.nihongo.testing.MainDispatcherRule
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

private fun msg(id: Long, at: String, sender: Long = 2, text: String = "m$id") =
    ChatMessage(id, null, roomId = 1, senderId = sender, senderName = "u$sender", content = text, createdAt = at)

private class FakeChat : ChatRepository {
    val events = MutableSharedFlow<ChatEvent>(extraBufferCapacity = 16)
    var serverHistory = listOf(msg(1, "2026-10-11T10:00:00Z"))
    var historyCalls = 0
    var nextSend: CompletableDeferred<Result<ChatMessage>> = CompletableDeferred()
    override suspend fun currentUserId() = Result.success(7L)
    override suspend fun rooms() = Result.success(emptyList<ChatRoom>())
    override suspend fun history(roomId: Long): Result<List<ChatMessage>> { historyCalls++; return Result.success(serverHistory) }
    override fun live(roomId: Long) = events
    override suspend fun send(roomId: Long, content: String) = nextSend.await()
    override suspend fun markRead(roomId: Long) = Unit
    override suspend fun searchUsers(query: String) = Result.success(emptyList<ChatUser>())
    override suspend fun openDirect(userId: Long) = Result.success(1L)
}

@OptIn(ExperimentalCoroutinesApi::class)
class ChatViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    private fun TestScope.vm(repo: FakeChat) =
        ChatViewModel(SavedStateHandle(mapOf("roomId" to 1L)), repo) { 1_000L }
            .also { v -> backgroundScope.launch { v.uiState.collect {} } }

    @Test
    fun optimisticMessage_showsImmediately_thenReplacedByServerCopy() = runTest(main.dispatcher) {
        val repo = FakeChat()
        val vm = vm(repo)
        advanceUntilIdle()

        vm.onDraftChange("こんにちは")
        vm.send()
        advanceUntilIdle()
        val sending = vm.uiState.value.messages.last()
        assertEquals(ChatMessage.Status.SENDING, sending.status)
        assertEquals("", vm.draft.value)

        val server = msg(2, "2026-10-11T10:01:00Z", sender = 7, text = "こんにちは")
        repo.nextSend.complete(Result.success(server))
        repo.events.emit(ChatEvent.Received(server)) // SSE cũng đẩy về đúng tin đó
        advanceUntilIdle()

        val list = vm.uiState.value.messages
        assertEquals(listOf(1L, 2L), list.map { it.id })               // không trùng, không còn tin lạc quan
        assertTrue(list.none { it.status == ChatMessage.Status.SENDING })
    }

    @Test
    fun failedSend_canBeRetried() = runTest(main.dispatcher) {
        val repo = FakeChat()
        val vm = vm(repo)
        advanceUntilIdle()
        vm.onDraftChange("hi"); vm.send()
        repo.nextSend.complete(Result.failure(IllegalStateException("mất mạng")))
        advanceUntilIdle()
        val failed = vm.uiState.value.messages.last()
        assertEquals(ChatMessage.Status.FAILED, failed.status)

        repo.nextSend = CompletableDeferred(Result.success(msg(3, "2026-10-11T10:02:00Z", sender = 7, text = "hi")))
        vm.retry(failed.localId!!)
        advanceUntilIdle()
        assertEquals(3L, vm.uiState.value.messages.last().id)
    }

    @Test
    fun reconnect_reloadsHistory_toFillGap() = runTest(main.dispatcher) {
        val repo = FakeChat()
        val vm = vm(repo)
        advanceUntilIdle()
        val before = repo.historyCalls

        // Trong lúc mất kết nối có tin 5 tới; stream nối lại phát Connected
        repo.serverHistory = repo.serverHistory + msg(5, "2026-10-11T10:05:00Z")
        repo.events.emit(ChatEvent.Connected)
        advanceUntilIdle()

        assertEquals(before + 1, repo.historyCalls)
        assertEquals(5L, vm.uiState.value.messages.last().id)
        assertTrue(vm.uiState.value.connected)
    }

    // Đo trên emulator: mất mạng mà tiêu đề vẫn "trực tuyến"
    @Test
    fun disconnect_clearsOnlineFlag() = runTest(main.dispatcher) {
        val repo = FakeChat()
        val vm = vm(repo)
        advanceUntilIdle() // để collector đăng ký trước: SharedFlow không replay, phát sớm là mất (giống L8)
        repo.events.emit(ChatEvent.Connected); advanceUntilIdle()
        assertTrue(vm.uiState.value.connected)

        repo.events.emit(ChatEvent.Disconnected); advanceUntilIdle()
        assertTrue(!vm.uiState.value.connected)
    }

    @Test
    fun mergeMessages_dedupesAndOrders_pendingLast() {
        val pending = ChatMessage(null, "tmp", 1, 7, "Bạn", "đang gửi", "~1", ChatMessage.Status.SENDING)
        val merged = mergeMessages(
            history = listOf(msg(2, "2026-10-11T10:02:00Z"), msg(1, "2026-10-11T10:01:00Z")),
            live = listOf(msg(2, "2026-10-11T10:02:00Z"), msg(3, "2026-10-11T10:03:00Z")),
            pending = listOf(pending),
        )
        assertEquals(listOf(1L, 2L, 3L, null), merged.map { it.id })
    }
}
