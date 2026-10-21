import { api } from './client';
import {
  paidPlans,
  type CheckoutStart,
  type PremiumPlan,
  type SubscriptionClient,
  type SubscriptionState,
  type WalletConfig,
} from '../payment/premiumCheckout';

/** Gateway bọc mọi response: `{ success: true, data }`. Client chung của app chưa mở lớp này. */
function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/** Các endpoint `/api/subscriptions` của gateway (Stripe nằm ở server). */
export async function fetchWalletConfig(): Promise<WalletConfig> {
  const res = await api.get('/subscriptions/wallet-config');
  return unwrap<WalletConfig>(res.data);
}

export async function fetchPremiumPlans(): Promise<PremiumPlan[]> {
  const res = await api.get('/subscriptions/plans');
  return paidPlans(unwrap<unknown>(res.data));
}

export const subscriptionClient: SubscriptionClient = {
  async start(plan) {
    const res = await api.post('/subscriptions', { plan });
    return unwrap<CheckoutStart>(res.data);
  },
  async status() {
    const res = await api.get('/subscriptions/status');
    return unwrap<SubscriptionState | null>(res.data) ?? null;
  },
};
