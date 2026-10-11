import { LearnerProgress, chooseFasterPlan } from "./learner-progress";

describe("LearnerProgress", () => {
  it("nâng longest streak lên ít nhất bằng streak hiện tại và chặn số âm", () => {
    const progress = LearnerProgress.rehydrate({
      userId: 4,
      currentStreak: 3,
      longestStreak: 1,
      totalSeconds: -5,
      totalCards: 2,
      vocabTotal: 8,
      kanjiTotal: -1,
    });

    expect(progress.longestStreak).toBe(3);
    expect(progress.totalSeconds).toBe(0);
    expect(progress.kanjiTotal).toBe(0);
    expect(progress.vocabTotal).toBe(8);
  });

  it("user chưa học thì mọi số là 0", () => {
    expect(LearnerProgress.empty(9)).toMatchObject({
      userId: 9,
      currentStreak: 0,
      totalCards: 0,
    });
  });
});

describe("chooseFasterPlan", () => {
  it("chọn materialized view khi cost thấp hơn hoặc bằng JOIN trực tiếp", () => {
    expect(chooseFasterPlan(10, 40)).toBe("materialized_view");
    expect(chooseFasterPlan(15, 15)).toBe("materialized_view");
    expect(chooseFasterPlan(50, 12)).toBe("live_join");
  });
});
