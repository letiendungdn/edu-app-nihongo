package com.edu.nihongo.data.local

import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

/** Room chỉ lưu kiểu nguyên thủy; danh sách lựa chọn của câu hỏi được lưu dạng JSON. */
class Converters {
    private val gson = Gson()
    private val stringListType = object : TypeToken<List<String>>() {}.type

    @TypeConverter
    fun fromStringList(value: List<String>): String = gson.toJson(value)

    @TypeConverter
    fun toStringList(value: String): List<String> = gson.fromJson(value, stringListType) ?: emptyList()
}
