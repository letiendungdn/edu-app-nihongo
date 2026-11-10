import { Injectable, NestMiddleware } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import type { NextFunction, Request, Response } from "express";
import { Counter, Histogram } from "prom-client";

/**
 * Nhãn `route` là MẪU route ("/api/vocabularies/:id"), không phải URL thật —
 * URL thật sinh một time series cho mỗi id (bùng nổ cardinality trong Prometheus).
 */
export function routeLabel(req: Request): string {
  const pattern = (req.route as { path?: unknown } | undefined)?.path;
  return typeof pattern === "string" ? pattern : "unmatched";
}

/**
 * Đếm request và đo thời gian theo method/route/status.
 *
 * Là middleware nghe sự kiện `finish` của response, KHÔNG phải interceptor: interceptor chỉ chạy khi
 * request đã qua guard, nên bản cũ không bao giờ thấy 401/403 (guard chặn), 429 (throttler),
 * 413 (body quá lớn). `finish` luôn xảy ra, dù request bị chặn ở tầng nào.
 */
@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(
    @InjectMetric("http_requests_total")
    private readonly counter: Counter<string>,
    @InjectMetric("http_request_duration_seconds")
    private readonly histogram: Histogram<string>,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const endTimer = this.histogram.startTimer();
    res.on("finish", () => {
      // req.route chỉ có SAU khi Express khớp route → đọc lúc response xong, không đọc lúc vào
      const labels = {
        method: req.method,
        route: routeLabel(req),
        status: String(res.statusCode),
      };
      this.counter.inc(labels);
      endTimer(labels);
    });
    next();
  }
}
