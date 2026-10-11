package com.edu.nihongo.presentation.exam

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.domain.TimeSource
import com.edu.nihongo.domain.entity.ExamAttempt
import com.edu.nihongo.domain.entity.MockExamTemplate
import com.edu.nihongo.domain.repository.ExamRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import com.edu.nihongo.utils.userMessage
import javax.inject.Inject

data class ExamListState(
    val templates: List<MockExamTemplate> = emptyList(),
    val active: ExamAttempt? = null,
    val isLoading: Boolean = true,
    val starting: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class ExamListViewModel @Inject constructor(
    private val exams: ExamRepository,
) : ViewModel() {
    private val local = MutableStateFlow(ExamListState())
    val uiState: StateFlow<ExamListState> = combine(local, exams.observeActive()) { s, active -> s.copy(active = active) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ExamListState())

    private val _openExam = Channel<String>(Channel.BUFFERED)
    val openExam: Flow<String> = _openExam.receiveAsFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            local.update { it.copy(isLoading = true, error = null) }
            exams.templates()
                .onSuccess { list -> local.update { it.copy(templates = list, isLoading = false) } }
                .onFailure { e -> local.update { it.copy(isLoading = false, error = e.userMessage()) } }
        }
    }

    fun start(key: String) {
        if (local.value.starting) return
        viewModelScope.launch {
            local.update { it.copy(starting = true, error = null) }
            exams.start(key)
                .onSuccess { id -> _openExam.send(id) }
                .onFailure { e -> local.update { it.copy(error = e.userMessage()) } }
            local.update { it.copy(starting = false) }
        }
    }
}

data class ExamState(
    val attempt: ExamAttempt? = null,
    val index: Int = 0,
    val remainingMs: Long = 0,
    val submitting: Boolean = false,
    val error: String? = null,
) {
    val answeredCount: Int get() = attempt?.answers?.size ?: 0
}

@HiltViewModel
class ExamViewModel @Inject constructor(
    private val savedState: SavedStateHandle,
    private val exams: ExamRepository,
    private val timeSource: TimeSource,
) : ViewModel() {
    private val examId: String = savedState.get<String>("examId").orEmpty()
    /**
     * Câu đang xem nằm trong SavedStateHandle: xoay màn hình hay hệ thống giết process vẫn đúng câu.
     * Người dùng tự tắt app (force-stop, vuốt khỏi recent) thì saved state bị bỏ: khi đó -1 nghĩa là
     * "mở ở câu đầu tiên chưa trả lời", tính từ đáp án đã lưu trong Room.
     */
    private val index = savedState.getStateFlow(KEY_INDEX, -1)
    private val local = MutableStateFlow(Local())
    private var autoSubmitted = false

    private data class Local(val submitting: Boolean = false, val error: String? = null)

    /** Tính lại "còn lại" từ mốc endsAt mỗi giây: không đếm lùi một biến (sẽ sai khi app ở nền). */
    private val clock: Flow<Long> = flow {
        while (true) {
            emit(timeSource.now())
            delay(1_000)
        }
    }

    val uiState: StateFlow<ExamState> = combine(exams.observe(examId), index, clock, local) { attempt, i, now, l ->
        ExamState(
            attempt = attempt,
            index = resolveIndex(i, attempt),
            remainingMs = attempt?.remainingMs(now) ?: 0,
            submitting = l.submitting,
            error = l.error,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ExamState())

    init {
        // Hết giờ khi đang mở màn hình (hoặc mở lại sau khi đã hết giờ): tự nộp, đúng một lần
        viewModelScope.launch {
            val attempt = exams.observe(examId).filterNotNull().first()
            if (attempt.result != null) return@launch
            val wait = attempt.remainingMs(timeSource.now())
            if (wait > 0) delay(wait)
            if (!autoSubmitted) {
                autoSubmitted = true
                submit()
            }
        }
    }

    fun choose(questionId: String, option: String) {
        viewModelScope.launch { exams.saveAnswer(examId, questionId, option) }
    }

    fun goTo(i: Int) {
        savedState[KEY_INDEX] = i
    }

    fun submit() {
        if (local.value.submitting) return
        viewModelScope.launch {
            local.update { it.copy(submitting = true, error = null) }
            exams.submit(examId)
                .onFailure { e -> local.update { it.copy(error = e.userMessage() + " Bài vẫn được lưu, thử lại khi có mạng.") } }
            local.update { it.copy(submitting = false) }
        }
    }

    private companion object {
        const val KEY_INDEX = "index"
    }
}

/** Câu cần hiện: câu đã lưu, hoặc câu đầu tiên chưa trả lời. Hàm thuần để test. */
fun resolveIndex(saved: Int, attempt: ExamAttempt?): Int {
    val questions = attempt?.questions.orEmpty()
    if (questions.isEmpty()) return 0
    if (saved >= 0) return saved.coerceIn(0, questions.lastIndex)
    val firstOpen = questions.indexOfFirst { it.id !in attempt!!.answers }
    return if (firstOpen >= 0) firstOpen else questions.lastIndex
}

/** "49:05". Hàm thuần để test. */
fun formatRemaining(ms: Long): String {
    val total = (ms / 1000).coerceAtLeast(0)
    return "%02d:%02d".format(total / 60, total % 60)
}
