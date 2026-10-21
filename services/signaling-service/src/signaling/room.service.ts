import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

const MAX_PARTICIPANTS = 2;

@Injectable()
export class RoomService implements OnModuleInit, OnModuleDestroy {
  private redis!: Redis;

  onModuleInit() {
    this.redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
    this.redis.on("error", (err) => {
      console.error("[RoomService] Redis error:", err.message);
    });
  }

  async onModuleDestroy() {
    await this.redis.quit(); // bản cũ không đóng kết nối: tắt app không sạch
  }

  private key(sessionId: number) {
    return `vcroom:${sessionId}`;
  }

  async join(
    sessionId: number,
    userId: number,
    socketId: string,
  ): Promise<"ok" | "full"> {
    const raw = await this.redis.get(this.key(sessionId));
    const members: { userId: number; socketId: string }[] = raw
      ? JSON.parse(raw)
      : [];

    const existing = members.findIndex((m) => m.userId === userId);
    if (existing !== -1) {
      members[existing].socketId = socketId;
      await this.redis.setex(
        this.key(sessionId),
        3600,
        JSON.stringify(members),
      );
      return "ok";
    }

    if (members.length >= MAX_PARTICIPANTS) return "full";

    members.push({ userId, socketId });
    await this.redis.setex(this.key(sessionId), 3600, JSON.stringify(members));
    return "ok";
  }

  async leave(sessionId: number, socketId: string): Promise<void> {
    const raw = await this.redis.get(this.key(sessionId));
    if (!raw) return;
    const members: { userId: number; socketId: string }[] = JSON.parse(raw);
    const updated = members.filter((m) => m.socketId !== socketId);
    if (updated.length === 0) {
      await this.redis.del(this.key(sessionId));
    } else {
      await this.redis.setex(
        this.key(sessionId),
        3600,
        JSON.stringify(updated),
      );
    }
  }

  async getOtherSocketId(
    sessionId: number,
    socketId: string,
  ): Promise<string | null> {
    const raw = await this.redis.get(this.key(sessionId));
    if (!raw) return null;
    const members: { userId: number; socketId: string }[] = JSON.parse(raw);
    const other = members.find((m) => m.socketId !== socketId);
    return other?.socketId ?? null;
  }

  async getCount(sessionId: number): Promise<number> {
    const raw = await this.redis.get(this.key(sessionId));
    if (!raw) return 0;
    return (JSON.parse(raw) as unknown[]).length;
  }
}
