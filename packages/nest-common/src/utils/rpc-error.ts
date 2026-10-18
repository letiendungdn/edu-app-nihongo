import { HttpStatus } from '@nestjs/common';

export function resolveMicroserviceError(
  exception: unknown,
): { status: number; message: string } | null {
  if (exception instanceof Error) {
    if (/không tồn tại|not found|hết hạn/i.test(exception.message)) {
      return { status: HttpStatus.NOT_FOUND, message: exception.message };
    }
  }

  if (!exception || typeof exception !== 'object') return null;
  const err = exception as Record<string, unknown>;

  const stripe = resolveStripeError(err);
  if (stripe) return stripe;

  if (typeof err.statusCode === 'number') {
    // 401/403 của API mình nghĩa là "token của BẠN không hợp lệ" → client sẽ refresh / đăng xuất.
    // Lỗi xác thực của một dịch vụ khác (sai API key…) là lỗi phía server: không chuyển nguyên mã.
    if (err.statusCode === 401 || err.statusCode === 403) {
      return { status: HttpStatus.BAD_GATEWAY, message: 'Dịch vụ liên kết đang gặp sự cố, vui lòng thử lại sau' };
    }
    return {
      status: err.statusCode,
      message: typeof err.message === 'string' ? err.message : 'Request failed',
    };
  }

  if (err.status === 'error' && 'message' in err) {
    const inner = err.message;
    if (typeof inner === 'string') {
      try {
        const parsed = JSON.parse(inner) as {
          statusCode?: number;
          message?: string;
        };
        if (parsed.statusCode) {
          return {
            status: parsed.statusCode,
            message: parsed.message ?? inner,
          };
        }
      } catch {
        // plain string
      }
      if (/không tồn tại|not found/i.test(inner)) {
        return { status: HttpStatus.NOT_FOUND, message: inner };
      }
      return { status: HttpStatus.BAD_GATEWAY, message: inner };
    }

    if (typeof inner === 'object' && inner !== null) {
      const obj = inner as { statusCode?: number; message?: string | string[] };
      if (obj.statusCode) {
        const msg = obj.message;
        return {
          status: obj.statusCode,
          message: Array.isArray(msg)
            ? msg.join(', ')
            : (msg ?? 'Request failed'),
        };
      }
    }
  }

  return null;
}

/**
 * Lỗi của Stripe SDK có `statusCode` của STRIPE (401 khi sai API key…). Bản cũ chép nguyên ra
 * client: sai key ở server làm trình duyệt tưởng phiên hết hạn và refresh liên tục, kèm lộ thông
 * điệp nội bộ ("Invalid API Key provided: sk_test_…"). Chỉ lỗi thẻ là nói thật cho người dùng.
 */
function resolveStripeError(err: Record<string, unknown>): { status: number; message: string } | null {
  if (typeof err.type !== 'string' || !err.type.startsWith('Stripe')) return null;
  if (err.type === 'StripeCardError') {
    return {
      status: HttpStatus.PAYMENT_REQUIRED,
      message: typeof err.message === 'string' ? err.message : 'Thẻ bị từ chối',
    };
  }
  if (err.type === 'StripeInvalidRequestError') {
    return { status: HttpStatus.BAD_REQUEST, message: 'Yêu cầu thanh toán không hợp lệ' };
  }
  return { status: HttpStatus.BAD_GATEWAY, message: 'Dịch vụ thanh toán đang gặp sự cố, vui lòng thử lại sau' };
}
