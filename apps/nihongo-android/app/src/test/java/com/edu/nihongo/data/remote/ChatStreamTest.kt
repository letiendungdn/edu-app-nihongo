package com.edu.nihongo.data.remote

import com.google.gson.Gson
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import java.util.concurrent.TimeUnit

/** SSE thật qua OkHttp + MockWebServer. Body dùng đúng định dạng gateway gửi (đã đo bằng curl). */
class ChatStreamTest {
    private val server = MockWebServer()
    private lateinit var stream: ChatStream

    @Before
    fun setUp() {
        server.start()
        stream = ChatStream(
            OkHttpClient.Builder().readTimeout(0, TimeUnit.SECONDS).build(),
            server.url("/api/"),
            Gson(),
        )
    }

    @After
    fun tearDown() = server.shutdown()

    private fun sse(vararg ids: Long) = MockResponse()
        .setHeader("Content-Type", "text/event-stream")
        .setBody(
            ids.joinToString("") { id ->
                "id: $id\ndata: {\"data\":{\"id\":$id,\"roomId\":1,\"senderId\":3,\"content\":\"m$id\"," +
                    "\"createdAt\":\"2026-10-11T13:26:44.909Z\",\"sender\":{\"id\":3,\"name\":null,\"email\":\"a@b.c\"}}}\n\n"
            },
        )

    @Test
    fun receivesMessages_afterOpen() = runBlocking {
        server.enqueue(sse(1, 2))

        val events = withTimeout(5_000) { stream.messages(roomId = 1).take(3).toList() }

        assertEquals(StreamEvent.Open, events[0])
        assertEquals(listOf(1L, 2L), events.drop(1).map { (it as StreamEvent.Message).message.id })
        assertEquals("/api/community/rooms/1/stream", server.takeRequest().path)
    }

    @Test
    fun serverClosesStream_reconnectsAndOpensAgain() = runBlocking {
        server.enqueue(sse(1))   // gửi 1 tin rồi đóng (như pod restart)
        server.enqueue(sse(2))   // lần nối lại

        val events = withTimeout(10_000) { stream.messages(roomId = 1).take(5).toList() }

        assertEquals(
            listOf(StreamEvent.Open::class, StreamEvent.Message::class, StreamEvent.Closed::class, StreamEvent.Open::class, StreamEvent.Message::class),
            events.map { it::class },
        )
        assertEquals(2, server.requestCount)
    }

    @Test
    fun unauthorized_doesNotRetry() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(401))
        try {
            withTimeout(5_000) { stream.messages(roomId = 1).toList() }
            fail("phải ném lỗi")
        } catch (e: SseHttpException) {
            assertEquals(401, e.code)
        }
        assertEquals(1, server.requestCount)
    }

    // Đo trên emulator: client có HttpLoggingInterceptor(BODY) nhận 200 nhưng không có sự kiện nào,
    // vì interceptor đọc hết body (không bao giờ hết) trước khi trả về. Body ở đây chảy rất chậm
    // (~9 giây) để giả stream dài: sự kiện Open phải tới ngay, không chờ hết body.
    private fun slowStream() = sse(1, 2, 3).throttleBody(64, 1, TimeUnit.SECONDS)

    private fun bodyLoggingClient() = OkHttpClient.Builder()
        .addInterceptor(okhttp3.logging.HttpLoggingInterceptor().apply { level = okhttp3.logging.HttpLoggingInterceptor.Level.BODY })
        .build()

    @Test
    fun sseClient_opensImmediately_evenWhenAppClientLogsBodies() = runBlocking {
        server.enqueue(slowStream())
        val s = ChatStream(com.edu.nihongo.di.AppModule.sseClient(bodyLoggingClient()), server.url("/api/"), Gson())

        val first = withTimeout(3_000) { s.messages(roomId = 1).take(1).toList() }
        assertEquals(StreamEvent.Open, first.single())
    }

    @Test
    fun ignoresMalformedEvents() {
        assertEquals(null, stream.parseMessage("not json"))
        assertEquals(null, stream.parseMessage("{\"ping\":true}"))
        assertEquals(9L, stream.parseMessage("{\"id\":9,\"roomId\":1,\"senderId\":2}")?.id)
    }

    @Test
    fun backoff_growsThenCaps() {
        assertEquals(listOf(1_000L, 2_000L, 4_000L, 8_000L, 16_000L, 30_000L, 30_000L), (0L..6L).map(ChatStream::backoffMs))
        assertTrue(ChatStream.backoffMs(100) == 30_000L)
    }
}
