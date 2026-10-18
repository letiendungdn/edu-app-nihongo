'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

/** `/login?redirect=<đường dẫn hiện tại>` (giữ cả query, ví dụ `?plan=PRO`). */
export function loginUrlFor(returnPath: string): string {
  return `/login?redirect=${encodeURIComponent(returnPath)}`;
}

/**
 * Trang cần đăng nhập. Trả về `ready` = đã biết chắc người dùng đã đăng nhập.
 *
 * Bản cũ ở từng trang: `if (!isAuthenticated) router.replace('/login…')`. Ở lần render đầu
 * AuthProvider chưa đọc xong token từ localStorage (effect của trang con chạy TRƯỚC effect của
 * provider), nên người ĐÃ đăng nhập vẫn bị đẩy sang /login rồi mới quay lại. Phải chờ `authReady`.
 */
export function useRequireAuth(): { ready: boolean } {
  const { authReady, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authReady || isAuthenticated) return;
    const { pathname, search } = window.location;
    router.replace(loginUrlFor(pathname + search));
  }, [authReady, isAuthenticated, router]);

  return { ready: authReady && isAuthenticated };
}
