import { Inject, Injectable } from "@nestjs/common";
import { compareQueryPlans } from "../domain/learner-progress";
import type { LearnerProgressRepository } from "../domain/learner-progress.repository";
import { LEARNER_PROGRESS_REPOSITORY } from "./tokens";

@Injectable()
export class ExplainLearnerProgress {
  constructor(
    @Inject(LEARNER_PROGRESS_REPOSITORY)
    private readonly progress: LearnerProgressRepository,
  ) {}

  async execute(userId: number, analyze = false) {
    const costs = await this.progress.measureCosts(userId, analyze);
    return compareQueryPlans(costs);
  }
}
