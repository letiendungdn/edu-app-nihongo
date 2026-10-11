import { Module } from "@nestjs/common";
import { ExplainLearnerProgress } from "./application/explain-learner-progress";
import { GetLearnerProgress } from "./application/get-learner-progress";
import { LearnerProgressScheduler } from "./application/learner-progress.scheduler";
import { RefreshLearnerProgress } from "./application/refresh-learner-progress";
import { LEARNER_PROGRESS_REPOSITORY } from "./application/tokens";
import { PrismaLearnerProgressRepository } from "./infrastructure/prisma-learner-progress.repository";
import { LearningProgressController } from "./learning-progress.controller";

@Module({
  controllers: [LearningProgressController],
  providers: [
    GetLearnerProgress,
    ExplainLearnerProgress,
    RefreshLearnerProgress,
    LearnerProgressScheduler,
    PrismaLearnerProgressRepository,
    {
      provide: LEARNER_PROGRESS_REPOSITORY,
      useExisting: PrismaLearnerProgressRepository,
    },
  ],
})
export class LearningProgressModule {}
