package com.edu.nihongo.presentation.login

import com.edu.nihongo.data.remote.PushRegistrar
import com.edu.nihongo.domain.repository.AuthRepository
import com.edu.nihongo.testing.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

private class FakeAuthRepository(var result: Result<Unit> = Result.success(Unit)) : AuthRepository {
    override suspend fun login(email: String, password: String) = result
    override suspend fun loginWithOidc(accessToken: String, idToken: String?) = result
    override suspend fun logout() = Unit
    override suspend fun isLoggedIn() = result.isSuccess
}

private class FakePushRegistrar : PushRegistrar {
    var registered = 0
    override suspend fun registerAfterLogin() { registered++ }
    override suspend fun unregisterOnLogout() = Unit
}

@OptIn(ExperimentalCoroutinesApi::class)
class LoginViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    // L7: sự kiện phát lúc chưa ai nghe (đang xoay màn hình) vẫn tới được màn hình mới
    @Test
    fun loggedInEvent_isBufferedUntilScreenCollects() = runTest(main.dispatcher) {
        val push = FakePushRegistrar()
        val vm = LoginViewModel(FakeAuthRepository(), push)

        vm.login("a@b.c", "pw")
        advanceUntilIdle() // login xong khi chưa có collector

        assertEquals(LoginEvent.LoggedIn, vm.events.first())
        assertEquals(1, push.registered)
        assertFalse(vm.uiState.value.isLoading)
    }

    @Test
    fun loginFailure_showsError_andSendsNoEvent() = runTest(main.dispatcher) {
        val vm = LoginViewModel(FakeAuthRepository(Result.failure(IllegalStateException("Sai mật khẩu"))), FakePushRegistrar())
        val events = mutableListOf<LoginEvent>()
        backgroundScope.launch { vm.events.toList(events) }

        vm.login("a@b.c", "x")
        advanceUntilIdle()

        assertEquals("Sai mật khẩu", vm.uiState.value.error)
        assertTrue(events.isEmpty())
    }
}
