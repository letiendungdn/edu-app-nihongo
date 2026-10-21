import PassKit
import XCTest
@testable import NihongoEDU

/// Ví giả: ghi lại lần gọi, trả kết quả định sẵn.
@MainActor
final class FakeWallet: WalletPaying {
    var result: WalletResult = .completed
    var calls: [(secret: String, summary: WalletSummary)] = []
    func isAvailable() -> Bool { true }
    func pay(config: WalletConfig, clientSecret: String, summary: WalletSummary) async -> WalletResult {
        calls.append((clientSecret, summary))
        return result
    }
}

@MainActor
final class PremiumCheckoutTests: XCTestCase {
    private var wallet: FakeWallet!
    private var checkout: PremiumCheckout!
    private let config = WalletConfig(publishableKey: "pk_test_1", merchantCountryCode: "US", currency: "usd")
    private let pro = PremiumPlan(plan: "PRO", displayName: "Pro", priceUsdCents: 1999, intervalMonths: 1,
                                  trialDays: 7, stripePriceId: "price_pro")

    override func setUp() async throws {
        let client = APIClient(session: StubURLProtocol.session, baseURL: "http://test.local/api",
                               tokens: MemoryTokenStore("tok"), allowSecureCookieOverHTTP: false)
        wallet = FakeWallet()
        checkout = PremiumCheckout(api: SubscriptionAPI(client: client), wallet: wallet,
                                   pollInterval: .zero, maxPolls: 3)
    }

