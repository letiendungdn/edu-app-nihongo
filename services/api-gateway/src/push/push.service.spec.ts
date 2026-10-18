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
