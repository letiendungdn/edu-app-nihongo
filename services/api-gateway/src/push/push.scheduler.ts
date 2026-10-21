import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { claimCronRun, PrismaService, vietnamDate } from "@app/prisma";
import { PushService } from "./push.service";

@Injectable()
export class PushScheduler {
  private readonly logger = new Logger(PushScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  // 9 AM Vietnam time every day
  @Cron("0 9 * * *", { timeZone: "Asia/Ho_Chi_Minh" })
  async sendDailyReminders() {
    // Chạy trên mọi pod gateway: chỉ pod giành được lượt hôm nay mới gửi (bản cũ: mỗi pod gửi một lần)
    if (!(await claimCronRun(this.prisma, "push.daily-srs", vietnamDate())))
      return;
    this.logger.log("Sending daily SRS reminders…");

    const groups = await this.prisma.srsCard.groupBy({
      by: ["userId"],
      where: {
        nextReviewAt: { lte: new Date() },
        mastered: false,
      },
      _count: { id: true },
    });

    let sent = 0;
    for (const { userId, _count } of groups) {
      await this.push.sendSrsReminder(userId, _count.id);
      sent++;
    }

    this.logger.log(`Reminder dispatched to ${sent} user(s)`);
  }
}
