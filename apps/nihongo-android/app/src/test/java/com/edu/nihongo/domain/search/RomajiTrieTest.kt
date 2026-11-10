package com.edu.nihongo.domain.search

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RomajiTrieTest {
    private fun trieOf(vararg romaji: String) = RomajiTrie<String>().apply { romaji.forEach { insert(it, it) } }

    @Test
    fun normalize_dropsCaseMarksSpacesAndPunctuation() {
        assertEquals("kandoshimasu", normalizeRomaji("Kandō shimasu"))
        assertEquals("jamataashita", normalizeRomaji("ja, mata [ashita]."))
    }

    @Test
    fun longVowel_isFoundWhetherTypedPlainOrDoubled() {
        // Dữ liệu thật dùng dấu trường âm; người dùng gõ "kando" hoặc "kandou"
        val trie = trieOf("kandō shimasu", "kanji")
        assertEquals(listOf("kandō shimasu"), trie.search("kando"))
        assertEquals(listOf("kandō shimasu"), trie.search("kandou"))
        assertEquals(listOf("kandō shimasu"), trie.search("Kandō Shi"))
    }

    @Test
    fun shorterKeysFirst_thenAlphabetical() {
        val trie = trieOf("kaban", "ka", "kasa", "kagi")
        assertEquals(listOf("ka", "kagi", "kasa", "kaban"), trie.search("ka"))
    }

    @Test
    fun itemStoredUnderTwoKeys_isReturnedOnce() {
        val trie = trieOf("tōrimasu")       // khóa "torimasu" và "tourimasu" cùng bắt đầu bằng "to"
        assertEquals(listOf("tōrimasu"), trie.search("to"))
        assertEquals(1, trie.itemCount)
    }

    @Test
    fun respectsLimit_andReturnsNothingForUnknownOrBlankPrefix() {
        val trie = trieOf("a", "ai", "aisu", "ame", "ane")
        assertEquals(3, trie.search("a", limit = 3).size)
        assertTrue(trie.search("zzz").isEmpty())
        assertTrue(trie.search("   ").isEmpty())
    }

    @Test
    fun realRomajiSamples_fromTheContentDatabase() {
        val samples = listOf("nyūgaku shimasu", "nyūgakushiki", "yūshū desu", "nandesuka.", "tōrimasu")
        val trie = trieOf(*samples.toTypedArray())
        assertEquals(listOf("nyūgakushiki", "nyūgaku shimasu"), trie.search("nyuugakushi"))
        assertEquals(listOf("yūshū desu"), trie.search("yushu"))
        assertEquals(listOf("nandesuka."), trie.search("nandesuka"))
    }
}
