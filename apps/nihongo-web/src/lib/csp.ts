/**
 * Content-Security-Policy cho mọi trang HTML (middleware.ts gắn vào response).
 *
 * script-src dùng nonce + 'strict-dynamic': chỉ script có nonce của request này (do Next/layout sinh) mới chạy,
 * script do chúng nạp tiếp (chunk Next, Stripe, Mapbox) được tin theo. Script XSS chèn vào trang không có nonce → bị chặn.
 * Xem docs/learn-devsecops.md mục 11.
 */
export function buildCsp(nonce: string, opts: { dev: boolean; secure: boolean }): string {
  // Trên máy dev (http): signaling :3002, LiveKit ws :7880, Keycloak auth.localhost, máy ảo Android 10.0.2.2
  const devOrigins = opts.secure
    ? []
    : ['http://localhost:*', 'ws://localhost:*', 'http://*.localhost:*', 'http://10.0.2.2:*', 'ws://10.0.2.2:*'];
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // 'unsafe-eval' chỉ khi `next dev` (React Refresh cần eval)
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(opts.dev ? ["'unsafe-eval'"] : [])],
    // style inline: React style={{…}}, Mapbox, thư viện UI. Rủi ro thấp hơn script nhiều.
    // + Google Fonts (globals.css @import fonts.googleapis.com; file font tải từ fonts.gstatic.com qua font-src https:)
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'blob:', 'https:', ...devOrigins],
    'media-src': ["'self'", 'data:', 'blob:', 'https:', ...devOrigins],
    'font-src': ["'self'", 'data:', 'https:'],
    // API, signaling, LiveKit, Mapbox, Stripe, Google, Azure TTS
    'connect-src': ["'self'", 'https:', 'wss:', ...devOrigins],
    // YouTube, Stripe 3DS, Google đăng nhập
    'frame-src': ["'self'", 'https:'],
    // Mapbox dùng worker từ blob:, PWA service worker
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(' ')}`);
  if (opts.secure) parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}

/** Nonce ngẫu nhiên 128 bit, base64 (chạy được ở Edge runtime). */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
