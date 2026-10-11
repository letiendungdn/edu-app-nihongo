package com.edu.nihongo.presentation.vocab

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.domain.entity.Vocabulary
import com.edu.nihongo.domain.usecase.GetVocabByLessonUseCase
import com.edu.nihongo.domain.usecase.SyncLessonUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import com.edu.nihongo.utils.userMessage
import javax.inject.Inject

data class VocabUiState(
    val items: List<Vocabulary> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class VocabViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    getVocabByLesson: GetVocabByLessonUseCase,
    private val syncLesson: SyncLessonUseCase,
) : ViewModel() {
    private val lessonNumber: Int = savedStateHandle.get<Int>("lesson") ?: 1

    private val syncing = MutableStateFlow(true)
    private val syncError = MutableStateFlow<String?>(null)

    /**
     * Room phát list rỗng ngay khi DB chưa có bài này. Chỉ coi là "đang tải" khi
     * chưa có dữ liệu VÀ sync chưa xong; có dữ liệu cũ thì hiện luôn trong lúc sync.
     */
    val uiState: StateFlow<VocabUiState> = combine(
        getVocabByLesson(lessonNumber),
        syncing,
        syncError,
    ) { items, isSyncing, error ->
        VocabUiState(
            items = items,
            isLoading = items.isEmpty() && isSyncing,
            error = error,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), VocabUiState())

    init {
        viewModelScope.launch {
            syncLesson(lessonNumber)
                .onSuccess { syncError.value = null }
                .onFailure { e -> syncError.value = e.userMessage() }
            syncing.value = false
        }
    }
}
