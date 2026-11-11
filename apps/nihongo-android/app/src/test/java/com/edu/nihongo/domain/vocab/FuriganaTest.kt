package com.edu.nihongo.domain.vocab

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FuriganaTest {
    @Test
    fun `đọc JSON furigana từ backend`() {
        assertEquals(
            listOf("食" to "た", "べます" to ""),
            parseFurigana("""[["食","た"],["べます",""]]"""),
        )
    }

    @Test
    fun `trống hoặc sai định dạng thì trả list rỗng`() {
        assertTrue(parseFurigana(null).isEmpty())
        assertTrue(parseFurigana("").isEmpty())
        assertTrue(parseFurigana("not json").isEmpty())
        assertTrue(parseFurigana("""[["食"]]""").isEmpty())
    }
}
