package com.edu.nihongo.domain.vocab

import com.google.gson.JsonParser

/**
 * Đọc cột furigana do backend tính sẵn: JSON [["食","た"],["べます",""]].
 * Dùng JsonParser của Gson (org.json trong unit test JVM chỉ là stub). Sai định dạng → list rỗng.
 */
fun parseFurigana(raw: String?): List<Pair<String, String>> {
    if (raw.isNullOrBlank()) return emptyList()
    return runCatching {
        JsonParser.parseString(raw).asJsonArray.map { seg ->
            val pair = seg.asJsonArray
            require(pair.size() == 2)
            pair[0].asString to pair[1].asString
        }
    }.getOrDefault(emptyList())
}
