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

private val Context.tokenDataStore: DataStore<Preferences> by preferencesDataStore("auth")

@Singleton
class TokenStore @Inject constructor(
    @ApplicationContext private val context: Context,
) : TokenStorage {
    private val accessKey = stringPreferencesKey("access_token")
    private val refreshCookieKey = stringPreferencesKey("refresh_cookie")

    override suspend fun save(token: String) {
        context.tokenDataStore.edit { it[accessKey] = token }
    }

    override suspend fun clear() {
        context.tokenDataStore.edit { it.remove(accessKey) }
    }

    override suspend fun get(): String? = read(accessKey)

    override suspend fun getRefreshCookie(): String? = read(refreshCookieKey)

    override suspend fun saveRefreshCookie(raw: String) {
        context.tokenDataStore.edit { it[refreshCookieKey] = raw }
    }

    override suspend fun clearRefreshCookie() {
        context.tokenDataStore.edit { it.remove(refreshCookieKey) }
    }

    private suspend fun read(key: Preferences.Key<String>): String? =
        context.tokenDataStore.data.map { it[key] }.first()
}
