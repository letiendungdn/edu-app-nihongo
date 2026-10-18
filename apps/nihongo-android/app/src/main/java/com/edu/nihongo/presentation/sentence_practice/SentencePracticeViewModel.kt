package com.edu.nihongo.presentation.sentence_practice

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.data.remote.SentencePracticeApi
import com.edu.nihongo.utils.userMessage
import kotlinx.coroutines.CancellationException
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FeedbackEntry(
    val sentence: String,
    val corrected: String,
    val reading: String,
    val meaning: String,
    val explanation: String,
    val examples: List<String>,
)

data class SentencePracticeUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val history: List<FeedbackEntry> = emptyList(),
)

@HiltViewModel
class SentencePracticeViewModel @Inject constructor(
    private val api: SentencePracticeApi,
) : ViewModel() {
    private val _uiState = MutableStateFlow(SentencePracticeUiState())
    val uiState: StateFlow<SentencePracticeUiState> = _uiState.asStateFlow()

    fun analyze(sentence: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null) }
            try {
                val feedback = api.analyze(sentence)
                val entry = FeedbackEntry(
                    sentence = sentence,
                    corrected = feedback.corrected,
                    reading = feedback.reading,
                    meaning = feedback.meaning,
                    explanation = feedback.explanation,
                    examples = feedback.examples,
                )
                _uiState.update { state ->
                    state.copy(loading = false, history = listOf(entry) + state.history)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update { it.copy(loading = false, error = e.userMessage()) }
            }
        }
    }
}
