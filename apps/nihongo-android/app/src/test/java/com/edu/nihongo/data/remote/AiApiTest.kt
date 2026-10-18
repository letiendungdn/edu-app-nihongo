package com.edu.nihongo.data.remote

import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/** Luyện câu và gia sư AI đi qua gateway; key AI không còn nằm trong APK. */
class AiApiTest {
    private val server = MockWebServer()
    private lateinit var retrofit: Retrofit

    @Before fun setUp() {
        server.start()
        retrofit = Retrofit.Builder()
            .baseUrl(server.url("/api/"))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @After fun tearDown() = server.shutdown()

    @Test fun sentenceFeedbackCallsGatewayAndUnwrapsEnvelope() = runBlocking {
        server.enqueue(
            MockResponse().setBody(
                """{"success":true,"data":{"corrected":"","reading":"わたしは","meaning":"Tôi","explanation":"Đúng","examples":["a"]}}""",
            ),
        )
        val api = SentencePracticeApi(retrofit.create(SentenceFeedbackApi::class.java))

        val fb = api.analyze("  私は  ")

        assertEquals(SentenceFeedback("", "わたしは", "Tôi", "Đúng", listOf("a")), fb)
        val req = server.takeRequest()
        assertEquals("/api/ai/sentence-feedback", req.path) // không còn ?key=…
        assertEquals("""{"sentence":"私は"}""", req.body.readUtf8())
    }

    @Test fun serverErrorIsThrownNotParsedAsEmptyFeedback() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(503).setBody("""{"success":false}"""))
        val api = SentencePracticeApi(retrofit.create(SentenceFeedbackApi::class.java))
        try {
            api.analyze("x")
            fail("phải ném lỗi")
        } catch (e: HttpException) {
            assertEquals(503, e.code())
        }
    }

    @Test fun tutorAnswerIsReadFromEnvelope() = runBlocking {
        // Bản cũ đọc `answer` ở cấp ngoài → luôn null → "Không có câu trả lời."
        server.enqueue(MockResponse().setBody("""{"success":true,"data":{"answer":"は là trợ từ chủ đề"}}"""))
        val res = retrofit.create(AiTutorApi::class.java).chat(AiChatRequest(question = "は?"))
        assertEquals("は là trợ từ chủ đề", res.data?.answer)
        assertTrue(server.takeRequest().path == "/api/ai/chat")
    }
}
