import 'package:dio/dio.dart';

import 'envelope.dart';

class PremiumPlan {
  const PremiumPlan({
    required this.plan,
    required this.displayName,
    required this.priceUsdCents,
    required this.intervalMonths,
    required this.trialDays,
    required this.features,
  });

  factory PremiumPlan.fromJson(Map<String, dynamic> json) => PremiumPlan(
        plan: json['plan'] as String,
        displayName: json['displayName'] as String? ?? json['plan'] as String,
        priceUsdCents: json['priceUsdCents'] as int? ?? 0,
        intervalMonths: json['intervalMonths'] as int? ?? 1,
        trialDays: json['trialDays'] as int? ?? 0,
        features: (json['features'] as List<dynamic>? ?? []).map((e) => e.toString()).toList(),
      );

  final String plan; // BASIC | PRO | PRO_ANNUAL
  final String displayName;
  final int priceUsdCents;
  final int intervalMonths;
  final int trialDays;
  final List<String> features;
}

class WalletConfig {
  const WalletConfig({
    required this.publishableKey,
    required this.merchantCountryCode,
    required this.currency,
  });

  factory WalletConfig.fromJson(Map<String, dynamic> json) => WalletConfig(
        publishableKey: json['publishableKey'] as String,
        merchantCountryCode: json['merchantCountryCode'] as String? ?? 'US',
        currency: json['currency'] as String? ?? 'usd',
      );

  final String publishableKey;
  final String merchantCountryCode;
  final String currency;
}

enum IntentType { payment, setup }

class CheckoutStart {
  const CheckoutStart({this.clientSecret, this.intentType});

  factory CheckoutStart.fromJson(Map<String, dynamic> json) => CheckoutStart(
        clientSecret: json['clientSecret'] as String?,
        intentType: switch (json['intentType']) {
          'setup' => IntentType.setup,
          'payment' => IntentType.payment,
          _ => null,
        },
      );

  /// null: đổi gói trên subscription đang chạy, không cần thanh toán thêm
  final String? clientSecret;
  final IntentType? intentType;
}

class SubscriptionState {
  const SubscriptionState({required this.plan, required this.status});
  final String plan;
  final String status; // ACTIVE | TRIALING | PAST_DUE | CANCELED | PAUSED
}

/// `/api/subscriptions/*` của gateway (Stripe nằm ở server).
class SubscriptionApi {
  SubscriptionApi(this._dio);
  final Dio _dio;

  Future<WalletConfig> walletConfig() async {
    final res = await _dio.get<dynamic>('/subscriptions/wallet-config');
    return WalletConfig.fromJson(unwrapEnvelope(res.data) as Map<String, dynamic>);
  }

  /// Chỉ các gói trả phí đã có giá trên Stripe
  Future<List<PremiumPlan>> plans() async {
    final res = await _dio.get<dynamic>('/subscriptions/plans');
    final list = unwrapEnvelope(res.data) as List<dynamic>? ?? [];
    return list
        .cast<Map<String, dynamic>>()
        .where((p) => (p['priceUsdCents'] as int? ?? 0) > 0 && p['stripePriceId'] != null)
        .map(PremiumPlan.fromJson)
        .toList();
  }

  Future<CheckoutStart> start(String plan) async {
    final res = await _dio.post<dynamic>('/subscriptions', data: {'plan': plan});
    return CheckoutStart.fromJson(unwrapEnvelope(res.data) as Map<String, dynamic>);
  }

  Future<SubscriptionState?> status() async {
    final res = await _dio.get<dynamic>('/subscriptions/status');
    final data = unwrapEnvelope(res.data);
    if (data is! Map<String, dynamic>) return null;
    return SubscriptionState(
      plan: data['plan'] as String? ?? 'FREE',
      status: data['status'] as String? ?? '',
    );
  }
}
