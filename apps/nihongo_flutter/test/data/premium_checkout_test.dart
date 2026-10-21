import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/data/payment/premium_checkout.dart';
import 'package:nihongo_app/data/remote/subscription_api.dart';

import 'auth_interceptor_test.dart' show ScriptedAdapter, none;

/// Ví giả: ghi lại lần gọi, trả kết quả định sẵn.
class FakeWallet implements WalletPayer {
  FakeWallet([this.result = const WalletCompleted()]);
  final WalletResult result;
  final calls = <({String secret, IntentType type, WalletSummary summary})>[];

  @override
  Future<bool> isAvailable(WalletConfig config) async => true;

  @override
  Future<WalletResult> pay({
    required WalletConfig config,
    required String clientSecret,
    required IntentType intentType,
    required WalletSummary summary,
  }) async {
    calls.add((secret: clientSecret, type: intentType, summary: summary));
    return result;
  }
}

Map<String, Object?> ok(Object? data) => {'success': true, 'data': data};

const config = WalletConfig(publishableKey: 'pk_test_1', merchantCountryCode: 'US', currency: 'usd');
const pro = PremiumPlan(
  plan: 'PRO', displayName: 'Pro', priceUsdCents: 1999, intervalMonths: 1, trialDays: 7, features: [],
);

