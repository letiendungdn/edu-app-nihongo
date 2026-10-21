package com.edu.nihongo.presentation.premium

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edu.nihongo.data.remote.StartSubscriptionRequest
import com.edu.nihongo.data.remote.SubscriptionApi
import com.edu.nihongo.data.remote.WalletConfigDto
import com.edu.nihongo.domain.payment.IntentType
import com.edu.nihongo.domain.payment.PremiumPlan
import com.edu.nihongo.domain.payment.WalletResult
import com.edu.nihongo.domain.payment.WalletSummary
import com.edu.nihongo.domain.payment.intentTypeOf
import com.edu.nihongo.domain.payment.isActivated
import com.edu.nihongo.domain.payment.walletSummary
import com.edu.nihongo.utils.userMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import retrofit2.HttpException
import javax.inject.Inject

data class PremiumUiState(
    val loading: Boolean = true,
    val loadError: String? = null,
    val config: WalletConfigDto? = null,
    val plans: List<PremiumPlan> = emptyList(),
    /** plan đang thanh toán; khác null thì khóa các nút */
    val buying: String? = null,
    val message: String? = null,
)

sealed interface PremiumEvent {
    /** Màn hình mở bảng Google Pay bằng GooglePayLauncher rồi báo lại [PremiumViewModel.onWalletResult] */
    data class PresentWallet(
        val clientSecret: String,
        val intentType: IntentType,
        val summary: WalletSummary,
        val currency: String,
    ) : PremiumEvent

    data object NeedsLogin : PremiumEvent
}

/**
 * Mua gói bằng Google Pay:
 * 1. `POST /subscriptions` → client secret (PaymentIntent, hoặc SetupIntent nếu gói có dùng thử)
 * 2. Màn hình mở Google Pay, Stripe SDK xác nhận intent (thẻ không đi qua server của mình)
 * 3. Gói chỉ kích hoạt khi webhook Stripe về server → hỏi lại trạng thái tới khi thấy
 */
@HiltViewModel
class PremiumViewModel @Inject constructor(
    private val api: SubscriptionApi,
) : ViewModel() {
    /** Test đặt 0 để không phải chờ thật */
    internal var pollIntervalMs = 2_000L
    internal var maxPolls = 15

    private val _uiState = MutableStateFlow(PremiumUiState())
    val uiState: StateFlow<PremiumUiState> = _uiState.asStateFlow()

    private val _events = Channel<PremiumEvent>(Channel.BUFFERED)
    val events: Flow<PremiumEvent> = _events.receiveAsFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, loadError = null) }
            try {
                val config = async { api.walletConfig().data }
                val plans = async { api.plans().data.orEmpty() }
                _uiState.update {
                    it.copy(
                        loading = false,
                        config = config.await(),
                        plans = plans.await()
                            .filter { p -> p.priceUsdCents > 0 && p.stripePriceId != null }
                            .map { p ->
                                PremiumPlan(
                                    plan = p.plan,
                                    displayName = p.displayName ?: p.plan,
                                    priceUsdCents = p.priceUsdCents,
                                    intervalMonths = p.intervalMonths,
                                    trialDays = p.trialDays,
                                    features = p.features.orEmpty(),
                                )
                            },
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update { it.copy(loading = false, loadError = e.userMessage()) }
            }
        }
    }

    fun buy(plan: PremiumPlan) {
        val config = _uiState.value.config ?: return
        if (_uiState.value.buying != null) return // chặn bấm 2 lần
        _uiState.update { it.copy(buying = plan.plan, message = null) }
        viewModelScope.launch {
            val start = try {
                api.start(StartSubscriptionRequest(plan.plan)).data
            } catch (e: CancellationException) {
                throw e
            } catch (e: HttpException) {
                when (e.code()) {
                    401 -> {
                        finish(null)
                        _events.send(PremiumEvent.NeedsLogin)
                    }
                    409 -> finish("Bạn đang dùng gói này rồi.")
                    else -> finish(e.userMessage())
                }
                return@launch
            } catch (e: Exception) {
                finish(e.userMessage())
                return@launch
            }

            val secret = start?.clientSecret
            if (secret == null) {
                finish("Đã đổi sang gói ${plan.displayName}.") // Stripe tự tính chênh lệch
                return@launch
            }
            val type = intentTypeOf(start.intentType)
            _events.send(PremiumEvent.PresentWallet(secret, type, walletSummary(plan, type), config.currency))
        }
    }

    fun onWalletResult(result: WalletResult) {
        val plan = _uiState.value.buying ?: return
        when (result) {
            WalletResult.Canceled -> finish(null)
            is WalletResult.Failed -> finish(result.message)
            WalletResult.Completed -> viewModelScope.launch {
                repeat(maxPolls) {
                    try {
                        val s = api.status().data
                        if (isActivated(s?.plan, s?.status, plan)) {
                            finish("Đã kích hoạt gói Premium!")
                            return@launch
                        }
                    } catch (e: CancellationException) {
                        throw e
                    } catch (_: Exception) {
                        // Mạng chập chờn khi hỏi trạng thái: tiền đã trả, cứ hỏi tiếp
                    }
                    delay(pollIntervalMs)
                }
                finish("Thanh toán xong. Gói sẽ được kích hoạt trong ít phút.")
            }
        }
    }

    fun messageShown() = _uiState.update { it.copy(message = null) }

    private fun finish(message: String?) = _uiState.update { it.copy(buying = null, message = message) }
}
