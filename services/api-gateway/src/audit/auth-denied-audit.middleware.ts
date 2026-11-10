import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { AuditService } from "@app/common/audit/audit.service";
import type { AuthRequest } from "@app/common/auth/current-user.decorator";
import { routeLabel } from "../metrics/http-metrics.middleware";

/**
 * Ghi audit cho request bị TỪ CHỐI QUYỀN. AuditInterceptor không thấy các lần này: guard ném lỗi
 * trước khi interceptor chạy (docs/learn-nestjs.md mục 4).
 *
 * Ghi:   403 — đã đăng nhập nhưng không đủ quyền (ví dụ USER gọi API admin).
 *        401 CÓ gửi token — token sai chữ ký / hết hạn / user đã bị xóa: đáng để ý về bảo mật.
 * Bỏ qua: 401 KHÔNG có token — chỉ là "chưa đăng nhập". ThrottlerGuard chạy sau JwtAuthGuard nên
 *        không chặn được loại này; ghi hết thì bot spam request trống là làm đầy MongoDB.
 */
@Injectable()
export class AuthDeniedAuditMiddleware implements NestMiddleware {
  constructor(private readonly auditService: AuditService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    res.on("finish", () => {
      const status = res.statusCode;
      const hadToken = typeof req.headers.authorization === "string";
      if (status !== 403 && !(status === 401 && hadToken)) return;

      const user = (req as Request & AuthRequest).user;
      const route = routeLabel(req);
      void this.auditService.log({
        userId: user?.id ?? null,
        action: status === 403 ? "auth.forbidden" : "auth.invalid_token",
        resource: route,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        success: false,
        errorMessage: `HTTP ${status}`,
        durationMs: Date.now() - start,
        metadata: { method: req.method, path: req.originalUrl.split("?")[0] },
      });
    });
    next();
  }
}
