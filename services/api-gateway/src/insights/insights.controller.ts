import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { Role } from "@prisma/client";
import { JwtAuthGuard, Public, Roles, RolesGuard } from "@app/common";
import { ReengagementBatchDto } from "./insights.dto";
import { InsightsService } from "./insights.service";
import { InternalTokenGuard } from "./internal-token.guard";

/** Airflow gọi (token nội bộ, không phải JWT người dùng). */
@ApiTags("internal")
@Controller("api/internal/insights")
@Public()
@SkipThrottle()
@UseGuards(InternalTokenGuard)
export class InsightsInternalController {
  constructor(private readonly insights: InsightsService) {}

  @Post("reengagement")
  @HttpCode(200)
  @ApiOperation({
    summary: "Airflow: gửi email kéo học viên sắp bỏ học quay lại",
  })
  reengagement(@Body() dto: ReengagementBatchDto) {
    return this.insights.sendReengagement(dto.day, dto.learners);
  }
}

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller("api/admin/insights")
export class InsightsAdminController {
  constructor(private readonly insights: InsightsService) {}

  @Get()
  @ApiOperation({
    summary: "KPI hằng ngày + học viên sắp bỏ học (pipeline Airflow)",
  })
  overview(@Query("day") day?: string) {
    return this.insights.overview(
      day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined,
    );
  }
}
