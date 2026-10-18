/**
 * Chỉ nhận đường dẫn NỘI BỘ. `//evil.com` và `/\evil.com` cũng bắt đầu bằng `/` nhưng trình
 * duyệt hiểu là sang tên miền khác (open redirect: link đăng nhập thật dẫn về trang lừa đảo).
 */
export function safeInternalPath(raw?: string | null): string | null {
  const path = raw?.trim();
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null;
  try {
    // Phân giải thử trên một origin giả: nếu ra origin khác nghĩa là đường dẫn trốn được ra ngoài
    const url = new URL(path, 'https://app.invalid');
    if (url.origin !== 'https://app.invalid') return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

/** Sau đăng nhập: ưu tiên redirect tường minh (nội bộ), admin mặc định vào /admin */
export function resolvePostAuthRedirect(
  role: string,
  explicitRedirect?: string | null,
): string {
  const redirect = safeInternalPath(explicitRedirect);
  if (redirect && redirect !== '/') {
    return redirect;
  }
  if (role === 'ADMIN') {
    return '/admin';
  }
  return '/';
}
