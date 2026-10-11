package com.edu.nihongo.presentation.kana

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import kotlin.random.Random

data class KanaQuestion(val kana: Kana, val options: List<String>)

data class KanaState(
    val script: KanaScript = KanaScript.HIRAGANA,
    val question: KanaQuestion? = null,
    val picked: String? = null,
    val correct: Int = 0,
    val answered: Int = 0,
    /** Số lần sai theo chữ: chữ hay sai được hỏi lại nhiều hơn. */
    val mistakes: Map<String, Int> = emptyMap(),
)

/**
 * [random] inject được để test ra cùng một chuỗi câu hỏi. Hilt dùng constructor phụ (@Inject)
 * với Random mặc định; test gọi constructor chính.
 */
@HiltViewModel
class KanaViewModel(
    private val savedState: SavedStateHandle,
    private val random: Random,
) : ViewModel() {
    @Inject constructor(savedState: SavedStateHandle) : this(savedState, Random.Default)

    private val _state = MutableStateFlow(
        KanaState(script = savedState.get<String>(KEY_SCRIPT)?.let(KanaScript::valueOf) ?: KanaScript.HIRAGANA),
    )
    val state: StateFlow<KanaState> = _state.asStateFlow()

    init { next() }

    fun setScript(script: KanaScript) {
        savedState[KEY_SCRIPT] = script.name
        _state.value = KanaState(script = script)
        next()
    }

    fun answer(option: String) {
        val s = _state.value
        val q = s.question ?: return
        if (s.picked != null) return
        val ok = option == q.kana.romaji
        _state.update {
            it.copy(
                picked = option,
                correct = it.correct + if (ok) 1 else 0,
                answered = it.answered + 1,
                mistakes = if (ok) it.mistakes else it.mistakes + (q.kana.char to (it.mistakes[q.kana.char] ?: 0) + 1),
            )
        }
    }

    fun next() {
        val s = _state.value
        val all = KanaData.of(s.script)
        val kana = pickWeighted(all, s.mistakes)
        val distractors = all.filter { it.romaji != kana.romaji }.shuffled(random).take(3).map { it.romaji }
        _state.update { it.copy(question = KanaQuestion(kana, (distractors + kana.romaji).shuffled(random)), picked = null) }
    }

    /** Mỗi chữ có trọng số 1 + 2 × số lần sai. */
    private fun pickWeighted(all: List<Kana>, mistakes: Map<String, Int>): Kana {
        val weights = all.map { 1 + 2 * (mistakes[it.char] ?: 0) }
        var r = random.nextInt(weights.sum())
        all.forEachIndexed { i, k ->
            r -= weights[i]
            if (r < 0) return k
        }
        return all.last()
    }

    private companion object {
        const val KEY_SCRIPT = "script"
    }
}
