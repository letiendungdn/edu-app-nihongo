package com.edu.nihongo.presentation.kana

data class Kana(val char: String, val romaji: String)

enum class KanaScript(val label: String) { HIRAGANA("Hiragana"), KATAKANA("Katakana") }

/** 46 chữ cơ bản (gojūon). Dữ liệu tĩnh: không cần mạng, không cần DB. */
object KanaData {
    private val romaji = listOf(
        "a", "i", "u", "e", "o", "ka", "ki", "ku", "ke", "ko", "sa", "shi", "su", "se", "so",
        "ta", "chi", "tsu", "te", "to", "na", "ni", "nu", "ne", "no", "ha", "hi", "fu", "he", "ho",
        "ma", "mi", "mu", "me", "mo", "ya", "yu", "yo", "ra", "ri", "ru", "re", "ro", "wa", "wo", "n",
    )
    private const val HIRAGANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん"
    private const val KATAKANA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン"

    fun of(script: KanaScript): List<Kana> {
        val chars = if (script == KanaScript.HIRAGANA) HIRAGANA else KATAKANA
        return chars.mapIndexed { i, c -> Kana(c.toString(), romaji[i]) }
    }
}
