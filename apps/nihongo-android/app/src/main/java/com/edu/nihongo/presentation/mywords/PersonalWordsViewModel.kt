package com.edu.nihongo.presentation.mywords

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.domain.repository.AuthRepository
import com.edu.nihongo.domain.repository.PersonalWord
import com.edu.nihongo.domain.repository.PersonalWordsRepository
import com.edu.nihongo.utils.userMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Nội dung danh sách: `when` trên sealed interface buộc màn hình xử lý đủ mọi trường hợp. */
sealed interface WordsContent {
    data object Loading : WordsContent
    data object NeedsLogin : WordsContent
    data class Error(val message: String) : WordsContent
    data class Data(val words: List<PersonalWord>) : WordsContent
}

data class WordErrors(val kana: String? = null, val meaning: String? = null, val lesson: String? = null) {
    val ok get() = kana == null && meaning == null && lesson == null
}

data class PersonalWordsUiState(
    val lesson: Int? = null,
    val content: WordsContent = WordsContent.Loading,
    val refreshing: Boolean = false,
    val formErrors: WordErrors = WordErrors(),
    val serverError: String? = null,
    val saving: Boolean = false,
    val message: String? = null, // snackbar: sự kiện một lần
)

/** Cùng luật với DTO gateway, form web và app Expo. Hàm thuần: test bằng JUnit. */
fun validatePersonalWord(kana: String, meaning: String, lesson: String) = WordErrors(
    kana = when {
        kana.isBlank() -> "Nhập cách đọc"
        !Regex("^[\\u3040-\\u30ff]+$").matches(kana.trim()) -> "Chỉ dùng hiragana hoặc katakana"
        else -> null
    },
    meaning = when {
        meaning.isBlank() -> "Nhập nghĩa"
        meaning.trim().length > 100 -> "Nghĩa tối đa 100 ký tự"
        else -> null
    },
    lesson = if (lesson.toIntOrNull() in 1..50) null else "Bài từ 1 tới 50",
)

/** Sổ từ vựng cá nhân. Bài học: docs/learn-android-build-app.md */
@HiltViewModel
class PersonalWordsViewModel @Inject constructor(
    private val repo: PersonalWordsRepository,
    private val auth: AuthRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(PersonalWordsUiState())
    val state: StateFlow<PersonalWordsUiState> = _state.asStateFlow()
    private var loadJob: Job? = null

    init {
        load()
    }

    fun selectLesson(lesson: Int?) {
        _state.update { it.copy(lesson = lesson, content = WordsContent.Loading) }
        load()
    }

    /** Gọi khi kéo xuống, và khi quay lại màn (vd sau khi đăng nhập). */
    fun refresh() = load(pullToRefresh = true)

    private fun load(pullToRefresh: Boolean = false) {
        loadJob?.cancel() // đổi bộ lọc liên tục: kết quả cũ không được ghi đè kết quả mới
        _state.update { it.copy(refreshing = pullToRefresh) }
        loadJob = viewModelScope.launch {
            val content = if (!auth.isLoggedIn()) {
                WordsContent.NeedsLogin
            } else {
                repo.list(_state.value.lesson).fold(
                    onSuccess = { WordsContent.Data(it) },
                    onFailure = { WordsContent.Error(it.userMessage()) },
                )
            }
            _state.update { it.copy(content = content, refreshing = false) }
        }
    }

    /** Trả true khi lưu thành công (màn hình xóa ô nhập). */
    fun add(kana: String, meaning: String, lesson: String, onSaved: () -> Unit) {
        val errors = validatePersonalWord(kana, meaning, lesson)
        _state.update { it.copy(formErrors = errors, serverError = null) }
        if (!errors.ok || _state.value.saving) return // chống bấm hai lần
        _state.update { it.copy(saving = true) }
        viewModelScope.launch {
            repo.add(kana.trim(), meaning.trim(), lesson.toInt())
                .onSuccess {
                    _state.update { s -> s.copy(message = "Đã thêm ${it.kana}") }
                    onSaved()
                    load()
                }
                .onFailure { e -> _state.update { it.copy(serverError = e.userMessage()) } }
            _state.update { it.copy(saving = false) }
        }
    }

    fun delete(word: PersonalWord) {
        val before = _state.value.content
        // Lạc quan: dòng biến mất ngay; lỗi thì trả lại
        _state.update { s ->
            val c = s.content
            if (c is WordsContent.Data) s.copy(content = WordsContent.Data(c.words.filter { it.id != word.id })) else s
        }
        viewModelScope.launch {
            repo.delete(word.id)
                .onSuccess { _state.update { it.copy(message = "Đã xóa ${word.kana}") } }
                .onFailure { e -> _state.update { it.copy(content = before, message = e.userMessage()) } }
        }
    }

    fun messageShown() = _state.update { it.copy(message = null) }
}
