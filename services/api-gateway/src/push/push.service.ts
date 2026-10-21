import { Injectable, Logger, OnModuleDestroy, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@app/prisma";
import * as apn from "@parse/node-apn";
import { FcmSender } from "./fcm.sender";

/** Token giả (không phải FCM) do bản app cũ tạo: "android-" + id thiết bị / uuid. */
const FAKE_ANDROID_TOKEN = /^android-[0-9a-f-]+$/i;

@Injectable()
export class PushService implements OnModuleDestroy {
  private readonly logger = new Logger(PushService.name);
  private provider: apn.Provider | null = null;
  private readonly bundleId: string;
  private readonly fcm: FcmSender | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    // Test truyền sender giả; chạy thật Nest truyền undefined → đọc cấu hình từ env
    @Optional() fcm?: FcmSender | null,
  ) {
    this.fcm = fcm === undefined ? FcmSender.fromEnv() : fcm;
    if (!this.fcm) {
      this.logger.warn(
        "FCM not configured — set FCM_SERVICE_ACCOUNT_JSON or FCM_SERVICE_ACCOUNT_PATH to push Android",
      );
    }
    const keyPath = config.get<string>("APNS_KEY_PATH", "");
    const keyId = config.get<string>("APNS_KEY_ID", "");
    const teamId = config.get<string>("APNS_TEAM_ID", "");
    this.bundleId = config.get<string>("APNS_BUNDLE_ID", "com.edu.nihongo.ios");

    if (keyPath && keyId && teamId) {
      this.provider = new apn.Provider({
        token: { key: keyPath, keyId, teamId },
        production: config.get("NODE_ENV") === "production",
      });
      this.logger.log("APNs provider initialized");
    } else {
      this.logger.warn(
        "APNs not configured — set APNS_KEY_PATH, APNS_KEY_ID, APNS_TEAM_ID to enable push",
      );
    }
  }

  async registerToken(
    userId: number,
    token: string,
    platform = "ios",
  ): Promise<void> {
    await this.prisma.pushDeviceToken.upsert({
      where: { token },
      update: { userId, platform, updatedAt: new Date() },
      create: { userId, token, platform },
    });
  }

  /** Chỉ xoá token của chính user đang đăng nhập — không cho gỡ thiết bị của người khác (IDOR). */
  async unregisterToken(token: string, userId: number): Promise<void> {
    await this.prisma.pushDeviceToken.deleteMany({ where: { token, userId } });
  }

  /** Nội bộ: APNs báo token không còn hợp lệ → xoá bất kể chủ (không gọi từ API). */
  private async removeInvalidToken(token: string): Promise<void> {
    await this.prisma.pushDeviceToken.deleteMany({ where: { token } });
  }

  async unregisterAllForUser(userId: number): Promise<void> {
    await this.prisma.pushDeviceToken.deleteMany({ where: { userId } });
  }

  async sendSrsReminder(userId: number, dueCount: number): Promise<void> {
    const rows = await this.prisma.pushDeviceToken.findMany({
      where: { userId },
      select: { token: true, platform: true },
    });
    const ios = rows.filter((r) => r.platform === "ios").map((r) => r.token);
    const android = rows
      .filter((r) => r.platform === "android")
      .map((r) => r.token);
    const title = "📚 Ôn tập hôm nay";
    const body = `Bạn có ${dueCount} thẻ cần ôn — duy trì streak nhé!`;
    await Promise.all([
      this.sendApns(ios, title, body, dueCount),
      this.sendFcm(android, title, body),
    ]);
  }

  private async sendApns(
    tokens: string[],
    title: string,
    body: string,
    badge: number,
  ) {
    if (!this.provider || tokens.length === 0) return;
    const note = new apn.Notification();
    note.topic = this.bundleId;
    note.alert = { title, body };
    note.badge = badge;
    note.sound = "default";
    note.payload = { screen: "srs" };
    // expire after 1 hour so stale reminders don't pile up
    note.expiry = Math.floor(Date.now() / 1000) + 3600;

    const result = await this.provider.send(note, tokens);
    for (const failure of result.failed) {
      this.logger.warn(
        `APNs failure for device ${failure.device}: ${failure.response?.reason ?? "unknown"}`,
      );
      const reason = failure.response?.reason;
      if (reason === "BadDeviceToken" || reason === "Unregistered") {
        await this.removeInvalidToken(failure.device);
      }
    }
  }

  private async sendFcm(tokens: string[], title: string, body: string) {
    for (const token of tokens) {
      // App Flutter cũ gửi "android-<uuid>" làm token: không phải token FCM, gửi chỉ tốn lượt gọi
      if (FAKE_ANDROID_TOKEN.test(token)) {
        await this.removeInvalidToken(token);
        continue;
      }
      if (!this.fcm) continue;
      try {
        const result = await this.fcm.send(token, {
          title,
          body,
          data: { screen: "srs" },
        });
        if (result === "invalid-token") await this.removeInvalidToken(token);
      } catch (err) {
        this.logger.warn(
          `FCM lỗi: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  onModuleDestroy() {
    void this.provider?.shutdown();
  }
}
