import { beforeEach, describe, expect, it } from 'vitest';

import {
  buyPremium,
  formatUsd,
  intervalLabel,
  isActivated,
  paidPlans,
  type CheckoutStart,
  type PremiumPlan,
  type SubscriptionState,
  type WalletPayer,
  type WalletResult,
  type WalletSummary,
} from './premiumCheckout';

const config = { publishableKey: 'pk_test_1', merchantCountryCode: 'US', currency: 'usd' };
const pro: PremiumPlan = {
  plan: 'PRO',
  displayName: 'Pro',
  priceUsdCents: 1999,
  intervalMonths: 1,
  trialDays: 7,
  features: [],
  stripePriceId: 'price_pro',
};

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

let walletCalls: { clientSecret: string; intentType: string; summary: WalletSummary }[];
let statusCalls: number;

function setup(opts: {
  start: () => CheckoutStart;
  statuses?: (() => SubscriptionState | null)[];
  wallet?: WalletResult;
}) {
  const statuses = [...(opts.statuses ?? [() => ({ plan: 'PRO', status: 'ACTIVE' })])];
  const wallet: WalletPayer = {
    async pay({ clientSecret, intentType, summary }) {
      walletCalls.push({ clientSecret, intentType, summary });
      return opts.wallet ?? { kind: 'completed' };
    },
  };
  const client = {
    async start() {
      return opts.start();
    },
    async status() {
      statusCalls += 1;
      // Mỗi lần hỏi lấy một phần tử; hết danh sách thì giữ phần tử cuối
      const next = statuses.length > 1 ? statuses.shift()! : statuses[0];
      return next();
    },
  };
  return (plan = pro) => buyPremium(plan, config, { client, wallet, pollIntervalMs: 0, maxPolls: 3 });
}

beforeEach(() => {
  walletCalls = [];
  statusCalls = 0;
});

describe('buyPremium', () => {
  it('PaymentIntent → ví trừ đủ giá → chờ webhook kích hoạt', async () => {
    const buy = setup({
      start: () => ({ clientSecret: 'pi_1_secret_x', intentType: 'payment' }),
      // Lần hỏi đầu webhook chưa về (vẫn FREE), lần sau đã ACTIVE
      statuses: [() => ({ plan: 'FREE', status: 'ACTIVE' }), () => ({ plan: 'PRO', status: 'ACTIVE' })],
    });
    await expect(buy()).resolves.toEqual({ kind: 'activated' });
    expect(walletCalls[0]).toMatchObject({ clientSecret: 'pi_1_secret_x', intentType: 'payment' });
    expect(walletCalls[0].summary.amountCents).toBe(1999);
    expect(statusCalls).toBe(2);
  });

  it('gói dùng thử → SetupIntent, hôm nay trừ 0, nhãn ghi giá sau dùng thử', async () => {
    const buy = setup({
      start: () => ({ clientSecret: 'seti_1_secret_x', intentType: 'setup' }),
      statuses: [() => ({ plan: 'PRO', status: 'TRIALING' })],
    });
    await expect(buy()).resolves.toEqual({ kind: 'activated' });
    const { summary, intentType } = walletCalls[0];
    expect(intentType).toBe('setup');
    expect(summary.amountCents).toBe(0);
    expect(summary.recurringCents).toBe(1999);
    expect(summary.label).toContain('dùng thử 7 ngày, sau đó $19.99/tháng');
  });

  it('đang dùng gói này (409) → báo trùng, KHÔNG mở ví', async () => {
    const buy = setup({ start: () => { throw httpError(409); } });
    await expect(buy()).resolves.toEqual({ kind: 'alreadySubscribed' });
    expect(walletCalls).toHaveLength(0);
  });

  it('chưa đăng nhập (401) → needsLogin', async () => {
    const buy = setup({ start: () => { throw httpError(401); } });
    await expect(buy()).resolves.toEqual({ kind: 'needsLogin' });
  });

  it('đổi gói (clientSecret null) → xong luôn, không mở ví', async () => {
    const buy = setup({ start: () => ({ clientSecret: null, intentType: null }) });
    await expect(buy()).resolves.toEqual({ kind: 'activated' });
    expect(walletCalls).toHaveLength(0);
  });

  it('người dùng đóng bảng ví → canceled, không hỏi trạng thái', async () => {
    const buy = setup({
      start: () => ({ clientSecret: 'pi_1_secret_x', intentType: 'payment' }),
      wallet: { kind: 'canceled' },
    });
    await expect(buy()).resolves.toEqual({ kind: 'canceled' });
    expect(statusCalls).toBe(0);
  });

  it('ví lỗi → failed kèm thông báo của ví', async () => {
    const buy = setup({
      start: () => ({ clientSecret: 'pi_1_secret_x', intentType: 'payment' }),
      wallet: { kind: 'failed', message: 'Thẻ bị từ chối' },
    });
    await expect(buy()).resolves.toEqual({ kind: 'failed', message: 'Thẻ bị từ chối' });
  });

  it('webhook chưa về hết thời gian chờ → processing (KHÔNG báo lỗi)', async () => {
    const buy = setup({
      start: () => ({ clientSecret: 'pi_1_secret_x', intentType: 'payment' }),
      statuses: [() => null],
    });
    await expect(buy()).resolves.toEqual({ kind: 'processing' });
    expect(statusCalls).toBe(3);
  });

  it('mạng lỗi khi hỏi trạng thái → hỏi tiếp', async () => {
    const buy = setup({
      start: () => ({ clientSecret: 'pi_1_secret_x', intentType: 'payment' }),
      statuses: [() => { throw httpError(502); }, () => ({ plan: 'PRO', status: 'ACTIVE' })],
    });
    await expect(buy()).resolves.toEqual({ kind: 'activated' });
  });
});

describe('helpers', () => {
  it('danh sách gói bỏ FREE và gói chưa có giá Stripe', () => {
    const plans = paidPlans([
      { plan: 'FREE', displayName: 'Free', priceUsdCents: 0, stripePriceId: null },
      { plan: 'BASIC', displayName: 'Basic', priceUsdCents: 999, stripePriceId: null },
      { plan: 'PRO', displayName: 'Pro', priceUsdCents: 1999, stripePriceId: 'price_pro', features: ['a'] },
    ]);
    expect(plans.map((p) => p.plan)).toEqual(['PRO']);
    expect(plans[0]).toMatchObject({ intervalMonths: 1, trialDays: 0, features: ['a'] });
  });

  it('định dạng giá và kỳ hạn', () => {
    expect(formatUsd(999)).toBe('$9.99');
    expect(formatUsd(10000)).toBe('$100.00');
    expect(intervalLabel(1)).toBe('tháng');
    expect(intervalLabel(12)).toBe('năm');
    expect(intervalLabel(3)).toBe('3 tháng');
    expect(isActivated({ plan: 'BASIC', status: 'ACTIVE' }, 'PRO')).toBe(false);
    expect(isActivated({ plan: 'PRO', status: 'PAST_DUE' }, 'PRO')).toBe(false);
  });
});
