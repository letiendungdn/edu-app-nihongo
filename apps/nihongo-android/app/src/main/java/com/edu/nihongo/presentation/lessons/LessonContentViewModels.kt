package com.edu.nihongo.presentation.lessons

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.domain.entity.Grammar
import com.edu.nihongo.domain.entity.Kanji
import com.edu.nihongo.domain.repository.ContentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import com.edu.nihongo.utils.userMessage
import javax.inject.Inject

/** State chung cho mọi danh sách "đọc từ Room, làm mới từ mạng". */
data class CachedListState<T>(
    val items: List<T> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

/**
 * Khuôn offline-first dùng lại cho ngữ pháp, kanji, đọc hiểu: Room phát dữ liệu, refresh chạy
 * song song, chỉ "đang tải" khi chưa có gì để hiện. Cùng ý tưởng sửa lỗi L2 ở VocabViewModel.
 */
abstract class CachedListViewModel<T> : ViewModel() {
    private val refreshing = MutableStateFlow(true)
    private val error = MutableStateFlow<String?>(null)

    protected abstract fun source(): Flow<List<T>>
    protected abstract suspend fun fetch(): Result<Unit>

    val uiState: StateFlow<CachedListState<T>> by lazy {
        combine(source(), refreshing, error) { items, isRefreshing, err ->
            CachedListState(items, isLoading = items.isEmpty() && isRefreshing, error = err)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), CachedListState())
    }

    fun refresh() {
        viewModelScope.launch {
            refreshing.value = true
            fetch()
                .onSuccess { error.value = null }
                .onFailure { e -> error.value = e.userMessage() }
            refreshing.value = false
        }
    }
}

@HiltViewModel
class GrammarViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val content: ContentRepository,
) : CachedListViewModel<Grammar>() {
    private val lesson: Int = savedStateHandle.get<Int>("lesson") ?: 1
    override fun source() = content.observeGrammar(lesson)
    override suspend fun fetch() = content.refreshGrammar(lesson)
    init { refresh() }
}

@HiltViewModel
class KanjiViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val content: ContentRepository,
) : CachedListViewModel<Kanji>() {
    private val lesson: Int = savedStateHandle.get<Int>("lesson") ?: 1
    override fun source() = content.observeKanji(lesson)
    override suspend fun fetch() = content.refreshKanji(lesson)
    init { refresh() }
}
