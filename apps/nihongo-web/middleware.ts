import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, createNonce } from '@/lib/csp';

/**
 * Nằm ở gốc apps/nihongo-web (không phải src/): build tạo symlink app → src/app nên Next coi gốc là thư mục dự án.
 * Mỗi request trang HTML: sinh nonce mới, gắn CSP. Next đọc CSP trong REQUEST header để tự gắn nonce vào
 * các thẻ <script> nó sinh; layout đọc `x-nonce` cho script inline của mình.
 */
export function middleware(request: NextRequest) {
  const nonce = createNonce();
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV !== 'production', secure: proto === 'https' });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Chỉ trang HTML; bỏ API, file tĩnh, media, prefetch của router
      source: '/((?!api|_next/static|_next/image|mori-hls|mori-media|mori-ticket|media|icons|favicon.ico|sw.js|workbox-|manifest).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
