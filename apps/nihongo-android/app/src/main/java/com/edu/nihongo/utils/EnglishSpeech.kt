package com.edu.nihongo.utils

/**
 * Chữ đưa cho giọng đọc tiếng Anh (cùng quy tắc với web): bỏ ghi chú trong ngoặc ("(in textbook)"),
 * dấu ~ của mẫu câu, đổi ";" thành "," để ngắt nghỉ tự nhiên.
 */
fun englishForSpeech(text: String): String =
    text.replace(Regex("""\([^)]*\)"""), " ")
        .replace(Regex("[~～]"), " ")
        .replace(Regex("""\s*;\s*"""), ", ")
        .replace(Regex("""\s+"""), " ")
        .replace(Regex("""\s+,"""), ",")
        .trim()
