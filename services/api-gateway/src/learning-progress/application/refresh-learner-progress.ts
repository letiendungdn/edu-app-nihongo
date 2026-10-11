import { Inject, Injectable } from "@nestjs/common";
import type { LearnerProgressRepository } from "../domain/learner-progress.repository";
import { LEARNER_PROGRESS_REPOSITORY } from "./tokens";

@Injectable()
export class RefreshLearnerProgress {
  constructor(
    @Inject(LEARNER_PROGRESS_REPOSITORY)
    private readonly progress: LearnerProgressRepository,
  ) {}

  execute() {
    return this.progress.refreshSummary();
  }
}
