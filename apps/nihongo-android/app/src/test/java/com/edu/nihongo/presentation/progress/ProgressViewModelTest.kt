package com.edu.nihongo.presentation.progress

import com.edu.nihongo.domain.entity.LearnerProgress
import com.edu.nihongo.domain.entity.StudyDay
import com.edu.nihongo.domain.repository.AuthRepository
import com.edu.nihongo.domain.repository.ProgressRepository
import com.edu.nihongo.testing.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

private class FakeProgressRepository : ProgressRepository {
    val progress = MutableStateFlow<LearnerProgress?>(null)
    val days = MutableStateFlow<List<StudyDay>>(emptyList())
    var result: Result<Unit> = Result.success(Unit)
    var calls = 0
    override fun observeProgress() = progress
    override fun observeRecentDays(limit: Int) = days.map { it.take(limit) }
    override suspend fun refresh(): Result<Unit> { calls++; return result }
}

private class FakeAuth(var loggedIn: Boolean) : AuthRepository {
    override suspend fun login(email: String, password: String) = Result.success(Unit)
    override suspend fun loginWithOidc(accessToken: String, idToken: String?) = Result.success(Unit)
    override suspend fun logout() = Unit
    override suspend fun isLoggedIn() = loggedIn
}

@OptIn(ExperimentalCoroutinesApi::class)
class ProgressViewModelTest {
    @get:Rule val main = MainDispatcherRule()
    private val sample = LearnerProgress(3, 7, 3_900, 40, 44, 5, fetchedAt = 0)

    @Test
    fun notLoggedIn_asksToLogin_withoutCallingServer() = runTest(main.dispatcher) {
        val repo = FakeProgressRepository()
        val vm = ProgressViewModel(repo, FakeAuth(loggedIn = false))
        backgroundScope.launch { vm.uiState.collect {} }
        advanceUntilIdle()

        assertTrue(vm.uiState.value.needsLogin)
        assertEquals(0, repo.calls)
    }

    @Test
    fun offline_showsCachedProgress_withError() = runTest(main.dispatcher) {
        val repo = FakeProgressRepository().apply {
            progress.value = sample
            result = Result.failure(IllegalStateException("Không có mạng"))
        }
        val vm = ProgressViewModel(repo, FakeAuth(loggedIn = true))
        backgroundScope.launch { vm.uiState.collect {} }
        advanceUntilIdle()

        assertEquals(3, vm.uiState.value.progress?.currentStreak)
        assertEquals("Không có mạng", vm.uiState.value.error)
        assertFalse(vm.uiState.value.isLoading)
    }

    @Test
    fun days_areSortedOldestFirst_forChart() = runTest(main.dispatcher) {
        val repo = FakeProgressRepository().apply {
            progress.value = sample
            days.value = listOf(StudyDay("2026-10-06", 0, 0, 7, 0), StudyDay("2026-10-04", 0, 0, 2, 0))
        }
        val vm = ProgressViewModel(repo, FakeAuth(loggedIn = true))
        backgroundScope.launch { vm.uiState.collect {} }
        advanceUntilIdle()

        assertEquals(listOf("2026-10-04", "2026-10-06"), vm.uiState.value.days.map { it.date })
    }

    @Test
    fun formatsStudyTime() {
        assertEquals("12 phút", formatStudyTime(12 * 60 + 30))
        assertEquals("1 giờ 5 phút", formatStudyTime(3_900))
    }
}
