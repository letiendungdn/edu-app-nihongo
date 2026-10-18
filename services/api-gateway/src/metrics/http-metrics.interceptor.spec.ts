import type { Request } from "express";
import { routeLabel } from "./http-metrics.interceptor";

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
