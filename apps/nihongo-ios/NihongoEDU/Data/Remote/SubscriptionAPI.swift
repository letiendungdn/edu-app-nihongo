import Foundation

struct PremiumPlan: Decodable, Equatable, Identifiable, Sendable {
    var plan: String            // BASIC | PRO | PRO_ANNUAL
    var displayName: String
    var priceUsdCents: Int
    var intervalMonths: Int
    var trialDays: Int
    var features: [String]
    var stripePriceId: String?

    var id: String { plan }

    enum CodingKeys: String, CodingKey {
        case plan, displayName, priceUsdCents, intervalMonths, trialDays, features, stripePriceId
    }

    init(plan: String, displayName: String, priceUsdCents: Int, intervalMonths: Int = 1,
         trialDays: Int = 0, features: [String] = [], stripePriceId: String? = nil) {
        self.plan = plan
        self.displayName = displayName
        self.priceUsdCents = priceUsdCents
        self.intervalMonths = intervalMonths
        self.trialDays = trialDays
        self.features = features
        self.stripePriceId = stripePriceId
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        plan = try c.decode(String.self, forKey: .plan)
        displayName = try c.decodeIfPresent(String.self, forKey: .displayName) ?? plan
        priceUsdCents = try c.decodeIfPresent(Int.self, forKey: .priceUsdCents) ?? 0
        intervalMonths = try c.decodeIfPresent(Int.self, forKey: .intervalMonths) ?? 1
        trialDays = try c.decodeIfPresent(Int.self, forKey: .trialDays) ?? 0
        features = try c.decodeIfPresent([String].self, forKey: .features) ?? []
        stripePriceId = try c.decodeIfPresent(String.self, forKey: .stripePriceId)
    }
}

struct WalletConfig: Decodable, Equatable, Sendable {
    var publishableKey: String
    var merchantCountryCode: String
    var currency: String
}

enum IntentType: String, Decodable, Sendable {
    case payment, setup
}

struct CheckoutStart: Decodable, Sendable {
    /// nil: đổi gói trên subscription đang chạy, không cần thanh toán thêm
    var clientSecret: String?
    var intentType: IntentType?
}

struct SubscriptionState: Decodable, Equatable, Sendable {
    var plan: String
    var status: String // ACTIVE | TRIALING | PAST_DUE | CANCELED | PAUSED
}

/// Các endpoint `/api/subscriptions` của gateway. Stripe nằm ở server, app chỉ xác nhận intent bằng Apple Pay.
struct SubscriptionAPI {
    var client: APIClient = .shared

    func walletConfig() async throws -> WalletConfig {
        let (data, _) = try await client.send(try client.request("subscriptions/wallet-config"))
        guard let config = try JSONDecoder().decode(Envelope<WalletConfig>.self, from: data).data else {
            throw APIError.decodingFailed
        }
        return config
    }

    /// Chỉ các gói trả phí đã có giá trên Stripe
    func plans() async throws -> [PremiumPlan] {
        let (data, _) = try await client.send(try client.request("subscriptions/plans"))
        let plans = try JSONDecoder().decode(Envelope<[PremiumPlan]>.self, from: data).data ?? []
        return plans.filter { $0.priceUsdCents > 0 && $0.stripePriceId != nil }
    }

    func start(plan: String) async throws -> CheckoutStart {
        let req = try client.request("subscriptions", method: "POST", body: ["plan": plan])
        let (data, _) = try await client.send(req)
        guard let start = try JSONDecoder().decode(Envelope<CheckoutStart>.self, from: data).data else {
            throw APIError.decodingFailed
        }
        return start
    }

    /// nil khi chưa từng có subscription
    func status() async throws -> SubscriptionState? {
        let (data, _) = try await client.send(try client.request("subscriptions/status"))
        return try JSONDecoder().decode(Envelope<SubscriptionState>.self, from: data).data
    }
}
