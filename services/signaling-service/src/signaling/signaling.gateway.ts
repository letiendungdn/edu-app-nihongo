import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { UseGuards } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { verifyCallToken } from "../auth/verify-call-token";
import { verifyWsToken } from "../auth/verify-ws-token";
import { WsJwtGuard } from "../auth/ws-jwt.guard";
import { PresenceService } from "../presence/presence.service";
import { RoomService } from "./room.service";

interface SessionSdpPayload {
  sessionId: number;
  sdp: { type?: string; sdp?: string };
}

interface SessionCandidatePayload {
  sessionId: number;
  candidate: {
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  },
  namespace: "/signal",
})
export class SignalingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;

  constructor(
    private readonly room: RoomService,
    private readonly presence: PresenceService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    const payload = token ? verifyWsToken(token) : null;
    if (!payload) {
      client.disconnect();
      return;
    }

    client.data.userId = payload.sub;
    client.data.email = payload.email;
    client.data.presenceOnly = true;

    const userIds = await this.presence.addSocket(payload.sub, client.id);
    this.server.emit("presence-update", { userIds });
  }

  async handleDisconnect(client: Socket) {
    // Lúc tắt app, socket ngắt SAU khi Redis đã đóng: lỗi dọn dẹp chỉ ghi log, không làm sập tiến
    // trình (bản cũ: unhandled rejection). Presence tự hết hạn sau 120 giây nếu không dọn được.
    try {
      const userId: number | undefined = client.data.userId;
      if (userId) {
        const userIds = await this.presence.removeSocket(userId, client.id);
        this.server.emit("presence-update", { userIds });
      }

      const sessionId: number | undefined = client.data.sessionId;
      if (sessionId) await this.handleLeave(client, sessionId);
    } catch (err) {
      console.warn(
        "[Signaling] dọn kết nối lỗi:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("presence-ping")
  async onPresencePing(@ConnectedSocket() client: Socket) {
    await this.presence.refresh(client.data.userId);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("join-room")
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: number; callToken?: string },
  ) {
    const { sessionId } = data;
    const userId: number = client.data.userId;

    // Bản cũ không kiểm tra gì: ai đăng nhập cũng vào được phòng của bất kỳ buổi học nào
    if (!verifyCallToken(data.callToken, sessionId, userId)) {
      throw new WsException("Không có quyền vào phòng này");
    }

    client.data.presenceOnly = false;

    const result = await this.room.join(sessionId, userId, client.id);
    if (result === "full") {
      throw new WsException("Room is full");
    }

    await client.join(`room:${sessionId}`);
    client.data.sessionId = sessionId;

    const count = await this.room.getCount(sessionId);
    client.emit("joined", { sessionId, userId });

    if (count === 2) {
      const otherSocketId = await this.room.getOtherSocketId(
        sessionId,
        client.id,
      );
      if (otherSocketId) {
        this.server.to(otherSocketId).emit("peer-joined", { userId });
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("offer")
  async onOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SessionSdpPayload,
  ) {
    const otherSocketId = await this.peerOf(client, data.sessionId);
    if (!otherSocketId) return;
    this.server
      .to(otherSocketId)
      .emit("offer", { sdp: data.sdp, from: client.data.userId });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("answer")
  async onAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SessionSdpPayload,
  ) {
    const otherSocketId = await this.peerOf(client, data.sessionId);
    if (!otherSocketId) return;
    this.server
      .to(otherSocketId)
      .emit("answer", { sdp: data.sdp, from: client.data.userId });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("ice-candidate")
  async onIce(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SessionCandidatePayload,
  ) {
    const otherSocketId = await this.peerOf(client, data.sessionId);
    if (!otherSocketId) return;
    this.server
      .to(otherSocketId)
      .emit("ice-candidate", { candidate: data.candidate });
  }

  @SubscribeMessage("leave-room")
  async onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: number },
  ) {
    // Chỉ rời phòng mình đang ở (bản cũ: người ngoài gửi leave-room là thành viên nhận peer-left giả)
    if (client.data.sessionId !== data.sessionId) return;
    await this.handleLeave(client, data.sessionId);
  }

  /**
   * Socket bên kia trong phòng mà client ĐÃ vào hợp lệ. Bản cũ lấy sessionId client gửi lên: người
   * chưa join (không có vé) vẫn bơm được offer/ICE vào phòng của người khác.
   */
  private async peerOf(
    client: Socket,
    sessionId: number,
  ): Promise<string | null> {
    if (client.data.sessionId !== sessionId) return null;
    return this.room.getOtherSocketId(sessionId, client.id);
  }

  private async handleLeave(client: Socket, sessionId: number) {
    await this.room.leave(sessionId, client.id);
    const otherSocketId = await this.room.getOtherSocketId(
      sessionId,
      client.id,
    );
    if (otherSocketId) {
      this.server
        .to(otherSocketId)
        .emit("peer-left", { userId: client.data.userId });
    }
    await client.leave(`room:${sessionId}`);
    client.data.sessionId = undefined;
  }
}
