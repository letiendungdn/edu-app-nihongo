package com.edu.nihongo.utils

import org.junit.Assert.assertEquals
import org.junit.Test

class EnglishSpeechTest {
    @Test
    fun `bỏ ghi chú trong ngoặc, dấu ~, đổi chấm phẩy thành phẩy`() {
        assertEquals("fictional company", englishForSpeech("fictional company (in textbook)"))
        assertEquals("to turn on, to switch on", englishForSpeech("to turn on; to switch on"))
        assertEquals("this", englishForSpeech("this ~ (near the speaker)"))
    }
}
