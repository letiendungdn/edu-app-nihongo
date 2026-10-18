'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSubscription, fetchSubscriptionStatus } from '@/api';
import SubscriptionCheckoutPanel from '@/components/SubscriptionCheckoutPanel';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { isSubscriptionEntitled } from '@/lib/subscription-utils';
import type { SubscriptionPlan } from '@/types/api';
import './CheckoutView.css';

export default function CheckoutView() {
  const { token } = useAuth();
  const { ready } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = (searchParams?.get('plan') ?? 'PRO') as SubscriptionPlan;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Gói đã khởi tạo thanh toán. Bản cũ chạy lại effect mỗi khi `token` đổi (render đầu, sau khi
  // bị đẩy qua /login, token tự làm mới 15 phút một lần…) → mỗi lần một subscription Stripe mới,
  // và clientSecret bị thay ngay lúc người dùng đang nhập thẻ.
  const startedFor = useRef<SubscriptionPlan | null>(null);

  useEffect(() => {
    if (!ready || startedFor.current === plan) return;
    startedFor.current = plan;

    async function initCheckout() {
      try {
        const res = await createSubscription(null, plan);
        if (!res.clientSecret) {
          // Đổi gói trên subscription đang chạy: xong luôn, không cần nhập thẻ
          router.replace('/pricing?success=1');
          return;
        }
        setClientSecret(res.clientSecret);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể khởi tạo thanh toán');
      } finally {
        setLoading(false);
      }
    }

    void initCheckout();
  }, [ready, plan, router]);

  const handleSuccess = useCallback(async () => {
    if (!token) {
      router.push('/pricing');
      return;
    }
    const sub = await fetchSubscriptionStatus(token);
    if (isSubscriptionEntitled(sub)) {
      router.push('/pricing?success=1');
    } else {
      router.push('/pricing');
    }
  }, [router, token]);

  if (loading) {
    return <div className="page-loading">Đang khởi tạo thanh toán...</div>;
  }

  if (error) {
    return (
      <div className="container checkout-page">
        <div className="checkout-error-panel glass-panel">
          <h2>Có lỗi xảy ra</h2>
          <p>{error}</p>
          <button type="button" className="btn btn-outline" onClick={() => router.push('/pricing')}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) return null;

  return (
    <div className="container checkout-page">
      <button type="button" className="checkout-back btn btn-outline btn-sm" onClick={() => router.back()}>
        ← Quay lại
      </button>
      <SubscriptionCheckoutPanel
        plan={plan}
        clientSecret={clientSecret}
        token={token!}
        onSuccess={handleSuccess}
        onCancel={() => router.push('/pricing')}
      />
    </div>
  );
}
