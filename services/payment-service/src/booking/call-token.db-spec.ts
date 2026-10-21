import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHmac } from "node:crypto";
import { verify } from "jsonwebtoken";
import { PrismaService } from "@app/prisma";
import { CallTokenService, iceServersFor } from "./call-token.service";
import {
  createCoach,
  createSession,
  createUser,
  resetTables,
} from "../../../test/db-fixtures";

describe("Vé vào phòng video call (Postgres thật)", () => {
  const prisma = new PrismaService();
  const service = new CallTokenService(
    prisma,
    new JwtService({ secret: "call-secret" }),
  );
  const start = new Date("2026-11-01T10:00:00Z");
  const at = (minutesFromStart: number) =>
    new Date(start.getTime() + minutesFromStart * 60_000);

  beforeEach(() => resetTables(prisma));
  afterAll(() => prisma.$disconnect());

  async function booked(
    status: "CONFIRMED" | "PENDING" | "CANCELED" = "CONFIRMED",
  ) {
    const coach = await createCoach(prisma);
    const learner = await createUser(prisma);
    const outsider = await createUser(prisma);
    const session = await createSession(prisma, {
      coachId: coach.id,
      learnerId: learner.id,
      scheduledAt: start,
      status,
    });
    return {
      session,
      learnerId: learner.id,
      coachUserId: coach.userId,
      outsiderId: outsider.id,
    };
  }

  it("học viên và coach nhận được vé đúng phòng, đúng người", async () => {
    const { session, learnerId, coachUserId } = await booked();

    for (const userId of [learnerId, coachUserId]) {
      const { token } = await service.issue(session.id, userId, at(-5));
      const p = verify(token, "call-secret") as unknown as {
        sub: number;
        sessionId: number;
        typ: string;
      };
      expect(p).toMatchObject({
        sub: userId,
        sessionId: session.id,
        typ: "call",
      });
    }
  });

  it("người ngoài → 403 (bản cũ: ai cũng vào được phòng)", async () => {
    const { session, outsiderId } = await booked();
    await expect(service.issue(session.id, outsiderId, at(0))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("buổi chưa thanh toán hoặc đã hủy → không cấp vé", async () => {
    for (const status of ["PENDING", "CANCELED"] as const) {
      await resetTables(prisma);
      const { session, learnerId } = await booked(status);
      await expect(service.issue(session.id, learnerId, at(0))).rejects.toThrow(
        BadRequestException,
      );
    }
  });

  it("phòng mở trước 15 phút, đóng 30 phút sau khi buổi 60 phút kết thúc", async () => {
    const { session, learnerId } = await booked();
    await expect(service.issue(session.id, learnerId, at(-16))).rejects.toThrow(
      "trước giờ học",
    );
    await expect(
      service.issue(session.id, learnerId, at(-15)),
    ).resolves.toBeDefined();
    await expect(
      service.issue(session.id, learnerId, at(90)),
    ).resolves.toBeDefined();
    await expect(service.issue(session.id, learnerId, at(91))).rejects.toThrow(
      "đã kết thúc",
    );
  });
});

describe("ICE server (STUN + TURN)", () => {
  it("chưa cấu hình TURN → chỉ STUN", () => {
    expect(iceServersFor(1, 0, {})).toEqual([
      {
        urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
      },
    ]);
  });

  it("có TURN → mật khẩu ngắn hạn kiểu coturn use-auth-secret (username = hạn:userId)", () => {
    const servers = iceServersFor(42, 1_800_000_000_000, {
      TURN_URLS:
        "turn:turn.example:3478?transport=udp, turn:turn.example:3478?transport=tcp",
      TURN_SECRET: "s3cret",
    });
    const turn = servers[1];
    expect(turn.urls).toEqual([
      "turn:turn.example:3478?transport=udp",
      "turn:turn.example:3478?transport=tcp",
    ]);
    expect(turn.username).toBe("1800000000:42");
    expect(turn.credential).toBe(
      createHmac("sha1", "s3cret").update("1800000000:42").digest("base64"),
    );
  });
});
