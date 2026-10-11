import { Inject, Injectable } from "@nestjs/common";
import type { LearnerProgressRepository } from "../domain/learner-progress.repository";
import { LEARNER_PROGRESS_REPOSITORY } from "./tokens";

@Injectable()
export class GetLearnerProgress {
  constructor(
    @Inject(LEARNER_PROGRESS_REPOSITORY)
    private readonly progress: LearnerProgressRepository,
  ) {}

  async execute(userId: number) {
    const [summary, recentDays] = await Promise.all([
      this.progress.findSummary(userId),
      this.progress.findRecentDays(userId, 30),
    ]);
    return { summary, recentDays };
  }
}