    private func started(_ secret: String, _ type: String) -> StubURLProtocol.Reply {
        StubURLProtocol.json(#"{"success":true,"data":{"clientSecret":"\#(secret)","intentType":"\#(type)"}}"#, status: 201)
    }

    private func status(_ plan: String, _ status: String) -> StubURLProtocol.Reply {
        StubURLProtocol.json(#"{"success":true,"data":{"plan":"\#(plan)","status":"\#(status)","payments":[]}}"#)
    }

    func testPaymentIntent_walletChargesFullPrice_thenWaitsForWebhook() async {
        // Lần hỏi đầu webhook chưa về (vẫn FREE), lần sau đã ACTIVE
        StubURLProtocol.reset([started("pi_1_secret_x", "payment"), status("FREE", "ACTIVE"), status("PRO", "ACTIVE")])

        let outcome = await checkout.buy(pro, config: config)

        XCTAssertEqual(outcome, .activated)
        XCTAssertEqual(wallet.calls.first?.secret, "pi_1_secret_x")
        XCTAssertEqual(wallet.calls.first?.summary.amountCents, 1999)
        let start = StubURLProtocol.requests[0]
        XCTAssertEqual(start.url?.path, "/api/subscriptions")
        XCTAssertEqual(start.httpMethod, "POST")
        XCTAssertEqual(StubURLProtocol.requests.count, 3)
    }

    func testTrial_setupIntent_chargesNothingToday() async {
        StubURLProtocol.reset([started("seti_1_secret_x", "setup"), status("PRO", "TRIALING")])

        let outcome = await checkout.buy(pro, config: config)
        XCTAssertEqual(outcome, .activated)
        let summary = wallet.calls.first!.summary
        XCTAssertEqual(summary.amountCents, 0)
        XCTAssertEqual(summary.recurringCents, 1999)
        XCTAssertTrue(summary.label.contains("dùng thử 7 ngày, sau đó $19.99/tháng"))
    }

    func testAlreadySubscribed_409_doesNotOpenWallet() async {
        StubURLProtocol.reset([StubURLProtocol.json(#"{"success":false}"#, status: 409)])
        let outcome = await checkout.buy(pro, config: config)
        XCTAssertEqual(outcome, .alreadySubscribed)
        XCTAssertTrue(wallet.calls.isEmpty)
    }

    func testNotLoggedIn_refreshRejected_needsLogin() async {
        // 401 → APIClient thử refresh → server từ chối → .needsLogin
        StubURLProtocol.reset([StubURLProtocol.json("{}", status: 401), StubURLProtocol.json("{}", status: 401)])
        let outcome = await checkout.buy(pro, config: config)
        XCTAssertEqual(outcome, .needsLogin)
    }

    func testPlanChange_noClientSecret_finishesWithoutWallet() async {
        StubURLProtocol.reset([StubURLProtocol.json(
            #"{"success":true,"data":{"clientSecret":null,"intentType":null,"changedPlan":true}}"#, status: 201)])
        let outcome = await checkout.buy(pro, config: config)
        XCTAssertEqual(outcome, .activated)
        XCTAssertTrue(wallet.calls.isEmpty)
    }

    func testWalletCanceled_doesNotPoll() async {
        StubURLProtocol.reset([started("pi_1_secret_x", "payment")])
        wallet.result = .canceled
        let outcome = await checkout.buy(pro, config: config)
        XCTAssertEqual(outcome, .canceled)
        XCTAssertEqual(StubURLProtocol.requests.count, 1)
    }

    func testWebhookLate_reportsProcessing() async {
        let none = StubURLProtocol.json(#"{"success":true,"data":null}"#)
        StubURLProtocol.reset([started("pi_1_secret_x", "payment"), none, none, none])
        let outcome = await checkout.buy(pro, config: config)
        XCTAssertEqual(outcome, .processing)
    }

    func testNetworkErrorWhilePolling_keepsPolling() async {
        StubURLProtocol.reset([
            started("pi_1_secret_x", "payment"),
            StubURLProtocol.Reply(error: URLError(.notConnectedToInternet)),
            status("PRO", "ACTIVE"),
        ])
        let outcome = await checkout.buy(pro, config: config)
        XCTAssertEqual(outcome, .activated)
    }

    func testPlansFilterFreeAndUnpricedPlans() async throws {
        StubURLProtocol.reset([StubURLProtocol.json(#"""
        {"success":true,"data":[
          {"plan":"FREE","displayName":"Free","priceUsdCents":0,"stripePriceId":null,"features":[]},
          {"plan":"BASIC","displayName":"Basic","priceUsdCents":999,"stripePriceId":null},
          {"plan":"PRO","displayName":"Pro","priceUsdCents":1999,"intervalMonths":1,"trialDays":7,"stripePriceId":"price_pro","features":["a"]}
        ]}
        """#)])
        let plans = try await checkout.api.plans()
        XCTAssertEqual(plans.map(\.plan), ["PRO"])
    }

    func testApplePaySheet_trialLastItemIsZeroTotal_andDeclaresRecurringBilling() {
        let summary = walletSummary(for: pro, intentType: .setup)
        let items = ApplePayWallet.summaryItems(summary)
        // Apple Pay lấy dòng CUỐI làm tổng tiền trừ hôm nay
        XCTAssertEqual(items.last?.amount, .zero)
        XCTAssertEqual((items.first as? PKRecurringPaymentSummaryItem)?.amount, NSDecimalNumber(string: "19.99"))
        let recurring = ApplePayWallet.recurring(summary)
        XCTAssertNotNil(recurring.trialBilling)
        XCTAssertEqual(recurring.regularBilling.intervalUnit, .month)
    }

    func testApplePaySheet_annualPlanBillsYearly() {
        let annual = PremiumPlan(plan: "PRO_ANNUAL", displayName: "Pro năm", priceUsdCents: 19900, intervalMonths: 12)
        let items = ApplePayWallet.summaryItems(walletSummary(for: annual, intentType: .payment))
        let item = items.single as? PKRecurringPaymentSummaryItem
        XCTAssertEqual(item?.intervalUnit, .year)
        XCTAssertEqual(item?.intervalCount, 1)
        XCTAssertEqual(item?.amount, NSDecimalNumber(string: "199"))
    }

    func testFormatting() {
        XCTAssertEqual(formatUSD(999), "$9.99")
        XCTAssertEqual(formatUSD(10000), "$100.00")
        XCTAssertEqual(intervalLabel(12), "năm")
        XCTAssertEqual(intervalLabel(3), "3 tháng")
    }
}
