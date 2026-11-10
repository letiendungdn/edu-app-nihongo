import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, type AuthUserPayload } from "@app/common";
import { NotificationService } from "../realtime/notification.service";

class MarkNotificationsReadDto {
  ids!: number[];
}

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("api/notifications")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: "Lấy notifications chưa đọc" })
  getUnread(@CurrentUser() user: AuthUserPayload) {
    return this.notificationService.getUnread(user.id);
  }

  @Patch("read")
  @ApiOperation({ summary: "Đánh dấu đã đọc" })
  markRead(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: MarkNotificationsReadDto,
  ) {
    return this.notificationService.markRead(user.id, dto.ids);
  }
}
