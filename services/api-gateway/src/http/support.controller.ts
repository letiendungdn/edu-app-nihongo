import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Res,
  Sse,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Observable } from "rxjs";
import { CurrentUser, type AuthUserPayload } from "@app/common";
import { SupportChatService } from "../realtime/support-chat.service";
import { ChatEventsService } from "../realtime/chat-events.service";

class SendMessageDto {
  content!: string;
  fileUrl?: string;
  fileType?: string;
}

@ApiTags("Support")
@ApiBearerAuth()
@Controller("api/support")
export class SupportController {
  constructor(
    private readonly support: SupportChatService,
    private readonly chatEvents: ChatEventsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Hội thoại hỗ trợ của user hiện tại" })
  getMyThread(@CurrentUser() user: AuthUserPayload) {
    return this.support.getUserThread(user.id);
  }

  @Post("messages")
  @ApiOperation({ summary: "Gửi tin nhắn hỗ trợ" })
  async sendMessage(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: SendMessageDto,
  ) {
    const thread = await this.support.getOrCreateThread(user.id);
    const { message } = await this.support.saveMessage(
      thread.id,
      user.id,
      body.content.trim(),
      body.fileUrl,
      body.fileType,
    );
    return { threadId: thread.id, message };
  }

  @Patch("read")
  @ApiOperation({ summary: "Đánh dấu đã đọc hội thoại hỗ trợ" })
  async markRead(@CurrentUser() user: AuthUserPayload) {
    const thread = await this.support.getOrCreateThread(user.id);
    await this.support.markRead(thread.id, user.id, user.role);
    return { ok: true };
  }

  @Sse("stream")
  @ApiOperation({ summary: "SSE stream — tin nhắn mới trong hội thoại hỗ trợ" })
  async stream(
    @CurrentUser() user: AuthUserPayload,
    @Res() res: Response,
  ): Promise<Observable<MessageEvent>> {
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    const thread = await this.support.getOrCreateThread(user.id);
    return this.chatEvents.observe("support", thread.id);
  }
}
