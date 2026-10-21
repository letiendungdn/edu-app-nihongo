import { createHmac, timingSafeEqual } from 'node:crypto';

const TTL_SEC = 6 * 60 * 60;

export function playbackSecret(): string {
  return process.env.MORI_PLAYBACK_SECRET || process.env.JWT_SECRET || 'mori-dev-playback';
}

export function signPlayback(file: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + TTL_SEC;
  const payload = Buffer.from(JSON.stringify({ f: file, e: exp })).toString('base64url');
  const sig = createHmac('sha256', playbackSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function readPlayback(token: string, now = Date.now()): string | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', playbackSecret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { f?: unknown; e?: unknown };
    if (typeof data.f !== 'string' || typeof data.e !== 'number') return null;
    if (data.e < Math.floor(now / 1000)) return null;
    return data.f;
  } catch {
    return null;
  }
}

export function verifyPlayback(token: string, file: string, now = Date.now()): boolean {
  return readPlayback(token, now) === file;
}

const INLINE_DEST = new Set(['video', 'image', 'iframe', 'embed', 'object']);

/** Thẻ video/ảnh/PDF, hoặc hls.js (fetch cors, dest rỗng). Mở URL trên thanh địa chỉ là dest=document. */
export function isInlineMediaRequest(headers: Headers): boolean {
  const dest = headers.get('sec-fetch-dest');
  if (dest === 'document' || dest == null) return false;
  if (INLINE_DEST.has(dest)) return true;
  return dest === 'empty' && headers.get('sec-fetch-mode') === 'cors';
}
