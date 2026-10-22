import { Injectable, Logger } from "@nestjs/common";
import { claimCronRun, PrismaService } from "@app/prisma";
import { MailService } from "@app/common/mail/mail.service";
import type { ReengageLearnerDto } from "./insights.dto";

export type ReengagementResult = {
  userId: number;
  status: "sent" | "skipped";
  reason?: string;
};

type KpiRow = {
  day: Date;
  active_learners: number;
  new_learners: number;
  at_risk: number;
  total_seconds: bigint;
  cards_reviewed: bigint;
  exams_taken: number;
};

type RiskRow = {
  user_id: number;
  email: string;
  name: string | null;
  risk_score: number;
  days_inactive: number;
  active_days_prior: number;
  due_cards: number;
  last_active_day: Date;
  reasons: string[];
  reengagement: string | null;
};

/**
 * Kết quả pipeline Airflow `learner_insights` (schema `insights`, Flyway V2).
 * Airflow tính; gateway gửi email (dùng MailService, tôn trọng tùy chọn nhận email) và phục vụ
 * trang admin.
 */
@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Gửi email kéo học viên quay lại cho một batch Airflow gửi lên.
   * Idempotent theo (học viên, ngày): Airflow retry gửi lại cùng batch không làm ai nhận hai email.
   * Kiểm tra lại tùy chọn email ngay lúc gửi (học viên có thể vừa tắt sau khi pipeline chạy).
   */
  async sendReengagement(
    day: string,
    learners: ReengageLearnerDto[],
  ): Promise<{ results: ReengagementResult[] }> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: learners.map((l) => l.userId) } },
      select: {
        id: true,
        email: true,
        name: true,
        emailBounced: true,
        emailPrefs: { select: { receiveProgress: true } },
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const results: ReengagementResult[] = [];
    for (const learner of learners) {
      const user = byId.get(learner.userId);
      if (!user) {
        results.push({
          userId: learner.userId,
          status: "skipped",
          reason: "not_found",
        });
        continue;
      }
      if (user.emailBounced || user.emailPrefs?.receiveProgress === false) {
        results.push({
          userId: user.id,
          status: "skipped",
          reason: "opted_out",
        });
        continue;
      }
      if (
        !(await claimCronRun(this.prisma, `reengagement.user-${user.id}`, day))
      ) {
        // Đã gửi cho (học viên, ngày) này ở lần gọi trước: báo "sent" để Airflow đánh dấu xong
        results.push({
          userId: user.id,
          status: "sent",
          reason: "already_sent",
        });
        continue;
      }
      try {
        await this.mail.sendReengagement({
          userId: user.id,
          toEmail: user.email,
          toName: user.name,
          daysInactive: learner.daysInactive,
          dueCards: learner.dueCards,
        });
        results.push({ userId: user.id, status: "sent" });
      } catch (err) {
        // Nhả lượt để lần retry sau gửi được
        await this.prisma.cronRun.deleteMany({
          where: { name: `reengagement.user-${user.id}`, slot: day },
        });
        this.logger.warn(
          `Gửi email kéo lại cho user ${user.id} lỗi: ${err instanceof Error ? err.message : String(err)}`,
        );
        throw err;
      }
    }
    return { results };
  }

  /** Trang admin: KPI 14 ngày gần nhất + danh sách học viên có nguy cơ của một ngày. */
  async overview(day?: string) {
    const exists = await this.prisma.$queryRaw<{ ok: boolean }[]>`
      SELECT to_regclass('insights.daily_kpi') IS NOT NULL AS ok`;
    if (!exists[0]?.ok) {
      return { ready: false, day: null, kpi: [], atRisk: [] };
    }
    const kpi = await this.prisma.$queryRaw<KpiRow[]>`
      SELECT * FROM insights.daily_kpi ORDER BY day DESC LIMIT 14`;
    const target = day ?? (kpi[0] ? isoDay(kpi[0].day) : null);
    const atRisk = target
      ? await this.prisma.$queryRaw<RiskRow[]>`
          SELECT c.user_id, u.email, u.name, c.risk_score, c.days_inactive, c.active_days_prior,
                 c.due_cards, c.last_active_day, c.reasons, r.status AS reengagement
          FROM insights.churn_risk c
          JOIN public."User" u ON u.id = c.user_id
          LEFT JOIN insights.reengagement r ON r.user_id = c.user_id AND r.day = c.day
          WHERE c.day = ${target}::date
          ORDER BY c.risk_score DESC, c.user_id
          LIMIT 100`
      : [];
    return {
      ready: true,
      day: target,
      kpi: kpi.map((k) => ({
        day: isoDay(k.day),
        activeLearners: k.active_learners,
        newLearners: k.new_learners,
        atRisk: k.at_risk,
        totalSeconds: Number(k.total_seconds),
        cardsReviewed: Number(k.cards_reviewed),
        examsTaken: k.exams_taken,
      })),
      atRisk: atRisk.map((r) => ({
        userId: r.user_id,
        email: r.email,
        name: r.name,
        riskScore: r.risk_score,
        daysInactive: r.days_inactive,
        activeDaysPrior: r.active_days_prior,
        dueCards: r.due_cards,
        lastActiveDay: isoDay(r.last_active_day),
        reasons: r.reasons,
        reengagement: r.reengagement,
      })),
    };
  }
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
