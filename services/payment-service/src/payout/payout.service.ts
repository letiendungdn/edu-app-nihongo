import { Injectable, Logger } from "@nestjs/common";
import { PaymentStatus, PayoutStatus, SessionStatus } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { StripeService } from "../stripe/stripe.service";

/** Buổi học coi là xong khi đã kết thúc quá 24 giờ: chừa thời gian khiếu nại trước khi trả tiền coach. */
export const COMPLETE_AFTER_END_MS = 24 * 60 * 60 * 1000;
/** Lượt PROCESSING kẹt (pod chết giữa chừng) chỉ thử lại trong 24 giờ: idempotency key của Stripe hết hạn sau 24 giờ */
const STUCK_PROCESSING_RETRY_MS = 24 * 60 * 60 * 1000;
const MAX_TRANSFER_ATTEMPTS = 5;

export type PayoutRunSummary = {
  completed: number;
  created: number;
  paid: number;
  failed: number;
};

/**
 * Trả tiền cho coach. Bản cũ (processWeeklyPayouts) không được gọi ở đâu, và nếu được gọi thì:
 * chọn buổi theo `scheduledAt` 7 ngày gần nhất mà không đánh dấu buổi đã trả → chạy 2 lần là trả
 * gấp đôi; buổi xong muộn hơn 7 ngày thì không bao giờ được trả; lượt lỗi không thử lại; lấy % phí
 * của buổi đầu áp cho cả lô. Thêm nữa, không có code nào chuyển buổi sang COMPLETED.
 *
 * Giờ: mỗi buổi gắn `payoutId` lúc được gom → mỗi buổi thuộc tối đa MỘT lượt trả, chạy lại hay chạy
 * song song cũng không trả hai lần.
 */
