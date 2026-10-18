import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, getStoredToken, refreshAccessToken, setStoredToken } from '../api-client';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.useFakeTimers({ toFake: ['setTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Chạy hết các lần chờ thử lại (setTimeout) cho tới khi promise xong. */
async function settle<T>(p: Promise<T>): Promise<T> {
  let done = false;
  p.finally(() => (done = true)).catch(() => {});
  for (let i = 0; i < 200 && !done; i += 1) await vi.advanceTimersByTimeAsync(5000);
  return p;
}

describe('token', () => {
  it('truyền token: null vẫn dùng token đã lưu (bản cũ gửi request KHÔNG có token → 401)', async () => {
    setStoredToken('tok-saved');
    fetchMock.mockResolvedValue(json(200, { success: true, data: 1 }));
    await apiRequest('/x', { token: null });
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer tok-saved');
  });
});

describe('thử lại', () => {
  it('GET lỗi mạng → thử lại', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network')).mockResolvedValue(json(200, { success: true, data: 'ok' }));
    await expect(settle(apiRequest('/x'))).resolves.toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('POST lỗi mạng → KHÔNG tự gửi lại (server có thể đã xử lý → tạo trùng)', async () => {
    fetchMock.mockRejectedValue(new TypeError('network'));
    await expect(settle(apiRequest('/messages', { method: 'POST', body: '{}' }))).rejects.toThrow('network');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('POST 500 → KHÔNG tự gửi lại', async () => {
    fetchMock.mockImplementation(async () => json(500, { success: false, error: { message: 'lỗi' } }));
    await expect(settle(apiRequest('/subscriptions', { method: 'POST', body: '{}' }))).rejects.toThrow('lỗi');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('POST gặp 503 của nginx (gateway đang khởi động, request chưa tới service) → chờ rồi gửi lại', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('<html>503</html>', { status: 503, headers: { 'Retry-After': '1' } }))
      .mockResolvedValue(json(201, { success: true, data: 'created' }));
    await expect(settle(apiRequest('/x', { method: 'POST', body: '{}' }))).resolves.toBe('created');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('502 do chính API trả (JSON lỗi) → báo lỗi ngay, không chờ ~90 giây', async () => {
    // Response mới cho mỗi lần gọi (body của một Response chỉ đọc được một lần)
    fetchMock.mockImplementation(async () => json(502, { success: false, error: { message: 'Dịch vụ thanh toán lỗi' } }));
    await expect(settle(apiRequest('/payment-methods'))).rejects.toThrow('Dịch vụ thanh toán lỗi');
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(3); // chỉ các lần thử lại thường của GET
  });
});

describe('refresh token', () => {
  beforeEach(() => setStoredToken('tok-old'));

  it('lỗi mạng khi refresh → GIỮ phiên (bản cũ đăng xuất mỗi lần mạng chập chờn)', async () => {
    fetchMock.mockRejectedValue(new TypeError('network'));
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(getStoredToken()).toBe('tok-old');
  });

  it.each([502, 503, 429])('refresh trả %i → giữ phiên', async (status) => {
    fetchMock.mockResolvedValue(json(status, {}));
    await refreshAccessToken();
    expect(getStoredToken()).toBe('tok-old');
  });

  it('server từ chối refresh token (401) → đăng xuất', async () => {
    fetchMock.mockResolvedValue(json(401, {}));
    await refreshAccessToken();
    expect(getStoredToken()).toBeNull();
  });

  it('401 → refresh → gửi lại một lần với token mới', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { success: false }))
      .mockResolvedValueOnce(json(200, { success: true, data: { access_token: 'tok-new' } }))
      .mockResolvedValueOnce(json(200, { success: true, data: 'ok' }));
    await expect(apiRequest('/me')).resolves.toBe('ok');
    expect((fetchMock.mock.calls[2][1].headers as Headers).get('Authorization')).toBe('Bearer tok-new');
    expect(getStoredToken()).toBe('tok-new');
  });
});
