package com.edu.nihongo.data

import kotlinx.coroutines.flow.Flow

/** Trạng thái mạng. Interface để repository test được bằng bản giả, không cần Android. */
interface NetworkStatus {
    fun isOnline(): Boolean
    val isOnlineFlow: Flow<Boolean>
}
