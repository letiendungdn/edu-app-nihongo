/**
 * Mua gói Premium bằng Apple Pay / Google Pay. Hàm thuần (không import Expo/Stripe) để test bằng vitest.
 *
 * 1. `POST /subscriptions` → client secret (PaymentIntent, hoặc SetupIntent nếu gói có dùng thử)
 * 2. Ví xác nhận intent đó với Stripe (thẻ không đi qua server của mình)
 * 3. Gói chỉ kích hoạt khi webhook Stripe về server → hỏi lại trạng thái tới khi thấy
 */

export interface PremiumPlan {
  plan: string; // BASIC | PRO | PRO_ANNUAL
  displayName: string;
  priceUsdCents: number;
  intervalMonths: number;
  trialDays: number;
  features: string[];
  stripePriceId?: string | null;
}

export interface WalletConfig {
  publishableKey: string;
  merchantCountryCode: string;
  currency: string;
}

export type IntentType = 'payment' | 'setup';

export interface CheckoutStart {
  /** null: đổi gói trên subscription đang chạy, không cần thanh toán thêm */
  clientSecret: string | null;
  intentType: IntentType | null;
}

export interface SubscriptionState {
  plan: string;
  status: string; // ACTIVE | TRIALING | PAST_DUE | CANCELED | PAUSED
}

export interface SubscriptionClient {
  start(plan: string): Promise<CheckoutStart>;
  status(): Promise<SubscriptionState | null>;
}

/** Nội dung bảng Apple Pay / Google Pay. */
export interface WalletSummary {
  label: string;
  /** Số tiền trừ NGAY: 0 khi dùng thử (SetupIntent chỉ lưu ví, kỳ đầu trừ sau) */
  amountCents: number;
  recurringCents: number;
  intervalMonths: number;
  /** > 0: đang dùng thử, kỳ trả tiền đầu tiên bắt đầu sau số ngày này */
  trialDays: number;
}

export type WalletResult = { kind: 'completed' } | { kind: 'canceled' } | { kind: 'failed'; message: string };

export interface WalletPayer {
  pay(args: {
    config: WalletConfig;
    clientSecret: string;
    intentType: IntentType;
    summary: WalletSummary;
  }): Promise<WalletResult>;
}

export type CheckoutOutcome =
  | { kind: 'activated' }
  /** Ví đã trả tiền xong nhưng webhook chưa kịp kích hoạt gói trong thời gian chờ */
  | { kind: 'processing' }
  | { kind: 'canceled' }
  | { kind: 'alreadySubscribed' }
  | { kind: 'needsLogin' }
  | { kind: 'failed'; message: string };

export function formatUsd(cents: number): string {
  return `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

export function intervalLabel(months: number): string {
  if (months === 1) return 'tháng';
  if (months === 12) return 'năm';
  return `${months} tháng`;
}

/** Chỉ các gói trả phí đã có giá trên Stripe */
export function paidPlans(raw: unknown): PremiumPlan[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => (p?.priceUsdCents ?? 0) > 0 && p?.stripePriceId != null)
    .map((p) => ({
      plan: String(p.plan),
      displayName: p.displayName ?? String(p.plan),
      priceUsdCents: p.priceUsdCents,
      intervalMonths: p.intervalMonths ?? 1,
      trialDays: p.trialDays ?? 0,
      features: Array.isArray(p.features) ? p.features.map(String) : [],
      stripePriceId: p.stripePriceId,
    }));
}

export function walletSummary(plan: PremiumPlan, intentType: IntentType): WalletSummary {
  const price = `${formatUsd(plan.priceUsdCents)}/${intervalLabel(plan.intervalMonths)}`;
  // Server trả SetupIntent khi gói có dùng thử; trialDays của gói có thể là 0 nếu cấu hình lệch
  const trialDays = intentType === 'setup' ? Math.max(plan.trialDays, 1) : 0;
  return {
    label:
      trialDays > 0
        ? `Nihongo ${plan.displayName}: dùng thử ${plan.trialDays} ngày, sau đó ${price}`
        : `Nihongo ${plan.displayName} (${price})`,
    amountCents: trialDays > 0 ? 0 : plan.priceUsdCents,
    recurringCents: plan.priceUsdCents,
    intervalMonths: plan.intervalMonths,
    trialDays,
  };
}

export function isActivated(state: SubscriptionState | null, plan: string): boolean {
  return state != null && state.plan === plan && (state.status === 'ACTIVE' || state.status === 'TRIALING');
}

/** Mã HTTP của lỗi axios (hoặc lỗi giả trong test) */
function httpStatus(e: unknown): number | undefined {
  return (e as { response?: { status?: number } })?.response?.status;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function buyPremium(
  plan: PremiumPlan,
  config: WalletConfig,
  deps: { client: SubscriptionClient; wallet: WalletPayer; pollIntervalMs?: number; maxPolls?: number },
): Promise<CheckoutOutcome> {
  const { client, wallet, pollIntervalMs = 2000, maxPolls = 15 } = deps;

  let start: CheckoutStart;
  try {
    start = await client.start(plan.plan);
  } catch (e) {
    const status = httpStatus(e);
    if (status === 401) return { kind: 'needsLogin' };
    if (status === 409) return { kind: 'alreadySubscribed' };
    return { kind: 'failed', message: 'Không tạo được thanh toán. Thử lại sau.' };
  }

  // Đổi gói: Stripe tự tính chênh lệch trên subscription đang chạy
  if (!start.clientSecret) return { kind: 'activated' };

  const intentType = start.intentType ?? 'payment';
  const result = await wallet.pay({
    config,
    clientSecret: start.clientSecret,
    intentType,
    summary: walletSummary(plan, intentType),
  });
  if (result.kind === 'canceled') return { kind: 'canceled' };
  if (result.kind === 'failed') return { kind: 'failed', message: result.message };

  for (let i = 0; i < maxPolls; i += 1) {
    try {
      if (isActivated(await client.status(), plan.plan)) return { kind: 'activated' };
    } catch {
      // Mạng chập chờn khi hỏi trạng thái: tiền đã trả, cứ hỏi tiếp
    }
    await sleep(pollIntervalMs);
  }
  return { kind: 'processing' };
}
