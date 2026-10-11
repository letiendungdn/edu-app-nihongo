import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import {
  LearnerProgress,
  ProgressViewsMissingError,
  type QueryCosts,
  type StudyDay,
} from "../domain/learner-progress";
import type { LearnerProgressRepository } from "../domain/learner-progress.repository";

interface SummaryRow {
  userId: number;
  currentStreak: number;
  longestStreak: number;
  totalSeconds: number;
  totalCards: number;
  vocabTotal: number;
  kanjiTotal: number;
}

interface DayRow {
  studyDate: Date | string;
  seconds: number;
  cardsReviewed: number;
  vocabCount: number;
  kanjiCount: number;
}

@Injectable()
export class PrismaLearnerProgressRepository implements LearnerProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSummary(userId: number): Promise<LearnerProgress> {
    try {
      const rows = await this.prisma.$queryRaw<SummaryRow[]>`
        SELECT
          "userId",
          "currentStreak",
          "longestStreak",
          "totalSeconds",
          "totalCards",
          "vocabTotal",
          "kanjiTotal"
        FROM learner_progress_summary
        WHERE "userId" = ${userId}
      `;
      const row = rows[0];
      if (!row) return LearnerProgress.empty(userId);
      return LearnerProgress.rehydrate({
        userId: Number(row.userId),
        currentStreak: Number(row.currentStreak),
        longestStreak: Number(row.longestStreak),
        totalSeconds: Number(row.totalSeconds),
        totalCards: Number(row.totalCards),
        vocabTotal: Number(row.vocabTotal),
        kanjiTotal: Number(row.kanjiTotal),
      });
    } catch (error) {
      throw this.asViewError(error);
    }
  }

  async findRecentDays(userId: number, limit: number): Promise<StudyDay[]> {
    try {
      const rows = await this.prisma.$queryRaw<DayRow[]>`
        SELECT "studyDate", seconds, "cardsReviewed", "vocabCount", "kanjiCount"
        FROM learner_daily_study
        WHERE "userId" = ${userId}
        ORDER BY "studyDate" DESC
        LIMIT ${limit}
      `;
      return rows.map((row) => ({
        studyDate: toDateString(row.studyDate),
        seconds: Number(row.seconds),
        cardsReviewed: Number(row.cardsReviewed),
        vocabCount: Number(row.vocabCount),
        kanjiCount: Number(row.kanjiCount),
      }));
    } catch (error) {
      throw this.asViewError(error);
    }
  }

  async measureCosts(userId: number, analyze: boolean): Promise<QueryCosts> {
    // ANALYZE chạy thật câu SELECT để có thời gian thực thi; BUFFERS cho biết đọc bao nhiêu page.
    const explain = analyze
      ? Prisma.raw("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)")
      : Prisma.raw("EXPLAIN (FORMAT JSON)");
    try {
      // Chạy lần lượt, không song song, để hai câu không tranh CPU/IO và làm lệch thời gian.
      const summary = await this.prisma.$queryRaw<ExplainRow[]>`
        ${explain}
        SELECT *
        FROM learner_progress_summary
        WHERE "userId" = ${userId}
      `;
      // Cùng kết quả với materialized view nhưng tính lại từ bảng gốc.
      const liveJoin = await this.prisma.$queryRaw<ExplainRow[]>`
        ${explain}
        SELECT
          u.id AS "userId",
          COALESCE(st."currentStreak", 0)::int AS "currentStreak",
          COALESCE(st."longestStreak", 0)::int AS "longestStreak",
          COALESCE(sess.total_seconds, 0)::int AS "totalSeconds",
          COALESCE(sess.total_cards, 0)::int AS "totalCards",
          COALESCE(act.vocab_total, 0)::int AS "vocabTotal",
          COALESCE(act.kanji_total, 0)::int AS "kanjiTotal"
        FROM "User" u
        LEFT JOIN "StudyStreak" st ON st."userId" = u.id
        LEFT JOIN (
          SELECT "userId", SUM(seconds) AS total_seconds, SUM("cardsReviewed") AS total_cards
          FROM "StudySession"
          GROUP BY "userId"
        ) sess ON sess."userId" = u.id
        LEFT JOIN (
          SELECT
            "userId",
            SUM(count) FILTER (WHERE kind = 'vocab') AS vocab_total,
            SUM(count) FILTER (WHERE kind = 'kanji') AS kanji_total
          FROM "DailyActivity"
          GROUP BY "userId"
        ) act ON act."userId" = u.id
        WHERE u.id = ${userId}
      `;
      const summaryPlan = readPlan(summary);
      const liveJoinPlan = readPlan(liveJoin);
      return {
        summaryCost: summaryPlan.cost,
        liveJoinCost: liveJoinPlan.cost,
        summaryMs: summaryPlan.executionMs,
        liveJoinMs: liveJoinPlan.executionMs,
      };
    } catch (error) {
      throw this.asViewError(error);
    }
  }

  /**
   * api-gateway chạy nhiều pod (HPA) và pod nào cũng có cron. Advisory lock theo
   * transaction: pod lấy được lock thì refresh, pod khác bỏ qua thay vì xếp hàng.
   * Lock tự nhả khi transaction kết thúc, kể cả khi pod chết giữa chừng.
   */
  async refreshSummary(): Promise<boolean> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
            SELECT pg_try_advisory_xact_lock(hashtext('learner_progress_summary')) AS locked
          `;
          if (!locked) return false;
          await tx.$executeRawUnsafe(
            "REFRESH MATERIALIZED VIEW CONCURRENTLY learner_progress_summary",
          );
          return true;
        },
        { timeout: 120_000 },
      );
    } catch (error) {
      throw this.asViewError(error);
    }
  }

  private asViewError(error: unknown): unknown {
    if (isMissingRelation(error)) return new ProgressViewsMissingError();
    return error;
  }
}

type ExplainRow = { "QUERY PLAN": unknown };

function readPlan(rows: ExplainRow[]): {
  cost: number;
  executionMs: number | null;
} {
  const field = rows[0]?.["QUERY PLAN"];
  const parsed: unknown = typeof field === "string" ? JSON.parse(field) : field;
  const root = (Array.isArray(parsed) ? parsed[0] : parsed) as
    { Plan?: { "Total Cost"?: number }; "Execution Time"?: number } | undefined;
  const cost = root?.Plan?.["Total Cost"];
  if (typeof cost !== "number") {
    throw new Error("EXPLAIN không có Total Cost");
  }
  const executionMs = root?.["Execution Time"];
  return {
    cost,
    executionMs: typeof executionMs === "number" ? executionMs : null,
  };
}

function toDateString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/** Chỉ 42P01 (undefined_table). Lỗi khác như thiếu cột (42703) không phải "chưa chạy Flyway". */
function isMissingRelation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = error.meta as { code?: string } | undefined;
    if (meta?.code === "42P01") return true;
  }
  const message = error instanceof Error ? error.message : "";
  return message.includes("42P01");
}
