import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { NotificationService } from "./notification.service";
import { GroupChatService } from "./group-chat.service";
import { SupportChatService } from "./support-chat.service";
import { VideoPresenceService } from "./video-presence.service";
import { ChatEventsService } from "./chat-events.service";
import { MqttBus } from "./mqtt.bus";

@Module({
  imports: [PrismaModule],
  providers: [
    MqttBus,
    ChatEventsService,
    GroupChatService,
    SupportChatService,
    NotificationService,
    VideoPresenceService,
  ],
  exports: [
    ChatEventsService,
    NotificationService,
    SupportChatService,
    GroupChatService,
    VideoPresenceService,
  ],
})
export class RealtimeModule {}
