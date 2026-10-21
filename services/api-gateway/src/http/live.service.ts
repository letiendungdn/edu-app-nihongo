import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  AccessToken,
  RoomServiceClient,
  WebhookReceiver,
} from "livekit-server-sdk";
import { PrismaService } from "@app/prisma";

export type LiveRole = "host" | "viewer";

/** Phòng vừa tạo có thể chưa hiện trên listRooms: không coi là "ma" trong 1 phút đầu. */
const GHOST_GRACE_MS = 60_000;

@Injectable()
export class LiveService {
  private roomClient: RoomServiceClient | null = null;

  constructor(private readonly prisma: PrismaService) {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (url && apiKey && apiSecret) {
      this.roomClient = new RoomServiceClient(url, apiKey, apiSecret);
    }
  }

  private get publicWsUrl(): string {
    return (
      process.env.LIVEKIT_PUBLIC_URL ??
      process.env.LIVEKIT_URL?.replace("http://", "ws://").replace(
        "https://",
        "wss://",
      ) ??
      "ws://localhost:7880"
    );
  }

  private ensureLiveKit(): RoomServiceClient {
    if (!this.roomClient) {
      throw new ServiceUnavailableException(
        "LiveKit chưa cấu hình (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)",
      );
    }
    return this.roomClient;
  }

  private createToken(
    userId: number,
    roomName: string,
    role: LiveRole,
  ): Promise<string> {
    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: String(userId),
      ttl: "2h",
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: role === "host",
      canPublishData: true,
      canSubscribe: true,
    });

    return at.toJwt();
  }

  /**
   * Phòng đang LIVE. Đối chiếu với LiveKit: phòng không còn trên LiveKit (coach thoát app không bấm
   * kết thúc, LiveKit tự xóa phòng sau 5 phút trống) thì đánh dấu ENDED. Bản cũ chỉ đọc DB: phiên "ma"
   * nằm mãi trong danh sách. Webhook room_finished (handleWebhook) xử lý ngay; đây là lớp dự phòng.
   */
  async listLiveSessions() {
    const live = await this.prisma.liveSession.findMany({
      where: { status: "LIVE" },
      orderBy: { startedAt: "desc" },
      include: {
        coach: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    const ghosts = await this.findGhosts(live);
    if (ghosts.size === 0) return live;
    await this.markEnded([...ghosts]);
    return live.filter((s) => !ghosts.has(s.roomName));
  }

  /** Phòng LIVE trong DB nhưng không còn trên LiveKit (bỏ qua phòng vừa tạo < 1 phút). */
  private async findGhosts(
    sessions: { roomName: string; startedAt: Date }[],
  ): Promise<Set<string>> {
    if (!this.roomClient || sessions.length === 0) return new Set();
    let active: Set<string>;
    try {
      const rooms = await this.roomClient.listRooms(
        sessions.map((s) => s.roomName),
      );
      active = new Set(rooms.map((r) => r.name));
    } catch {
      return new Set(); // LiveKit lỗi: giữ nguyên, không kết thúc nhầm
    }
    const settled = Date.now() - GHOST_GRACE_MS;
    return new Set(
      sessions
        .filter(
          (s) => !active.has(s.roomName) && s.startedAt.getTime() < settled,
        )
        .map((s) => s.roomName),
    );
  }

  private async markEnded(roomNames: string[]) {
    await this.prisma.liveSession.updateMany({
      where: { roomName: { in: roomNames }, status: "LIVE" },
      data: { status: "ENDED", endedAt: new Date() },
    });
  }

  /** Webhook của LiveKit (POST /api/live/webhook): room_finished → ENDED ngay. */
  async handleWebhook(rawBody: string, authHeader: string | undefined) {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret)
      throw new ServiceUnavailableException("LiveKit chưa cấu hình");
    let event: { event: string; room?: { name: string } };
    try {
      // Kiểm chữ ký (header Authorization là JWT ký bằng API secret, chứa sha256 của body)
      event = await new WebhookReceiver(apiKey, apiSecret).receive(
        rawBody,
        authHeader,
      );
    } catch {
      throw new ForbiddenException("Webhook LiveKit sai chữ ký");
    }
    if (event.event === "room_finished" && event.room?.name) {
      await this.markEnded([event.room.name]);
    }
  }

  async createLiveSession(coachId: number, title: string) {
    const roomClient = this.ensureLiveKit();
    const roomName = `live_${coachId}_${Date.now()}`;

    await roomClient.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: 200,
      metadata: JSON.stringify({ coachId, title }),
    });

    const session = await this.prisma.liveSession.create({
      data: {
        roomName,
        coachId,
        title,
        status: "LIVE",
      },
      include: {
        coach: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return {
      sessionId: session.id,
      roomName: session.roomName,
      title: session.title,
      token: await this.createToken(coachId, roomName, "host"),
      wsUrl: this.publicWsUrl,
      session,
    };
  }

  async joinAsViewer(userId: number, sessionId: number) {
    this.ensureLiveKit();

    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, status: "LIVE" },
    });
    if (!session) {
      throw new NotFoundException("Phòng không tồn tại hoặc đã kết thúc");
    }
    if ((await this.findGhosts([session])).size > 0) {
      await this.markEnded([session.roomName]);
      throw new NotFoundException("Phòng không tồn tại hoặc đã kết thúc");
    }

    return {
      sessionId: session.id,
      roomName: session.roomName,
      title: session.title,
      token: await this.createToken(userId, session.roomName, "viewer"),
      wsUrl: this.publicWsUrl,
    };
  }

  async endLiveSession(sessionId: number, coachId: number) {
    const roomClient = this.ensureLiveKit();

    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, coachId },
    });
    if (!session) {
      throw new ForbiddenException("Không có quyền kết thúc phòng này");
    }

    try {
      await roomClient.deleteRoom(session.roomName);
    } catch {
      // room có thể đã bị xóa trên LiveKit
    }

    await this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: "ENDED", endedAt: new Date() },
    });
  }

  async getViewerCount(sessionId: number) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException("Session not found");

    if (!this.roomClient) {
      return { sessionId, viewerCount: 0, participants: 0 };
    }

    try {
      const participants = await this.roomClient.listParticipants(
        session.roomName,
      );
      const viewers = Math.max(0, participants.length - 1);
      return {
        sessionId,
        viewerCount: viewers,
        participants: participants.length,
      };
    } catch {
      return { sessionId, viewerCount: 0, participants: 0 };
    }
  }
}
