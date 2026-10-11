package com.edu.nihongo.presentation.live

import com.edu.nihongo.data.LiveNavigationStore
import com.edu.nihongo.data.remote.CreateLiveSessionRequest
import com.edu.nihongo.data.remote.LiveApi
import com.edu.nihongo.data.remote.LiveJoinDto
import com.edu.nihongo.data.remote.LiveSessionDto
import com.edu.nihongo.testing.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

private class FakeLiveApi : LiveApi {
    private val join = LiveJoinDto(sessionId = 9, token = "t", wsUrl = "ws://x", roomName = "r")
    override suspend fun listSessions(): List<LiveSessionDto> = emptyList()
    override suspend fun createSession(body: CreateLiveSessionRequest) = join
    override suspend fun joinSession(sessionId: Int) = join
    override suspend fun endSession(sessionId: Int) = Unit
}

@OptIn(ExperimentalCoroutinesApi::class)
class LiveListViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    // L8: MutableSharedFlow() cũ làm mất sự kiện này vì lúc emit chưa có ai collect
    @Test
    fun navigateEvent_emittedBeforeCollect_isNotLost() = runTest(main.dispatcher) {
        val store = LiveNavigationStore()
        val vm = LiveListViewModel(FakeLiveApi(), store)

        vm.joinSession(9)
        advanceUntilIdle()

        assertEquals(Unit, vm.navigateViewer.first())
        assertEquals(9, store.consumeJoin()?.sessionId)
    }
}
