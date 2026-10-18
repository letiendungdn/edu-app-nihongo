import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/prisma";
import { SrsCardRepository } from "@app/prisma/srs-card.repository";
import {
  LogActivityDto,
  LogListeningDto,
  SrsAddLessonDto,
  SrsReviewDto,
  SyncReviewDto,
  UpsertDailyGoalsDto,
  UpsertDailyNoteDto,
} from "@app/contracts";

function fallbackContentId(kana: string, lessonNumber: number): number {
  let hash = lessonNumber * 9973;
  for (let i = 0; i < kana.length; i += 1) {
    hash = (hash * 31 + kana.charCodeAt(i)) | 0;
  }
  return -Math.abs(hash || 1);
}

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly srsCards: SrsCardRepository,
  ) {}

  async syncReviewBank(userId: number, dto: SyncReviewDto) {
    for (const item of dto.items) {
      const vocabulary = await this.prisma.vocabulary.findFirst({
        where: {
          kana: item.kana,
          lesson: { lessonNumber: item.lessonNumber },
        },
        select: { id: true },
        orderBy: { id: "asc" },
      });

      const contentId =
        vocabulary?.id ?? fallbackContentId(item.kana, item.lessonNumber);
      const lastReviewedAt = item.lastReviewedAt
        ? new Date(item.lastReviewedAt)
        : null;

      await this.srsCards.upsertVocabularyReviewCard(
        userId,
        contentId,
        item,
        lastReviewedAt,
      );
    }

    return { synced: dto.items.length };
  }

  getReviewBank(userId: number) {
    return this.srsCards.findVocabularyReviewBank(userId);
  }

  async logListening(userId: number, dto: LogListeningDto) {
    const log = await this.prisma.listeningLog.upsert({
      where: { userId_date: { userId, date: dto.date } },
      create: { userId, date: dto.date, seconds: dto.seconds },
      update: { seconds: dto.seconds },
    });
    return log;
  }

  getListeningHistory(userId: number) {
    return this.prisma.listeningLog.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 90,
    });
  }

  async getAnalytics(userId: number) {
    const [studySessions, examResults, srsStats, listeningLogs] =
      await Promise.all([
        this.prisma.studySession.findMany({
          where: { userId },
          orderBy: { date: "asc" },
          take: 365,
          select: { date: true, seconds: true, cardsReviewed: true },
        }),
        this.prisma.examResult.findMany({
          where: { userId },
          orderBy: { submittedAt: "asc" },
          select: {
            submittedAt: true,
            percent: true,
            passed: true,
            level: true,
            title: true,
          },
        }),
        this.prisma.srsCard.aggregate({
          where: { userId },
          _count: { id: true },
          _sum: { correctCount: true, wrongCount: true },
        }),
        this.prisma.listeningLog.findMany({
          where: { userId },
          orderBy: { date: "asc" },
          take: 365,
          select: { date: true, seconds: true },
        }),
      ]);

    const masteredCount = await this.prisma.srsCard.count({
      where: { userId, mastered: true },
    });

    const totalStudySeconds = studySessions.reduce((s, r) => s + r.seconds, 0);
    const totalListeningSeconds = listeningLogs.reduce(
      (s, r) => s + r.seconds,
      0,
    );

    return {
      overview: {
        totalStudySeconds,
        totalListeningSeconds,
        totalCardsReviewed:
          srsStats._sum.correctCount ?? 0 + (srsStats._sum.wrongCount ?? 0),
        masteredVocab: masteredCount,
        totalExams: examResults.length,
        passedExams: examResults.filter((e) => e.passed).length,
      },
      studySessions,
      examHistory: examResults,
      listeningHistory: listeningLogs,
    };
  }

  async upsertDailyNote(userId: number, dto: UpsertDailyNoteDto) {
    return this.prisma.dailyNote.upsert({
      where: { userId_date: { userId, date: dto.date } },
      create: { userId, date: dto.date, content: dto.content },
      update: { content: dto.content },
    });
  }

  listDailyNotes(userId: number, limit = 90) {
    return this.prisma.dailyNote.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: limit,
      select: {
        date: true,
        content: true,
        updatedAt: true,
      },
    });
  }

  async upsertDailyGoals(userId: number, dto: UpsertDailyGoalsDto) {
    const itemRows = dto.items.map((item, sortOrder) => ({
      text: item.label,
      done: item.done,
      sortOrder,
    }));

    return this.prisma.$transaction(async (tx) => {
      const goal = await tx.dailyGoal.upsert({
        where: { userId_date: { userId, date: dto.date } },
        create: { userId, date: dto.date },
        update: {},
      });

      await tx.dailyGoalItem.deleteMany({ where: { goalId: goal.id } });
      if (itemRows.length) {
        await tx.dailyGoalItem.createMany({
          data: itemRows.map((row) => ({ ...row, goalId: goal.id })),
        });
      }

      return tx.dailyGoal.findUnique({
        where: { id: goal.id },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
    });
  }

  listDailyGoals(userId: number, limit = 90) {
    return this.prisma.dailyGoal.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: limit,
      select: {
        date: true,
        items: {
          orderBy: { sortOrder: "asc" },
          select: { text: true, done: true, sortOrder: true },
        },
        updatedAt: true,
      },
    });
  }

  // ── SRS (SM-2) ──────────────────────────────────────────────────────────

  getSrsDueCards(userId: number, limit = 20) {
    return this.srsCards.getSrsDueCards(userId, limit);
  }

  submitSrsReview(userId: number, dto: SrsReviewDto) {
    return this.srsCards.submitSrsReview(userId, dto.vocabId, dto.quality);
  }

  getSrsStats(userId: number) {
    return this.srsCards.getSrsStats(userId);
  }

  addLessonToSrs(userId: number, dto: SrsAddLessonDto) {
    return this.srsCards.addLessonToSrs(userId, dto.lessonNumber);
  }

  async logActivity(userId: number, dto: LogActivityDto) {
    await this.prisma.dailyActivity.upsert({
      where: { userId_date_kind: { userId, date: dto.date, kind: dto.kind } },
      create: { userId, date: dto.date, kind: dto.kind, count: 1 },
      update: { count: { increment: 1 } },
    });
    return { ok: true };
  }

  async getTodayActivity(userId: number) {
    const today = new Date().toISOString().slice(0, 10);

    const [srsStats, activities, examToday] = await Promise.all([
      this.srsCards.getSrsStats(userId),
      this.prisma.dailyActivity.findMany({
        where: { userId, date: today },
        select: { kind: true, count: true },
      }),
      this.prisma.examResult.findFirst({
        where: {
          userId,
          submittedAt: {
            gte: new Date(today),
            lt: new Date(new Date(today).getTime() + 86_400_000),
          },
        },
        select: { id: true },
      }),
    ]);

    const activityMap = Object.fromEntries(
      activities.map((a) => [a.kind, a.count]),
    );

    return {
      srs: srsStats.total > 0 && srsStats.dueToday === 0,
      vocab: (activityMap["vocab"] ?? 0) > 0,
      kanji: (activityMap["kanji"] ?? 0) > 0,
      exam: !!examToday,
    };
  }
}
