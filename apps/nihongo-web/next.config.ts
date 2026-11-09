import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';
import path from 'path';

const apiUrl = process.env.API_URL ?? 'http://localhost:3000';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.ENABLE_PWA !== 'true',
  register: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/.*\/api\/vocabularies.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'vocab-api-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60,
          },
        },
      },
    ],
  },
});

const monorepoRoot = path.join(__dirname, '../..');

// Header bảo mật cho mọi trang (OWASP ZAP baseline, docs/learn-devsecops.md). Đặt ở app thay vì nginx
// để chạy sau Ingress K8s cũng có. CSP có nonce theo từng request nên đặt ở src/middleware.ts (src/lib/csp.ts).
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Chỉ trang cùng site được nhúng tài nguyên của app (chống Spectre đọc chéo, ZAP 90004)
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
  // Gọi video cần camera/micro; trang bản đồ cần vị trí. Còn lại tắt.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), payment=(self), usb=(), serial=(), bluetooth=()' },
  // Cô lập cửa sổ (chống Spectre); allow-popups để cửa sổ đăng nhập Google/thanh toán vẫn trả kết quả về được
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false, // bỏ "X-Powered-By: Next.js" (lộ công nghệ, ZAP 10037)
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ['@edu/vocab-images', 'mapbox-gl'],
  // Tránh lỗi useContext khi monorepo có nhiều bản React (Next 15 devtools)
  experimental: {
    devtoolSegmentExplorer: false,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async rewrites() {
    // Luyện câu AI chạy trên Next (Ollama), không proxy sang Nest.
    return [
      {
        source: '/api/:path((?!sentence-practice$).*)',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig as Parameters<typeof withPWA>[0]);
