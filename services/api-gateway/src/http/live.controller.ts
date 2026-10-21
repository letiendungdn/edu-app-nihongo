import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import {
  CurrentUser,
  JwtAuthGuard,
  Public,
  Roles,
  RolesGuard,
  type AuthUserPayload,
} from "@app/common";
import { CreateLiveSessionDto } from "./dto/live.dto";
import { LiveService } from "./live.service";

@ApiTags("live")
@Controller("api/live")
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  @Post("webhook")
  @Public()
  @HttpCode(200)
  @ApiOperation({
    summary: "Webhook của LiveKit (room_finished → kết thúc phiên)",
  })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("authorization") auth: string | undefined,
  ) {
    if (!req.rawBody) throw new BadRequestException("Missing raw body");
    await this.liveService.handleWebhook(req.rawBody.toString("utf8"), auth);
    return { received: true };
  }

  @Get("sessions")
  @Public()
  @ApiOperation({ summary: "Danh sách phòng đang live" })
  listSessions() {
    return this.liveService.listLiveSessions();
  }

  @Post("sessions")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: "Coach tạo phòng livestream" })
  createSession(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateLiveSessionDto,
  ) {
    return this.liveService.createLiveSession(user.id, dto.title);
  }

  @Post("sessions/:id/join")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Viewer lấy token vào xem" })
  joinSession(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.liveService.joinAsViewer(user.id, id);
  }

  @Delete("sessions/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: "Coach kết thúc livestream" })
  async endSession(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.liveService.endLiveSession(id, user.id);
    return { ok: true };
  }

  @Get("sessions/:id/viewers")
  @Public()
  @ApiOperation({ summary: "Số người đang xem" })
  viewerCount(@Param("id", ParseIntPipe) id: number) {
    return this.liveService.getViewerCount(id);
  }
}
