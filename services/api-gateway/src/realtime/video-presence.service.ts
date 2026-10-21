import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT } from "@app/common";

/** Do signaling-service ghi: sorted set userId → thời điểm hết hạn (ms). */
const ONLINE_KEY = "vc:presence:online";

@Injectable()
export class VideoPresenceService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Bản cũ dùng KEYS vc:presence:* (quét toàn bộ keyspace, chặn Redis khi nhiều key). */
  async listOnlineUserIds(): Promise<number[]> {
    const ids = await this.redis.zrangebyscore(ONLINE_KEY, Date.now(), "+inf");
    return ids
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id))
      .sort((a, b) => a - b);
  }
}
