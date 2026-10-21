package com.edu.nihongo.presentation.premium

import com.edu.nihongo.data.remote.ApiEnvelope
import com.edu.nihongo.data.remote.PremiumPlanDto
import com.edu.nihongo.data.remote.StartSubscriptionRequest
import com.edu.nihongo.data.remote.StartSubscriptionResponse
import com.edu.nihongo.data.remote.SubscriptionApi
import com.edu.nihongo.data.remote.SubscriptionStatusDto
import com.edu.nihongo.data.remote.WalletConfigDto
import com.edu.nihongo.domain.payment.IntentType
import com.edu.nihongo.domain.payment.WalletResult
import com.edu.nihongo.domain.payment.formatUsd
import com.edu.nihongo.domain.payment.intervalLabel
import com.edu.nihongo.testing.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException

private class FakeSubscriptionApi : SubscriptionApi {
    var startResult: () -> StartSubscriptionResponse =
        { StartSubscriptionResponse("pi_1_secret_x", "payment") }
    /** Mỗi lần hỏi trạng thái lấy một phần tử; hết danh sách thì giữ phần tử cuối */
    var statuses: MutableList<() -> SubscriptionStatusDto?> = mutableListOf({ SubscriptionStatusDto("PRO", "ACTIVE") })
    val started = mutableListOf<String>()
    var statusCalls = 0

    override suspend fun walletConfig() = ApiEnvelope(true, WalletConfigDto("pk_test_1", "US", "usd"))

    override suspend fun plans() = ApiEnvelope(
        true,
        listOf(
            PremiumPlanDto("FREE", "Free", 0),
            PremiumPlanDto("BASIC", "Basic", 999, stripePriceId = null), // chưa có giá Stripe
            PremiumPlanDto("PRO", "Pro", 1999, 1, 7, listOf("SRS không giới hạn"), "price_pro"),
        ),
    )

    override suspend fun start(body: StartSubscriptionRequest): ApiEnvelope<StartSubscriptionResponse> {
        started += body.plan
        return ApiEnvelope(true, startResult())
    }

    override suspend fun status(): ApiEnvelope<SubscriptionStatusDto> {
        statusCalls++
        val next = if (statuses.size > 1) statuses.removeAt(0) else statuses.first()
        return ApiEnvelope(true, next())
    }
}

private fun httpError(code: Int) =
    HttpException(Response.error<Any>(code, "{}".toResponseBody(null)))

@OptIn(ExperimentalCoroutinesApi::class)
class PremiumViewModelTest {
    @get:Rule val main = MainDispatcherRule()

    private val api = FakeSubscriptionApi()

    private fun vm() = PremiumViewModel(api).apply {
        pollIntervalMs = 0
        maxPolls = 3
    }

    @Test
    fun load_keepsOnlyPaidPlansWithStripePrice() = runTest(main.dispatcher) {
        val vm = vm()
        advanceUntilIdle()
        assertEquals(listOf("PRO"), vm.uiState.value.plans.map { it.plan })
        assertEquals("pk_test_1", vm.uiState.value.config?.publishableKey)
    }

    @Test
    fun paymentIntent_presentsWalletWithFullPrice_thenWaitsForWebhook() = runTest(main.dispatcher) {
        // Lần hỏi đầu webhook chưa về (vẫn FREE), lần sau đã ACTIVE
        api.statuses = mutableListOf({ SubscriptionStatusDto("FREE", "ACTIVE") }, { SubscriptionStatusDto("PRO", "ACTIVE") })
        val vm = vm()
        advanceUntilIdle()

        vm.buy(vm.uiState.value.plans.single())
        advanceUntilIdle()
        val event = vm.events.first() as PremiumEvent.PresentWallet
        assertEquals("pi_1_secret_x", event.clientSecret)
        assertEquals(IntentType.PAYMENT, event.intentType)
        assertEquals(1999, event.summary.amountCents)
        assertEquals("PRO", vm.uiState.value.buying)

        vm.onWalletResult(WalletResult.Completed)
        advanceUntilIdle()
        assertEquals(2, api.statusCalls)
        assertEquals("Đã kích hoạt gói Premium!", vm.uiState.value.message)
        assertNull(vm.uiState.value.buying)
    }

