import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHmac } from "node:crypto";
import { SessionStatus } from "@prisma/client";
import { PrismaService } from "@app/prisma";

/** Phòng gọi mở trước giờ học 15 phút, đóng 30 phút sau khi buổi kết thúc. */
export const CALL_OPENS_BEFORE_MS = 15 * 60 * 1000;
export const CALL_CLOSES_AFTER_MS = 30 * 60 * 1000;

export type CallTokenPayload = { sub: number; sessionId: number; typ: "call" };

export type IceServer = {
  urls: string[];
  username?: string;
  credential?: string;
};

const DEFAULT_STUN = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

/**
 * STUN + TURN. Bản cũ chỉ có STUN (ghi cứng ở web): hai bên sau NAT đối xứng (4G/5G, mạng công ty)
 * không tìm được đường đi trực tiếp → không gọi được. TURN chuyển tiếp media khi P2P thất bại.
 *
 * Mật khẩu TURN ngắn hạn theo "TURN REST API" (coturn `use-auth-secret`): username = "hạn:userId",
 * credential = base64(HMAC-SHA1(TURN_SECRET, username)). coturn tự kiểm, không cần lưu tài khoản;
 * lộ mật khẩu thì hết hạn cùng lúc phòng đóng.
 */
export function iceServersFor(
  userId: number,
  expiresAtMs: number,
  env = process.env,
): IceServer[] {
  const stun =
    env.STUN_URLS?.split(",")
      .map((u) => u.trim())
      .filter(Boolean) ?? DEFAULT_STUN;
  const servers: IceServer[] = [{ urls: stun.length ? stun : DEFAULT_STUN }];
  const turnUrls =
    env.TURN_URLS?.split(",")
      .map((u) => u.trim())
      .filter(Boolean) ?? [];
  if (turnUrls.length && env.TURN_SECRET) {
    const username = `${Math.floor(expiresAtMs / 1000)}:${userId}`;
    const credential = createHmac("sha1", env.TURN_SECRET)
      .update(username)
      .digest("base64");
    servers.push({ urls: turnUrls, username, credential });
  }
  return servers;
}

/**
 * Vé vào phòng video call của một buổi coach.
 *
 * Bản cũ: signaling-service cho `join-room` với BẤT KỲ sessionId nào, miễn có JWT đăng nhập → người
 * lạ vào được phòng của buổi người khác, chiếm chỗ (phòng 2 người) hoặc nghe lén. signaling không có
 * DB nên gateway kiểm tra quyền và ký vé; signaling chỉ kiểm vé (cùng JWT_SECRET).
 */
@Injectable()
export class CallTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async issue(sessionId: number, userId: number, now = new Date()) {
    const session = await this.prisma.coachingSession.findUnique({
      where: { id: sessionId },
      select: {
        learnerId: true,
        status: true,
        scheduledAt: true,
        durationMin: true,
        coach: { select: { userId: true } },
      },
    });
    if (!session) throw new NotFoundException("Buổi học không tồn tại");
    if (session.learnerId !== userId && session.coach.userId !== userId) {
      throw new ForbiddenException(
        "Chỉ học viên và coach của buổi này được vào phòng",
      );
    }
    if (session.status !== SessionStatus.CONFIRMED) {
      throw new BadRequestException(
        "Buổi học chưa được xác nhận (chưa thanh toán hoặc đã hủy)",
      );
    }

    const start = session.scheduledAt.getTime();
    const closesAt =
      start + session.durationMin * 60_000 + CALL_CLOSES_AFTER_MS;
    if (now.getTime() < start - CALL_OPENS_BEFORE_MS) {
      throw new BadRequestException("Phòng mở trước giờ học 15 phút");
    }
    if (now.getTime() > closesAt) {
      throw new BadRequestException("Buổi học đã kết thúc");
    }

    // Vé sống tới lúc phòng đóng: rớt mạng giữa buổi thì Socket.IO tự nối lại vẫn dùng được vé cũ
    const expiresInSec = Math.ceil((closesAt - now.getTime()) / 1000);
    const payload: CallTokenPayload = { sub: userId, sessionId, typ: "call" };
    const token = await this.jwt.signAsync(payload, {
      expiresIn: expiresInSec,
    });
    return {
      token,
      expiresAt: new Date(closesAt).toISOString(),
      iceServers: iceServersFor(userId, closesAt),
    };
  }
}
