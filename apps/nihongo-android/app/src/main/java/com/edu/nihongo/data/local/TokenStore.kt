package com.edu.nihongo.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

internal val Context.tokenDataStore: DataStore<Preferences> by preferencesDataStore("auth")

/**
 * Token đăng nhập, mã hóa bằng khóa trong Android Keystore ([TokenCodec]).
 *
 * Bản cũ lưu dạng thường trong khi `allowBackup="true"`: Auto Backup đưa file này lên Google Drive
 * và khôi phục sang máy khác → refresh token rời khỏi máy. Giờ file bị loại khỏi bản sao lưu
 * (res/xml/backup_rules.xml, data_extraction_rules.xml) VÀ được mã hóa.
 */
@Singleton
class TokenStore @Inject constructor(
    @ApplicationContext private val context: Context,
    cipher: TokenCipher,
) : TokenStorage {
    private val codec = TokenCodec(cipher)
    private val accessKey = stringPreferencesKey("access_token")
    private val refreshCookieKey = stringPreferencesKey("refresh_cookie")

    // Interceptor đọc token ở MỖI request: giải mã bằng Keystore một lần rồi giữ trong RAM
    private val cache = java.util.concurrent.ConcurrentHashMap<String, String>()

    override suspend fun save(token: String) = write(accessKey, token)

    override suspend fun clear() = remove(accessKey)

    override suspend fun get(): String? = read(accessKey)

    override suspend fun getRefreshCookie(): String? = read(refreshCookieKey)

    override suspend fun saveRefreshCookie(raw: String) = write(refreshCookieKey, raw)

    override suspend fun clearRefreshCookie() = remove(refreshCookieKey)

    private suspend fun write(key: Preferences.Key<String>, value: String) {
        val encoded = codec.encode(value)
        context.tokenDataStore.edit { it[key] = encoded }
        cache[key.name] = value
    }

    private suspend fun remove(key: Preferences.Key<String>) {
        cache.remove(key.name)
        context.tokenDataStore.edit { it.remove(key) }
    }

    private suspend fun read(key: Preferences.Key<String>): String? {
        cache[key.name]?.let { return it }
        val decoded = codec.decode(context.tokenDataStore.data.map { it[key] }.first())
        when {
            // Token dạng thường của bản cũ → ghi lại dạng mã hóa
            decoded.needsRewrite && decoded.value != null -> write(key, decoded.value)
            // Không giải mã được → xóa, coi như chưa đăng nhập
            decoded.needsRewrite -> remove(key)
            decoded.value != null -> cache[key.name] = decoded.value
        }
        return decoded.value
    }
}
