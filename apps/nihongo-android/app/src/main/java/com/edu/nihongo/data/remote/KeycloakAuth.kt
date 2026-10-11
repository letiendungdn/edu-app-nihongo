package com.edu.nihongo.data.remote

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.edu.nihongo.BuildConfig
import net.openid.appauth.AppAuthConfiguration
import net.openid.appauth.AuthorizationRequest
import net.openid.appauth.AuthorizationService
import net.openid.appauth.AuthorizationServiceConfiguration
import net.openid.appauth.ResponseTypeValues
import net.openid.appauth.connectivity.ConnectionBuilder
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

object KeycloakConfig {
    val discoveryUri: Uri =
        Uri.parse(
            "${BuildConfig.KEYCLOAK_URL.trimEnd('/')}/realms/${BuildConfig.KEYCLOAK_REALM}" +
                "/.well-known/openid-configuration",
        )
    val redirectUri: Uri = Uri.parse(BuildConfig.KEYCLOAK_REDIRECT_URI)
    val clientId: String = BuildConfig.KEYCLOAK_CLIENT_ID
}

data class KeycloakTokens(
    val accessToken: String,
    val idToken: String?,
)

/**
 * AppAuth mặc định chỉ cho HTTPS — local Keycloak (http://10.0.2.2:8080) cần builder này.
 */
private object HttpConnectionBuilder : ConnectionBuilder {
    private val CONNECTION_TIMEOUT_MS = TimeUnit.SECONDS.toMillis(15).toInt()
    private val READ_TIMEOUT_MS = TimeUnit.SECONDS.toMillis(20).toInt()

    override fun openConnection(uri: Uri): HttpURLConnection {
        val connection = URL(uri.toString()).openConnection() as HttpURLConnection
        connection.connectTimeout = CONNECTION_TIMEOUT_MS
        connection.readTimeout = READ_TIMEOUT_MS
        connection.instanceFollowRedirects = false
        return connection
    }
}

class KeycloakAuth(context: Context) {
    private val authService = AuthorizationService(
        context.applicationContext,
        AppAuthConfiguration.Builder()
            .setConnectionBuilder(HttpConnectionBuilder)
            .build(),
    )

    fun dispose() = authService.dispose()

    suspend fun fetchServiceConfig(): AuthorizationServiceConfiguration {
        // Không dùng discovery JSON từ Keycloak: issuer/endpoints trả về auth.localhost
        // (emulator không resolve được). Dùng KEYCLOAK_URL (10.0.2.2) trực tiếp.
        val base =
            "${BuildConfig.KEYCLOAK_URL.trimEnd('/')}/realms/${BuildConfig.KEYCLOAK_REALM}" +
                "/protocol/openid-connect"
        return AuthorizationServiceConfiguration(
            Uri.parse("$base/auth"),
            Uri.parse("$base/token"),
            Uri.parse("$base/userinfo"),
            Uri.parse("$base/logout"),
        )
    }

    fun createAuthIntent(config: AuthorizationServiceConfiguration): Intent {
        val request = AuthorizationRequest.Builder(
            config,
            KeycloakConfig.clientId,
            ResponseTypeValues.CODE,
            KeycloakConfig.redirectUri,
        )
            .setScopes("openid", "profile", "email")
            .setPrompt("login")
            .build()
        return authService.getAuthorizationRequestIntent(request)
    }

    /**
     * suspendCancellableCoroutine (không phải suspendCoroutine): rời màn hình giữa chừng thì
     * coroutine kết thúc ngay thay vì treo chờ mạng; callback về muộn bị bỏ qua.
     */
    suspend fun exchangeCode(intent: Intent?): KeycloakTokens =
        suspendCancellableCoroutine { cont ->
            val response = net.openid.appauth.AuthorizationResponse.fromIntent(intent ?: Intent())
            val ex = net.openid.appauth.AuthorizationException.fromIntent(intent)
            if (response == null) {
                cont.resumeWithException(ex ?: IllegalStateException("Keycloak auth bị hủy"))
                return@suspendCancellableCoroutine
            }
            authService.performTokenRequest(response.createTokenExchangeRequest()) { tokenResponse, tokenEx ->
                if (!cont.isActive) return@performTokenRequest
                val access = tokenResponse?.accessToken
                if (access.isNullOrBlank()) {
                    cont.resumeWithException(tokenEx ?: IllegalStateException("Không nhận access_token"))
                } else {
                    cont.resume(KeycloakTokens(access, tokenResponse.idToken))
                }
            }
        }
}
