'use client';

import Link from 'next/link';
import SupportChatPanel from '@/components/SupportChatPanel';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useSupportThreadQuery } from '@/hooks/queries';

export default function SupportPage() {
  const { ready } = useRequireAuth();
  const { data, isLoading, refetch } = useSupportThreadQuery(ready);

  if (!ready) {
    return <div className="page-loading">Đang tải...</div>;
  }

  return (
    <div className="container" style={{ padding: '1.5rem 1rem 3rem' }}>
      <p style={{ marginBottom: '1rem' }}>
        <Link href="/">← Trang chủ</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>Liên hệ hỗ trợ</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        Nhắn tin trực tiếp với admin — thanh toán, gói học, lỗi kỹ thuật, v.v.
      </p>

      {isLoading ? (
        <div className="page-loading">Đang tải hội thoại...</div>
      ) : (
        <SupportChatPanel
          threadId={data?.thread.id ?? null}
          initialMessages={data?.messages ?? []}
          title="Chat với Admin"
          subtitle="Phản hồi trong giờ hành chính hoặc sớm nhất có thể"
          onSent={() => void refetch()}
        />
      )}
    </div>
  );
}
