package com.edu.nihongo.utils

import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response
import java.net.ConnectException

class UserMessageTest {
    private fun http(code: Int) = HttpException(Response.error<Any>(code, "".toResponseBody()))

    // Đo trên emulator: chế độ máy bay hiện nguyên văn "Failed to connect to /10.0.2.2:8080"
    @Test
    fun networkErrors_becomeFriendly() {
        assertEquals("Không có kết nối mạng.", ConnectException("Failed to connect to /10.0.2.2:8080").userMessage())
    }

    @Test
    fun httpErrors_byCode() {
        assertEquals("Phiên đăng nhập đã hết hạn. Đăng nhập lại nhé.", http(401).userMessage())
        assertEquals("Máy chủ đang gặp sự cố, thử lại sau.", http(503).userMessage())
        assertEquals("Có lỗi xảy ra (mã 418).", http(418).userMessage())
    }

    @Test
    fun domainErrors_keepTheirMessage() {
        assertEquals("Không có mạng", IllegalStateException("Không có mạng").userMessage())
        assertEquals("Có lỗi xảy ra.", RuntimeException().userMessage())
    }
}
