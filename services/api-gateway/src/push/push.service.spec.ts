import { ConfigService } from "@nestjs/config";
import { PushService } from "./push.service";

describe("PushService — IDOR", () => {
  it("gỡ token chỉ trong phạm vi user đang đăng nhập (không gỡ được thiết bị của người khác)", async () => {
    const prisma = {
      pushDeviceToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const config = {
      get: (_k: string, def?: string) => def,
    } as unknown as ConfigService;
    const push = new PushService(prisma as never, config);
    await push.unregisterToken("device-token-of-A", 2);
    expect(prisma.pushDeviceToken.deleteMany).toHaveBeenCalledWith({
      where: { token: "device-token-of-A", userId: 2 },
    });
  });
});

describe("PushService — nhắc ôn cho cả iOS và Android", () => {
  const config = {
    get: (_k: string, def?: string) => def,
  } as unknown as ConfigService;

  function setup(
    tokens: { token: string; platform: string }[],
    fcmResult = "sent",
  ) {
    const prisma = {
      pushDeviceToken: {
        findMany: jest.fn().mockResolvedValue(tokens),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const fcm = { send: jest.fn().mockResolvedValue(fcmResult) };
    const push = new PushService(prisma as never, config, fcm as never);
    return { push, prisma, fcm };
  }

  it("token Android được gửi qua FCM (bản cũ: chỉ gửi iOS, Android không bao giờ nhận)", async () => {
    const { push, fcm } = setup([
      { token: "fcm-token-1", platform: "android" },
    ]);

    await push.sendSrsReminder(1, 12);

    expect(fcm.send).toHaveBeenCalledWith("fcm-token-1", {
      title: expect.any(String),
      body: expect.stringContaining("12 thẻ"),
      data: { screen: "srs" },
    });
  });

  it("FCM báo token không còn hợp lệ → xóa token", async () => {
    const { push, prisma } = setup(
      [{ token: "fcm-dead", platform: "android" }],
      "invalid-token",
    );

    await push.sendSrsReminder(1, 3);

    expect(prisma.pushDeviceToken.deleteMany).toHaveBeenCalledWith({
      where: { token: "fcm-dead" },
    });
  });

  it("token giả android-<uuid> của app cũ → không gửi, xóa luôn", async () => {
    const { push, prisma, fcm } = setup([
      {
        token: "android-3f2a9c1e-1b2c-4d5e-8f90-123456789abc",
        platform: "android",
      },
    ]);

    await push.sendSrsReminder(1, 3);

    expect(fcm.send).not.toHaveBeenCalled();
    expect(prisma.pushDeviceToken.deleteMany).toHaveBeenCalled();
  });
});
