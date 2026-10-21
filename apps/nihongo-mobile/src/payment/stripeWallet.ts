import {
  confirmPlatformPayPayment,
  confirmPlatformPaySetupIntent,
  initStripe,
  isPlatformPaySupported,
  PlatformPay,
  PlatformPayError,
} from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import type { WalletConfig, WalletPayer, WalletSummary } from '../data/premiumCheckout';

/** Phải khớp `merchantIdentifier` của plugin Stripe trong app.json và trên Apple Developer */
export const APPLE_MERCHANT_ID = 'merchant.com.edu.nihongo';

/** Bản dev: môi trường test của Google Pay (không cần hồ sơ merchant Google, thẻ giả) */
const GOOGLE_PAY_TEST_ENV = __DEV__;

/** Trang quản lý / hủy gói. Apple bắt buộc có khi khai báo thanh toán định kỳ trên bảng Apple Pay. */
const MANAGEMENT_URL = `${(Constants.expoConfig?.extra?.webBaseUrl as string | undefined) ?? 'http://nihongo.localhost:8080'}/payments`;

let appliedKey: string | null = null;

/** Khóa công khai lấy từ server: đổi khóa không cần ra bản app mới */
async function ensureInit(config: WalletConfig) {
  if (appliedKey === config.publishableKey) return;
  await initStripe({
    publishableKey: config.publishableKey,
    merchantIdentifier: APPLE_MERCHANT_ID,
    // Quay lại app sau bước xác thực 3DS trên trình duyệt (Expo Go cần đoạn '/--/')
    urlScheme: Constants.appOwnership === 'expo' ? Linking.createURL('/--/') : Linking.createURL(''),
  });
  appliedKey = config.publishableKey;
}

export async function walletAvailable(config: WalletConfig): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  try {
    await ensureInit(config);
    return await isPlatformPaySupported({ googlePay: { testEnv: GOOGLE_PAY_TEST_ENV } });
  } catch {
    return false;
  }
}

const money = (cents: number) => (cents / 100).toFixed(2);

function recurringItem(s: WalletSummary, label: string): PlatformPay.RecurringCartSummaryItem {
  const years = s.intervalMonths % 12 === 0;
  return {
    paymentType: PlatformPay.PaymentType.Recurring,
    label,
    amount: money(s.recurringCents),
    intervalUnit: years ? PlatformPay.IntervalUnit.Year : PlatformPay.IntervalUnit.Month,
    intervalCount: years ? s.intervalMonths / 12 : s.intervalMonths,
    // Giây Unix: kỳ trả tiền đầu bắt đầu sau khi hết dùng thử
    startDate: s.trialDays > 0 ? Math.floor(Date.now() / 1000) + s.trialDays * 86_400 : undefined,
  };
}

function confirmParams(config: WalletConfig, s: WalletSummary): PlatformPay.ConfirmParams {
  const trial = s.trialDays > 0;
  const regular = recurringItem(s, trial ? `Sau ${s.trialDays} ngày dùng thử` : s.label);
  return {
    applePay: {
      merchantCountryCode: config.merchantCountryCode,
      currencyCode: config.currency.toUpperCase(),
      // Dòng CUỐI là tổng tiền trừ hôm nay
      cartItems: trial
        ? [regular, { paymentType: PlatformPay.PaymentType.Immediate, label: s.label, amount: money(s.amountCents) }]
        : [regular],
      request: {
        type: PlatformPay.PaymentRequestType.Recurring,
        description: s.label,
        managementUrl: MANAGEMENT_URL,
        billing: recurringItem(s, s.label),
      },
    },
    googlePay: {
      testEnv: GOOGLE_PAY_TEST_ENV,
      merchantName: 'Nihongo EDU',
      merchantCountryCode: config.merchantCountryCode,
      currencyCode: config.currency.toUpperCase(),
    },
  };
}

export const stripeWallet: WalletPayer = {
  async pay({ config, clientSecret, intentType, summary }) {
    try {
      await ensureInit(config);
      const params = confirmParams(config, summary);
      const { error } =
        intentType === 'setup'
          ? await confirmPlatformPaySetupIntent(clientSecret, params)
          : await confirmPlatformPayPayment(clientSecret, params);
      if (!error) return { kind: 'completed' };
      if (error.code === PlatformPayError.Canceled) return { kind: 'canceled' };
      return { kind: 'failed', message: error.localizedMessage ?? error.message ?? 'Thanh toán không thành công' };
    } catch {
      return { kind: 'failed', message: 'Thanh toán không thành công' };
    }
  },
};
