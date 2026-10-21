import 'package:flutter/foundation.dart';
import 'package:flutter_stripe/flutter_stripe.dart';

import '../remote/subscription_api.dart';
import 'premium_checkout.dart';

/// Phải khớp merchant ID trong `ios/Runner/Runner.entitlements` và trên Apple Developer
const appleMerchantId = 'merchant.com.edu.nihongo';

/// Bản debug dùng môi trường test của Google Pay (không cần hồ sơ merchant Google, thẻ giả)
const _googlePayTestEnv = !kReleaseMode;

class StripeWalletPayer implements WalletPayer {
  String? _appliedKey;

  Future<void> _ensureInit(WalletConfig config) async {
    if (_appliedKey == config.publishableKey) return;
    Stripe.publishableKey = config.publishableKey;
    Stripe.merchantIdentifier = appleMerchantId;
    await Stripe.instance.applySettings();
    _appliedKey = config.publishableKey;
  }

  @override
  Future<bool> isAvailable(WalletConfig config) async {
    // Web: flutter_stripe cần thêm flutter_stripe_web; app web dùng trang thanh toán của nihongo-web
    if (kIsWeb) return false;
    if (defaultTargetPlatform != TargetPlatform.iOS &&
        defaultTargetPlatform != TargetPlatform.android) {
      return false;
    }
    try {
      await _ensureInit(config);
      return await Stripe.instance.isPlatformPaySupported(
        googlePay: const IsGooglePaySupportedParams(testEnv: _googlePayTestEnv),
      );
    } catch (_) {
      return false;
    }
  }

  @override
  Future<WalletResult> pay({
    required WalletConfig config,
    required String clientSecret,
    required IntentType intentType,
    required WalletSummary summary,
  }) async {
    try {
      await _ensureInit(config);
      final params = defaultTargetPlatform == TargetPlatform.iOS
          ? PlatformPayConfirmParams.applePay(applePay: _applePay(config, summary))
          : PlatformPayConfirmParams.googlePay(
              googlePay: GooglePayParams(
                testEnv: _googlePayTestEnv,
                merchantName: 'Nihongo EDU',
                merchantCountryCode: config.merchantCountryCode,
                currencyCode: config.currency.toUpperCase(),
              ),
            );
      if (intentType == IntentType.setup) {
        await Stripe.instance.confirmPlatformPaySetupIntent(
          clientSecret: clientSecret,
          confirmParams: params,
        );
      } else {
        await Stripe.instance.confirmPlatformPayPaymentIntent(
          clientSecret: clientSecret,
          confirmParams: params,
        );
      }
      return const WalletCompleted();
    } on StripeException catch (e) {
      if (e.error.code == FailureCode.Canceled) return const WalletCanceled();
      return WalletFailed(e.error.localizedMessage ?? 'Thanh toán không thành công');
    } catch (_) {
      return const WalletFailed('Thanh toán không thành công');
    }
  }

  ApplePayParams _applePay(WalletConfig config, WalletSummary summary) {
    String money(int cents) => (cents / 100).toStringAsFixed(2);
    final years = summary.intervalMonths % 12 == 0;
    // Apple khuyến nghị khai báo khoản định kỳ cho subscription: bảng Apple Pay hiện rõ "mỗi tháng"
    final recurring = ApplePayCartSummaryItem.recurring(
      label: summary.isTrial ? 'Sau ${summary.trialDays} ngày dùng thử' : summary.label,
      amount: money(summary.recurringCents),
      intervalUnit: years ? ApplePayIntervalUnit.year : ApplePayIntervalUnit.month,
      intervalCount: years ? summary.intervalMonths ~/ 12 : summary.intervalMonths,
      startDate: summary.isTrial
          ? DateTime.now().add(Duration(days: summary.trialDays)).millisecondsSinceEpoch ~/ 1000
          : null,
    );
    return ApplePayParams(
      merchantCountryCode: config.merchantCountryCode,
      currencyCode: config.currency.toUpperCase(),
      // Dòng CUỐI là tổng tiền trừ hôm nay
      cartItems: [
        if (summary.isTrial) ...[
          recurring,
          ApplePayCartSummaryItem.immediate(label: summary.label, amount: money(summary.amountCents)),
        ] else
          recurring,
      ],
    );
  }
}
