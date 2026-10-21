import { claimCronRun, PrismaService, vietnamDate } from "@app/prisma";
import { resetTables } from "../../../test/db-fixtures";

describe("Cron chỉ chạy một lần cho mỗi lượt dù gateway chạy nhiều pod (Postgres thật)", () => {
  const prisma = new PrismaService();
  beforeEach(() => resetTables(prisma));
  afterAll(() => prisma.$disconnect());

  it("5 pod nổ cron CÙNG LÚC → đúng một pod được chạy (bản cũ: cả 5 gửi push)", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        claimCronRun(prisma, "push.daily-srs", "2026-10-21"),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("pod nổ TRỄ sau khi pod kia chạy xong vẫn bị chặn (khóa 'đang chạy' không chặn được trường hợp này)", async () => {
    expect(await claimCronRun(prisma, "push.daily-srs", "2026-10-21")).toBe(
      true,
    );
    expect(await claimCronRun(prisma, "push.daily-srs", "2026-10-21")).toBe(
      false,
    );
  });

  it("ngày hôm sau / cron khác → chạy bình thường", async () => {
    await claimCronRun(prisma, "push.daily-srs", "2026-10-21");
    expect(await claimCronRun(prisma, "push.daily-srs", "2026-10-22")).toBe(
      true,
    );
    expect(
      await claimCronRun(prisma, "mail.weekly-progress", "2026-10-21"),
    ).toBe(true);
  });

  it("lượt tính theo NGÀY GIỜ VIỆT NAM (cron chạy theo Asia/Ho_Chi_Minh)", () => {
    // 20/10 18:00 UTC = 21/10 01:00 giờ VN
    expect(vietnamDate(new Date("2026-10-20T18:00:00Z"))).toBe("2026-10-21");
  });
});