@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async runPayouts(now = new Date()): Promise<PayoutRunSummary> {
    const completed = await this.completeFinishedSessions(now);
    const retried = await this.retryUnfinishedPayouts(now);
    const created = await this.createPayouts();
    let paid = retried.paid;
    let failed = retried.failed;
    for (const payoutId of created) {
      if (await this.transfer(payoutId)) paid += 1;
      else failed += 1;
    }
    return { completed, created: created.length, paid, failed };
  }

  /** CONFIRMED + đã thanh toán + kết thúc quá 24 giờ → COMPLETED (bản cũ không có bước này). */
  async completeFinishedSessions(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - COMPLETE_AFTER_END_MS);
    return this.prisma.$executeRaw`
      UPDATE "CoachingSession" s
      SET status = 'COMPLETED', "updatedAt" = NOW()
      FROM "Payment" p
      WHERE p."sessionId" = s.id
        AND p.status = 'SUCCEEDED'
        AND s.status = 'CONFIRMED'
        AND s."scheduledAt" + make_interval(mins => s."durationMin") < ${cutoff}`;
  }

  /** Gom các buổi COMPLETED chưa trả của từng coach thành một lượt trả. Trả về id các lượt mới. */
  async createPayouts(): Promise<number[]> {
    const eligible = await this.prisma.coachingSession.findMany({
      where: {
        status: SessionStatus.COMPLETED,
        payoutId: null,
        payment: { status: PaymentStatus.SUCCEEDED },
        coach: { stripeAccountId: { not: null }, payoutEnabled: true },
      },
      select: { id: true, coachId: true },
    });

    const byCoach = new Map<number, number[]>();
    for (const s of eligible) {
      byCoach.set(s.coachId, [...(byCoach.get(s.coachId) ?? []), s.id]);
    }

    const created: number[] = [];
    for (const [coachId, sessionIds] of byCoach) {
      const payoutId = await this.prisma.$transaction(async (tx) => {
        const payout = await tx.payout.create({
          data: {
            coachId,
            status: PayoutStatus.PROCESSING,
            amountCents: 0,
            grossAmountCents: 0,
            feeAmountCents: 0,
            periodStart: new Date(),
            periodEnd: new Date(),
          },
        });
        // Giành buổi: chỉ lấy buổi CHƯA thuộc lượt nào. Lượt chạy song song giành phần còn lại.
        await tx.coachingSession.updateMany({
          where: { id: { in: sessionIds }, payoutId: null },
          data: { payoutId: payout.id },
        });
        const claimed = await tx.coachingSession.findMany({
          where: { payoutId: payout.id },
          select: {
            priceUsdCents: true,
            platformFeePercent: true,
            scheduledAt: true,
          },
        });
        if (claimed.length === 0) {
          await tx.payout.delete({ where: { id: payout.id } });
          return null;
        }
        const gross = claimed.reduce((sum, c) => sum + c.priceUsdCents, 0);
        // Phí theo TỪNG buổi (bản cũ lấy % của buổi đầu cho cả lô)
        const fee = claimed.reduce(
          (sum, c) =>
            sum + Math.round((c.priceUsdCents * c.platformFeePercent) / 100),
          0,
        );
        const times = claimed.map((c) => c.scheduledAt.getTime());
        await tx.payout.update({
          where: { id: payout.id },
          data: {
            grossAmountCents: gross,
            feeAmountCents: fee,
            amountCents: gross - fee,
            sessionCount: claimed.length,
            periodStart: new Date(Math.min(...times)),
            periodEnd: new Date(Math.max(...times)),
          },
        });
        return payout.id;
      });
      if (payoutId != null) created.push(payoutId);
    }
    return created;
  }

  /** Thử lại lượt FAILED, và lượt PROCESSING kẹt (pod chết sau khi gom buổi, trước khi chuyển tiền). */
  async retryUnfinishedPayouts(
    now = new Date(),
  ): Promise<{ paid: number; failed: number }> {
    const recent = new Date(now.getTime() - STUCK_PROCESSING_RETRY_MS);
    const stale = new Date(now.getTime() - 60 * 60 * 1000);
    const pending = await this.prisma.payout.findMany({
      where: {
        attempts: { lt: MAX_TRANSFER_ATTEMPTS },
        OR: [
          { status: PayoutStatus.FAILED, createdAt: { gte: recent } },
          {
            status: PayoutStatus.PROCESSING,
            updatedAt: { lt: stale },
            createdAt: { gte: recent },
          },
        ],
      },
      select: { id: true },
    });
    let paid = 0;
    let failed = 0;
    for (const { id } of pending) {
      if (await this.transfer(id)) paid += 1;
      else failed += 1;
    }
    return { paid, failed };
  }

  /** Chuyển tiền một lượt. Idempotency key theo id lượt: thử lại không chuyển hai lần. */
  private async transfer(payoutId: number): Promise<boolean> {
    const payout = await this.prisma.payout.update({
      where: { id: payoutId },
      data: { attempts: { increment: 1 }, status: PayoutStatus.PROCESSING },
      include: { coach: { select: { stripeAccountId: true } } },
    });
    if (!payout.coach.stripeAccountId) {
      await this.markFailed(payoutId, "Coach chưa có tài khoản Stripe");
      return false;
    }
    try {
      const transfer = await this.stripe.transferToCoach({
        amountCents: payout.amountCents,
        currency: payout.currency,
        stripeAccountId: payout.coach.stripeAccountId,
        metadata: {
          payoutId: String(payout.id),
          coachId: String(payout.coachId),
          sessionCount: String(payout.sessionCount),
        },
        idempotencyKey: `payout-${payout.id}`,
      });
      await this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: PayoutStatus.PAID,
          stripeTransferId: transfer.id,
          processedAt: new Date(),
          failReason: null,
        },
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Payout ${payout.id} lỗi (lần ${payout.attempts}): ${message}`,
      );
      await this.markFailed(payout.id, message);
      return false;
    }
  }

  private async markFailed(payoutId: number, reason: string) {
    // Buổi vẫn gắn với lượt này: lần chạy sau thử lại đúng lượt đó, không gom buổi sang lượt mới
    await this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: PayoutStatus.FAILED, failReason: reason },
    });
  }

  async getReconciliationReport(startDate: Date, endDate: Date) {
    const [payments, payouts] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ["status"],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _sum: { amountCents: true },
        _count: { id: true },
      }),
      this.prisma.payout.groupBy({
        by: ["status"],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _sum: { amountCents: true, feeAmountCents: true },
        _count: { id: true },
      }),
    ]);

    const totalRevenue = payments
      .filter((payment) => payment.status === PaymentStatus.SUCCEEDED)
      .reduce((sum, payment) => sum + (payment._sum.amountCents ?? 0), 0);
    const totalPayouts = payouts
      .filter((payout) => payout.status === PayoutStatus.PAID)
      .reduce((sum, payout) => sum + (payout._sum.amountCents ?? 0), 0);
    const platformFees = payouts
      .filter((payout) => payout.status === PayoutStatus.PAID)
      .reduce((sum, payout) => sum + (payout._sum.feeAmountCents ?? 0), 0);

    return {
      period: { startDate, endDate },
      totalRevenueCents: totalRevenue,
      totalPayoutsCents: totalPayouts,
      platformFeesCents: platformFees,
      netPlatformCents: totalRevenue - totalPayouts,
      paymentBreakdown: payments,
      payoutBreakdown: payouts,
    };
  }
}
