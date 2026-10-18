import { ServiceUnavailableException } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { HealthController } from "./health.controller";

function build({ dbUp = true, contentUp = true, examUp = true } = {}) {
  const prisma = {
    $queryRaw: jest.fn(() =>
      dbUp
        ? Promise.resolve([{ "?column?": 1 }])
        : Promise.reject(new Error("db down")),
    ),
  };
  const client = (up: boolean) => ({
    send: jest.fn(() => (up ? of([]) : throwError(() => new Error("down")))),
  });
  return new HealthController(
    prisma as never,
    client(contentUp) as never,
    client(examUp) as never,
  );
}

describe("HealthController", () => {
  it("/health/live không gọi DB hay service khác", () => {
    const prisma = { $queryRaw: jest.fn() };
    const ctrl = new HealthController(
      prisma as never,
      { send: jest.fn() } as never,
      { send: jest.fn() } as never,
    );
    expect(ctrl.live()).toEqual({ status: "ok" });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("/health/ready trả ok khi đủ phụ thuộc", async () => {
    await expect(build().ready()).resolves.toMatchObject({ status: "ok" });
  });

  it("/health/ready ném 503 khi DB chết (K8s rút pod khỏi load balancer)", async () => {
    await expect(build({ dbUp: false }).ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("/health vẫn trả 200 kèm chi tiết (tương thích cũ)", async () => {
    await expect(build({ contentUp: false }).check()).resolves.toEqual({
      status: "degraded",
      services: { database: "up", content: "down", exam: "up" },
    });
  });
});
