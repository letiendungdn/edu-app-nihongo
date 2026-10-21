import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { claimCronRun, PrismaService, vietnamDate } from "@app/prisma";
import { MailService } from "@app/common/mail/mail.service";

const MILESTONE_DAYS = [7, 30, 100];

@Injectable()
export class MailSchedulerService {
  private readonly logger = new Logger(MailSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Every Sunday 8:00 AM Vietnam time */
  @Cron("0 8 * * 0", { timeZone: "Asia/Ho_Chi_Minh" })
  async sendWeeklyProgress(): Promise<void> {
    // Mọi pod gateway đều nổ cron này: chỉ một pod gửi (bản cũ: mỗi pod gửi một email)
    if (
      !(await claimCronRun(this.prisma, "mail.weekly-progress", vietnamDate()))
    )
      return;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const users = await this.prisma.user.findMany({
      where: {
        emailBounced: false,
        emailPrefs: { OR: [{ receiveProgress: true }, { id: { gt: 0 } }] },
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailPrefs: { select: { receiveProgress: true } },
      },
    });

    for (const user of users) {
      // Default opt-in when no prefs row exists
      if (user.emailPrefs?.receiveProgress === false) continue;

      try {
        const [cardsReviewed, newMastered, totalMastered] = await Promise.all([
          this.prisma.srsCard.count({
            where: { userId: user.id, lastReviewedAt: { gte: since } },
          }),
          this.prisma.srsCard.count({
            where: {
              userId: user.id,
              mastered: true,
              lastReviewedAt: { gte: since },
            },
          }),
          this.prisma.srsCard.count({
            where: { userId: user.id, mastered: true },
          }),
        ]);

        if (cardsReviewed === 0) continue; // no activity — skip

        const streak = await this.getStreak(user.id);

        await this.mail.sendWeeklyProgress({
          userId: user.id,
          toEmail: user.email,
          toName: user.name,
          cardsReviewed,
          newMastered,
          totalMastered,
          currentStreak: streak,
        });
      } catch (err: unknown) {
        this.logger.error(
          { err, userId: user.id },
          "Weekly progress email failed",
        );
      }
    }
  }

  /** Every day 9:00 AM Vietnam time — check streak milestones */
  @Cron("0 9 * * *", { timeZone: "Asia/Ho_Chi_Minh" })
  async sendStreakMilestones(): Promise<void> {
    if (
      !(await claimCronRun(
        this.prisma,
        "mail.streak-milestones",
        vietnamDate(),
      ))
    )
      return;
    const users = await this.prisma.user.findMany({
      where: { emailBounced: false },
      select: {
        id: true,
        email: true,
        name: true,
        emailPrefs: {
          select: { receiveStreak: true, lastMilestoneNotified: true },
        },
      },
    });

    for (const user of users) {
      if (user.emailPrefs?.receiveStreak === false) continue;

      try {
        const streak = await this.getStreak(user.id);
        const lastNotified = user.emailPrefs?.lastMilestoneNotified ?? 0;

        const nextMilestone = MILESTONE_DAYS.find(
          (m) => streak >= m && m > lastNotified,
        );
        if (!nextMilestone) continue;

        await this.mail.sendStreakMilestone({
          userId: user.id,
          toEmail: user.email,
          toName: user.name,
          milestone: nextMilestone,
          currentStreak: streak,
        });

        await this.prisma.emailPrefs.upsert({
          where: { userId: user.id },
          create: { userId: user.id, lastMilestoneNotified: nextMilestone },
          update: { lastMilestoneNotified: nextMilestone },
        });
      } catch (err: unknown) {
        this.logger.error(
          { err, userId: user.id },
          "Streak milestone email failed",
        );
      }
    }
  }

  private async getStreak(userId: number): Promise<number> {
    // Count consecutive days going backwards from today that have at least one review
    const reviews = await this.prisma.srsCard.findMany({
      where: { userId, lastReviewedAt: { not: null } },
      select: { lastReviewedAt: true },
      orderBy: { lastReviewedAt: "desc" },
    });

    if (!reviews.length) return 0;

    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    const days = new Set(
      reviews
        .map((r) => r.lastReviewedAt!)
        .map((d) => {
          const day = new Date(d);
          day.setUTCHours(0, 0, 0, 0);
          return day.getTime();
        }),
    );

    let streak = 0;
    let cursor = todayUtc.getTime();
    const DAY_MS = 86_400_000;

    while (days.has(cursor)) {
      streak++;
      cursor -= DAY_MS;
    }
    return streak;
  }
}
