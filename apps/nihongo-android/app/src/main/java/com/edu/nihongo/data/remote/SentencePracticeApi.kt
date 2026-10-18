package com.edu.nihongo.data.remote

import javax.inject.Inject
import javax.inject.Singleton

/**
 * Luyện câu với AI qua gateway.
 *
 * Bản cũ gọi thẳng Gemini bằng `BuildConfig.GEMINI_API_KEY`: key nằm trong APK, giải nén APK là
 * lấy được. Lại không kiểm tra mã HTTP: Gemini báo lỗi thì Gson parse JSON rác và ném exception khó hiểu.
 * Giờ đi qua Retrofit (AuthInterceptor gắn token, TokenAuthenticator tự refresh khi 401).
 */
@Singleton
class SentencePracticeApi @Inject constructor(private val api: SentenceFeedbackApi) {
    suspend fun analyze(sentence: String): SentenceFeedback =
        api.analyze(SentenceFeedbackRequest(sentence.trim())).data
            ?: throw IllegalStateException("Máy chủ không trả kết quả")
}
