package com.edu.nihongo.data.remote

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class VocabularyRemoteDataSource @Inject constructor(
    private val api: VocabularyApi,
) {
    suspend fun fetchAllForLesson(lessonNumber: Int): List<VocabDto> {
        val all = mutableListOf<VocabDto>()
        var page = 1
        val limit = 100

        // Có giới hạn trang: server lỗi mà trang nào cũng đủ `limit` dòng thì không lặp mãi
        while (page <= MAX_PAGES) {
            val envelope = api.list(lessonNumber = lessonNumber, page = page, limit = limit)
            val batch = envelope.data?.data.orEmpty()
            if (batch.isEmpty()) break
            all += batch
            val total = envelope.data?.total
            if (batch.size < limit || (total != null && all.size >= total)) break
            page += 1
        }

        return all
    }

    private companion object {
        const val MAX_PAGES = 50
    }

    suspend fun syncReviewBank(items: List<ReviewSyncItem>) {
        if (items.isEmpty()) return
        api.syncReviewBank(ReviewSyncRequest(items))
    }
}
