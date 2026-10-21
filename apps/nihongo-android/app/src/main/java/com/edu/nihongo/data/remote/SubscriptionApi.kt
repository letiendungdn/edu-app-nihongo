package com.edu.nihongo.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

data class PremiumPlanDto(
    val plan: String,
    val displayName: String? = null,
    val priceUsdCents: Int = 0,
    val intervalMonths: Int = 1,
    val trialDays: Int = 0,
    val features: List<String>? = null,
    val stripePriceId: String? = null,
)

data class WalletConfigDto(
    val publishableKey: String,
    val merchantCountryCode: String = "US",
    val currency: String = "usd",
)

data class StartSubscriptionRequest(val plan: String)

data class StartSubscriptionResponse(
    /** null: đổi gói trên subscription đang chạy, không cần thanh toán thêm */
    val clientSecret: String? = null,
    /** "payment" (trừ tiền kỳ đầu) | "setup" (gói dùng thử: chỉ lưu ví) */
    val intentType: String? = null,
)

data class SubscriptionStatusDto(
    val plan: String? = null,
    val status: String? = null,
)

/** Các endpoint `/api/subscriptions` của gateway. Stripe nằm ở server, app chỉ xác nhận intent bằng Google Pay. */
interface SubscriptionApi {
    @GET("subscriptions/wallet-config")
    suspend fun walletConfig(): ApiEnvelope<WalletConfigDto>

    @GET("subscriptions/plans")
    suspend fun plans(): ApiEnvelope<List<PremiumPlanDto>>

    @POST("subscriptions")
    suspend fun start(@Body body: StartSubscriptionRequest): ApiEnvelope<StartSubscriptionResponse>

    @GET("subscriptions/status")
    suspend fun status(): ApiEnvelope<SubscriptionStatusDto>
}
