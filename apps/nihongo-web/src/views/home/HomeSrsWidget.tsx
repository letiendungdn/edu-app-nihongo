'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api-client';

interface SrsStats {
  total: number;
  dueToday: number;
  mastered: number;
  learning: number;
}

export default function HomeSrsWidget() {
  const { isAuthenticated, token } = useAuth();

  const { data: stats } = useQuery<SrsStats>({
    queryKey: ['srs-stats-home'],
    queryFn: () => apiRequest<SrsStats>('/progress/srs/stats'),
    enabled: isAuthenticated && !!token,
    staleTime: 60_000,
  });

  if (!isAuthenticated) {
    return (
      <div className="home-srs-widget home-srs-widget--guest">
        <div className="home-srs-widget__icon japanese-text">憶</div>
        <div className="home-srs-widget__body">
          <p className="home-srs-widget__title">Ôn tập SRS thông minh</p>
          <p className="home-srs-widget__sub">Đăng nhập để lưu tiến độ và nhận thẻ ôn tập hàng ngày.</p>
        </div>
        <Link href="/login?redirect=/srs" className="btn btn-primary btn-sm home-srs-widget__cta">
          Đăng nhập
        </Link>
      </div>
    );
  }

  const due = stats?.dueToday ?? 0;
  const mastered = stats?.mastered ?? 0;
  const total = stats?.total ?? 0;

  return (
    <Link href="/srs" className="home-srs-widget home-srs-widget--auth">
      <div className="home-srs-widget__icon japanese-text">{due > 0 ? '憶' : '✓'}</div>
      <div className="home-srs-widget__body">
        <p className="home-srs-widget__title">
          {due > 0 ? (
            <><strong className="home-srs-widget__due">{due}</strong> thẻ cần ôn hôm nay</>
          ) : (
            'Đã ôn xong hôm nay!'
          )}
        </p>
        <p className="home-srs-widget__sub">
          {total > 0
            ? `${mastered}/${total} từ đã thuộc`
            : 'Thêm bài học vào bộ thẻ để bắt đầu SRS'}
        </p>
      </div>
      <span className="home-srs-widget__arrow">→</span>
    </Link>
  );
}
