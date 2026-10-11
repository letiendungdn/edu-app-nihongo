package com.edu.nihongo.data.remote

import com.edu.nihongo.data.local.TokenStorage
import com.google.gson.JsonParser
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import java.io.IOException

/**
 * OkHttp gọi [authenticate] khi server trả 401.
 *
 * 1. Request đã thử lại một lần mà vẫn 401 → bỏ (không lặp vô hạn).
 * 2. Luồng khác vừa refresh xong (token hiện tại khác token của request lỗi) → thử lại bằng token mới.
 * 3. Gọi `POST auth/refresh` (cookie refresh token do [RefreshCookieJar] gửi kèm).
 *    - thành công: lưu access token mới, gửi lại request.
 *    - server từ chối (refresh token hết hạn/thu hồi): xóa token = đăng xuất.
 *    - lỗi mạng: giữ nguyên token, để request thất bại; lần sau thử lại.
 *
 * [refreshClient] không có Authenticator để chính lệnh refresh không gọi lại vào đây.
 */
class TokenAuthenticator(
    private val storage: TokenStorage,
    private val refreshClient: OkHttpClient,
    private val apiBaseUrl: HttpUrl,
) : Authenticator {
    private val lock = Any()

    override fun authenticate(route: Route?, response: Response): Request? {
        if (isAuthEndpoint(response.request.url)) return null
        if (response.priorResponse != null) return null

        val failedToken = response.request.header("Authorization")?.removePrefix("Bearer ")

        synchronized(lock) {
            val current = runBlocking { storage.get() }
            if (!current.isNullOrBlank() && current != failedToken) {
                return response.request.withBearer(current)
            }

            return when (val result = refresh()) {
                is RefreshResult.Success -> {
                    runBlocking { storage.save(result.accessToken) }
                    response.request.withBearer(result.accessToken)
                }
                RefreshResult.Rejected -> {
                    runBlocking {
                        storage.clear()
                        storage.clearRefreshCookie()
                    }
                    null
                }
                RefreshResult.NetworkError -> null
            }
        }
    }

    private fun refresh(): RefreshResult {
        val url = apiBaseUrl.resolve("auth/refresh") ?: return RefreshResult.NetworkError
        val request = Request.Builder()
            .url(url)
            .post(ByteArray(0).toRequestBody())
            .build()
        return try {
            refreshClient.newCall(request).execute().use { res ->
                if (!res.isSuccessful) return RefreshResult.Rejected
                val token = parseAccessToken(res.body?.string().orEmpty())
                if (token.isNullOrBlank()) RefreshResult.Rejected else RefreshResult.Success(token)
            }
        } catch (_: IOException) {
            RefreshResult.NetworkError
        }
    }

    private fun isAuthEndpoint(url: HttpUrl): Boolean {
        val path = url.encodedPath
        return AUTH_PATHS.any { path.endsWith(it) }
    }

    private sealed interface RefreshResult {
        data class Success(val accessToken: String) : RefreshResult
        data object Rejected : RefreshResult
        data object NetworkError : RefreshResult
    }

    companion object {
        private val AUTH_PATHS = listOf("/auth/refresh", "/auth/login", "/auth/oidc", "/auth/logout")

        /** Gateway bọc `{ success, data: { access_token } }`; chấp nhận cả dạng không bọc. */
        internal fun parseAccessToken(body: String): String? = try {
            val root = JsonParser.parseString(body).asJsonObject
            val payload = root.getAsJsonObject("data") ?: root
            payload.get("access_token")?.takeIf { it.isJsonPrimitive }?.asString
        } catch (_: Exception) {
            null
        }
    }
}

private fun Request.withBearer(token: String): Request =
    newBuilder().header("Authorization", "Bearer $token").build()
