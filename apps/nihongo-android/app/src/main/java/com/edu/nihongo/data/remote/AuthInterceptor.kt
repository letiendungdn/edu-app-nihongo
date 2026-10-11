package com.edu.nihongo.data.remote

import com.edu.nihongo.data.local.TokenStorage
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Gắn `Authorization: Bearer <token>`. Chạy trên luồng OkHttp (không phải main) nên
 * `runBlocking` đọc DataStore ở đây chấp nhận được; DataStore cache sau lần đọc đầu.
 */
class AuthInterceptor(
    private val tokenStore: TokenStorage,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        if (original.header("Authorization") != null) return chain.proceed(original)

        val token = runBlocking { tokenStore.get() }
        val request = if (!token.isNullOrBlank()) {
            original.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            original
        }
        return chain.proceed(request)
    }
}
