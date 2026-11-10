import { Logger, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, TimeoutError, from, lastValueFrom, timeout } from 'rxjs';
import { CircuitBreaker } from './circuit-breaker';

/**
 * Mọi lời gọi sang microservice đều có hạn chót: service con treo thì gateway trả 504
 * thay vì treo theo (lỗi lan truyền). Huỷ subscription cũng huỷ luôn cuộc gọi gRPC.
 */
const DEFAULT_TIMEOUT_MS = 10_000;

function timeoutMs(): number {
  const fromEnv = Number(process.env.MICROSERVICE_TIMEOUT_MS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_TIMEOUT_MS;
}

type DispatchGrpcService = {
  dispatch(data: {
    pattern: string;
    payload: string;
  }): Observable<{ result: string; error: string }>;
};

/** Lỗi nghiệp vụ (404, 400, "không tồn tại"…) nghĩa là service vẫn sống — không tính vào circuit breaker. */
function isServiceFailure(error: { statusCode?: number; message?: unknown }): boolean {
  if (typeof error.statusCode === 'number') return error.statusCode >= 500;
  return !/không tồn tại|not found|hết hạn/i.test(String(error.message ?? ''));
}

function describeGrpcError(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as { code?: unknown; details?: unknown; message?: unknown };
    if (typeof e.code === 'number') return `gRPC code ${e.code}: ${String(e.details ?? e.message ?? '')}`;
    if (typeof e.message === 'string') return e.message;
  }
  return String(error);
}

/** Chuyển `response.error` (chuỗi JSON hoặc chuỗi thường) thành object ném ra — giữ nguyên định dạng cũ. */
function toRpcError(raw: string): { statusCode?: number; status?: string; message?: string } {
  try {
    const parsed = JSON.parse(raw) as { statusCode?: number; message?: string };
    if (parsed.statusCode) return { statusCode: parsed.statusCode, message: parsed.message };
  } catch {
    // chuỗi thường
  }
  return { status: 'error', message: raw };
}

/**
 * ClientProxy-compatible wrapper for gRPC Dispatch RPC.
 * Mỗi service con một circuit breaker: lỗi hạ tầng liên tục (timeout, mất kết nối, 5xx) → mở mạch,
 * trả 503 ngay trong 30s thay vì dồn thêm request vào service đang chết.
 */
export class GrpcDispatchClient implements OnModuleInit {
  private dispatchService!: DispatchGrpcService;
  private readonly serviceName: string;
  private readonly grpcClient: ClientGrpc;
  readonly breaker = new CircuitBreaker();
  private readonly logger = new Logger(GrpcDispatchClient.name);

  constructor(grpcClient: ClientGrpc, serviceName: string) {
    this.grpcClient = grpcClient;
    this.serviceName = serviceName;
  }

  onModuleInit() {
    this.dispatchService =
      this.grpcClient.getService<DispatchGrpcService>(this.serviceName);
  }

  send<T = unknown>(pattern: string, data: unknown): Observable<T> {
    return from(this.invoke<T>(pattern, data));
  }

  private async invoke<T>(pattern: string, data: unknown): Promise<T> {
    const breakerOn = process.env.CIRCUIT_BREAKER_DISABLED !== 'true';
    if (breakerOn && !this.breaker.tryAcquire()) {
      throw {
        statusCode: 503,
        message: `${this.serviceName} tạm thời không khả dụng — thử lại sau ít phút (${pattern})`,
      };
    }

    const ms = timeoutMs();
    let response: { result: string; error: string };
    try {
      response = await lastValueFrom(
        this.dispatchService
          .dispatch({ pattern, payload: JSON.stringify(data ?? {}) })
          .pipe(timeout(ms)),
      );
    } catch (error) {
      this.breaker.recordFailure();
      if (error instanceof TimeoutError) {
        throw {
          statusCode: 504,
          message: `${this.serviceName} không phản hồi sau ${ms}ms (${pattern})`,
        };
      }
      // Lỗi tầng gRPC (mất kết nối, service đang khởi động lại…): client chỉ cần biết "tạm thời không
      // dùng được". Bản cũ ném nguyên lỗi → 500 kèm "14 UNAVAILABLE: No connection established…"
      // (lộ chi tiết nội bộ, sai mã: lỗi ở service phía sau không phải bug của gateway).
      this.logger.warn(`${this.serviceName} ${pattern}: ${describeGrpcError(error)}`);
      throw {
        statusCode: 503,
        message: `${this.serviceName} tạm thời không khả dụng — thử lại sau ít phút (${pattern})`,
      };
    }

    if (response.error) {
      const rpcError = toRpcError(response.error);
      if (isServiceFailure(rpcError)) this.breaker.recordFailure();
      else this.breaker.recordSuccess();
      throw rpcError;
    }

    this.breaker.recordSuccess();
    return (response.result ? JSON.parse(response.result) : null) as T;
  }
}
