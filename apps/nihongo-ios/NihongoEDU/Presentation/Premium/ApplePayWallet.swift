import Foundation
import PassKit
import StripeApplePay

/// Phải khớp merchant ID trong `NihongoEDU.entitlements` và trên Apple Developer
let appleMerchantID = "merchant.com.edu.nihongo"

/// Trang quản lý / hủy gói. Apple bắt buộc có khi khai báo thanh toán định kỳ trên bảng Apple Pay.
/// Override bằng biến môi trường WEB_BASE_URL (Edit Scheme → Run → Environment Variables).
let subscriptionManagementURL: URL = {
    let base = ProcessInfo.processInfo.environment["WEB_BASE_URL"].flatMap { $0.isEmpty ? nil : $0 }
        ?? "http://nihongo.localhost:8080"
    return URL(string: "\(base)/payments") ?? URL(string: "https://stripe.com")!
}()

/// Apple Pay qua `STPApplePayContext`: Apple Pay tạo PaymentMethod, Stripe SDK dùng client secret
/// của server để xác nhận PaymentIntent (hoặc SetupIntent: SDK tự nhận ra theo tiền tố `seti_`).
@MainActor
final class ApplePayWallet: NSObject, WalletPaying, ApplePayContextDelegate {
    private var clientSecret = ""
    private var continuation: CheckedContinuation<WalletResult, Never>?

    func isAvailable() -> Bool {
        StripeAPI.deviceSupportsApplePay()
    }

    func pay(config: WalletConfig, clientSecret: String, summary: WalletSummary) async -> WalletResult {
        // Khóa công khai lấy từ server: đổi khóa không cần ra bản app mới
        StripeAPI.defaultPublishableKey = config.publishableKey
        self.clientSecret = clientSecret

        let request = StripeAPI.paymentRequest(
            withMerchantIdentifier: appleMerchantID,
            country: config.merchantCountryCode,
            currency: config.currency.uppercased()
        )
        request.paymentSummaryItems = Self.summaryItems(summary)
        request.recurringPaymentRequest = Self.recurring(summary)

        guard let context = STPApplePayContext(paymentRequest: request, delegate: self) else {
            return .failed("Không mở được Apple Pay trên máy này")
        }
        return await withCheckedContinuation { cont in
            continuation = cont
            context.presentApplePay()
        }
    }

    // MARK: ApplePayContextDelegate

    func applePayContext(
        _ context: STPApplePayContext,
        didCreatePaymentMethod paymentMethod: StripeAPI.PaymentMethod,
        paymentInformation: PKPayment
    ) async throws -> String {
        clientSecret // intent đã tạo trước khi mở Apple Pay
    }

    func applePayContext(
        _ context: STPApplePayContext,
        didCompleteWith status: STPApplePayContext.PaymentStatus,
        error: Error?
    ) {
        let result: WalletResult = switch status {
        case .success: .completed
        case .userCancellation: .canceled
        case .error: .failed(error?.localizedDescription ?? "Thanh toán không thành công")
        }
        continuation?.resume(returning: result)
        continuation = nil
    }

    // MARK: Nội dung bảng Apple Pay

    private static func decimal(_ cents: Int) -> NSDecimalNumber {
        NSDecimalNumber(mantissa: UInt64(cents), exponent: -2, isNegative: false)
    }

    private static func interval(_ months: Int) -> (NSCalendar.Unit, Int) {
        months % 12 == 0 ? (.year, months / 12) : (.month, months)
    }

    /// Dòng CUỐI là tổng tiền trừ hôm nay
    static func summaryItems(_ s: WalletSummary) -> [PKPaymentSummaryItem] {
        let (unit, count) = interval(s.intervalMonths)
        let regular = PKRecurringPaymentSummaryItem(
            label: s.isTrial ? "Sau \(s.trialDays) ngày dùng thử" : s.label,
            amount: decimal(s.recurringCents)
        )
        regular.intervalUnit = unit
        regular.intervalCount = count
        if s.isTrial {
            regular.startDate = Calendar.current.date(byAdding: .day, value: s.trialDays, to: .now)
            return [regular, PKPaymentSummaryItem(label: s.label, amount: decimal(s.amountCents))]
        }
        return [regular]
    }

    static func recurring(_ s: WalletSummary) -> PKRecurringPaymentRequest {
        let (unit, count) = interval(s.intervalMonths)
        let regular = PKRecurringPaymentSummaryItem(label: s.label, amount: decimal(s.recurringCents))
        regular.intervalUnit = unit
        regular.intervalCount = count
        if s.isTrial {
            regular.startDate = Calendar.current.date(byAdding: .day, value: s.trialDays, to: .now)
        }
        let request = PKRecurringPaymentRequest(
            paymentDescription: s.label,
            regularBilling: regular,
            managementURL: subscriptionManagementURL
        )
        if s.isTrial {
            let trial = PKRecurringPaymentSummaryItem(label: "Dùng thử", amount: .zero)
            trial.endDate = regular.startDate
            request.trialBilling = trial
        }
        return request
    }
}
