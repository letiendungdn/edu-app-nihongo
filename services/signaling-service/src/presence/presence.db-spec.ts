import Redis from "ioredis";
import { ONLINE_KEY, PresenceService } from "./presence.service";

/** Hai instance signaling dùng chung một Redis (REDIS_URL: Redis riêng cho test). */
describe("Presence giữa nhiều instance", () => {
  const a = new PresenceService();
  const b = new PresenceService();
  const redis = new Redis(process.env.REDIS_URL!);

  beforeAll(() => {
    a.onModuleInit();
    b.onModuleInit();
  });
  beforeEach(async () => {
    const keys = await redis.keys("vc:presence:*");
    if (keys.length) await redis.del(...keys);
  });
  afterAll(async () => {
    await Promise.all([a.onModuleDestroy(), b.onModuleDestroy(), redis.quit()]);
  });

  it("đóng tab ở instance A, tab ở instance B còn mở → vẫn online (bản cũ: thành offline)", async () => {
    await a.addSocket(7, "sock-a");
    await b.addSocket(7, "sock-b");

    const after = await a.removeSocket(7, "sock-a");

    expect(after).toEqual([7]);
    expect(await b.listOnlineUserIds()).toEqual([7]);
  });

  it("đóng tab cuối cùng → offline ở mọi instance", async () => {
    await a.addSocket(7, "sock-a");
    await b.addSocket(7, "sock-b");
    await a.removeSocket(7, "sock-a");
    await b.removeSocket(7, "sock-b");

    expect(await a.listOnlineUserIds()).toEqual([]);
  });

  it("instance chết không dọn được → hết hạn thì tự offline", async () => {
    await a.addSocket(7, "sock-a");
    await redis.zadd(ONLINE_KEY, Date.now() - 1, "7"); // giả lập đã quá TTL mà không ping

    expect(await b.listOnlineUserIds()).toEqual([]);
  });
});
