package com.edu.nihongo.domain.repository

data class PersonalWord(val id: Long, val kana: String, val meaning: String, val lesson: Int)

/** ViewModel phụ thuộc interface này; test thay bằng bản giả, không cần mạng. */
interface PersonalWordsRepository {
    suspend fun list(lesson: Int?): Result<List<PersonalWord>>
    suspend fun add(kana: String, meaning: String, lesson: Int): Result<PersonalWord>
    suspend fun delete(id: Long): Result<Unit>
}
