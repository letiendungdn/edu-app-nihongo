import { EventEmitter } from "node:events";
import type { Request } from "express";
import type { AuditService } from "@app/common/audit/audit.service";
import { AuthDeniedAuditMiddleware } from "./auth-denied-audit.middleware";

function run(status: number, req: Partial<Request> & { user?: unknown }) {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const mw = new AuthDeniedAuditMiddleware(audit as unknown as AuditService);
  const res = Object.assign(new EventEmitter(), { statusCode: status });
  mw.use(
    {
      method: "GET",
      originalUrl: "/api/admin/users?page=2",
      headers: {},
      route: { path: "/api/admin/users" },
      ...req,
    } as unknown as Request,
    res as never,
    jest.fn(),
  );
  res.emit("finish");
  return audit.log;
}

describe("AuthDeniedAuditMiddleware", () => {
  it("403: ghi kèm id người dùng", () => {
    const log = run(403, { user: { id: 7 } });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        action: "auth.forbidden",
        resource: "/api/admin/users",
        success: false,
        metadata: { method: "GET", path: "/api/admin/users" },
      }),
    );
  });

  it("401 có gửi token (sai/hết hạn): ghi, userId null", () => {
    const log = run(401, { headers: { authorization: "Bearer hong" } });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, action: "auth.invalid_token" }),
    );
  });

  it("401 không có token: bỏ qua (chỉ là chưa đăng nhập, tránh bị spam)", () => {
    expect(run(401, {})).not.toHaveBeenCalled();
  });

  it("response thường: không ghi", () => {
    expect(run(200, { user: { id: 7 } })).not.toHaveBeenCalled();
  });
});
