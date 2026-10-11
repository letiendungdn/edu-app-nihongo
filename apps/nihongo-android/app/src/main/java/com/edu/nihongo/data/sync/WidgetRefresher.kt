package com.edu.nihongo.data.sync

/**
 * Báo widget màn hình chính vẽ lại số thẻ cần ôn. Interface nằm ở data để Worker và repository
 * không phụ thuộc Glance (presentation); bản thật ở presentation/widget.
 */
interface WidgetRefresher {
    suspend fun refresh()
}
