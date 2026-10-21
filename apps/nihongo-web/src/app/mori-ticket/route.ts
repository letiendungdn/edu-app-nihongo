import { signPlayback } from '@/server/moriPlayback';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let file = '';
  try {
    const body = await request.json() as { file?: unknown };
    if (typeof body.file === 'string') file = body.file;
  } catch {
    return Response.json({ message: 'Thiếu đường dẫn video' }, { status: 400 });
  }
  if (!file || file.includes('..') || file.includes('\0') || file.startsWith('/')) {
    return Response.json({ message: 'Đường dẫn không hợp lệ' }, { status: 400 });
  }
  return Response.json({ token: signPlayback(file) });
}
