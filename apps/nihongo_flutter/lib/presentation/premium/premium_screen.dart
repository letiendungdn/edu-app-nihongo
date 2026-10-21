import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart' show PlatformButtonType, PlatformPayButton;
import 'package:go_router/go_router.dart';

import '../../core/routes.dart';
import '../../data/payment/premium_checkout.dart';
import '../../data/remote/subscription_api.dart';
import '../../providers.dart';

/// Dữ liệu cần trước khi hiện nút ví: cấu hình Stripe, danh sách gói, máy có ví không.
final premiumOfferProvider = FutureProvider.autoDispose<
    ({WalletConfig config, List<PremiumPlan> plans, bool walletAvailable})>((ref) async {
  final api = ref.watch(subscriptionApiProvider);
  final (config, plans) = await (api.walletConfig(), api.plans()).wait;
  final available = await ref.watch(walletPayerProvider).isAvailable(config);
  return (config: config, plans: plans, walletAvailable: available);
});

class PremiumScreen extends ConsumerStatefulWidget {
  const PremiumScreen({super.key});

  @override
  ConsumerState<PremiumScreen> createState() => _PremiumScreenState();
}

class _PremiumScreenState extends ConsumerState<PremiumScreen> {
  String? _buying; // plan đang thanh toán

  String get _walletName =>
      defaultTargetPlatform == TargetPlatform.iOS ? 'Apple Pay' : 'Google Pay';

  Future<void> _buy(PremiumPlan plan, WalletConfig config) async {
    if (_buying != null) return; // chặn bấm 2 lần
    setState(() => _buying = plan.plan);
    final outcome = await ref.read(premiumCheckoutProvider).buy(plan, config);
    if (!mounted) return;
    setState(() => _buying = null);

    final message = switch (outcome) {
      CheckoutActivated() => 'Đã kích hoạt gói ${plan.displayName}!',
      CheckoutProcessing() => 'Thanh toán xong. Gói sẽ được kích hoạt trong ít phút.',
      CheckoutCanceled() => null,
      CheckoutAlreadySubscribed() => 'Bạn đang dùng gói này rồi.',
      CheckoutNeedsLogin() => 'Đăng nhập để mua gói.',
      CheckoutFailed(:final message) => message,
    };
    if (message != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    }
    if (outcome is CheckoutNeedsLogin) context.push(Routes.login);
  }

  @override
  Widget build(BuildContext context) {
    final offer = ref.watch(premiumOfferProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Nâng cấp Premium')),
      body: offer.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Không tải được gói. Kiểm tra kết nối rồi thử lại.', textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(premiumOfferProvider),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
        data: (o) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (!o.walletAvailable)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    kIsWeb
                        ? 'Trên web, hãy thanh toán ở trang Gói học của Nihongo EDU.'
                        : 'Máy này chưa có $_walletName (hoặc chưa thêm thẻ vào ví).',
                  ),
                ),
              ),
            for (final plan in o.plans)
              _PlanCard(
                plan: plan,
                enabled: o.walletAvailable && _buying == null,
                loading: _buying == plan.plan,
                onBuy: () => _buy(plan, o.config),
              ),
          ],
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({
    required this.plan,
    required this.enabled,
    required this.loading,
    required this.onBuy,
  });

  final PremiumPlan plan;
  final bool enabled;
  final bool loading;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(plan.displayName, style: text.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(
              '${formatUsd(plan.priceUsdCents)} / ${intervalLabel(plan.intervalMonths)}'
              '${plan.trialDays > 0 ? ' · dùng thử ${plan.trialDays} ngày' : ''}',
              style: text.titleMedium,
            ),
            const SizedBox(height: 8),
            for (final f in plan.features) Text('• $f', style: text.bodyMedium),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: loading
                  ? const Center(child: CircularProgressIndicator())
                  // Nút chính thức của Apple Pay / Google Pay (Apple từ chối app tự vẽ nút Apple Pay)
                  : IgnorePointer(
                      ignoring: !enabled,
                      child: Opacity(
                        opacity: enabled ? 1 : 0.4,
                        child: PlatformPayButton(
                          type: PlatformButtonType.subscribe,
                          onPressed: onBuy,
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
