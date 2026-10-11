package com.edu.nihongo.presentation.lessons

import com.edu.nihongo.domain.entity.Lesson
import com.edu.nihongo.domain.repository.LessonRepository
import com.edu.nihongo.testing.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Rule
import org.junit.Test

private class FakeLessonRepository : LessonRepository {
    val cached = MutableStateFlow<List<Lesson>>(emptyList())
    var refreshResult: Result<Unit> = Result.success(Unit)
    override fun observeLessons() = cached
    override suspend fun refreshLessons() = refreshResult
}

@OptIn(ExperimentalCoroutinesApi::class)
class LessonListViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    // L11: offline vẫn thấy bài đã cache, kèm lỗi làm mới
    @Test
    fun offline_showsCachedLessons_withError() = runTest(main.dispatcher) {
        val repo = FakeLessonRepository().apply {
            cached.value = listOf(Lesson(1, 1, "Bài 1", null, 20), Lesson(2, 2, "Bài 2", null, 25))
            refreshResult = Result.failure(IllegalStateException("Không có mạng"))
        }
        val vm = LessonListViewModel(repo)
        backgroundScope.launch { vm.uiState.collect {} }
        advanceUntilIdle()

        assertEquals(listOf(1, 2), vm.uiState.value.lessons.map { it.lessonNumber })
        assertEquals("Không có mạng", vm.uiState.value.error)
        assertFalse(vm.uiState.value.isLoading)
    }

    @Test
    fun refreshedLessons_appearFromRoom() = runTest(main.dispatcher) {
        val repo = FakeLessonRepository()
        val vm = LessonListViewModel(repo)
        backgroundScope.launch { vm.uiState.collect {} }

        repo.cached.value = listOf(Lesson(5, 5, null, null, null))
        advanceUntilIdle()

        assertEquals(5, vm.uiState.value.lessons.single().lessonNumber)
    }
}