    @Test
    fun trial_setupIntent_chargesNothingToday() = runTest(main.dispatcher) {
        api.startResult = { StartSubscriptionResponse("seti_1_secret_x", "setup") }
        val vm = vm()
        advanceUntilIdle()

        vm.buy(vm.uiState.value.plans.single())
        advanceUntilIdle()
        val event = vm.events.first() as PremiumEvent.PresentWallet
        assertEquals(IntentType.SETUP, event.intentType)
        assertEquals(0, event.summary.amountCents)
        assertEquals("usd", event.currency)
        assertTrue(event.summary.label.contains("dùng thử 7 ngày, sau đó $19.99/tháng"))
    }

    @Test
    fun alreadySubscribed_409_showsMessage_noWallet() = runTest(main.dispatcher) {
        api.startResult = { throw httpError(409) }
        val vm = vm()
        advanceUntilIdle()

        vm.buy(vm.uiState.value.plans.single())
        advanceUntilIdle()
        assertEquals("Bạn đang dùng gói này rồi.", vm.uiState.value.message)
        assertNull(vm.uiState.value.buying)
    }

    @Test
    fun notLoggedIn_401_sendsNeedsLogin() = runTest(main.dispatcher) {
        api.startResult = { throw httpError(401) }
        val vm = vm()
        advanceUntilIdle()

        vm.buy(vm.uiState.value.plans.single())
        advanceUntilIdle()
        assertEquals(PremiumEvent.NeedsLogin, vm.events.first())
    }

    @Test
    fun planChange_withoutClientSecret_finishesWithoutWallet() = runTest(main.dispatcher) {
        api.startResult = { StartSubscriptionResponse(null, null) }
        val vm = vm()
        advanceUntilIdle()

        vm.buy(vm.uiState.value.plans.single())
        advanceUntilIdle()
        assertEquals("Đã đổi sang gói Pro.", vm.uiState.value.message)
        assertNull(vm.uiState.value.buying)
    }

    @Test
    fun doubleTap_startsOnlyOneCheckout() = runTest(main.dispatcher) {
        val vm = vm()
        advanceUntilIdle()
        val plan = vm.uiState.value.plans.single()

        vm.buy(plan)
        vm.buy(plan)
        advanceUntilIdle()
        assertEquals(listOf("PRO"), api.started)
    }

    @Test
    fun walletCanceled_unlocksButtons_withoutPolling() = runTest(main.dispatcher) {
        val vm = vm()
        advanceUntilIdle()
        vm.buy(vm.uiState.value.plans.single())
        advanceUntilIdle()

        vm.onWalletResult(WalletResult.Canceled)
        advanceUntilIdle()
        assertNull(vm.uiState.value.buying)
        assertNull(vm.uiState.value.message)
        assertEquals(0, api.statusCalls)
    }

    @Test
    fun webhookLate_reportsProcessing_notError() = runTest(main.dispatcher) {
        api.statuses = mutableListOf({ null })
        val vm = vm()
        advanceUntilIdle()
        vm.buy(vm.uiState.value.plans.single())
        advanceUntilIdle()

        vm.onWalletResult(WalletResult.Completed)
        advanceUntilIdle()
        assertEquals(3, api.statusCalls)
        assertEquals("Thanh toán xong. Gói sẽ được kích hoạt trong ít phút.", vm.uiState.value.message)
    }

    @Test
    fun networkErrorWhilePolling_keepsPolling() = runTest(main.dispatcher) {
        api.statuses = mutableListOf({ throw IOException("offline") }, { SubscriptionStatusDto("PRO", "TRIALING") })
        val vm = vm()
        advanceUntilIdle()
        vm.buy(vm.uiState.value.plans.single())
        advanceUntilIdle()

        vm.onWalletResult(WalletResult.Completed)
        advanceUntilIdle()
        assertEquals("Đã kích hoạt gói Premium!", vm.uiState.value.message)
    }

    @Test
    fun formatting() {
        assertEquals("$9.99", formatUsd(999))
        assertEquals("$100.00", formatUsd(10000))
        assertEquals("tháng", intervalLabel(1))
        assertEquals("năm", intervalLabel(12))
        assertEquals("3 tháng", intervalLabel(3))
    }
}
