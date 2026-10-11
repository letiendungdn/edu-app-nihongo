package com.edu.nihongo.data.remote

import com.google.gson.Gson
import com.google.gson.JsonParser
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.retryWhen
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import java.io.IOException

/** Server trả mã lỗi HTTP khi mở stream. 4xx (trừ 408/429) là lỗi không tự khỏi: không nối lại. */
class SseHttpException(val code: Int) : IOException("SSE HTTP $code") {
    val retryable: Boolean get() = code >= 500 || code == 408 || code == 429
}

/** Server đóng stream bình thường (deploy, restart pod): nối lại. */
class SseClosedException : IOException("SSE đóng")

sealed interface StreamEvent {
    /** Vừa (nối lại) thành công. Tin gửi trong lúc mất kết nối không đi qua stream: caller tải lại lịch sử. */
    data object Open : StreamEvent
    /** Kết nối vừa đứt, đang chờ nối lại: UI thôi hiện "trực tuyến". */
    data object Closed : StreamEvent
    data class Message(val message: ChatMessageDto) : StreamEvent
}

/**
 * Nghe `GET /api/community/rooms/{id}/stream` (Server-Sent Events).
 *
 * [client] phải có `readTimeout(0)`: stream mở hàng giờ, không có dữ liệu trong lúc phòng im lặng
 * là bình thường. Client này vẫn có AuthInterceptor + TokenAuthenticator nên token hết hạn
 * lúc mở stream sẽ được làm mới như request thường.
 */
class ChatStream(
    private val client: OkHttpClient,
    private val apiBaseUrl: HttpUrl,
    private val gson: Gson,
) {
    fun messages(roomId: Long): Flow<StreamEvent> = callbackFlow {
        val url = apiBaseUrl.resolve("community/rooms/$roomId/stream")
            ?: throw IllegalArgumentException("URL stream không hợp lệ")
        val request = Request.Builder()
            .url(url)
            .header("Accept", "text/event-stream")
            .build()

        val source = EventSources.createFactory(client).newEventSource(
            request,
            object : EventSourceListener() {
                override fun onOpen(eventSource: EventSource, response: Response) {
                    trySend(StreamEvent.Open)
                }

                override fun onEvent(eventSource: EventSource, id: String?, type: String?, data: String) {
                    parseMessage(data)?.let { trySend(StreamEvent.Message(it)) }
                }

                override fun onClosed(eventSource: EventSource) {
                    close(SseClosedException())
                }

                override fun onFailure(eventSource: EventSource, t: Throwable?, response: Response?) {
                    val error = when {
                        response != null && !response.isSuccessful -> SseHttpException(response.code)
                        t != null -> t
                        else -> SseClosedException()
                    }
                    close(error)
                }
            },
        )
        // Không còn ai collect (rời màn hình, app vào nền quá 5 giây) → đóng kết nối
        awaitClose { source.cancel() }
    }.retryWhen { cause, attempt ->
        val retry = when (cause) {
            is SseHttpException -> cause.retryable
            is IOException -> true
            else -> false
        }
        if (retry) {
            // retryWhen chạy trên FlowCollector: báo cho người nghe biết trước khi chờ nối lại
            emit(StreamEvent.Closed)
            delay(backoffMs(attempt))
        }
        retry
    }

    /** Gateway gửi `data: {"data": <message>}`; chấp nhận cả message không bọc. */
    internal fun parseMessage(data: String): ChatMessageDto? = try {
        val root = JsonParser.parseString(data).asJsonObject
        val payload = root.get("data")?.takeIf { it.isJsonObject } ?: root
        gson.fromJson(payload, ChatMessageDto::class.java)?.takeIf { it.id > 0 }
    } catch (_: Exception) {
        null
    }

    companion object {
        /** 1s, 2s, 4s, 8s, 16s, rồi 30s mãi: không dội server khi nó đang sập. */
        fun backoffMs(attempt: Long): Long =
            if (attempt >= 5) 30_000L else (1_000L shl attempt.toInt()).coerceAtMost(30_000L)
    }
}
