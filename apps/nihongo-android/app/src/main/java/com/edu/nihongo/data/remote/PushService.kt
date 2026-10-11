package com.edu.nihongo.data.remote

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.edu.nihongo.utils.runCatchingCancellable
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.pushStore by preferencesDataStore("push_prefs")

interface PushRegistrar {
    suspend fun registerAfterLogin()
    suspend fun unregisterOnLogout()
}

/**
 * Push trên Android cần token FCM thật. App chưa tích hợp Firebase và backend hiện chỉ gửi
 * qua APNs (`platform = "ios"`), nên ở đây KHÔNG đăng ký gì.
 *
 * Bản cũ gửi `"android-" + ANDROID_ID` làm "token": server lưu được nhưng không push được,
 * lại làm rác bảng PushDeviceToken. Lần login sau, hàm này gỡ token giả đó khỏi server.
 *
 * Để bật push thật: tạo Firebase project + google-services.json, thêm firebase-messaging,
 * lấy `FirebaseMessaging.getInstance().token`, lưu vào [tokenKey], gọi `pushApi.register`,
 * xử lý `onNewToken`, xin quyền POST_NOTIFICATIONS (Android 13+), và thêm bộ gửi FCM ở backend.
 */
@Singleton
class PushService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val pushApi: PushApi,
) : PushRegistrar {
    private val tokenKey = stringPreferencesKey("device_token")

    override suspend fun registerAfterLogin() {
        removeLegacyFakeToken()
    }

    override suspend fun unregisterOnLogout() {
        val token = storedToken() ?: return
        runCatchingCancellable { pushApi.unregister(PushUnregisterRequest(token)) }
        context.pushStore.edit { it.remove(tokenKey) }
    }

    private suspend fun removeLegacyFakeToken() {
        val token = storedToken() ?: return
        if (!token.startsWith(LEGACY_FAKE_PREFIX)) return
        runCatchingCancellable { pushApi.unregister(PushUnregisterRequest(token)) }
            .onSuccess { context.pushStore.edit { it.remove(tokenKey) } }
    }

    private suspend fun storedToken(): String? =
        context.pushStore.data.map { it[tokenKey] }.first()

    private companion object {
        const val LEGACY_FAKE_PREFIX = "android-"
    }
}
