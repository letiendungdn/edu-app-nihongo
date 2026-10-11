package com.edu.nihongo.data.remote

import com.edu.nihongo.data.local.TokenStorage
import kotlinx.coroutines.runBlocking
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl

/**
 * Server trả refresh token dưới dạng cookie httpOnly `refresh_token` (path `/api/auth`).
 * OkHttp mặc định bỏ mọi cookie, nên trước đây app mất refresh token ngay sau khi login.
 *
 * Jar này chỉ giữ đúng cookie đó, lưu bền vào [TokenStorage] để sống qua lần mở app sau.
 * `Cookie.matches(url)` lo phần path/domain/secure, nên cookie chỉ được gửi tới `/api/auth/...`.
 *
 * Hàm của CookieJar là hàm thường chạy trên luồng OkHttp (không phải main), nên `runBlocking`
 * để đọc/ghi DataStore ở đây chấp nhận được.
 *
 * [allowSecureOverHttp]: gateway local (Docker, NODE_ENV=production) đặt cờ `Secure` cho cookie
 * dù chạy qua http://10.0.2.2. OkHttp đúng chuẩn sẽ không gửi cookie Secure qua HTTP, nên
 * refresh không bao giờ chạy khi dev. Chỉ bật cho bản debug; release luôn đúng chuẩn (HTTPS).
 */
class RefreshCookieJar(
    private val storage: TokenStorage,
    private val allowSecureOverHttp: Boolean = false,
    private val now: () -> Long = System::currentTimeMillis,
) : CookieJar {

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val refresh = cookies.lastOrNull { it.name == REFRESH_COOKIE } ?: return
        runBlocking {
            // clearCookie của server gửi cookie rỗng đã hết hạn
            if (refresh.value.isEmpty() || refresh.expiresAt <= now()) {
                storage.clearRefreshCookie()
            } else {
                storage.saveRefreshCookie(refresh.toString())
            }
        }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val raw = runBlocking { storage.getRefreshCookie() } ?: return emptyList()
        val parsed = Cookie.parse(url, raw) ?: return emptyList()
        if (parsed.expiresAt <= now()) return emptyList()
        val cookie = if (allowSecureOverHttp && parsed.secure && !url.isHttps) {
            parsed.withoutSecureFlag()
        } else {
            parsed
        }
        return if (cookie.matches(url)) listOf(cookie) else emptyList()
    }

    companion object {
        const val REFRESH_COOKIE = "refresh_token"
    }
}

private fun Cookie.withoutSecureFlag(): Cookie {
    val builder = Cookie.Builder()
        .name(name)
        .value(value)
        .path(path)
        .expiresAt(expiresAt)
    if (hostOnly) builder.hostOnlyDomain(domain) else builder.domain(domain)
    if (httpOnly) builder.httpOnly()
    return builder.build()
}
