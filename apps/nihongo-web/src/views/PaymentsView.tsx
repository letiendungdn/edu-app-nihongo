'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  cancelSubscription,
  fetchMyPayments,
  fetchSubscriptionStatus,
  requestPaymentRefund,
  requestSubscriptionRefund,
} from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { PaymentRecord, Subscription } from '@/types/api';
import { ApiError } from '@/types/api';
import './PaymentsView.css';

const SUBSCRIPTION_REFUND_DAYS = 7;

function formatMoney(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  return currency === 'USD' ? `$${amount}` : `${amount} ${currency}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusLabel(status: PaymentRecord['status']): string {
  switch (status) {
    case 'SUCCEEDED':
      return 'Đã thanh toán';
    case 'PENDING':
      return 'Đang chờ';
    case 'FAILED':
      return 'Thất bại';
    case 'REFUNDED':
      return 'Đã hoàn tiền';
    case 'PARTIALLY_REFUNDED':
      return 'Hoàn một phần';
    default:
      return status;
  }
}

function paymentTitle(p: PaymentRecord): string {
  if (p.session) {
    const coach = p.session.coach?.user?.name ?? 'Coach';
    return `Buổi coaching — ${coach}`;
  }
  if (p.subscription) {
    return `Gói ${p.subscription.plan}`;
  }
  return `Giao dịch #${p.id}`;
}

function canRefundPayment(p: PaymentRecord): boolean {
  if (p.status !== 'SUCCEEDED') return false;
  if (p.subscription) {
    const days = (Date.now() - new Date(p.createdAt).getTime()) / (24 * 3_600_000);
    return days <= SUBSCRIPTION_REFUND_DAYS;
  }
  if (p.session) {
    const hours =
      (new Date(p.session.scheduledAt).getTime() - Date.now()) / 3_600_000;
    return hours > 24 && p.session.status !== 'CANCELED';
  }
  return false;
}

export default function PaymentsView() {
  const { token } = useAuth();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refundingId, setRefundingId] = useState<number | null>(null);
  const [subRefundLoading, setSubRefundLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [payData, subData] = await Promise.all([
        fetchMyPayments(token),
        fetchSubscriptionStatus(token),
      ]);
      setPayments(payData);
      setSubscription(subData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được lịch sử');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const { ready } = useRequireAuth();
  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  async function handleRefund(payment: PaymentRecord) {
    if (!token) return;
    const reason = window.prompt('Lý do hoàn tiền (tuỳ chọn):') ?? undefined;
    setRefundingId(payment.id);
    setError('');
    setSuccess('');
    try {
      const result = await requestPaymentRefund(token, payment.id, reason);
      setSuccess(result.message);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Hoàn tiền thất bại');
    } finally {
      setRefundingId(null);
    }
  }

  async function handleSubscriptionRefund() {
    if (!token) return;
    const ok = window.confirm(
      `Hoàn tiền gói subscription (trong ${SUBSCRIPTION_REFUND_DAYS} ngày) và hủy gói ngay?`,
    );
    if (!ok) return;
    const reason = window.prompt('Lý do hoàn tiền (tuỳ chọn):') ?? undefined;
    setSubRefundLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await requestSubscriptionRefund(token, reason);
      setSuccess(result.message);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Hoàn tiền thất bại');
    } finally {
      setSubRefundLoading(false);
    }
  }

  async function handleCancelAtPeriodEnd() {
    if (!token) return;
    const ok = window.confirm('Hủy subscription vào cuối kỳ hiện tại?');
    if (!ok) return;
    try {
      const res = await cancelSubscription(token);
      setSuccess(res.message);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Hủy subscription thất bại');
    }
  }

  const latestSubPayment = payments.find(
    (p) => p.subscription && p.status === 'SUCCEEDED',
  );
  const canSubRefund = latestSubPayment
    ? canRefundPayment(latestSubPayment)
    : false;

  if (loading) {
    return <div className="payments-page container page-loading">Đang tải...</div>;
  }

  return (
    <div className="payments-page container">
      <div className="payments-header">
        <h1>Lịch sử thanh toán</h1>
        <p>Xem giao dịch và yêu cầu hoàn tiền theo chính sách của nền tảng.</p>
      </div>

      {error && <div className="payments-alert payments-alert--error">{error}</div>}
      {success && <div className="payments-alert payments-alert--success">{success}</div>}

      {subscription && subscription.status !== 'CANCELED' && (
        <section className="payments-sub glass-panel">
          <h2>Gói đã mua: {subscription.plan}</h2>
          <p className="payments-sub-meta">
            Trạng thái: {subscription.status}
            {subscription.cancelAtPeriodEnd && ' · Sẽ hủy cuối kỳ'}
          </p>
          <div className="payments-sub-actions">
            {canSubRefund && (
              <button
                type="button"
                className="btn btn-outline"
                disabled={subRefundLoading}
                onClick={() => void handleSubscriptionRefund()}
              >
                {subRefundLoading ? 'Đang xử lý...' : 'Trả hàng & hoàn tiền'}
              </button>
            )}
            {!subscription.cancelAtPeriodEnd && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => void handleCancelAtPeriodEnd()}
              >
                Hủy cuối kỳ
              </button>
            )}
            <Link href="/pricing" className="btn btn-primary">
              Đổi gói
            </Link>
          </div>
          <p className="payments-policy">
            Hoàn tiền subscription: trong {SUBSCRIPTION_REFUND_DAYS} ngày kể từ thanh toán.
            Coaching: hủy trước 24 giờ được hoàn toàn bộ.
          </p>
        </section>
      )}

      {payments.length === 0 ? (
        <div className="payments-empty glass-panel">
          <p>Chưa có giao dịch nào.</p>
          <Link href="/pricing" className="btn btn-primary">
            Xem gói học
          </Link>
        </div>
      ) : (
        <div className="payments-table-wrap glass-panel">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Mô tả</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Ngày</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="payments-desc">{paymentTitle(p)}</div>
                    {p.refundAmountCents != null && (
                      <div className="payments-refund-meta">
                        Hoàn {formatMoney(p.refundAmountCents, p.currency)}
                        {p.refundedAt ? ` · ${formatDate(p.refundedAt)}` : ''}
                      </div>
                    )}
                  </td>
                  <td>{formatMoney(p.amountCents, p.currency)}</td>
                  <td>
                    <span className={`payments-status payments-status--${p.status.toLowerCase()}`}>
                      {statusLabel(p.status)}
                    </span>
                  </td>
                  <td>{formatDate(p.createdAt)}</td>
                  <td>
                    {canRefundPayment(p) && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={refundingId === p.id}
                        onClick={() => void handleRefund(p)}
                      >
                        {refundingId === p.id ? '...' : 'Hoàn tiền'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="payments-footer">
        <Link href="/profile">← Về hồ sơ</Link>
      </p>
    </div>
  );
}
