package com.edu.nihongo.presentation.lessons

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.domain.entity.Lesson
import com.edu.nihongo.domain.repository.LessonRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import com.edu.nihongo.utils.userMessage
import javax.inject.Inject

data class LessonListUiState(
    val lessons: List<Lesson> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

/**
 * Đọc bài từ Room qua [LessonRepository] (trước đây gọi thẳng API và đưa DTO lên UI).
 * Offline vẫn thấy danh sách đã tải lần trước, kèm thông báo lỗi làm mới.
 */
@HiltViewModel
class LessonListViewModel @Inject constructor(
    private val lessons: LessonRepository,
) : ViewModel() {
    private val refreshing = MutableStateFlow(true)
    private val refreshError = MutableStateFlow<String?>(null)

    val uiState: StateFlow<LessonListUiState> = combine(
        lessons.observeLessons(),
        refreshing,
        refreshError,
    ) { list, isRefreshing, error ->
        LessonListUiState(
            lessons = list,
            isLoading = list.isEmpty() && isRefreshing,
            error = error,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), LessonListUiState())

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            refreshing.value = true
            lessons.refreshLessons()
                .onSuccess { refreshError.value = null }
                .onFailure { e -> refreshError.value = e.userMessage() }
            refreshing.value = false
        }
    }
}
