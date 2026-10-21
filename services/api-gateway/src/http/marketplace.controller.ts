import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  JwtAuthGuard,
  Public,
  type AuthUserPayload,
} from "@app/common";
import { BookingService } from "../../../payment-service/src/booking/booking.service";
import { MarketplaceService } from "../../../payment-service/src/marketplace/marketplace.service";
import { SessionChatService } from "../../../payment-service/src/booking/session-chat.service";
import { CallTokenService } from "../../../payment-service/src/booking/call-token.service";
import {
  BookSessionDto,
  CancelSessionDto,
  CreateReviewDto,
  SearchCoachesDto,
} from "./dto/marketplace.dto";

@ApiTags("Marketplace")
@Controller("api/marketplace")
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly bookingService: BookingService,
    private readonly sessionChat: SessionChatService,
    private readonly callTokens: CallTokenService,
  ) {}

  @Public()
  @Get("coaches")
  @ApiOperation({ summary: "Tìm kiếm coaches" })
  searchCoaches(@Query() query: SearchCoachesDto) {
    return this.marketplaceService.searchCoaches(query);
  }

  @Public()
  @Get("coaches/:id")
  @ApiOperation({ summary: "Chi tiết coach" })
  getCoach(@Param("id", ParseIntPipe) id: number) {
    return this.marketplaceService.getCoach(id);
  }

  @Public()
  @Get("coaches/:id/availability")
  @ApiOperation({ summary: "Available slots của coach theo ngày (YYYY-MM-DD)" })
  getAvailability(
    @Param("id", ParseIntPipe) id: number,
    @Query("date") date: string,
  ) {
    return this.marketplaceService.getAvailability(id, date);
  }

  @Post("sessions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Đặt lịch coaching session" })
  bookSession(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: BookSessionDto,
  ) {
    return this.bookingService.bookSession({
      learnerId: user.id,
      coachId: dto.coachId,
      scheduledAt: new Date(dto.scheduledAt),
      topic: dto.topic,
    });
  }

  @Post("sessions/:id/call-token")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Vé vào phòng video call (chỉ học viên/coach của buổi, đúng khung giờ)",
  })
  callToken(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.callTokens.issue(id, user.id);
  }

  @Post("sessions/:id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Hủy coaching session" })
  async cancelSession(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CancelSessionDto,
  ) {
    return this.bookingService.cancelSession(id, user.id, dto.reason);
  }

  @Post("sessions/:id/review")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Đánh giá coaching session" })
  reviewSession(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateReviewDto,
  ) {
    return this.marketplaceService.createReview(
      id,
      user.id,
      dto.rating,
      dto.comment,
    );
  }

  @Get("sessions/:id/messages")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lịch sử chat coaching session" })
  getSessionMessages(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.sessionChat.getMessages(id, user.id);
  }

  @Post("sessions/:id/messages")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Gửi tin nhắn trong coaching session" })
  sendSessionMessage(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { content: string; fileUrl?: string; fileType?: string },
  ) {
    return this.sessionChat.sendMessage(
      id,
      user.id,
      body.content.trim(),
      body.fileUrl,
      body.fileType,
    );
  }

  @Patch("sessions/:id/messages/read")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Đánh dấu đã đọc chat session" })
  async markSessionRead(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.sessionChat.markRead(id, user.id);
    return { ok: true };
  }
}
