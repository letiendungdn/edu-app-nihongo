import { getStoredToken, refreshAccessToken } from './api-client';

const API_BASE = '/api';

export interface AuthedStreamHandlers<T> {
  onMessage: (data: T) => void;
  /** Vừa (nối lại) thành công. Tin gửi trong lúc mất kết nối không đi qua stream: nên tải lại. */
  onOpen?: () => void;
}

export interface AuthedStreamOptions {
  /** Đổi được trong test để không phải chờ thật. */
  sleep?: (ms: number) => Promise<void>;
  fetchImpl?: typeof fetch;
}

/** 1, 2, 4, 8, 16, 30, 30… giây */
export function backoffMs(attempt: number): number {
  return Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5));
}

/** 5xx, 408, 429 thì thử lại; các 4xx khác (403 không phải thành viên, 404…) thì dừng hẳn. */
export function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

/** Gateway gửi `data: {"data": <tin>}`; chấp nhận cả tin không bọc. */
export function parseSseData<T>(raw: string): T | null {
  try {
    const json = JSON.parse(raw) as unknown;
    if (json && typeof json === 'object' && 'data' in json) return (json as { data: T }).data;
    return json as T;
  } catch {
    return null;
  }
}

/**
 * SSE có đăng nhập, đọc bằng `fetch` + ReadableStream.
 *
 * Không dùng `EventSource`: nó không gửi được header `Authorization`, nên bản cũ luôn nhận 401
 * và chat web chỉ cập nhật nhờ polling. Tự nối lại với backoff; 401 thì refresh token rồi mở lại.
 * Trả về hàm hủy (gọi khi rời màn hình).
 */
export function openAuthedStream<T>(
  path: string,
  handlers: AuthedStreamHandlers<T>,
  options: AuthedStreamOptions = {},
): () => void {
  const controller = new AbortController();
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const doFetch = options.fetchImpl ?? fetch;

  void (async () => {
    let attempt = 0;
    let token = getStoredToken();
    let refreshedOnce = false;
    while (!controller.signal.aborted) {
      let retry = true;
      try {
        const res = await doFetch(`${API_BASE}${path}`, {
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
          cache: 'no-store',
        });

        if (res.status === 401) {
          // Refresh MỘT lần; token mới vẫn 401 thì dừng, không refresh vòng vòng
          if (refreshedOnce) return;
          const fresh = await refreshAccessToken();
          if (fresh) {
            refreshedOnce = true;
            token = fresh;
            continue;
          }
          if (!getStoredToken()) return; // refresh bị từ chối → đã đăng xuất
          throw new Error('refresh lỗi mạng'); // còn phiên: chờ rồi thử lại
        }
        if (!res.ok || !res.body) {
          retry = isRetryableStatus(res.status);
          throw new Error(`SSE ${res.status}`);
        }

        handlers.onOpen?.();
        attempt = 0;
        refreshedOnce = false;
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break; // server đóng stream (deploy, restart pod): nối lại
          buffer += value.replace(/\r\n/g, '\n');
          // Mỗi sự kiện kết thúc bằng một dòng trống
          let sep: number;
          while ((sep = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const data = block
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trimStart())
              .join('\n');
            if (!data) continue;
            const parsed = parseSseData<T>(data);
            if (parsed != null) handlers.onMessage(parsed);
          }
        }
      } catch {
        if (controller.signal.aborted || !retry) return;
      }
      if (controller.signal.aborted) return;
      await sleep(backoffMs(attempt));
      attempt += 1;
    }
  })();

  return () => controller.abort();
}
