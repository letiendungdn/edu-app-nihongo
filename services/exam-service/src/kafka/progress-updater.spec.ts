import { ProgressUpdater, nextStreak, studyDate } from "./progress-updater";

describe("studyDate (giờ Việt Nam)", () => {
  it("6 giờ sáng VN = 23:00 UTC hôm trước → vẫn là ngày của VN", () => {
    expect(studyDate("2026-09-28T23:00:00.000Z")).toBe("2026-09-29");
  });
  it("chiều VN", () => {
    expect(studyDate("2026-09-29T10:00:00.000Z")).toBe("2026-09-29");
  });
});

describe("nextStreak", () => {
  const prev = (current: number, longest: number, last: string | null) => ({
    currentStreak: current,
    longestStreak: longest,
    lastStudyDate: last,
  });

  it("lần đầu học → 1", () => {
    expect(nextStreak(null, "2026-09-29")).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastStudyDate: "2026-09-29",
    });
  });
  it("hôm qua có học → +1 và cập nhật kỷ lục", () => {
    expect(nextStreak(prev(4, 4, "2026-09-28"), "2026-09-29")).toMatchObject({
      currentStreak: 5,
      longestStreak: 5,
    });
  });
  it("qua tháng (30/9 → 1/10) vẫn là ngày liên tiếp", () => {
    expect(nextStreak(prev(2, 7, "2026-09-30"), "2026-10-01")).toMatchObject({
      currentStreak: 3,
      longestStreak: 7,
    });
  });
  it("bỏ một ngày → về 1, giữ kỷ lục", () => {
    expect(nextStreak(prev(6, 9, "2026-09-26"), "2026-09-29")).toMatchObject({
      currentStreak: 1,
      longestStreak: 9,
    });
  });
  it("cùng ngày học lại → giữ nguyên", () => {
    expect(nextStreak(prev(3, 5, "2026-09-29"), "2026-09-29")).toMatchObject({
      currentStreak: 3,
      lastStudyDate: "2026-09-29",
    });
  });
  it("event đến trễ (ngày cũ hơn) không làm streak lùi", () => {
    expect(nextStreak(prev(3, 5, "2026-09-29"), "2026-09-27")).toMatchObject({
      currentStreak: 3,
      lastStudyDate: "2026-09-29",
    });
  });
});

describe("ProgressUpdater.handle", () => {
  function setup(alreadyProcessed = false, streak: object | null = null) {
    const tx = {
      processedEvent: {
        createMany: jest
          .fn()
          .mockResolvedValue({ count: alreadyProcessed ? 0 : 1 }),
      },
      dailyActivity: { upsert: jest.fn() },
      studyStreak: {
        findUnique: jest.fn().mockResolvedValue(streak),
        upsert: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    return { updater: new ProgressUpdater(prisma as never), tx, prisma };
  }
  const msg = {
    eventId: "exam-result-20",
    examResultId: 20,
    userId: 7,
    submittedAt: "2026-09-29T10:00:00.000Z",
  };

  it("ghi hoạt động exam + streak cho user, dấu đã xử lý cùng transaction", async () => {
    const { updater, tx } = setup(false, {
      currentStreak: 2,
      longestStreak: 2,
      lastStudyDate: "2026-09-28",
    });
    await expect(updater.handle(msg)).resolves.toBe(true);
    expect(tx.processedEvent.createMany).toHaveBeenCalledWith({
      data: [{ eventId: "exam-result-20", consumer: "progress-updater" }],
      skipDuplicates: true,
    });
    expect(tx.dailyActivity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_date_kind: { userId: 7, date: "2026-09-29", kind: "exam" },
        },
      }),
    );
    expect(tx.studyStreak.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          currentStreak: 3,
          longestStreak: 3,
          lastStudyDate: "2026-09-29",
        },
      }),
    );
  });

  it("event trùng (đã xử lý) → không cập nhật gì", async () => {
    const { updater, tx } = setup(true);
    await expect(updater.handle(msg)).resolves.toBe(false);
    expect(tx.dailyActivity.upsert).not.toHaveBeenCalled();
    expect(tx.studyStreak.upsert).not.toHaveBeenCalled();
  });

  it("khách (userId null) → bỏ qua, không mở transaction", async () => {
    const { updater, prisma } = setup();
    await expect(updater.handle({ ...msg, userId: null })).resolves.toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
