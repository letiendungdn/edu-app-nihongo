import PassKit
import SwiftUI

@Observable
@MainActor
final class PremiumViewModel {
    var plans: [PremiumPlan] = []
    var config: WalletConfig?
    var isLoading = true
    var loadError: String?
    /// plan đang thanh toán; khác nil thì khóa các nút
    var buying: String?
    var message: String?
    var needsLogin = false

    @ObservationIgnored let api: SubscriptionAPI
    @ObservationIgnored let wallet: WalletPaying

    init(api: SubscriptionAPI = SubscriptionAPI(), wallet: WalletPaying? = nil) {
        self.api = api
        self.wallet = wallet ?? ApplePayWallet()
    }

    var walletAvailable: Bool { wallet.isAvailable() }

    func load() async {
        isLoading = true
        loadError = nil
        defer { isLoading = false }
        do {
            async let config = api.walletConfig()
            async let plans = api.plans()
            (self.config, self.plans) = try await (config, plans)
        } catch {
            loadError = error.userMessage
        }
    }

    func buy(_ plan: PremiumPlan) async {
        guard let config, buying == nil else { return } // chặn bấm 2 lần
        buying = plan.plan
        defer { buying = nil }

        switch await PremiumCheckout(api: api, wallet: wallet).buy(plan, config: config) {
        case .activated: message = "Đã kích hoạt gói \(plan.displayName)!"
        case .processing: message = "Thanh toán xong. Gói sẽ được kích hoạt trong ít phút."
        case .canceled: break
        case .alreadySubscribed: message = "Bạn đang dùng gói này rồi."
        case .needsLogin: needsLogin = true
        case .failed(let m): message = m
        }
    }
}

struct PremiumView: View {
    @State private var model = PremiumViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if model.isLoading {
                ProgressView()
            } else if let error = model.loadError {
                ContentUnavailableView {
                    Label("Không tải được gói", systemImage: "wifi.exclamationmark")
                } description: {
                    Text(error)
                } actions: {
                    Button("Thử lại") { Task { await model.load() } }
                }
            } else {
                list
            }
        }
        .navigationTitle("Nâng cấp Premium")
        .task { await model.load() }
        .alert(model.message ?? "", isPresented: Binding(
            get: { model.message != nil },
            set: { if !$0 { model.message = nil } }
        )) {}
        .navigationDestination(isPresented: $model.needsLogin) { LoginView() }
    }

    private var list: some View {
        ScrollView {
            VStack(spacing: 12) {
                if !model.walletAvailable {
                    Text("Máy này chưa có Apple Pay hoặc chưa thêm thẻ vào Wallet.")
                        .font(.callout)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))
                }
                ForEach(model.plans) { plan in
                    PlanCard(
                        plan: plan,
                        enabled: model.walletAvailable && model.buying == nil,
                        loading: model.buying == plan.plan
                    ) {
                        Task { await model.buy(plan) }
                    }
                }
            }
            .padding(16)
        }
        .background(Color(.systemGroupedBackground))
    }
}

private struct PlanCard: View {
    let plan: PremiumPlan
    let enabled: Bool
    let loading: Bool
    let onBuy: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(plan.displayName).font(.title2.bold())
            Text("\(formatUSD(plan.priceUsdCents)) / \(intervalLabel(plan.intervalMonths))"
                 + (plan.trialDays > 0 ? " · dùng thử \(plan.trialDays) ngày" : ""))
                .font(.headline)
            ForEach(plan.features, id: \.self) { Text("• \($0)").font(.subheadline) }
            Group {
                if loading {
                    ProgressView().frame(maxWidth: .infinity)
                } else {
                    // Nút chính thức của Apple Pay (Apple từ chối app tự vẽ nút Apple Pay)
                    PayWithApplePayButton(.subscribe, action: onBuy)
                        .payWithApplePayButtonStyle(.black)
                        .disabled(!enabled)
                        .opacity(enabled ? 1 : 0.4)
                }
            }
            .frame(height: 48)
            .padding(.top, 6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
    }
}
