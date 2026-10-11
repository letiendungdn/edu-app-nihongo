package com.edu.nihongo.presentation.reading

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.domain.entity.QuizScore
import com.edu.nihongo.domain.entity.ReadingPassage
import com.edu.nihongo.domain.repository.ContentRepository
import com.edu.nihongo.presentation.lessons.CachedListViewModel
import com.edu.nihongo.utils.runCatchingCancellable
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import com.edu.nihongo.utils.userMessage
import javax.inject.Inject

@HiltViewModel
class ReadingListViewModel @Inject constructor(
    private val content: ContentRepository,
) : CachedListViewModel<ReadingPassage>() {
    override fun source() = content.observeReadingList()
    override suspend fun fetch() = content.refreshReadingList()
    init { refresh() }
}

data class ReadingDetailState(
    val passage: ReadingPassage? = null,
    val answers: Map<Long, String> = emptyMap(),
    val isLoading: Boolean = true,
    val submitting: Boolean = false,
    val score: QuizScore? = null,
    val gradedOffline: Boolean = false,
    val error: String? = null,
) {
    val canSubmit: Boolean
        get() = passage != null && score == null && !submitting &&
            passage.questions.isNotEmpty() && answers.size == passage.questions.size
}

@HiltViewModel
class ReadingDetailViewModel @Inject constructor(
    private val savedState: SavedStateHandle,
    private val content: ContentRepository,
) : ViewModel() {
    private val passageId: Long = savedState.get<Long>("id") ?: 0L

    /**
     * Đáp án đang chọn nằm trong SavedStateHandle (HashMap là Serializable): hệ điều hành giết
     * app khi đang làm bài thì mở lại vẫn còn. Key là String vì Bundle lưu được chắc chắn.
     */
    private val answers = savedState.getStateFlow(KEY_ANSWERS, HashMap<String, String>())
    private val extra = MutableStateFlow(Extra())

    private data class Extra(
        val refreshing: Boolean = true,
        val submitting: Boolean = false,
        val score: QuizScore? = null,
        val gradedOffline: Boolean = false,
        val error: String? = null,
    )

    val uiState: StateFlow<ReadingDetailState> = combine(content.observeReading(passageId), answers, extra) { p, a, x ->
        ReadingDetailState(
            passage = p,
            answers = a.mapKeys { it.key.toLong() },
            isLoading = (p?.content == null) && x.refreshing,
            submitting = x.submitting,
            score = x.score,
            gradedOffline = x.gradedOffline,
            error = x.error,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ReadingDetailState())

    init {
        viewModelScope.launch {
            content.refreshReading(passageId).onFailure { e -> extra.value = extra.value.copy(error = e.userMessage()) }
            extra.value = extra.value.copy(refreshing = false)
        }
    }

    fun choose(questionId: Long, option: String) {
        if (extra.value.score != null) return
        savedState[KEY_ANSWERS] = HashMap(answers.value).apply { put(questionId.toString(), option) }
    }

    fun submit() {
        val state = uiState.value
        val passage = state.passage ?: return
        if (!state.canSubmit) return
        viewModelScope.launch {
            extra.value = extra.value.copy(submitting = true, error = null)
            runCatchingCancellable { content.submitReading(passage, state.answers) }
                .onSuccess { o -> extra.value = extra.value.copy(score = o.score, gradedOffline = o.gradedOffline) }
                .onFailure { e -> extra.value = extra.value.copy(error = e.userMessage()) }
            extra.value = extra.value.copy(submitting = false)
        }
    }

    private companion object {
        const val KEY_ANSWERS = "answers"
    }
}
