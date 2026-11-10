import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import {
  CurrentUser,
  Roles,
  RolesGuard,
  type AuthUserPayload,
} from "@app/common";
import { CoachService } from "../../../payment-service/src/coach/coach.service";
import {
  DateRangeDto,
  GetSessionsDto,
  SetAvailabilityDto,
  StripeOnboardDto,
  UpsertCoachProfileDto,
} from "./dto/coach.dto";

@ApiTags("Coach")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN)
@Controller("api/coach")
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  @Post("profile")
  @ApiOperation({ summary: "Tạo hoặc cập nhật coach profile" })
  upsertProfile(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: UpsertCoachProfileDto,
  ) {
    return this.coachService.upsertProfile(user.id, dto);
  }

  @Post("availability")
  @ApiOperation({ summary: "Cập nhật lịch available của coach" })
  setAvailability(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.coachService.setAvailability(user.id, dto.slots);
  }

  @Get("sessions")
  @ApiOperation({ summary: "Danh sách sessions của coach" })
  getSessions(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: GetSessionsDto,
  ) {
    return this.coachService.getSessions(user.id, query.status);
  }

  @Get("earnings")
  @ApiOperation({ summary: "Thu nhập coach theo khoảng thời gian" })
  getEarnings(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: DateRangeDto,
  ) {
    return this.coachService.getEarnings(
      user.id,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Post("stripe/onboard")
  @ApiOperation({ summary: "Bắt đầu Stripe Connect onboarding để nhận payout" })
  startStripeOnboarding(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: StripeOnboardDto,
  ) {
    return this.coachService.startStripeOnboarding(
      user.id,
      dto.refreshUrl,
      dto.returnUrl,
    );
  }
}
