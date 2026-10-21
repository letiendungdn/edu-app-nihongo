import 'package:dio/dio.dart';

import '../remote/subscription_api.dart';

/// Nội dung bảng Apple Pay / Google Pay.
class WalletSummary {
  const WalletSummary({
    required this.label,
    required this.amountCents,
    required this.recurringCents,
    required this.intervalMonths,
    required this.trialDays,
  });

  final String label;

  /// Số tiền trừ NGAY: 0 khi dùng thử (SetupIntent chỉ lưu ví, kỳ đầu trừ sau)
  final int amountCents;

  /// Giá mỗi kỳ
  final int recurringCents;
  final int intervalMonths;

  /// > 0: đang dùng thử, kỳ trả tiền đầu tiên bắt đầu sau số ngày này
  final int trialDays;

  bool get isTrial => trialDays > 0;
}

String formatUsd(int cents) => '\$${(cents ~/ 100)}.${(cents % 100).toString().padLeft(2, '0')}';

String intervalLabel(int months) => switch (months) {
      1 => 'tháng',
      12 => 'năm',
      _ => '$months tháng',
    };

WalletSummary walletSummary(PremiumPlan plan, IntentType intentType) {
  final price = '${formatUsd(plan.priceUsdCents)}/${intervalLabel(plan.intervalMonths)}';
  // Server trả SetupIntent khi gói có dùng thử; trialDays của gói có thể là 0 nếu cấu hình lệch
  final trialDays = intentType == IntentType.setup ? (plan.trialDays > 0 ? plan.trialDays : 1) : 0;
  return WalletSummary(
    label: trialDays > 0
        ? 'Nihongo ${plan.displayName}: dùng thử ${plan.trialDays} ngày, sau đó $price'
        : 'Nihongo ${plan.displayName} ($price)',
    amountCents: trialDays > 0 ? 0 : plan.priceUsdCents,
    recurringCents: plan.priceUsdCents,
    intervalMonths: plan.intervalMonths,
    trialDays: trialDays,
  );
}

bool isActivated(SubscriptionState? s, String plan) =>
    s != null && s.plan == plan && (s.status == 'ACTIVE' || s.status == 'TRIALING');

sealed class WalletResult {
  const WalletResult();
}

final class WalletCompleted extends WalletResult {
  const WalletCompleted();
}

final class WalletCanceled extends WalletResult {
  const WalletCanceled();
}

final class WalletFailed extends WalletResult {
  const WalletFailed(this.message);
  final String message;
}

/// Apple Pay (iOS) / Google Pay (Android). Tách interface để test luồng mà không cần ví thật.
abstract interface class WalletPayer {
  Future<bool> isAvailable(WalletConfig config);
  Future<WalletResult> pay({
    required WalletConfig config,
    required String clientSecret,
    required IntentType intentType,
    required WalletSummary summary,
  });
}

sealed class CheckoutOutcome {
  const CheckoutOutcome();
}

final class CheckoutActivated extends CheckoutOutcome {
  const CheckoutActivated();
}

/// Ví đã trả tiền xong nhưng webhook chưa kịp kích hoạt gói trong thời gian chờ
final class CheckoutProcessing extends CheckoutOutcome {
  const CheckoutProcessing();
}

final class CheckoutCanceled extends CheckoutOutcome {
  const CheckoutCanceled();
}

final class CheckoutAlreadySubscribed extends CheckoutOutcome {
  const CheckoutAlreadySubscribed();
}

final class CheckoutNeedsLogin extends CheckoutOutcome {
  const CheckoutNeedsLogin();
}

final class CheckoutFailed extends CheckoutOutcome {
  const CheckoutFailed(this.message);
  final String message;
}

/// Mua gói Premium bằng ví:
/// 1. `POST /subscriptions` → client secret (PaymentIntent, hoặc SetupIntent nếu gói có dùng thử)
/// 2. Ví xác nhận intent đó với Stripe (thẻ không đi qua server của mình)
/// 3. Gói chỉ kích hoạt khi webhook Stripe về server → hỏi lại trạng thái tới khi thấy
class PremiumCheckout {
  PremiumCheckout(
    this._api,
    this._wallet, {
    this.pollInterval = const Duration(seconds: 2),
    this.maxPolls = 15,
  });

  final SubscriptionApi _api;
  final WalletPayer _wallet;
  final Duration pollInterval;
  final int maxPolls;

  Future<CheckoutOutcome> buy(PremiumPlan plan, WalletConfig config) async {
    final CheckoutStart start;
    try {
      start = await _api.start(plan.plan);
    } on DioException catch (e) {
      return switch (e.response?.statusCode) {
        401 => const CheckoutNeedsLogin(),
        409 => const CheckoutAlreadySubscribed(),
        _ => const CheckoutFailed('Không tạo được thanh toán. Thử lại sau.'),
      };
    }

    final secret = start.clientSecret;
    if (secret == null) return const CheckoutActivated(); // đổi gói, Stripe tự tính chênh lệch

    final intentType = start.intentType ?? IntentType.payment;
    final result = await _wallet.pay(
      config: config,
      clientSecret: secret,
      intentType: intentType,
      summary: walletSummary(plan, intentType),
    );
    switch (result) {
      case WalletCanceled():
        return const CheckoutCanceled();
      case WalletFailed(:final message):
        return CheckoutFailed(message);
      case WalletCompleted():
        break;
    }

    for (var i = 0; i < maxPolls; i++) {
      try {
        if (isActivated(await _api.status(), plan.plan)) return const CheckoutActivated();
      } on DioException {
        // Mạng chập chờn khi hỏi trạng thái: tiền đã trả, cứ hỏi tiếp
      }
      await Future<void>.delayed(pollInterval);
    }
    return const CheckoutProcessing();
  }
}
