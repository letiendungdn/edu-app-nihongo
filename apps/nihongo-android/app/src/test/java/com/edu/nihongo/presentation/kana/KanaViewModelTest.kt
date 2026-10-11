package com.edu.nihongo.presentation.kana

import androidx.lifecycle.SavedStateHandle
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class KanaViewModelTest {
    private fun vm(seed: Int = 1, saved: SavedStateHandle = SavedStateHandle()) = KanaViewModel(saved, Random(seed))

    @Test
    fun question_hasFourDistinctOptions_includingAnswer() {
        val q = vm().state.value.question!!
        assertEquals(4, q.options.distinct().size)
        assertTrue(q.kana.romaji in q.options)
    }

    @Test
    fun answer_countsOnce_andRecordsMistake() {
        val vm = vm()
        val q = vm.state.value.question!!
        val wrong = q.options.first { it != q.kana.romaji }
        vm.answer(wrong)
        vm.answer(q.kana.romaji) // bấm lần 2 không tính

        val s = vm.state.value
        assertEquals(1, s.answered)
        assertEquals(0, s.correct)
        assertEquals(1, s.mistakes[q.kana.char])
    }

    @Test
    fun oftenMissedKana_isAskedMoreOften() {
        val vm = vm(seed = 42)
        // Cố ý trả lời sai chữ đầu tiên gặp 10 lần
        val target = vm.state.value.question!!.kana.char
        repeat(10) {
            val q = vm.state.value.question!!
            if (q.kana.char == target) vm.answer(q.options.first { it != q.kana.romaji }) else vm.answer(q.kana.romaji)
            vm.next()
        }
        val weightOfTarget = 1 + 2 * (vm.state.value.mistakes[target] ?: 0)
        assertTrue("chữ hay sai phải có trọng số > 1", weightOfTarget > 1)

        var hits = 0
        repeat(500) { vm.next(); if (vm.state.value.question!!.kana.char == target) hits++ }
        // Không trọng số: kỳ vọng 500/46 ≈ 11 lần
        assertTrue("hỏi lại chữ hay sai nhiều hơn mức ngẫu nhiên (được $hits)", hits > 20)
    }

    @Test
    fun script_survivesProcessDeath_viaSavedStateHandle() {
        val saved = SavedStateHandle()
        vm(saved = saved).setScript(KanaScript.KATAKANA)
        val restored = vm(saved = saved)
        assertEquals(KanaScript.KATAKANA, restored.state.value.script)
        assertTrue(restored.state.value.question!!.kana.char.first() in 'ア'..'ン')
    }
}
