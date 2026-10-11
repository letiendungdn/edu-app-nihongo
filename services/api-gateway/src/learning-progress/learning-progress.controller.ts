import {
  Controller,
  Get,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import {
  CurrentUser,
  Roles,
  RolesGuard,
  type AuthUserPayload,
} from "@app/common";
import { ProgressViewsMissingError } from "./domain/learner-progress";
import { ExplainLearnerProgress } from "./application/explain-learner-progress";
import { GetLearnerProgress } from "./application/get-learner-progress";
import { RefreshLearnerProgress } from "./application/refresh-learner-progress";

@ApiTags("learning-progress")
@ApiBearerAuth()
@Controller("api/learning-progress")
export class LearningProgressController {
  constructor(
    private readonly getProgress: GetLearnerProgress,
    private readonly explainProgress: ExplainLearnerProgress,
    private readonly refreshProgress: RefreshLearnerProgress,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Tiến độ học của user hiện tại (materialized view + view theo ngày)",
  })
  getMine(@CurrentUser() user: AuthUserPayload) {
    return this.wrap(() => this.getProgress.execute(user.id));
  }

  @Get("explain")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: "So sánh EXPLAIN giữa materialized view và JOIN trực tiếp",
  })
  @ApiQuery({
    name: "analyze",
    required: false,
    description: "true = EXPLAIN ANALYZE (chạy thật, có thời gian thực thi)",
  })
  explain(
    @CurrentUser() user: AuthUserPayload,
    @Query("analyze") analyze?: string,
  ) {
    return this.wrap(() =>
      this.explainProgress.execute(user.id, analyze === "true"),
    );
  }

  @Post("refresh")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "REFRESH MATERIALIZED VIEW CONCURRENTLY" })
  refresh() {
    return this.wrap(async () => {
      const refreshed = await this.refreshProgress.execute();
      return { ok: true, refreshed };
    });
  }

  private async wrap<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ProgressViewsMissingError) {
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }
  }
}
