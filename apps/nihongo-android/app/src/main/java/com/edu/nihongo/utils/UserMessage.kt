package com.edu.nihongo.utils

import retrofit2.HttpException
import java.io.IOException

/**
 * Đổi lỗi kỹ thuật thành câu người học hiểu được. Không bao giờ hiện thẳng exception
 * ("Failed to connect to /10.0.2.2:8080") lên màn hình.
 */
fun Throwable.userMessage(): String = when (this) {
    is HttpException -> when (code()) {
        401, 403 -> "Phiên đăng nhập đã hết hạn. Đăng nhập lại nhé."
        404 -> "Không tìm thấy dữ liệu."
        429 -> "Bạn thao tác hơi nhanh, thử lại sau ít phút."
        in 500..599 -> "Máy chủ đang gặp sự cố, thử lại sau."
        else -> "Có lỗi xảy ra (mã ${code()})."
    }
    // Retrofit ném IOException khi không kết nối được, hết thời gian chờ, mất mạng giữa chừng
    is IOException -> "Không có kết nối mạng."
    else -> message?.takeIf { it.isNotBlank() } ?: "Có lỗi xảy ra."
}
