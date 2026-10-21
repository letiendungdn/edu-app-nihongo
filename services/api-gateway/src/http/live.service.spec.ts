import { createHash } from "node:crypto";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AccessToken } from "livekit-server-sdk";
import type { PrismaService } from "@app/prisma";
import { LiveService } from "./live.service";

describe("LiveService: phiên livestream 'ma'", () => {
  const old = new Date(Date.now() - 10 * 60_000);
  let prisma: {
    liveSession: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let rooms: { listRooms: jest.Mock };
  let service: LiveService;

  beforeEach(() => {
    process.env.LIVEKIT_URL = "http://livekit:7880";
    process.env.LIVEKIT_API_KEY = "devkey";
    process.env.LIVEKIT_API_SECRET = "devsecret-devsecret-devsecret-32";
    prisma = {
      liveSession: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    service = new LiveService(prisma as unknown as PrismaService);
    rooms = { listRooms: jest.fn() };
    (service as unknown as { roomClient: unknown }).roomClient = rooms;
  });

  it("phòng không còn trên LiveKit → đánh dấu ENDED và bỏ khỏi danh sách (bản cũ: nằm mãi)", async () => {
    prisma.liveSession.findMany.mockResolvedValue([
      { roomName: "live_a", startedAt: old },
      { roomName: "live_ghost", startedAt: old },
    ]);
    rooms.listRooms.mockResolvedValue([{ name: "live_a" }]);

    const list = await service.listLiveSessions();

    expect(list.map((s) => s.roomName)).toEqual(["live_a"]);
    expect(prisma.liveSession.updateMany).toHaveBeenCalledWith({
      where: { roomName: { in: ["live_ghost"] }, status: "LIVE" },
      data: expect.objectContaining({ status: "ENDED" }),
    });
  });

  it("phòng vừa tạo (< 1 phút) chưa hiện trên LiveKit → không kết thúc nhầm", async () => {
    prisma.liveSession.findMany.mockResolvedValue([
      { roomName: "live_new", startedAt: new Date() },
    ]);
    rooms.listRooms.mockResolvedValue([]);

    expect(await service.listLiveSessions()).toHaveLength(1);
    expect(prisma.liveSession.updateMany).not.toHaveBeenCalled();
  });

  it("LiveKit lỗi → giữ nguyên danh sách, không kết thúc phòng nào", async () => {
    prisma.liveSession.findMany.mockResolvedValue([
      { roomName: "live_a", startedAt: old },
    ]);
    rooms.listRooms.mockRejectedValue(new Error("timeout"));

    expect(await service.listLiveSessions()).toHaveLength(1);
    expect(prisma.liveSession.updateMany).not.toHaveBeenCalled();
  });

  it("vào xem phòng 'ma' → 404 và kết thúc phòng đó", async () => {
    prisma.liveSession.findFirst.mockResolvedValue({
      id: 1,
      roomName: "live_ghost",
      startedAt: old,
    });
    rooms.listRooms.mockResolvedValue([]);

    await expect(service.joinAsViewer(5, 1)).rejects.toThrow(NotFoundException);
    expect(prisma.liveSession.updateMany).toHaveBeenCalled();
  });

  async function signed(
    body: string,
    secret = process.env.LIVEKIT_API_SECRET!,
  ) {
    const at = new AccessToken("devkey", secret);
    at.sha256 = createHash("sha256").update(body).digest("base64");
    return at.toJwt();
  }

  it("webhook room_finished có chữ ký đúng → ENDED ngay", async () => {
    const body = JSON.stringify({
      event: "room_finished",
      room: { name: "live_a" },
    });

    await service.handleWebhook(body, await signed(body));

    expect(prisma.liveSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { roomName: { in: ["live_a"] }, status: "LIVE" },
      }),
    );
  });

  it("webhook sai chữ ký → 403, không đụng DB", async () => {
    const body = JSON.stringify({
      event: "room_finished",
      room: { name: "live_a" },
    });

    await expect(
      service.handleWebhook(
        body,
        await signed(body, "wrong-secret-wrong-secret-wrong-1"),
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.liveSession.updateMany).not.toHaveBeenCalled();
  });
});
