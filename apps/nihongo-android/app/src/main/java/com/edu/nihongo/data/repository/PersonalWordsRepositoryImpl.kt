package com.edu.nihongo.data.repository

import com.edu.nihongo.data.remote.NewPersonalWordDto
import com.edu.nihongo.data.remote.PersonalWordDto
import com.edu.nihongo.data.remote.PersonalWordsApi
import com.edu.nihongo.domain.repository.PersonalWord
import com.edu.nihongo.domain.repository.PersonalWordsRepository
import com.google.gson.JsonParser
import kotlinx.coroutines.CancellationException
import retrofit2.HttpException
import javax.inject.Inject

/** Lỗi nghiệp vụ server đã giải thích (400 dữ liệu sai, 409 trùng): giữ nguyên câu của server. */
class ServerMessageException(message: String) : Exception(message)

class PersonalWordsRepositoryImpl @Inject constructor(
    private val api: PersonalWordsApi,
) : PersonalWordsRepository {

    override suspend fun list(lesson: Int?) = call { api.list(lesson).data?.data.orEmpty().map { it.toDomain() } }

    override suspend fun add(kana: String, meaning: String, lesson: Int) = call {
        val dto = api.create(NewPersonalWordDto(kana, meaning, lesson)).data ?: error("Server không trả từ vừa thêm")
        dto.toDomain()
    }

    override suspend fun delete(id: Long) = call { api.delete(id); Unit }

    private suspend fun <T> call(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e // không biến việc hủy coroutine thành "lỗi"
    } catch (e: HttpException) {
        Result.failure(serverMessage(e) ?: e)
    } catch (e: Exception) {
        Result.failure(e)
    }

    /** Gateway trả `{ "success": false, "error": { "code": "CONFLICT", "message": "Từ này đã có trong sổ" } }`. */
    private fun serverMessage(e: HttpException): ServerMessageException? {
        if (e.code() != 400 && e.code() != 409) return null // 401/5xx: để userMessage() chung xử lý
        val body = e.response()?.errorBody()?.string() ?: return null
        return runCatching {
            JsonParser.parseString(body).asJsonObject.getAsJsonObject("error").get("message").asString
        }.getOrNull()?.let(::ServerMessageException)
    }
}

private fun PersonalWordDto.toDomain() = PersonalWord(id, kana, meaning, lesson)
