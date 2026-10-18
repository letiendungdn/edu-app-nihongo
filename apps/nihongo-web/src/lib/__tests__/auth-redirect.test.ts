import { describe, expect, it } from 'vitest';
import { resolvePostAuthRedirect, safeInternalPath } from '../auth-redirect';
import { loginUrlFor } from '../../hooks/useRequireAuth';

describe('redirect sau đăng nhập', () => {
  it.each(['//evil.com', '//evil.com/login', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', ' //evil.com'])(
    'chặn đường dẫn ra ngoài: %s',
    (raw) => {
      expect(safeInternalPath(raw)).toBeNull();
      expect(resolvePostAuthRedirect('USER', raw)).toBe('/');
    },
  );

  it('giữ nguyên đường dẫn nội bộ kèm query', () => {
    expect(resolvePostAuthRedirect('USER', '/subscribe?plan=PRO')).toBe('/subscribe?plan=PRO');
  });

  it('admin không có redirect → /admin', () => {
    expect(resolvePostAuthRedirect('ADMIN', null)).toBe('/admin');
  });

  it('loginUrlFor mã hóa query của trang cũ (bản cũ ghép thẳng ?plan= vào giữa ?redirect=)', () => {
    const url = loginUrlFor('/subscribe?plan=PRO&coupon=A');
    expect(new URLSearchParams(url.split('?')[1]).get('redirect')).toBe('/subscribe?plan=PRO&coupon=A');
  });
});
