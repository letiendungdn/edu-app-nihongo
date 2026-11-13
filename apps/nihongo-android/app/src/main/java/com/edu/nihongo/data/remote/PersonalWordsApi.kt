package com.edu.nihongo.data.remote

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** Sổ từ vựng cá nhân (`/api/personal-words`). Gateway bọc mọi response trong `{ success, data }`. */
data class PersonalWordDto(val id: Long, val kana: String, val meaning: String, val lesson: Int)

data class PersonalWordPageDto(val data: List<PersonalWordDto> = emptyList(), val total: Int = 0)

data class NewPersonalWordDto(val kana: String, val meaning: String, val lesson: Int)

interface PersonalWordsApi {
    /** `lesson = null` → Retrofit không gửi tham số (lấy mọi bài). */
    @GET("personal-words")
    suspend fun list(@Query("lesson") lesson: Int?, @Query("limit") limit: Int = 200): ApiEnvelope<PersonalWordPageDto>

    @POST("personal-words")
    suspend fun create(@Body body: NewPersonalWordDto): ApiEnvelope<PersonalWordDto>

    @DELETE("personal-words/{id}")
    suspend fun delete(@Path("id") id: Long): ApiEnvelope<Map<String, Any>>
}
