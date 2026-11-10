import type { Request } from "express";
import { EventEmitter } from "node:events";
import type { Counter, Histogram } from "prom-client";
import { HttpMetricsMiddleware, routeLabel } from "./http-metrics.middleware";

describe("routeLabel", () => {
  it("dùng mẫu route thay vì URL có id (không bùng nổ time series)", () => {
    const req = {
      route: { path: "/api/vocabularies/:id" },
      path: "/api/vocabularies/123",
    } as unknown as Request;
    expect(routeLabel(req)).toBe("/api/vocabularies/:id");
  });

  it("request không khớp route nào → nhãn cố định", () => {
    expect(routeLabel({ path: "/wp-admin/x.php" } as unknown as Request)).toBe(
      "unmatched",
    );
  });
});

describe("HttpMetricsMiddleware", () => {
  function setup() {
    const counter = { inc: jest.fn() };
    const endTimer = jest.fn();
    const histogram = { startTimer: jest.fn(() => endTimer) };
    const mw = new HttpMetricsMiddleware(
      counter as unknown as Counter<string>,
      histogram as unknown as Histogram<string>,
    );
    return { mw, counter, endTimer };
  }

  it("ghi cả response bị guard chặn (401) — interceptor cũ không thấy", () => {
    const { mw, counter, endTimer } = setup();
    const req = {
      method: "GET",
      route: { path: "/api/auth/me" },
    } as unknown as Request;
    const res = Object.assign(new EventEmitter(), { statusCode: 401 });
    const next = jest.fn();

    mw.use(req, res as never, next);
    expect(next).toHaveBeenCalled();
    expect(counter.inc).not.toHaveBeenCalled(); // chưa xong response

    res.emit("finish");
    const labels = { method: "GET", route: "/api/auth/me", status: "401" };
    expect(counter.inc).toHaveBeenCalledWith(labels);
    expect(endTimer).toHaveBeenCalledWith(labels);
  });
});
