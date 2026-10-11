import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ProgressViewsMissingError } from "../domain/learner-progress";
import { RefreshLearnerProgress } from "./refresh-learner-progress";

@Injectable()
export class LearnerProgressScheduler {
  private readonly logger = new Logger(LearnerProgressScheduler.name);

  constructor(private readonly refresh: RefreshLearnerProgress) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshSummary() {
    try {
      const refreshed = await this.refresh.execute();
      if (!refreshed) {
        this.logger.debug("Pod khác đang refresh learner_progress_summary");
      }
    } catch (error) {
      if (error instanceof ProgressViewsMissingError) {
        this.logger.warn(error.message);
        return;
      }
      this.logger.warn(
        `Không refresh được learner_progress_summary: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
