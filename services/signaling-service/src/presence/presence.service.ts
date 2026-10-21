import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

const PRESENCE_TTL_SEC = 120;
/** Sorted set: member = userId, score = thời điểm hết hạn (ms). Gateway đọc chung key này. */
export const ONLINE_KEY = "vc:presence:online";
const socketsKey = (userId: number) => `vc:presence:sockets:${userId}`;

/**
 * Ai đang online, dùng chung giữa mọi instance signaling qua Redis.
 *
 * Bản cũ giữ socket của từng user trong RAM của instance: user mở 2 tab nối vào 2 instance, đóng tab
 * ở instance A thì A thấy "hết socket" và xóa key online → user bị coi là offline dù tab kia còn mở.
 * Instance chết thì không ai dọn: TTL trên sorted set lo việc đó (không ping thì hết hạn sau 120 giây).
 */
@Injectable()
export class PresenceService implements OnModuleInit, OnModuleDestroy {
  private redis!: Redis;

  onModuleInit() {
    this.redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
    this.redis.on("error", (err) => {
      console.error("[PresenceService] Redis error:", err.message);
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  private expiry() {
    return Date.now() + PRESENCE_TTL_SEC * 1000;
  }

  async addSocket(userId: number, socketId: string): Promise<number[]> {
    await this.redis
      .multi()
      .sadd(socketsKey(userId), socketId)
      .expire(socketsKey(userId), PRESENCE_TTL_SEC)
      .zadd(ONLINE_KEY, this.expiry(), String(userId))
      .exec();
    return this.listOnlineUserIds();
  }

  async removeSocket(userId: number, socketId: string): Promise<number[]> {
    const replies = await this.redis
      .multi()
      .srem(socketsKey(userId), socketId)
      .scard(socketsKey(userId))
      .exec();
    if (replies?.[1]?.[1] === 0) {
      await this.redis
        .multi()
        .zrem(ONLINE_KEY, String(userId))
        .del(socketsKey(userId))
        .exec();
    }
    return this.listOnlineUserIds();
  }

  async refresh(userId: number): Promise<void> {
    await this.redis
      .multi()
      .zadd(ONLINE_KEY, "XX", this.expiry(), String(userId)) // chỉ gia hạn user đang online
      .expire(socketsKey(userId), PRESENCE_TTL_SEC)
      .exec();
  }

  async listOnlineUserIds(): Promise<number[]> {
    const now = Date.now();
    await this.redis.zremrangebyscore(ONLINE_KEY, "-inf", now);
    const ids = await this.redis.zrangebyscore(ONLINE_KEY, now, "+inf");
    return ids
      .map(Number)
      .filter((id) => !Number.isNaN(id))
      .sort((a, b) => a - b);
  }
}
