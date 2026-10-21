import { Module } from "@nestjs/common";
import { WsJwtGuard } from "../auth/ws-jwt.guard";
import { PresenceService } from "../presence/presence.service";
import { SignalingGateway } from "./signaling.gateway";
import { RoomService } from "./room.service";

@Module({
  providers: [SignalingGateway, RoomService, PresenceService, WsJwtGuard],
})
export class SignalingModule {}
