package com.edu.nihongo.presentation.progress

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.domain.entity.LearnerProgress
import com.edu.nihongo.domain.entity.StudyDay
import com.edu.nihongo.domain.repository.AuthRepository
import com.edu.nihongo.domain.repository.ProgressRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import com.edu.nihongo.utils.userMessage
import javax.inject.Inject

data class ProgressUiState(
    val progress: LearnerProgress? = null,
    /** Cũ → mới (trái sang phải trên biểu đồ). */
    val days: List<StudyDay> = emptyList(),
    val isLoading: Boolean = true,
    val needsLogin: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class ProgressViewModel @Inject constructor(
    private val repository: ProgressRepository,
    private val auth: AuthRepository,
) : ViewModel() {
    private val refreshing = MutableStateFlow(true)
    private val error = MutableStateFlow<String?>(null)
    private val needsLogin = MutableStateFlow(false)

    val uiState: StateFlow<ProgressUiState> = combine(
        repository.observeProgress(),
        repository.observeRecentDays(CHART_DAYS),
        refreshing,
        error,
        needsLogin,
    ) { progress, days, isRefreshing, err, login ->
        ProgressUiState(
            progress = progress,
            days = days.sortedBy { it.date },
            isLoading = progress == null && isRefreshing,
            needsLogin = login && progress == null,
            error = err,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ProgressUiState())

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            refreshing.value = true
            if (!auth.isLoggedIn()) {
                needsLogin.value = true
                refreshing.value = false
                return@launch
            }
            needsLogin.value = false
            repository.refresh()
                .onSuccess { error.value = null }
                .onFailure { e -> error.value = e.userMessage() }
            refreshing.value = false
        }
    }

    companion object {
        const val CHART_DAYS = 14
    }
}

/** "1 giờ 5 phút", "12 phút". Hàm thuần để test. */
fun formatStudyTime(totalSeconds: Int): String {
    val minutes = totalSeconds / 60
    val hours = minutes / 60
    return when {
        hours > 0 -> "$hours giờ ${minutes % 60} phút"
        else -> "$minutes phút"
    }
}
