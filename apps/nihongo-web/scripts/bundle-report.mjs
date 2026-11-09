#!/usr/bin/env node
/**
 * Báo cáo bundle sau `next build`: thư viện nặng nằm ở chunk nào, bao nhiêu trang phải tải nó,
 * và có lọt vào layout gốc (trang nào cũng tải) không.
 *
 *   npm run build -w @edu/nihongo-web
 *   npm run bundle:report -w @edu/nihongo-web
 *
 * Thoát mã 1 nếu thư viện nằm trong ROOT_FORBIDDEN lọt vào layout gốc, để dùng được trong CI.
 * Dò thư viện bằng một chuỗi đặc trưng có trong mã đã nén (tên biến bị đổi, chuỗi thì không).
 * Xem docs/learn-webpack.md.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const nextDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.next');
const manifestPath = path.join(nextDir, 'app-build-manifest.json');

/** Thư viện → chuỗi đặc trưng tìm trong chunk. */
const LIBRARIES = {
  'socket.io-client': 'socket.io',
  'oidc-client-ts': 'signinRedirect',
  'hls.js': 'hlsjs',
  recharts: 'recharts',
  'mapbox-gl': 'mapbox-gl',
  fabric: 'fabric.js',
  jspdf: 'jsPDF',
  html2canvas: 'html2canvas',
};

/** Không được nằm trong layout gốc: chỉ vài trang cần. */
const ROOT_FORBIDDEN = ['socket.io-client', 'oidc-client-ts', 'hls.js', 'recharts', 'mapbox-gl', 'fabric', 'jspdf', 'html2canvas'];

if (!existsSync(manifestPath)) {
  console.error('Chưa có .next/app-build-manifest.json. Chạy `npm run build -w @edu/nihongo-web` trước.');
  process.exit(2);
}

const pages = JSON.parse(readFileSync(manifestPath, 'utf8')).pages;
const cache = new Map();
const read = (chunk) => {
  if (!cache.has(chunk)) {
    const file = path.join(nextDir, chunk);
    cache.set(chunk, existsSync(file) ? readFileSync(file, 'utf8') : '');
  }
  return cache.get(chunk);
};

/** Mọi file JS trong .next/static/chunks, kể cả chunk tải động (import(), next/dynamic): manifest không gắn
 *  chunk động vào trang nào, nên phải quét thư mục. */
const listChunks = (dir) =>
  readdirSync(path.join(nextDir, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listChunks(`${dir}/${e.name}`) : e.name.endsWith('.js') ? [`${dir}/${e.name}`] : [],
  );
const allChunks = listChunks('static/chunks');
const rootChunks = new Set((pages['/layout'] ?? []).filter((c) => c.endsWith('.js')));
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

const rows = [];
for (const [lib, signature] of Object.entries(LIBRARIES)) {
  const chunks = allChunks.filter((c) => read(c).includes(signature));
  if (chunks.length === 0) continue;
  const raw = chunks.reduce((sum, c) => sum + statSync(path.join(nextDir, c)).size, 0);
  const gzip = chunks.reduce((sum, c) => sum + gzipSync(read(c)).length, 0);
  const usedBy = Object.entries(pages)
    .filter(([page, list]) => page !== '/layout' && list.some((c) => chunks.includes(c)))
    .map(([page]) => page);
  const inRoot = chunks.some((c) => rootChunks.has(c));
  const where = inRoot ? 'MỌI TRANG' : usedBy.length > 0 ? `${usedBy.length} trang` : 'khi cần';
  const example = usedBy[0] ?? '(import động: chỉ tải khi code gọi tới)';
  rows.push({ lib, raw, gzip, pages: where, inRoot, example });
}

const rootRaw = [...rootChunks].reduce((sum, c) => sum + statSync(path.join(nextDir, c)).size, 0);
console.log(`Layout gốc (trang nào cũng tải): ${rootChunks.size} chunk, ${kb(rootRaw)} chưa nén\n`);
console.log('Thư viện'.padEnd(20), 'Chưa nén'.padStart(10), 'Gzip'.padStart(10), '  Tải ở     Ví dụ');
for (const r of rows.sort((a, b) => b.raw - a.raw)) {
  console.log(r.lib.padEnd(20), kb(r.raw).padStart(10), kb(r.gzip).padStart(10), ' ', r.pages.padEnd(9), r.example);
}

const leaked = rows.filter((r) => r.inRoot && ROOT_FORBIDDEN.includes(r.lib));
if (leaked.length > 0) {
  console.error(`\nLỖI: ${leaked.map((r) => r.lib).join(', ')} nằm trong layout gốc. Dùng import() hoặc next/dynamic ở chỗ cần nó.`);
  process.exit(1);
}
console.log('\nOK: không thư viện nặng nào nằm trong layout gốc.');
