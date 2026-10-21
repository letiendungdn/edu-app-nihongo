import { PlatformPay, PlatformPayButton } from '@stripe/stripe-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  buyPremium,
  formatUsd,
  intervalLabel,
  type CheckoutOutcome,
  type PremiumPlan,
  type WalletConfig,
} from '../src/data/premiumCheckout';
import { fetchPremiumPlans, fetchWalletConfig, subscriptionClient } from '../src/data/subscriptionApi';
import { stripeWallet, walletAvailable } from '../src/payment/stripeWallet';

const WALLET_NAME = Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay';

function outcomeMessage(outcome: CheckoutOutcome, plan: PremiumPlan): string | null {
  switch (outcome.kind) {
    case 'activated':
      return `Đã kích hoạt gói ${plan.displayName}!`;
    case 'processing':
      return 'Thanh toán xong. Gói sẽ được kích hoạt trong ít phút.';
    case 'alreadySubscribed':
      return 'Bạn đang dùng gói này rồi.';
    case 'failed':
      return outcome.message;
    case 'canceled':
    case 'needsLogin':
      return null;
  }
}

export default function PremiumScreen() {
  const [config, setConfig] = useState<WalletConfig | null>(null);
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null); // plan đang thanh toán

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [cfg, list] = await Promise.all([fetchWalletConfig(), fetchPremiumPlans()]);
      setConfig(cfg);
      setPlans(list);
      setAvailable(await walletAvailable(cfg));
    } catch {
      setLoadError('Không tải được gói. Kiểm tra kết nối rồi thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function buy(plan: PremiumPlan) {
    if (!config || buying) return; // chặn bấm 2 lần
    setBuying(plan.plan);
    try {
      const outcome = await buyPremium(plan, config, { client: subscriptionClient, wallet: stripeWallet });
      if (outcome.kind === 'needsLogin') {
        router.push('/login');
        return;
      }
      const message = outcomeMessage(outcome, plan);
      if (message) Alert.alert('Premium', message);
    } finally {
      setBuying(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>{loadError}</Text>
        <Pressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!available && (
        <View style={styles.notice}>
          <Text style={styles.body}>
            Máy này chưa dùng được {WALLET_NAME} (cần bản development build, không chạy trong Expo Go; hoặc chưa
            thêm thẻ vào ví).
          </Text>
        </View>
      )}
      {plans.map((plan) => {
        const enabled = available && buying == null;
        return (
          <View key={plan.plan} style={styles.card}>
            <Text style={styles.title}>{plan.displayName}</Text>
            <Text style={styles.price}>
              {formatUsd(plan.priceUsdCents)} / {intervalLabel(plan.intervalMonths)}
              {plan.trialDays > 0 ? ` · dùng thử ${plan.trialDays} ngày` : ''}
            </Text>
            {plan.features.map((f) => (
              <Text key={f} style={styles.body}>
                • {f}
              </Text>
            ))}
            {buying === plan.plan ? (
              <ActivityIndicator style={styles.button} />
            ) : available ? (
              // Nút chính thức của Apple Pay / Google Pay (Apple từ chối app tự vẽ nút Apple Pay)
              <PlatformPayButton
                type={PlatformPay.ButtonType.Subscribe}
                onPress={() => void buy(plan)}
                disabled={!enabled}
                style={[styles.button, !enabled && styles.disabled]}
              />
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  notice: { backgroundColor: '#fff7ed', borderRadius: 12, padding: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 4 },
  title: { fontSize: 22, fontWeight: '700' },
  price: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  body: { fontSize: 14, color: '#334155' },
  button: { height: 48, marginTop: 10 },
  disabled: { opacity: 0.4 },
  retry: { backgroundColor: '#1d4ed8', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
});
