import type { ApiErrorBody } from '../types/api';
import { ApiError } from '../types/api';

const API_BASE = '/api';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 400;
/**
 * 502/503 khi gateway đang khởi động (vd. vừa bật lại Docker): nginx trả 503 + Retry-After.
 * Chờ tối đa ~90 giây thay vì báo lỗi sau vài trăm ms.
 */
const STARTUP_MAX_WAITS = 30;
const STARTUP_DEFAULT_WAIT_MS = 3000;
const TOKEN_EVENT = 'nihongo-auth-token';

export type RequestOptions = RequestInit & {
  /**
   * Token cũ còn để tương thích. Không truyền hoặc truyền null đều dùng token đang lưu: bản cũ
   * coi null là "cố ý không gửi token", nên lời gọi chạy lúc context chưa đọc xong token
   * (render đầu) bị 401 dù người dùng đã đăng nhập.
   */
  token?: string | null;
  /** Số lần thử lại khi lỗi mạng / 5xx. Mặc định chỉ GET, HEAD, OPTIONS được thử lại. */
  retries?: number;
  credentials?: RequestCredentials;
  /** Internal: already attempted refresh after 401 */
  _authRetried?: boolean;
};

interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

interface ApiErrorEnvelope {
  success: false;
  error?: { code?: string; message?: string };
  message?: string | string[];
}

function startupWaitMs(res: Response): number {
  const seconds = Number(res.headers.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds * 1000, 10_000)
    : STARTUP_DEFAULT_WAIT_MS;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseErrorMessage(
  body: ApiErrorBody | ApiErrorEnvelope,
  status: number,
): string {
  if ('error' in body && body.error?.message) {
    return body.error.message;
  }
  if (Array.isArray(body.message)) return body.message.join(', ');
  if (body.message) return body.message;
  return `API error: ${status}`;
}

function shouldSkipRefresh(path: string): boolean {
  return (
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/oidc') ||
    path.startsWith('/auth/google') ||
    path.startsWith('/auth/refresh') ||
    path.startsWith('/auth/forgot-password') ||
    path.startsWith('/auth/reset-password')
  );
}

let refreshInFlight: Promise<string | null> | null = null;

/** Server thật sự từ chối refresh token (hết hạn, bị thu hồi) → phải đăng xuất. */
function isRefreshRejected(status: number): boolean {
  return status === 400 || status === 401 || status === 403;
}

/**
 * Xoay access JWT bằng refresh cookie HttpOnly. Chỉ đăng xuất khi server TỪ CHỐI refresh token.
 * Lỗi mạng, 502/503 lúc gateway khởi động, 429 → giữ phiên (bản cũ đăng xuất người dùng mỗi lần
 * mạng chập chờn).
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        if (isRefreshRejected(res.status)) setStoredToken(null);
        return null;
      }
      const json = (await res.json()) as
        | ApiSuccessEnvelope<{ access_token?: string }>
        | { access_token?: string };
      const data =
        json && typeof json === 'object' && 'success' in json && json.success
          ? json.data
          : (json as { access_token?: string });
      const token = data?.access_token ?? null;
      if (token) setStoredToken(token);
      return token;
    } catch {
      return null; // lỗi mạng: giữ phiên, lần sau thử lại
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const {
    token,
    // POST/PATCH/DELETE không tự gửi lại: lỗi mạng có thể xảy ra SAU khi server đã xử lý xong,
    // gửi lại sẽ tạo trùng (tin nhắn, subscription…). Nơi nào an toàn thì tự truyền `retries`.
    retries = IDEMPOTENT_METHODS.has(method) ? MAX_RETRIES : 0,
    credentials,
    _authRetried,
    ...init
  } = options;
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const bearer = token || getStoredToken(); // null, undefined hay '' đều dùng token đã lưu
  if (bearer) {
    headers.set('Authorization', `Bearer ${bearer}`);
  }

  let lastError: unknown;
  let startupWaits = 0;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
        ...(credentials ? { credentials } : {}),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiErrorEnvelope;
        const message = parseErrorMessage(body, res.status);

        if (
          res.status === 401 &&
          !_authRetried &&
          !shouldSkipRefresh(path)
        ) {
          const next = await refreshAccessToken();
          if (next) {
            return apiRequest<T>(path, {
              ...options,
              token: next,
              _authRetried: true,
              retries: 0,
            });
          }
        }

        // Gateway chưa sẵn sàng: chờ theo Retry-After, không tính vào số lần thử thường.
        // 503 (nginx: upstream chưa lên) = request chưa tới service → an toàn cho cả POST.
        // 502 có thể là service sập giữa chừng → chỉ chờ với request GET.
        // Lỗi do chính API trả về (JSON `{ success: false }`, ví dụ dịch vụ thanh toán lỗi → 502)
        // không phải "gateway đang khởi động": báo lỗi ngay, đừng chờ ~90 giây.
        const fromOurApi = typeof body === 'object' && body !== null && 'success' in body;
        const gatewayStarting =
          !fromOurApi && (res.status === 503 || (res.status === 502 && IDEMPOTENT_METHODS.has(method)));
        if (gatewayStarting && startupWaits < STARTUP_MAX_WAITS) {
          startupWaits += 1;
          await sleep(startupWaitMs(res));
          attempt -= 1;
          continue;
        }

        if (res.status >= 500 && attempt < retries) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        throw new ApiError(res.status, message);
      }

      if (res.status === 204) {
        return undefined as T;
      }

      const json = (await res.json()) as ApiSuccessEnvelope<T> | T;
      if (
        json &&
        typeof json === 'object' &&
        'success' in json &&
        json.success === true &&
        'data' in json
      ) {
        return json.data;
      }
      return json as T;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError) throw error;
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}

/**
 * Id người dùng trong access token (claim `sub`). Chỉ dùng để chọn kho dữ liệu cục bộ theo người,
 * KHÔNG dùng để phân quyền (không kiểm chữ ký; server mới là nơi kiểm).
 */
export function userIdFromToken(token: string | null): number | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const sub = Number((JSON.parse(json) as { sub?: unknown }).sub);
    return Number.isInteger(sub) && sub > 0 ? sub : null;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nihongo-auth-token');
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('nihongo-auth-token', token);
  else localStorage.removeItem('nihongo-auth-token');
  window.dispatchEvent(new CustomEvent(TOKEN_EVENT, { detail: token }));
}

export function subscribeAuthToken(
  listener: (token: string | null) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (e: Event) => {
    listener((e as CustomEvent<string | null>).detail);
  };
  window.addEventListener(TOKEN_EVENT, handler);
  return () => window.removeEventListener(TOKEN_EVENT, handler);
}
