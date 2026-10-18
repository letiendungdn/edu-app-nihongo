import { NotFoundException } from "@nestjs/common";
import { FeatureFlagsService, isFlagOn } from "./feature-flags.service";

const flag = (
  key: string,
  enabled: boolean,
  roles: ("USER" | "TEACHER" | "ADMIN")[] = [],
) => ({
  key,
  enabled,
  roles,
  description: null,
  updatedAt: new Date(),
});

describe("isFlagOn", () => {
  it("tắt → không ai thấy", () => {
    expect(isFlagOn(flag("x", false) as never, "ADMIN")).toBe(false);
  });
  it("bật, không giới hạn vai trò → mọi người kể cả khách", () => {
    expect(isFlagOn(flag("x", true) as never, null)).toBe(true);
  });
  it("bật cho ADMIN → khách và USER không thấy, ADMIN thấy", () => {
    const f = flag("x", true, ["ADMIN"]) as never;
    expect(isFlagOn(f, null)).toBe(false);
    expect(isFlagOn(f, "USER")).toBe(false);
    expect(isFlagOn(f, "ADMIN")).toBe(true);
  });
  it("cờ không tồn tại → tắt", () => {
    expect(isFlagOn(undefined, "ADMIN")).toBe(false);
  });
});

describe("FeatureFlagsService", () => {
  function setup() {
    const prisma = {
      featureFlag: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            flag("vocab-search-all-lessons", true),
            flag("beta", true, ["ADMIN"]),
          ]),
        findUnique: jest.fn().mockResolvedValue(flag("beta", true, ["ADMIN"])),
        update: jest.fn().mockResolvedValue(flag("beta", false)),
      },
    };
    return { svc: new FeatureFlagsService(prisma as never), prisma };
  }

  it("enabledKeys lọc theo vai trò người xem", async () => {
    const { svc } = setup();
    await expect(svc.enabledKeys(null)).resolves.toEqual([
      "vocab-search-all-lessons",
    ]);
    await expect(svc.enabledKeys("ADMIN")).resolves.toEqual([
      "vocab-search-all-lessons",
      "beta",
    ]);
  });

  it("cache: nhiều lần hỏi trong 30s chỉ truy vấn DB một lần; cập nhật xoá cache", async () => {
    const { svc, prisma } = setup();
    await svc.isOn("beta", "ADMIN");
    await svc.isOn("beta", "ADMIN");
    expect(prisma.featureFlag.findMany).toHaveBeenCalledTimes(1);
    await svc.update("beta", { enabled: false });
    await svc.isOn("beta", "ADMIN");
    expect(prisma.featureFlag.findMany).toHaveBeenCalledTimes(2);
  });

  it("cập nhật cờ không tồn tại → 404", async () => {
    const { svc, prisma } = setup();
    prisma.featureFlag.findUnique.mockResolvedValue(null);
    await expect(svc.update("nope", { enabled: true })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
