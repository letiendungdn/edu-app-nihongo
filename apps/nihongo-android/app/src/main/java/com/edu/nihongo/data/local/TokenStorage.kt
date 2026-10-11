package com.edu.nihongo.data.local

/** Nơi lưu access token và cookie refresh token. Tách interface để test OkHttp/Repository. */
interface TokenStorage {
    suspend fun get(): String?
    suspend fun save(token: String)
    suspend fun clear()
    suspend fun isLoggedIn(): Boolean = !get().isNullOrBlank()

    /** Chuỗi `Set-Cookie` của refresh token (server đặt httpOnly cookie, path /api/auth). */
    suspend fun getRefreshCookie(): String?
    suspend fun saveRefreshCookie(raw: String)
    suspend fun clearRefreshCookie()
}
