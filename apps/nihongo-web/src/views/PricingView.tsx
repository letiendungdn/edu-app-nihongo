'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSubscription, fetchMyPayments, fetchSubscriptionPlans, fetchSubscriptionStatus } from '@/api';
import SubscriptionCheckoutPanel from '@/components/SubscriptionCheckoutPanel';
import CurrentSubscriptionCard from '@/components/CurrentSubscriptionCard';
import { useAuth } from '@/hooks/useAuth';
import { loginUrlFor } from '@/hooks/useRequireAuth';
import type { PaymentRecord, Subscription, SubscriptionPlan, SubscriptionPlanConfig } from '@/types/api';
import {
  isDisplayPlanCurrent,
  isSubscriptionEntitled,
  resolveDisplaySubscription,
} from '@/lib/subscription-utils';
import './PricingView.css';

const PLAN_ORDER: SubscriptionPlan[] = ['FREE', 'BASIC', 'PRO', 'PRO_ANNUAL'];
const SYNC_POLL_MS = 1500;
const SYNC_MAX_ATTEMPTS = 12;

function formatPrice(cents: number, intervalMonths: number): string {
  if (cents === 0) return 'Miễn phí';
  const dollars = (cents / 100).toFixed(2);
  const interval = intervalMonths >= 12 ? '/năm' : '/tháng';
  return `$${dollars}${interval}`;
}

