import Foundation

/// Nội dung bảng Apple Pay.
struct WalletSummary: Equatable, Sendable {
    var label: String
    /// Số tiền trừ NGAY: 0 khi dùng thử (SetupIntent chỉ lưu ví, kỳ đầu trừ sau)
    var amountCents: Int
    var recurringCents: Int
    var intervalMonths: Int
    /// > 0: đang dùng thử, kỳ trả tiền đầu tiên bắt đầu sau số ngày này
    var trialDays: Int

    var isTrial: Bool { trialDays > 0 }
}

func formatUSD(_ cents: Int) -> String { String(format: "$%d.%02d", cents / 100, cents % 100) }

func intervalLabel(_ months: Int) -> String {
    switch months {
    case 1: "tháng"
    case 12: "năm"
    default: "\(months) tháng"
    }
}

func walletSummary(for plan: PremiumPlan, intentType: IntentType) -> WalletSummary {
    let price = "\(formatUSD(plan.priceUsdCents))/\(intervalLabel(plan.intervalMonths))"
    // Server trả SetupIntent khi gói có dùng thử; trialDays của gói có thể là 0 nếu cấu hình lệch
    let trialDays = intentType == .setup ? max(plan.trialDays, 1) : 0
    return WalletSummary(
        label: trialDays > 0
            ? "Nihongo \(plan.displayName): dùng thử \(plan.trialDays) ngày, sau đó \(price)"
            : "Nihongo \(plan.displayName) (\(price))",
        amountCents: trialDays > 0 ? 0 : plan.priceUsdCents,
        recurringCents: plan.priceUsdCents,
        intervalMonths: plan.intervalMonths,
        trialDays: trialDays
    )
}

func isActivated(_ state: SubscriptionState?, plan: String) -> Bool {
    guard let state else { return false }
    return state.plan == plan && (state.status == "ACTIVE" || state.status == "TRIALING")
}

enum WalletResult: Equatable, Sendable {
    case completed, canceled
    case failed(String)
}

/// Apple Pay. Tách protocol để test luồng mà không cần ví thật.
@MainActor
protocol WalletPaying {
    func isAvailable() -> Bool
    func pay(config: WalletConfig, clientSecret: String, summary: WalletSummary) async -> WalletResult
}

enum CheckoutOutcome: Equatable {
    case activated
    /// Ví đã trả tiền xong nhưng webhook chưa kịp kích hoạt gói trong thời gian chờ
    case processing
    case canceled
    case alreadySubscribed
    case needsLogin
    case failed(String)
}

/// Mua gói Premium bằng Apple Pay:
/// 1. `POST /subscriptions` → client secret (PaymentIntent, hoặc SetupIntent nếu gói có dùng thử)
/// 2. Apple Pay + Stripe SDK xác nhận intent đó (thẻ không đi qua server của mình)
/// 3. Gói chỉ kích hoạt khi webhook Stripe về server → hỏi lại trạng thái tới khi thấy
@MainActor
struct PremiumCheckout {
    var api: SubscriptionAPI
    var wallet: WalletPaying
    var pollInterval: Duration = .seconds(2)
    var maxPolls = 15

    func buy(_ plan: PremiumPlan, config: WalletConfig) async -> CheckoutOutcome {
        let start: CheckoutStart
        do {
            start = try await api.start(plan: plan.plan)
        } catch APIError.badStatus(401) {
            return .needsLogin
        } catch APIError.badStatus(409) {
            return .alreadySubscribed
        } catch {
            return .failed(error.userMessage)
        }

        // Đổi gói: Stripe tự tính chênh lệch trên subscription đang chạy
        guard let secret = start.clientSecret else { return .activated }

        let summary = walletSummary(for: plan, intentType: start.intentType ?? .payment)
        switch await wallet.pay(config: config, clientSecret: secret, summary: summary) {
        case .canceled: return .canceled
        case .failed(let message): return .failed(message)
        case .completed: break
        }

        for _ in 0..<maxPolls {
            // Mạng chập chờn khi hỏi trạng thái: tiền đã trả, cứ hỏi tiếp
            if let state = try? await api.status(), isActivated(state, plan: plan.plan) {
                return .activated
            }
            try? await Task.sleep(for: pollInterval)
        }
        return .processing
    }
}
