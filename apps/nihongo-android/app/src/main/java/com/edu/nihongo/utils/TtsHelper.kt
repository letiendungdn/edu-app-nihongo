package com.edu.nihongo.utils

import android.content.Context
import android.speech.tts.TextToSpeech
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

object TtsHelper {
    private var tts: TextToSpeech? = null
    private val ready = AtomicBoolean(false)

    fun init(context: Context) {
        if (tts != null) return
        tts = TextToSpeech(context.applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale.JAPANESE
                tts?.setSpeechRate(0.9f)
                ready.set(true)
            }
        }
    }

    fun speak(text: String) {
        val engine = tts ?: return
        if (!ready.get() || text.isBlank()) return
        // speakEnglish đổi ngôn ngữ: đặt lại tiếng Nhật mỗi lần cho chắc
        engine.language = Locale.JAPANESE
        engine.speak(text.trim(), TextToSpeech.QUEUE_FLUSH, null, "nihongo-tts")
    }

    /** Đọc nghĩa tiếng Anh (giọng en-US), đã làm sạch bằng [englishForSpeech]. */
    fun speakEnglish(text: String) {
        val engine = tts ?: return
        val clean = englishForSpeech(text).ifBlank { text.trim() }
        if (!ready.get() || clean.isBlank()) return
        engine.language = Locale.US
        engine.speak(clean, TextToSpeech.QUEUE_FLUSH, null, "nihongo-tts-en")
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        ready.set(false)
    }
}
