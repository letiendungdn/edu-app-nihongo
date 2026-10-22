import {
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { PrismaService } from "@app/prisma";
import type { MailService } from "@app/common/mail/mail.service";
import { InsightsService } from "./insights.service";
import { InternalTokenGuard } from "./internal-token.guard";

describe("InternalTokenGuard", () => {
  const ctx = (token?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: token ? { "x-internal-token": token } : {},
        }),
      }),
    }) as unknown as ExecutionContext;
  const guard = new InternalTokenGuard();

  afterEach(() => delete process.env.INTERNAL_API_TOKEN);

  it("đúng token → cho qua; sai / thiếu → 401", () => {
    process.env.INTERNAL_API_TOKEN = "a-very-long-internal-token";
    expect(guard.canActivate(ctx("a-very-long-internal-token"))).toBe(true);
    expect(() => guard.canActivate(ctx("wrong"))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(ctx())).toThrow(UnauthorizedException);
  });

  it("chưa cấu hình token → từ chối hết (không mở cửa mặc định)", () => {
    expect(() => guard.canActivate(ctx(""))).toThrow(
      ServiceUnavailableException,
    );
  });
});

describe("InsightsService.sendReengagement", () => {
  const user = (id: number, extra: Record<string, unknown> = {}) => ({
    id,
    email: `u${id}@t.vn`,
    name: `User ${id}`,
    emailBounced: false,
    emailPrefs: { receiveProgress: true },
    ...extra,
  });
  let claimed: Set<string>;
  let prisma: {
    user: { findMany: jest.Mock };
    cronRun: { create: jest.Mock; deleteMany: jest.Mock };
  };
  let mail: { sendReengagement: jest.Mock };
  let service: InsightsService;

  beforeEach(() => {
    claimed = new Set();
    prisma = {
      user: { findMany: jest.fn() },
      cronRun: {
        // Giống khóa chính (name, slot) của bảng CronRun
        create: jest.fn(
          ({ data }: { data: { name: string; slot: string } }) => {
            const key = `${data.name}|${data.slot}`;
            if (claimed.has(key))
              return Promise.reject(
                Object.assign(new Error("dup"), { code: "P2002" }),
              );
            claimed.add(key);
            return Promise.resolve({});
          },
        ),
        deleteMany: jest.fn(
          ({ where }: { where: { name: string; slot: string } }) => {
            claimed.delete(`${where.name}|${where.slot}`);
            return Promise.resolve({ count: 1 });
          },
        ),
      },
    };
    mail = { sendReengagement: jest.fn().mockResolvedValue(undefined) };
    service = new InsightsService(
      prisma as unknown as PrismaService,
      mail as unknown as MailService,
    );
  });

  const learners = [
    { userId: 1, daysInactive: 5, dueCards: 20 },
    { userId: 2, daysInactive: 4, dueCards: 0 },
    { userId: 3, daysInactive: 6, dueCards: 3 },
  ];

  it("gửi cho người nhận email; bỏ qua người tắt nhận / email bị trả về", async () => {
    prisma.user.findMany.mockResolvedValue([
      user(1),
      user(2, { emailPrefs: { receiveProgress: false } }),
      user(3, { emailBounced: true }),
    ]);

    const { results } = await service.sendReengagement("2026-10-21", learners);

    expect(results).toEqual([
      { userId: 1, status: "sent" },
      { userId: 2, status: "skipped", reason: "opted_out" },
      { userId: 3, status: "skipped", reason: "opted_out" },
    ]);
    expect(mail.sendReengagement).toHaveBeenCalledTimes(1);
    expect(mail.sendReengagement).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, daysInactive: 5, dueCards: 20 }),
    );
  });

  it("Airflow retry gửi lại cùng batch → không ai nhận hai email", async () => {
    prisma.user.findMany.mockResolvedValue([user(1)]);

    await service.sendReengagement("2026-10-21", [learners[0]]);
    const again = await service.sendReengagement("2026-10-21", [learners[0]]);

    expect(mail.sendReengagement).toHaveBeenCalledTimes(1);
    expect(again.results[0]).toEqual({
      userId: 1,
      status: "sent",
      reason: "already_sent",
    });
  });

  it("gửi lỗi → nhả lượt và báo lỗi, lần retry sau gửi được", async () => {
    prisma.user.findMany.mockResolvedValue([user(1)]);
    mail.sendReengagement.mockRejectedValueOnce(new Error("Brevo 503"));

    await expect(
      service.sendReengagement("2026-10-21", [learners[0]]),
    ).rejects.toThrow("Brevo 503");
    const retry = await service.sendReengagement("2026-10-21", [learners[0]]);

    expect(retry.results[0]).toEqual({ userId: 1, status: "sent" });
    expect(mail.sendReengagement).toHaveBeenCalledTimes(2);
  });
});
