package com.edu.nihongo.presentation.srs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.domain.TimeSource
import com.edu.nihongo.domain.entity.ReviewCard
import com.edu.nihongo.domain.repository.VocabularyRepository
import com.edu.nihongo.domain.usecase.GetReviewQueueUseCase
import com.edu.nihongo.utils.SrsAlgorithm
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SrsUiState(
    val cards: List<ReviewCard> = emptyList(),
    val error: String? = null,
    val sessionTotal: Int = 0,
    val sessionCorrect: Int = 0,
    val isDone: Boolean = false,
)

@HiltViewModel
class SrsViewModel @Inject constructor(
    getReviewQueue: GetReviewQueueUseCase,
    private val vocabRepo: VocabularyRepository,
    private val timeSource: TimeSource,
) : ViewModel() {
    private val _uiState = MutableStateFlow(SrsUiState())
    val uiState: StateFlow<SrsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            getReviewQueue().collect { cards ->
                _uiState.update { state ->
                    state.copy(
                        cards = cards,
                        isDone = cards.isEmpty() && state.sessionTotal > 0,
                    )
                }
            }
        }
    }

    fun onCardReviewed(card: ReviewCard, quality: Int) {
        viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    sessionTotal = state.sessionTotal + 1,
                    sessionCorrect = if (quality >= 3) state.sessionCorrect + 1 else state.sessionCorrect,
                )
            }
            val updated = SrsAlgorithm.calculateNextReview(card.card, quality, timeSource.now())
            vocabRepo.updateSrsCard(updated).onFailure { e ->
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    fun resetSession() {
        _uiState.update { it.copy(sessionTotal = 0, sessionCorrect = 0, isDone = false) }
    }
}
