package com.edu.nihongo.domain.payment

/** Gói trả phí hiển thị trên màn Premium. */
data class PremiumPlan(
    val plan: String,
    val displayName: String,
    val priceUsdCents: Int,
    val intervalMonths: Int,
    val trialDays: Int,
    val features: List<String>,
)

enum class IntentType { PAYMENT, SETUP }

/** Nội dung bảng Google Pay / Apple Pay. */
data class WalletSummary(
    val label: String,
    /** Số tiền trừ NGAY: 0 khi dùng thử (SetupIntent chỉ lưu ví, kỳ đầu trừ sau) */
    val amountCents: Int,
    val recurringCents: Int,
    val intervalMonths: Int,
    /** > 0: đang dùng thử, kỳ trả tiền đầu tiên bắt đầu sau số ngày này */
    val trialDays: Int,
) {
    val isTrial: Boolean get() = trialDays > 0
}

fun formatUsd(cents: Int): String = "$%d.%02d".format(cents / 100, cents % 100)

fun intervalLabel(months: Int): String = when (months) {
    1 -> "tháng"
    12 -> "năm"
    else -> "$months tháng"
}

fun walletSummary(plan: PremiumPlan, intentType: IntentType): WalletSummary {
    val price = "${formatUsd(plan.priceUsdCents)}/${intervalLabel(plan.intervalMonths)}"
    // Server trả SetupIntent khi gói có dùng thử; trialDays của gói có thể là 0 nếu cấu hình lệch
    val trialDays = if (intentType == IntentType.SETUP) plan.trialDays.coerceAtLeast(1) else 0
    return WalletSummary(
        label = if (trialDays > 0) {
            "Nihongo ${plan.displayName}: dùng thử ${plan.trialDays} ngày, sau đó $price"
        } else {
            "Nihongo ${plan.displayName} ($price)"
        },
        amountCents = if (trialDays > 0) 0 else plan.priceUsdCents,
        recurringCents = plan.priceUsdCents,
        intervalMonths = plan.intervalMonths,
        trialDays = trialDays,
    )
}

fun intentTypeOf(raw: String?): IntentType = if (raw == "setup") IntentType.SETUP else IntentType.PAYMENT

fun isActivated(plan: String?, status: String?, target: String): Boolean =
    plan == target && (status == "ACTIVE" || status == "TRIALING")

sealed interface WalletResult {
    data object Completed : WalletResult
    data object Canceled : WalletResult
    data class Failed(val message: String) : WalletResult
}
