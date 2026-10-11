import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Observable } from "rxjs";
import { CurrentUser, JwtAuthGuard, type AuthUserPayload } from "@app/common";
import { GroupChatService } from "../realtime/group-chat.service";
import { VideoPresenceService } from "../realtime/video-presence.service";
import { ChatEventsService } from "../realtime/chat-events.service";
import {
  AddMembersDto,
  CreateGroupDto,
  DirectChatDto,
} from "./dto/community.dto";

@ApiTags("Community")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("api/community")
export class CommunityController {
  constructor(
    private readonly groupChat: GroupChatService,
    private readonly presence: VideoPresenceService,
    private readonly chatEvents: ChatEventsService,
  ) {}

  @Get("rooms")
  @ApiOperation({ summary: "Danh sách phòng chat của user" })
  listRooms(@CurrentUser() user: AuthUserPayload) {
    return this.groupChat.listRoomsForUser(user.id);
  }

  @Get("rooms/:id")
  @ApiOperation({ summary: "Chi tiết phòng + lịch sử tin nhắn" })
  getRoom(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.groupChat.getRoomDetail(id, user.id);
  }

  @Post("rooms/group")
  @ApiOperation({ summary: "Tạo nhóm chat mới" })
  async createGroup(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: CreateGroupDto,
  ) {
    const room = await this.groupChat.createGroup(
      user.id,
      body.name,
      body.memberIds ?? [],
    );
    return this.groupChat.getRoomDetail(room.id, user.id);
  }

  @Post("rooms/direct")
  @ApiOperation({ summary: "Mở hoặc tạo chat 1:1 với học viên khác" })
  async directChat(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: DirectChatDto,
  ) {
    const room = await this.groupChat.findOrCreateDirect(user.id, body.userId);
    return this.groupChat.getRoomDetail(room.id, user.id);
  }

  @Post("rooms/:id/members")
  @ApiOperation({ summary: "Thêm thành viên vào nhóm" })
  addMembers(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: AddMembersDto,
  ) {
    return this.groupChat.addMembers(id, user.id, body.memberIds ?? []);
  }

  @Get("users")
  @ApiOperation({ summary: "Tìm học viên để chat" })
  searchUsers(@CurrentUser() user: AuthUserPayload, @Query("q") q = "") {
    return this.groupChat.searchUsers(q, user.id);
  }

  @Get("online")
  @ApiOperation({ summary: "Học viên đang online (video call)" })
  async listOnline(@CurrentUser() user: AuthUserPayload) {
    const onlineIds = await this.presence.listOnlineUserIds();
    return this.groupChat.getOnlineUsers(user.id, onlineIds);
  }

  @Post("rooms/:id/messages")
  @ApiOperation({ summary: "Gửi tin nhắn trong phòng" })
  async sendMessage(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { content: string; fileUrl?: string; fileType?: string },
  ) {
    const message = await this.groupChat.saveMessage(
      id,
      user.id,
      body.content.trim(),
      body.fileUrl,
      body.fileType,
    );
    return { message };
  }

  @Patch("rooms/:id/read")
  @ApiOperation({ summary: "Đánh dấu đã đọc phòng chat" })
  async markRead(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.groupChat.markRead(id, user.id);
    return { ok: true };
  }

  @Sse("rooms/:id/stream")
  @ApiOperation({ summary: "SSE stream — tin nhắn mới trong phòng" })
  async streamRoom(
    @CurrentUser() user: AuthUserPayload,
    @Param("id", ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<Observable<MessageEvent>> {
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    await this.groupChat.assertMember(id, user.id);
    return this.chatEvents.observe("community", id);
  }
}