void main() {
  late ScriptedAdapter server;
  late FakeWallet wallet;
  late int statusCalls;

  PremiumCheckout build(
    (int, Object, Map<String, List<String>>) Function(RequestOptions) reply, {
    WalletResult walletResult = const WalletCompleted(),
  }) {
    server = ScriptedAdapter(reply);
    wallet = FakeWallet(walletResult);
    final dio = Dio(BaseOptions(baseUrl: 'http://test.local/api'))..httpClientAdapter = server;
    return PremiumCheckout(SubscriptionApi(dio), wallet, pollInterval: Duration.zero, maxPolls: 3);
  }

  setUp(() => statusCalls = 0);

  test('PaymentIntent → ví trừ đủ giá → chờ webhook kích hoạt → Activated', () async {
    final checkout = build((o) {
      if (o.method == 'POST') return (201, ok({'clientSecret': 'pi_1_secret_x', 'intentType': 'payment'}), none);
      statusCalls++;
      // Lần hỏi đầu webhook chưa về (vẫn FREE), lần sau đã ACTIVE
      return (200, ok({'plan': statusCalls == 1 ? 'FREE' : 'PRO', 'status': 'ACTIVE'}), none);
    });

    final outcome = await checkout.buy(pro, config);

    expect(outcome, isA<CheckoutActivated>());
    expect(server.requests.first.data, {'plan': 'PRO'});
    expect(wallet.calls.single.secret, 'pi_1_secret_x');
    expect(wallet.calls.single.type, IntentType.payment);
    expect(wallet.calls.single.summary.amountCents, 1999);
    expect(statusCalls, 2);
  });

  test('gói dùng thử → SetupIntent, hôm nay trừ 0, nhãn ghi rõ giá sau dùng thử', () async {
    final checkout = build((o) => o.method == 'POST'
        ? (201, ok({'clientSecret': 'seti_1_secret_x', 'intentType': 'setup'}), none)
        : (200, ok({'plan': 'PRO', 'status': 'TRIALING'}), none));

    expect(await checkout.buy(pro, config), isA<CheckoutActivated>());
    final call = wallet.calls.single;
    expect(call.type, IntentType.setup);
    expect(call.summary.amountCents, 0);
    expect(call.summary.recurringCents, 1999);
    expect(call.summary.trialDays, 7);
    expect(call.summary.label, contains('dùng thử 7 ngày, sau đó \$19.99/tháng'));
  });

  test('đang dùng gói này (409) → báo trùng, KHÔNG mở ví', () async {
    final checkout = build((o) => (409, {'success': false}, none));
    expect(await checkout.buy(pro, config), isA<CheckoutAlreadySubscribed>());
    expect(wallet.calls, isEmpty);
  });

  test('chưa đăng nhập (401) → NeedsLogin', () async {
    final checkout = build((o) => (401, {'success': false}, none));
    expect(await checkout.buy(pro, config), isA<CheckoutNeedsLogin>());
  });

  test('đổi gói (server trả clientSecret null) → xong luôn, không mở ví', () async {
    final checkout = build((o) => (201, ok({'clientSecret': null, 'intentType': null, 'changedPlan': true}), none));
    expect(await checkout.buy(pro, config), isA<CheckoutActivated>());
    expect(wallet.calls, isEmpty);
  });

  test('người dùng đóng bảng ví → Canceled, không hỏi trạng thái', () async {
    final checkout = build(
      (o) => (201, ok({'clientSecret': 'pi_1_secret_x', 'intentType': 'payment'}), none),
      walletResult: const WalletCanceled(),
    );
    expect(await checkout.buy(pro, config), isA<CheckoutCanceled>());
    expect(server.requests.where((r) => r.path.endsWith('/status')), isEmpty);
  });

  test('ví lỗi → Failed kèm thông báo của ví', () async {
    final checkout = build(
      (o) => (201, ok({'clientSecret': 'pi_1_secret_x', 'intentType': 'payment'}), none),
      walletResult: const WalletFailed('Thẻ bị từ chối'),
    );
    final outcome = await checkout.buy(pro, config);
    expect(outcome, isA<CheckoutFailed>());
    expect((outcome as CheckoutFailed).message, 'Thẻ bị từ chối');
  });

  test('trả tiền xong nhưng webhook chưa về hết thời gian chờ → Processing (KHÔNG báo lỗi)', () async {
    final checkout = build((o) {
      if (o.method == 'POST') return (201, ok({'clientSecret': 'pi_1_secret_x', 'intentType': 'payment'}), none);
      statusCalls++;
      return (200, ok(null), none); // chưa có subscription
    });
    expect(await checkout.buy(pro, config), isA<CheckoutProcessing>());
    expect(statusCalls, 3);
  });

  test('mạng lỗi khi hỏi trạng thái → hỏi tiếp, không bỏ cuộc', () async {
    final checkout = build((o) {
      if (o.method == 'POST') return (201, ok({'clientSecret': 'pi_1_secret_x', 'intentType': 'payment'}), none);
      statusCalls++;
      return statusCalls == 1 ? (502, {}, none) : (200, ok({'plan': 'PRO', 'status': 'ACTIVE'}), none);
    });
    expect(await checkout.buy(pro, config), isA<CheckoutActivated>());
  });

  test('danh sách gói bỏ FREE và gói chưa có giá Stripe', () async {
    final server = ScriptedAdapter((o) => (200, ok([
          {'plan': 'FREE', 'displayName': 'Free', 'priceUsdCents': 0, 'stripePriceId': null},
          {'plan': 'BASIC', 'displayName': 'Basic', 'priceUsdCents': 999, 'stripePriceId': null},
          {'plan': 'PRO', 'displayName': 'Pro', 'priceUsdCents': 1999, 'stripePriceId': 'price_pro', 'intervalMonths': 1},
        ]), none));
    final api = SubscriptionApi(Dio(BaseOptions(baseUrl: 'http://test.local/api'))..httpClientAdapter = server);
    expect((await api.plans()).map((p) => p.plan), ['PRO']);
  });

  test('định dạng giá và kỳ hạn', () {
    expect(formatUsd(999), '\$9.99');
    expect(formatUsd(10000), '\$100.00');
    expect(intervalLabel(1), 'tháng');
    expect(intervalLabel(12), 'năm');
    expect(intervalLabel(3), '3 tháng');
    expect(isActivated(const SubscriptionState(plan: 'BASIC', status: 'ACTIVE'), 'PRO'), isFalse);
    expect(isActivated(const SubscriptionState(plan: 'PRO', status: 'PAST_DUE'), 'PRO'), isFalse);
  });
}