function PlanBadge({ plan }: { plan: SubscriptionPlan }) {
  if (plan === 'PRO') return <span className="plan-badge plan-badge--popular">Phổ biến nhất</span>;
  if (plan === 'PRO_ANNUAL') return <span className="plan-badge plan-badge--value">Tiết kiệm nhất</span>;
  return null;
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="plan-features">
      {features.map((f) => (
        <li key={f}>
          <span className="feature-check">✓</span> {f}
        </li>
      ))}
    </ul>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PricingView() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plans, setPlans] = useState<SubscriptionPlanConfig[]>([]);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlan | null>(null);
  const [syncingPurchase, setSyncingPurchase] = useState(false);

  const reloadSubscription = useCallback(async () => {
    if (!token) return null;
    const [subData, payData] = await Promise.all([
      fetchSubscriptionStatus(token),
      fetchMyPayments(token),
    ]);
    setCurrentSub(subData);
    setPayments(payData);
    return subData;
  }, [token]);

  const syncAfterPurchase = useCallback(
    async (purchasedPlan: SubscriptionPlan) => {
      if (!token) return;
      setPendingPlan(purchasedPlan);
      setSyncingPurchase(true);
      setSuccessMsg('Thanh toán thành công! Đang kích hoạt gói của bạn...');

      for (let attempt = 0; attempt < SYNC_MAX_ATTEMPTS; attempt += 1) {
        if (attempt > 0) await sleep(SYNC_POLL_MS);
        const sub = await reloadSubscription();
        if (sub && isSubscriptionEntitled(sub) && sub.plan === purchasedPlan) {
          setPendingPlan(null);
          setSyncingPurchase(false);
          setSuccessMsg('Thanh toán thành công! Gói của bạn đã được kích hoạt.');
          return;
        }
      }

      setSyncingPurchase(false);
      setSuccessMsg(
        `Đã thanh toán gói ${purchasedPlan}. Hệ thống đang đồng bộ — làm mới trang nếu chưa thấy cập nhật.`,
      );
    },
    [token, reloadSubscription],
  );

  useEffect(() => {
    if (searchParams?.get('success') !== '1' || !token) return;

    void (async () => {
      const sub = await reloadSubscription();
      if (sub && isSubscriptionEntitled(sub) && sub.plan !== 'FREE') {
        setSuccessMsg('Thanh toán thành công! Gói của bạn đã được kích hoạt.');
      }
      router.replace('/pricing', { scroll: false });
    })();
  }, [searchParams, token, router, reloadSubscription]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const plansData = await fetchSubscriptionPlans();
        const sorted = [...plansData].sort(
          (a, b) => PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan),
        );
        setPlans(sorted);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : 'Không tải được danh sách gói',
        );
      }

      if (isAuthenticated && token) {
        try {
          await reloadSubscription();
        } catch {
          setCurrentSub(null);
          setPayments([]);
        }
      } else {
        setCurrentSub(null);
        setPayments([]);
      }

      setLoading(false);
    }
    load();
  }, [isAuthenticated, token, reloadSubscription]);

  function handleSelect(plan: SubscriptionPlan) {
    if (plan === 'FREE') return;
    if (!isAuthenticated) {
      router.push(loginUrlFor(`/pricing?plan=${plan}`));
      return;
    }
    void startCheckout(plan);
  }

  const startCheckout = useCallback(
    async (plan: SubscriptionPlan) => {
      if (!token) return;
      setSuccessMsg('');
      setSelectedPlan(plan);
      setCheckoutError('');
      setClientSecret(null);
      setCheckoutLoading(true);
      try {
        const res = await createSubscription(token, plan);
        if (!res.clientSecret) {
          // Đổi gói trên subscription đang chạy: không cần nhập thẻ
          setSelectedPlan(null);
          await syncAfterPurchase(plan);
          return;
        }
        setClientSecret(res.clientSecret);
      } catch (err) {
        setCheckoutError(
          err instanceof Error ? err.message : 'Không thể khởi tạo thanh toán',
        );
      } finally {
        setCheckoutLoading(false);
      }
    },
    [token, syncAfterPurchase],
  );

  // ?plan= trên URL (quay lại sau khi đăng nhập): mở thanh toán MỘT lần cho mỗi gói. Bản cũ phụ
  // thuộc `token` qua startCheckout → token đổi là tạo thêm một subscription Stripe.
  const autoStartedFor = useRef<string | null>(null);
  useEffect(() => {
    const planParam = searchParams?.get('plan') as SubscriptionPlan | null;
    if (
      !planParam ||
      planParam === 'FREE' ||
      !isAuthenticated ||
      searchParams?.get('success') ||
      autoStartedFor.current === planParam
    ) {
      return;
    }
    autoStartedFor.current = planParam;
    void startCheckout(planParam);
  }, [searchParams, isAuthenticated, startCheckout]);

  const handleCheckoutSuccess = useCallback(
    async (purchasedPlan: SubscriptionPlan) => {
      setSelectedPlan(null);
      setClientSecret(null);
      setCheckoutError('');
      await syncAfterPurchase(purchasedPlan);
      requestAnimationFrame(() => {
        document.querySelector('.pricing-my-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [syncAfterPurchase],
  );

  const handleCancelCheckout = useCallback(() => {
    setSelectedPlan(null);
    setClientSecret(null);
    setCheckoutError('');
  }, []);

  const displaySub = resolveDisplaySubscription(currentSub, pendingPlan);
  const activePlanConfig = plans.find((p) => p.plan === displaySub?.plan);

  if (loading) {
    return <div className="page-loading">Đang tải plans...</div>;
  }

  return (
    <div className="pricing-page container">
      <div className="pricing-header">
        <h1>Chọn gói học phù hợp</h1>
        <p className="pricing-sub">Nâng cấp để mở khoá toàn bộ nội dung và học không giới hạn</p>
      </div>

      {loadError && (
        <div className="pricing-notice pricing-notice--error">
          {loadError}. Thử refresh hoặc kiểm tra backend (:3000) đang chạy.
        </div>
      )}

      {successMsg && (
        <div className={`pricing-success${syncingPurchase ? ' pricing-success--syncing' : ''}`}>
          <span>{syncingPurchase ? '⏳' : '🎉'}</span> {successMsg}
        </div>
      )}

      {displaySub && token && (
        <CurrentSubscriptionCard
          subscription={displaySub}
          planConfig={activePlanConfig}
          payments={payments}
          token={token}
          syncing={syncingPurchase}
          onUpdated={() => void reloadSubscription()}
        />
      )}

      <div className="plans-grid">
        {plans.map((plan) => {
          const isCurrent = isDisplayPlanCurrent(plan.plan, currentSub, pendingPlan);
          const isPopular = plan.plan === 'PRO';

          return (
            <div
              key={plan.id}
              className={`plan-card glass-panel${isPopular ? ' plan-card--featured' : ''}${isCurrent ? ' plan-card--current' : ''}`}
            >
              {isCurrent && <span className="plan-current-tag">Gói của bạn</span>}
              <PlanBadge plan={plan.plan} />

              <div className="plan-name">{plan.displayName}</div>
              <div className="plan-price">{formatPrice(plan.priceUsdCents, plan.intervalMonths)}</div>

              {plan.trialDays > 0 && (
                <div className="plan-trial">Dùng thử {plan.trialDays} ngày miễn phí</div>
              )}

              <FeatureList features={plan.features as string[]} />

              <button
                className={`btn btn-block${isPopular ? ' btn-primary' : ' btn-outline'}`}
                disabled={isCurrent || plan.plan === 'FREE' || syncingPurchase}
                onClick={() => handleSelect(plan.plan)}
              >
                {isCurrent ? '✓ Gói hiện tại' : plan.plan === 'FREE' ? 'Miễn phí' : 'Chọn gói này'}
              </button>
            </div>
          );
        })}
      </div>

      {(checkoutLoading || checkoutError || clientSecret) && selectedPlan && !syncingPurchase && (
        <section className="pricing-checkout glass-panel">
          {checkoutLoading && <p className="page-loading">Đang mở form thẻ thanh toán...</p>}
          {checkoutError && (
            <div className="checkout-error-panel">
              <h2>Không thể thanh toán</h2>
              <p>{checkoutError}</p>
              <button type="button" className="btn btn-outline" onClick={handleCancelCheckout}>
                Đóng
              </button>
            </div>
          )}
          {clientSecret && !checkoutLoading && token && (
            <SubscriptionCheckoutPanel
              plan={selectedPlan}
              clientSecret={clientSecret}
              token={token}
              onSuccess={() => void handleCheckoutSuccess(selectedPlan)}
              onCancel={handleCancelCheckout}
              title="Nhập thẻ để đăng ký gói"
            />
          )}
        </section>
      )}

      <p className="pricing-footer">
        Thanh toán an toàn qua Stripe ·{' '}
        <Link href="/payments">Hoàn tiền & lịch sử thanh toán</Link> · Không phí ẩn
      </p>
    </div>
  );
}
