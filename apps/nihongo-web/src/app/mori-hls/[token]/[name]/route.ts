import { readHlsFile, isHlsName, prepareHls } from '@/server/moriHls';
import { isInlineMediaRequest, readPlayback } from '@/server/moriPlayback';
import { resolveCourseFile } from '@/app/mori-media/[...path]/route';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string; name: string }> },
) {
  if (!isInlineMediaRequest(request.headers)) {
    return new Response('Video chỉ phát trong trang học', { status: 403 });
  }
  const root = process.env.MORI_COURSE_DIR;
  if (!root) return new Response('Chưa cấu hình MORI_COURSE_DIR', { status: 404 });

  const { token, name } = await context.params;
  if (!isHlsName(name)) return new Response('Not found', { status: 404 });

  const rel = readPlayback(token);
  if (!rel) return new Response('Link phát đã hết hạn', { status: 403 });
  const abs = resolveCourseFile(root, rel.split('/'));
  if (!abs) return new Response('Not found', { status: 404 });

  try {
    const dir = await prepareHls(abs);
    const body = await readHlsFile(dir, name);
    if (!body) return new Response('Not found', { status: 404 });
    const playlist = name === 'index.m3u8';
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': playlist ? 'application/vnd.apple.mpegurl' : 'video/mp2t',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không tạo được HLS';
    return new Response(message, { status: 500 });
  }
}
