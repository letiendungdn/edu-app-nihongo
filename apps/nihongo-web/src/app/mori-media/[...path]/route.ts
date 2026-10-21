import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { isInlineMediaRequest, verifyPlayback } from '@/server/moriPlayback';

export const runtime = 'nodejs';

const TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/** Đường dẫn tuyệt đối nằm trong MORI_COURSE_DIR, hoặc null nếu ra ngoài thư mục khóa. */
export function resolveCourseFile(root: string, segments: string[]): string | null {
  const rel = segments.map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  }).join('/');
  if (!rel || rel.includes('\0')) return null;
  const base = path.resolve(root);
  const abs = path.resolve(base, rel);
  if (abs !== base && !abs.startsWith(base + path.sep)) return null;
  return abs;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const root = process.env.MORI_COURSE_DIR;
  if (!root) return new Response('Chưa cấu hình MORI_COURSE_DIR', { status: 404 });

  const { path: segments } = await context.params;
  const rel = segments.map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  }).join('/');
  const token = new URL(request.url).searchParams.get('t') ?? '';
  if (!verifyPlayback(token, rel) || !isInlineMediaRequest(request.headers)) {
    return new Response('Tài liệu chỉ mở trong trang học', { status: 403 });
  }

  const abs = resolveCourseFile(root, segments);
  if (!abs) return new Response('Not found', { status: 404 });

  let fileStat;
  try {
    fileStat = await stat(abs);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (!fileStat.isFile()) return new Response('Not found', { status: 404 });

  const ext = path.extname(abs).toLowerCase();
  if (ext === '.mp4' || ext === '.m4v' || ext === '.webm' || ext === '.mkv' || ext === '.mov') {
    return new Response('Video phát qua HLS', { status: 404 });
  }

  const type = TYPES[ext] ?? 'application/octet-stream';
  const size = fileStat.size;
  const range = request.headers.get('range');
  const common = {
    'Accept-Ranges': 'bytes',
    'Content-Type': type,
    'Cache-Control': 'private, no-store',
    'Content-Disposition': 'inline',
  };

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) return new Response('Range không hợp lệ', { status: 416 });
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : size - 1;
    if (start > end || start >= size) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      });
    }
    const stream = createReadStream(abs, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        ...common,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(end - start + 1),
      },
    });
  }

  const stream = createReadStream(abs);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: { ...common, 'Content-Length': String(size) },
  });
}
