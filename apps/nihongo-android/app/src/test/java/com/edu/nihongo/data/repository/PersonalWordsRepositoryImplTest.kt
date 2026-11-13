package com.edu.nihongo.data.repository

import com.edu.nihongo.data.remote.PersonalWordsApi
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/** MockWebServer: server HTTP thật trong test, trả JSON đúng định dạng của gateway. */
class PersonalWordsRepositoryImplTest {
    private val server = MockWebServer()
    private lateinit var repo: PersonalWordsRepositoryImpl

    @Before fun setUp() {
        server.start()
        val api = Retrofit.Builder()
            .baseUrl(server.url("/api/"))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(PersonalWordsApi::class.java)
        repo = PersonalWordsRepositoryImpl(api)
    }

    @After fun tearDown() = server.shutdown()

    @Test fun moLopPhongBi_vaGuiDungThamSo() = runTest {
        server.enqueue(MockResponse().setBody("""{"success":true,"data":{"data":[{"id":7,"kana":"ねこ","meaning":"mèo","lesson":2}],"total":1,"page":1,"limit":200},"timestamp":"x"}"""))
        val words = repo.list(2).getOrThrow()
        assertEquals("ねこ", words.single().kana)
        assertEquals("/api/personal-words?lesson=2&limit=200", server.takeRequest().path)
    }

    @Test fun loi409_giuNguyenCauCuaServer() = runTest {
        server.enqueue(MockResponse().setResponseCode(409).setBody("""{"success":false,"error":{"code":"CONFLICT","message":"Từ này đã có trong sổ"}}"""))
        val e = repo.add("わたし", "tôi", 1).exceptionOrNull()
        assertTrue(e is ServerMessageException)
        assertEquals("Từ này đã có trong sổ", e!!.message)
    }

    @Test fun loi500_khongDocBody_deUserMessageXuLy() = runTest {
        server.enqueue(MockResponse().setResponseCode(500).setBody("""{"success":false,"error":{"code":"INTERNAL","message":"stack trace nội bộ"}}"""))
        val e = repo.delete(1).exceptionOrNull()
        assertTrue(e is HttpException) // không lộ thông báo nội bộ của server ra màn hình
    }
}
