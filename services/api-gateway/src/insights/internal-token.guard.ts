import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

/**
 * Cho service nội bộ (Airflow) gọi gateway bằng token dùng chung `INTERNAL_API_TOKEN`
 * (header `x-internal-token`). So sánh hằng thời gian để không lộ token qua thời gian phản hồi.
 * Chưa đặt token → từ chối hết (không bao giờ mở cửa mặc định).
 */
@Injectable()
export class InternalTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INTERNAL_API_TOKEN ?? "";
    if (expected.length < 16) {
      throw new ServiceUnavailableException(
        "INTERNAL_API_TOKEN chưa được cấu hình",
      );
    }
    const req = context.switchToHttp().getRequest<Request>();
    const given = req.headers["x-internal-token"];
    if (typeof given !== "string" || !safeEqual(given, expected)) {
      throw new UnauthorizedException("Token nội bộ không hợp lệ");
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
