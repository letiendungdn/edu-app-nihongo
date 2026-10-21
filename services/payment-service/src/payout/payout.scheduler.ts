import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { claimCronRun, PrismaService, vietnamDate } from "@app/prisma";
import { PayoutService } from "./payout.service";

/** Trả tiền coach mỗi thứ Hai 3:00 sáng (giờ VN). Bản cũ không có lịch nào gọi việc trả tiền. */
@Injectable()
export class PayoutScheduler {
  private readonly logger = new Logger(PayoutScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payouts: PayoutService,
  ) {}

  @Cron("0 3 * * 1", { timeZone: "Asia/Ho_Chi_Minh" })
  async weekly(): Promise<void> {
    // Mọi pod gateway đều nổ cron: chỉ một pod chạy lượt tuần này. Trả tiền vốn đã an toàn khi chạy
    // trùng (mỗi buổi gắn payoutId), khóa này chỉ để không gọi Stripe thừa.
    if (!(await claimCronRun(this.prisma, "payout.weekly", vietnamDate())))
      return;
    const summary = await this.payouts.runPayouts();
    this.logger.log(
      `Payout: ${summary.completed} buổi hoàn tất, ${summary.created} lượt mới, ${summary.paid} đã trả, ${summary.failed} lỗi`,
    );
  }
}
