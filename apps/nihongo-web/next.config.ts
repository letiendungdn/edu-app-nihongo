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

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ['@edu/vocab-images', 'mapbox-gl'],
  // Tránh lỗi useContext khi monorepo có nhiều bản React (Next 15 devtools)
  experimental: {
    devtoolSegmentExplorer: false,
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
