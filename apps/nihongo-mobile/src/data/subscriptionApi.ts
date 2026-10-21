import { api } from './api';
import {
  paidPlans,
  type CheckoutStart,
  type PremiumPlan,
  type SubscriptionClient,
  type SubscriptionState,
  type WalletConfig,
} from './premiumCheckout';

/** Các endpoint `/api/subscriptions` của gateway (Stripe nằm ở server). */
export async function fetchWalletConfig(): Promise<WalletConfig> {
  const res = await api.get<WalletConfig>('/subscriptions/wallet-config');
  return res.data;
}

export async function fetchPremiumPlans(): Promise<PremiumPlan[]> {
  const res = await api.get<unknown>('/subscriptions/plans');
  return paidPlans(res.data);
}

export const subscriptionClient: SubscriptionClient = {
  async start(plan) {
    const res = await api.post<CheckoutStart>('/subscriptions', { plan });
    return res.data;
  },
  async status() {
    const res = await api.get<SubscriptionState | null>('/subscriptions/status');
    return res.data ?? null;
  },
};
