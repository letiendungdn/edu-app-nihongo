package com.edu.nihongo.presentation.premium

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.edu.nihongo.BuildConfig
import com.edu.nihongo.data.remote.WalletConfigDto
import com.edu.nihongo.domain.payment.IntentType
import com.edu.nihongo.domain.payment.PremiumPlan
import com.edu.nihongo.domain.payment.WalletResult
import com.edu.nihongo.domain.payment.formatUsd
import com.edu.nihongo.domain.payment.intervalLabel
import com.google.pay.button.ButtonType
import com.google.pay.button.PayButton
import com.stripe.android.PaymentConfiguration
import com.stripe.android.googlepaylauncher.GooglePayEnvironment
import com.stripe.android.googlepaylauncher.GooglePayLauncher
import com.stripe.android.googlepaylauncher.rememberGooglePayLauncher

/** Phương thức thẻ cho nút Google Pay (chỉ để vẽ nút đúng; Stripe tự cấu hình khi thanh toán). */
private const val ALLOWED_PAYMENT_METHODS = """[{"type":"CARD","parameters":{"allowedAuthMethods":["PAN_ONLY","CRYPTOGRAM_3DS"],"allowedCardNetworks":["AMEX","DISCOVER","MASTERCARD","VISA"]}}]"""

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PremiumScreen(
    onBack: () -> Unit,
    onLogin: () -> Unit,
    viewModel: PremiumViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.message) {
        state.message?.let {
            snackbar.showSnackbar(it)
            viewModel.messageShown()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Nâng cấp Premium") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        val config = state.config
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator()
            }
            config == null -> Column(
                Modifier.fillMaxSize().padding(padding).padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(state.loadError ?: "Không tải được gói.")
                Button(onClick = viewModel::load, modifier = Modifier.padding(top = 12.dp)) { Text("Thử lại") }
            }
            // Chỉ tạo GooglePayLauncher khi đã có publishable key
            else -> PlanList(
                config = config,
                state = state,
                padding = padding,
                viewModel = viewModel,
                onLogin = onLogin,
            )
        }
    }
}

@Composable
private fun PlanList(
    config: WalletConfigDto,
    state: PremiumUiState,
    padding: PaddingValues,
    viewModel: PremiumViewModel,
    onLogin: () -> Unit,
) {
    val context = LocalContext.current
    // Khóa công khai lấy từ server: đổi khóa không cần ra bản app mới
    remember(config.publishableKey) {
        PaymentConfiguration.init(context.applicationContext, config.publishableKey)
    }
    var walletReady by remember { mutableStateOf<Boolean?>(null) }

    val launcher = rememberGooglePayLauncher(
        config = GooglePayLauncher.Config(
            // Bản debug: môi trường test của Google Pay (không cần hồ sơ merchant Google, thẻ giả)
            environment = if (BuildConfig.DEBUG) GooglePayEnvironment.Test else GooglePayEnvironment.Production,
            merchantCountryCode = config.merchantCountryCode,
            merchantName = "Nihongo EDU",
        ),
        readyCallback = { walletReady = it },
        resultCallback = { result ->
            viewModel.onWalletResult(
                when (result) {
                    GooglePayLauncher.Result.Completed -> WalletResult.Completed
                    GooglePayLauncher.Result.Canceled -> WalletResult.Canceled
                    is GooglePayLauncher.Result.Failed ->
                        WalletResult.Failed(result.error.message ?: "Thanh toán không thành công")
                }
            )
        },
    )

    LaunchedEffect(viewModel) {
        viewModel.events.collect { event ->
            when (event) {
                is PremiumEvent.PresentWallet -> when (event.intentType) {
                    IntentType.PAYMENT -> launcher.presentForPaymentIntent(
                        clientSecret = event.clientSecret,
                        label = event.summary.label,
                    )
                    // Dùng thử: SetupIntent không có số tiền, Google Pay cần mã tiền tệ
                    IntentType.SETUP -> launcher.presentForSetupIntent(
                        clientSecret = event.clientSecret,
                        currencyCode = event.currency.uppercase(),
                        amount = 0L,
                        label = event.summary.label,
                    )
                }
                PremiumEvent.NeedsLogin -> onLogin()
            }
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (walletReady == false) {
            item {
                Card(Modifier.fillMaxWidth()) {
                    Text(
                        "Máy này chưa dùng được Google Pay (chưa có Google Play services hoặc chưa thêm thẻ vào ví).",
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }
        }
        items(state.plans, key = { it.plan }) { plan ->
            PlanCard(
                plan = plan,
                enabled = walletReady == true && state.buying == null,
                loading = state.buying == plan.plan,
                onBuy = { viewModel.buy(plan) },
            )
        }
    }
}

@Composable
private fun PlanCard(plan: PremiumPlan, enabled: Boolean, loading: Boolean, onBuy: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(plan.displayName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                "${formatUsd(plan.priceUsdCents)} / ${intervalLabel(plan.intervalMonths)}" +
                    if (plan.trialDays > 0) " · dùng thử ${plan.trialDays} ngày" else "",
                style = MaterialTheme.typography.titleMedium,
            )
            plan.features.forEach { Text("• $it", style = MaterialTheme.typography.bodyMedium) }
            Box(Modifier.fillMaxWidth().padding(top = 8.dp).height(48.dp), Alignment.Center) {
                if (loading) {
                    CircularProgressIndicator()
                } else {
                    // Nút chính thức của Google Pay (quy định thương hiệu của Google)
                    PayButton(
                        onClick = onBuy,
                        allowedPaymentMethods = ALLOWED_PAYMENT_METHODS,
                        type = ButtonType.Subscribe,
                        enabled = enabled,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}
