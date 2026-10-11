package com.edu.nihongo.presentation.live

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.data.LiveNavigationStore
import com.edu.nihongo.data.remote.LiveApi
import com.edu.nihongo.data.remote.LiveSessionDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LiveListUiState(
    val sessions: List<LiveSessionDto> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class LiveListViewModel @Inject constructor(
    private val liveApi: LiveApi,
    private val navStore: LiveNavigationStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LiveListUiState())
    val uiState: StateFlow<LiveListUiState> = _uiState.asStateFlow()

    // Channel có buffer thay vì MutableSharedFlow() (replay 0, không buffer): sự kiện phát ra
    // lúc màn hình chưa collect (đang xoay) vẫn được giữ lại, không bị mất.
    private val _navigateViewer = Channel<Unit>(Channel.BUFFERED)
    val navigateViewer: Flow<Unit> = _navigateViewer.receiveAsFlow()

    private val _navigateHost = Channel<Unit>(Channel.BUFFERED)
    val navigateHost: Flow<Unit> = _navigateHost.receiveAsFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val list = liveApi.listSessions()
                _uiState.update { it.copy(sessions = list, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Lỗi tải danh sách")
                }
            }
        }
    }

    fun joinSession(sessionId: Int) {
        viewModelScope.launch {
            try {
                val join = liveApi.joinSession(sessionId)
                navStore.setJoin(join)
                _navigateViewer.send(Unit)
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(error = e.message ?: "Cần đăng nhập để xem")
                }
            }
        }
    }

    fun startHost(title: String) {
        viewModelScope.launch {
            try {
                val join = liveApi.createSession(
                    com.edu.nihongo.data.remote.CreateLiveSessionRequest(title),
                )
                navStore.setJoin(join)
                _navigateHost.send(Unit)
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(error = e.message ?: "Cần tài khoản coach + LiveKit")
                }
            }
        }
    }
}
