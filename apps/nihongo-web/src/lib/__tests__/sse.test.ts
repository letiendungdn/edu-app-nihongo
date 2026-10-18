import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  getStoredToken: vi.fn<() => string | null>(),
  refreshAccessToken: vi.fn<() => Promise<string | null>>(),
}));
vi.mock('../api-client', () => auth);

import { backoffMs, isRetryableStatus, openAuthedStream, parseSseData } from '../sse';

/** Response SSE giả, body chia thành các mảnh tùy ý (mảnh có thể cắt ngang một sự kiện). */
function sseResponse(chunks: string[], status = 200): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { 'Content-Type': 'text/event-stream' } });
}

const event = (msg: object) => `id: 1\ndata: ${JSON.stringify({ data: msg })}\n\n`;

beforeEach(() => {
  vi.clearAllMocks();
  auth.getStoredToken.mockReturnValue('tok-1');
});

describe('các hàm nhỏ', () => {
  it('backoff 1-2-4-8-16-30-30 giây', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(backoffMs)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  });

  it('thử lại với 5xx, 408, 429; dừng với 403, 404', () => {
    expect([500, 502, 408, 429].every(isRetryableStatus)).toBe(true);
    expect([400, 403, 404].some(isRetryableStatus)).toBe(false);
  });

  it('parse cả tin bọc {data} lẫn tin trần, JSON hỏng → null', () => {
    expect(parseSseData('{"data":{"id":7}}')).toEqual({ id: 7 });
    expect(parseSseData('{"id":8}')).toEqual({ id: 8 });
    expect(parseSseData('{hỏng')).toBeNull();
  });
});

describe('openAuthedStream', () => {
  it('gửi Bearer token (EventSource cũ không gửi được → 401) và nhận tin bị cắt giữa các mảnh', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      sseResponse([event({ id: 1 }).slice(0, 15), event({ id: 1 }).slice(15) + event({ id: 2 }).slice(0, 4), event({ id: 2 }).slice(4)]),
    ).mockReturnValue(new Promise(() => {}));
    const got: unknown[] = [];
    const stop = openAuthedStream('/community/rooms/3/stream', { onMessage: (m) => got.push(m) }, { fetchImpl, sleep: async () => {} });

    await vi.waitFor(() => expect(got).toEqual([{ id: 1 }, { id: 2 }]));
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/community/rooms/3/stream');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
    stop();
  });

  it('server đóng stream → nối lại và báo onOpen lần nữa (để tải lại tin bị lỡ)', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(sseResponse([event({ id: 1 })]))
      .mockResolvedValueOnce(sseResponse([event({ id: 2 })]))
      .mockReturnValue(new Promise(() => {}));
    const onOpen = vi.fn();
    const got: unknown[] = [];
    const sleeps: number[] = [];
    const stop = openAuthedStream('/x', { onMessage: (m) => got.push(m), onOpen }, {
      fetchImpl,
      sleep: async (ms) => void sleeps.push(ms),
    });

    await vi.waitFor(() => expect(got).toEqual([{ id: 1 }, { id: 2 }]));
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(sleeps[0]).toBe(1000);
    stop();
  });

  it('401 → refresh một lần rồi mở lại với token mới', async () => {
    auth.refreshAccessToken.mockResolvedValue('tok-2');
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(sseResponse([event({ id: 9 })]))
      .mockReturnValue(new Promise(() => {}));
    const got: unknown[] = [];
    const stop = openAuthedStream('/x', { onMessage: (m) => got.push(m) }, { fetchImpl, sleep: async () => {} });

    await vi.waitFor(() => expect(got).toEqual([{ id: 9 }]));
    const second = fetchImpl.mock.calls[1][1] as RequestInit;
    expect((second.headers as Record<string, string>).Authorization).toBe('Bearer tok-2');
    stop();
  });

  it('token mới vẫn 401 → dừng, không refresh vòng vòng', async () => {
    auth.refreshAccessToken.mockResolvedValue('tok-2');
    const fetchImpl = vi.fn().mockImplementation(async () => new Response(null, { status: 401 }));
    openAuthedStream('/x', { onMessage: () => {} }, { fetchImpl, sleep: async () => {} });

    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(auth.refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('refresh bị từ chối (token đã bị xóa) → dừng', async () => {
    auth.refreshAccessToken.mockImplementation(async () => {
      auth.getStoredToken.mockReturnValue(null);
      return null;
    });
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    openAuthedStream('/x', { onMessage: () => {} }, { fetchImpl, sleep: async () => {} });
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('403 (không phải thành viên phòng) → dừng hẳn, không dội request', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    openAuthedStream('/x', { onMessage: () => {} }, { fetchImpl, sleep: async () => {} });
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('503 → chờ rồi thử lại', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(sseResponse([event({ id: 3 })]))
      .mockReturnValue(new Promise(() => {}));
    const got: unknown[] = [];
    const stop = openAuthedStream('/x', { onMessage: (m) => got.push(m) }, { fetchImpl, sleep: async () => {} });
    await vi.waitFor(() => expect(got).toEqual([{ id: 3 }]));
    stop();
  });

  it('hủy (rời màn hình) → abort request đang mở', async () => {
    let signal: AbortSignal | undefined;
    const fetchImpl = vi.fn((_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return new Promise<Response>(() => {});
    });
    const stop = openAuthedStream('/x', { onMessage: () => {} }, { fetchImpl: fetchImpl as never });
    await vi.waitFor(() => expect(signal).toBeDefined());
    stop();
    expect(signal!.aborted).toBe(true);
  });
});
