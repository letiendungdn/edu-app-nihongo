import { ExplainLearnerProgress } from "./explain-learner-progress";
import type { LearnerProgressRepository } from "../domain/learner-progress.repository";

describe("ExplainLearnerProgress", () => {
  it("không ANALYZE thì so theo cost ước tính", async () => {
    const measureCosts = jest.fn(async () => ({
      summaryCost: 1.5,
      liveJoinCost: 80,
      summaryMs: null,
      liveJoinMs: null,
    }));
    const useCase = new ExplainLearnerProgress({
      measureCosts,
    } as unknown as LearnerProgressRepository);

    await expect(useCase.execute(3)).resolves.toEqual({
      summaryCost: 1.5,
      liveJoinCost: 80,
      summaryMs: null,
      liveJoinMs: null,
      basis: "estimated_cost",
      faster: "materialized_view",
    });
    expect(measureCosts).toHaveBeenCalledWith(3, false);
  });

  it("có ANALYZE thì so theo thời gian thật, kể cả khi cost nói ngược lại", async () => {
    const useCase = new ExplainLearnerProgress({
      measureCosts: async () => ({
        summaryCost: 1.5,
        liveJoinCost: 80,
        summaryMs: 0.9,
        liveJoinMs: 0.2,
      }),
    } as unknown as LearnerProgressRepository);

    await expect(useCase.execute(3, true)).resolves.toMatchObject({
      basis: "execution_time",
      faster: "live_join",
    });
  });
});
