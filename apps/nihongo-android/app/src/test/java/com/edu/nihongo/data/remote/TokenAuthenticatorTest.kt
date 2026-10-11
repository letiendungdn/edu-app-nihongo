package com.edu.nihongo.data.remote

import com.edu.nihongo.testing.FakeTokenStorage
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** L13: OkHttp thật nói chuyện với server giả, cấu hình giống AppModule.provideOkHttp. */
class TokenAuthenticatorTest {
    private val server = MockWebServer()
    private lateinit var storage: FakeTokenStorage
    private lateinit var client: OkHttpClient

    @Before
    fun setUp() {
        server.start()
        storage = FakeTokenStorage(token = "old")
        val jar = RefreshCookieJar(storage)
        val refreshClient = OkHttpClient.Builder().cookieJar(jar).build()
        client = OkHttpClient.Builder()
            .cookieJar(jar)
            .addInterceptor(AuthInterceptor(storage))
            .authenticator(TokenAuthenticator(storage, refreshClient, server.url("/api/")))
            .build()
    }

    @After
    fun tearDown() = server.shutdown()

    private fun get(path: String) =
        client.newCall(Request.Builder().url(server.url(path)).build()).execute().use { it.code }

    private fun refreshOk(token: String) = MockResponse()
        .setBody("""{"success":true,"data":{"access_token":"$token"}}""")

    @Test
    fun refreshCookie_isStored_andOnlySentToAuthPaths() {
        server.enqueue(
            MockResponse()
                .addHeader("Set-Cookie", "refresh_token=r1; Path=/api/auth; Max-Age=600; HttpOnly")
                .setBody("{}"),
        )
        server.enqueue(MockResponse().setBody("{}"))
        server.enqueue(refreshOk("x"))

        get("/api/auth/login")
        get("/api/vocabularies")
        client.newCall(
            Request.Builder().url(server.url("/api/auth/refresh")).post(ByteArray(0).toRequestBody()).build(),
        ).execute().close()

        server.takeRequest()
        assertNull(server.takeRequest().getHeader("Cookie"))
        assertEquals("refresh_token=r1", server.takeRequest().getHeader("Cookie"))
        assertTrue(storage.refreshCookie!!.startsWith("refresh_token=r1"))
    }

    @Test
    fun on401_refreshesToken_andRetriesOnce() {
        storage.refreshCookie = "refresh_token=r1; path=/api/auth"
        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(refreshOk("new"))
        server.enqueue(MockResponse().setBody("ok"))

        assertEquals(200, get("/api/progress"))

        assertEquals("Bearer old", server.takeRequest().getHeader("Authorization"))
        val refresh = server.takeRequest()
        assertEquals("/api/auth/refresh", refresh.path)
        assertEquals("refresh_token=r1", refresh.getHeader("Cookie"))
        assertEquals("Bearer new", server.takeRequest().getHeader("Authorization"))
        assertEquals("new", storage.token)
    }

    @Test
    fun refreshRejected_logsOut() {
        storage.refreshCookie = "refresh_token=expired; path=/api/auth"
        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(MockResponse().setResponseCode(401)) // refresh bị từ chối

        assertEquals(401, get("/api/progress"))

        assertNull(storage.token)
        assertNull(storage.refreshCookie)
        assertEquals(2, server.requestCount)
    }

    @Test
    fun stillUnauthorizedAfterRefresh_doesNotLoop() {
        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(refreshOk("new"))
        server.enqueue(MockResponse().setResponseCode(401)) // vẫn 401 với token mới

        assertEquals(401, get("/api/progress"))
        assertEquals(3, server.requestCount)
    }

    @Test
    fun networkErrorDuringRefresh_keepsSession() {
        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AT_START))

        assertEquals(401, get("/api/progress"))
        assertEquals("old", storage.token) // mất mạng không phải lý do đăng xuất
    }

    @Test
    fun anotherThreadAlreadyRefreshed_retriesWithoutCallingRefresh() {
        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(MockResponse().setBody("ok"))
        // Request đi với "old"; trước khi Authenticator chạy, token đã được làm mới ở nơi khác
        client = client.newBuilder()
            .addNetworkInterceptor { chain ->
                val res = chain.proceed(chain.request())
                if (res.code == 401) storage.token = "fresh"
                res
            }
            .build()

        assertEquals(200, get("/api/progress"))
        server.takeRequest()
        assertEquals("Bearer fresh", server.takeRequest().getHeader("Authorization"))
        assertEquals(2, server.requestCount)
    }

    // Đúng header mà gateway local trả về (đo bằng curl qua nginx :8080): có cờ Secure dù là HTTP
    private val secureCookie =
        "refresh_token=r2; Max-Age=604800; Path=/api/auth; HttpOnly; Secure; SameSite=Lax"

    private fun refreshRequestCookie(jar: RefreshCookieJar): String? {
        val c = OkHttpClient.Builder().cookieJar(jar).build()
        server.enqueue(MockResponse().addHeader("Set-Cookie", secureCookie).setBody("{}"))
        server.enqueue(MockResponse().setBody("{}"))
        c.newCall(Request.Builder().url(server.url("/api/auth/login")).build()).execute().close()
        c.newCall(Request.Builder().url(server.url("/api/auth/refresh")).build()).execute().close()
        server.takeRequest()
        return server.takeRequest().getHeader("Cookie")
    }

    @Test
    fun secureCookie_overHttp_notSentByDefault() {
        assertNull(refreshRequestCookie(RefreshCookieJar(FakeTokenStorage())))
    }

    @Test
    fun secureCookie_overHttp_sentWhenDebugAllows() {
        assertEquals("refresh_token=r2", refreshRequestCookie(RefreshCookieJar(FakeTokenStorage(), allowSecureOverHttp = true)))
    }

    @Test
    fun parsesWrappedAndPlainBodies() {
        assertEquals("a", TokenAuthenticator.parseAccessToken("""{"success":true,"data":{"access_token":"a"}}"""))
        assertEquals("b", TokenAuthenticator.parseAccessToken("""{"access_token":"b"}"""))
        assertNull(TokenAuthenticator.parseAccessToken("not json"))
    }
}
