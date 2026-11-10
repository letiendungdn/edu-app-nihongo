package com.edu.nihongo.presentation.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.di.DefaultDispatcher
import com.edu.nihongo.domain.entity.Vocabulary
import com.edu.nihongo.domain.repository.VocabularyRepository
import com.edu.nihongo.domain.search.RomajiTrie
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

data class VocabSearchUiState(
    val query: String = "",
    val results: List<Vocabulary> = emptyList(),
    /** Số từ đã có trên máy (chỉ các bài đã mở ít nhất một lần). 0 = chưa có gì để tìm. */
    val indexedCount: Int = 0,
    val isIndexing: Boolean = true,
)

/**
 * Tra từ theo romaji, chạy hoàn toàn offline trên dữ liệu Room.
 * Trie được dựng lại mỗi khi bảng vocabulary đổi (Room phát list mới), ở luồng Default
 * (việc tính toán), không làm giật giao diện. Mỗi lần gõ chỉ là một lần search trên Trie đã có.
 */
@HiltViewModel
class VocabSearchViewModel @Inject constructor(
    repository: VocabularyRepository,
    @DefaultDispatcher computeDispatcher: CoroutineDispatcher,
) : ViewModel() {

    private val _query = MutableStateFlow("")

    /** Ô nhập đọc thẳng biến này (cập nhật ngay), không đọc qua uiState: tránh con trỏ nhảy khi gõ nhanh. */
    val query: StateFlow<String> = _query.asStateFlow()

    private val index = repository.observeAllVocab()
        .map { list -> RomajiTrie<Vocabulary>().apply { list.forEach { insert(it.romaji, it) } } }
        .flowOn(computeDispatcher)

    val uiState: StateFlow<VocabSearchUiState> = combine(index, _query) { trie, q ->
        VocabSearchUiState(
            query = q,
            results = trie.search(q, RESULT_LIMIT),
            indexedCount = trie.itemCount,
            isIndexing = false,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), VocabSearchUiState())

    fun onQueryChange(text: String) {
        _query.value = text
    }

    companion object {
        const val RESULT_LIMIT = 30
    }
}
