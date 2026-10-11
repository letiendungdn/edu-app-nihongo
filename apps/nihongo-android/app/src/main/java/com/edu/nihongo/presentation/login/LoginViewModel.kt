package com.edu.nihongo.presentation.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.data.remote.PushRegistrar
import com.edu.nihongo.domain.repository.AuthRepository
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

data class LoginUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
)

sealed interface LoginEvent {
    data object LoggedIn : LoginEvent
}

/**
 * Sự kiện một lần (đăng nhập xong → điều hướng) đi qua [Channel] có buffer.
 *
 * Trước đây màn hình truyền lambda `onSuccess` vào ViewModel: ViewModel sống qua xoay màn hình
 * nên giữ lambda của Composable cũ, gọi navController đã bị hủy. Channel giữ sự kiện tới khi
 * màn hình mới collect, và mỗi sự kiện chỉ được xử lý một lần.
 */
@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepo: AuthRepository,
    private val pushRegistrar: PushRegistrar,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    private val _events = Channel<LoginEvent>(Channel.BUFFERED)
    val events: Flow<LoginEvent> = _events.receiveAsFlow()

    fun setLoading(loading: Boolean) {
        _uiState.update { it.copy(isLoading = loading, error = if (loading) null else it.error) }
    }

    fun setError(message: String) {
        _uiState.update { it.copy(isLoading = false, error = message) }
    }

    fun login(email: String, password: String) {
        submit(fallbackError = "Đăng nhập thất bại") { authRepo.login(email, password) }
    }

    fun loginWithOidc(accessToken: String, idToken: String?) {
        submit(fallbackError = "OIDC thất bại") { authRepo.loginWithOidc(accessToken, idToken) }
    }

    private fun submit(fallbackError: String, action: suspend () -> Result<Unit>) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            action()
                .onSuccess {
                    pushRegistrar.registerAfterLogin()
                    _uiState.update { it.copy(isLoading = false) }
                    _events.send(LoginEvent.LoggedIn)
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message ?: fallbackError) }
                }
        }
    }
}
