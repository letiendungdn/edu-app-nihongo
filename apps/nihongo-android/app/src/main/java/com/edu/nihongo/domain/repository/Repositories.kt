package com.edu.nihongo.domain.repository

import com.edu.nihongo.domain.entity.Lesson
import com.edu.nihongo.domain.entity.ReviewCard
import com.edu.nihongo.domain.entity.SrsCard
import com.edu.nihongo.domain.entity.Vocabulary
import kotlinx.coroutines.flow.Flow

interface VocabularyRepository {
    fun getVocabByLesson(lessonNumber: Int): Flow<List<Vocabulary>>
    fun getReviewQueue(): Flow<List<ReviewCard>>
    /** Lưu kết quả chấm vào máy rồi hẹn gửi lên server. Không phụ thuộc mạng. */
    suspend fun updateSrsCard(card: SrsCard): Result<Unit>
    suspend fun syncLesson(lessonNumber: Int): Result<Unit>
    /** Gửi hàng đợi ôn tập lên server. WorkManager gọi khi có mạng. */
    suspend fun syncPendingReviews(): Result<Unit>
}

interface LessonRepository {
    /** Danh sách bài từ Room; có dữ liệu cũ ngay cả khi offline. */
    fun observeLessons(): Flow<List<Lesson>>
    suspend fun refreshLessons(): Result<Unit>
}

interface AuthRepository {
    suspend fun login(email: String, password: String): Result<Unit>
    suspend fun loginWithOidc(accessToken: String, idToken: String?): Result<Unit>
    suspend fun logout()
    suspend fun isLoggedIn(): Boolean
}

interface TranslateRepository {
    suspend fun translateJapanese(text: String): String
}
