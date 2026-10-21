import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export const VOCABULARY_CONTENT_TYPE = 'VOCABULARY' as const;

// ── SM-2 algorithm ────────────────────────────────────────────────────────────
function sm2(quality: number, ef: number, interval: number, reps: number) {
  const q = Math.max(0, Math.min(5, quality));
  const newEf = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  let newInterval: number;
  let newReps: number;
  if (q < 3) {
    newInterval = 1;
    newReps = 0;
  } else {
    newReps = reps + 1;
    if (reps === 0) newInterval = 1;
    else if (reps === 1) newInterval = 6;
    else newInterval = Math.round(interval * newEf);
  }
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
  return { easeFactor: newEf, interval: newInterval, repetitions: newReps, nextReviewAt };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReviewBankItem = {
  kana: string;
  kanji: string | null;
  meaning: string;
  lessonNumber: number;
  wrongCount: number;
  reviewStreak: number;
  mastered: boolean;
  lastReviewedAt: string | null;
};

export type ReviewBankSyncItem = {
  kana: string;
  kanji?: string | null;
  meaning: string;
  lessonNumber: number;
  wrongCount: number;
  reviewStreak: number;
  mastered: boolean;
};

export type SrsDueCard = {
  vocabId: number;
  kana: string;
  kanji: string | null;
  meaning: string;
  lessonNumber: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string | null;
};

export type SrsReviewResult = {
  interval: number;
  nextReviewAt: string;
  mastered: boolean;
};

export type SrsStats = {
  total: number;
  dueToday: number;
  mastered: number;
  learning: number;
};

// ── Repository ────────────────────────────────────────────────────────────────

@Injectable()
export class SrsCardRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Legacy mistake-bank (unchanged) ──────────────────────────────────────

  /**
   * Ghi trạng thái ôn của một thẻ từ máy gửi lên. Chỉ ghi khi lần ôn gửi lên MỚI HƠN bản đang lưu.
   *
   * Bản cũ upsert vô điều kiện (ai gửi sau thắng): điện thoại offline cả tuần rồi đẩy hàng đợi cũ
   * lên là đè mất tiến độ mới hơn từ máy khác. Điều kiện nằm trong WHERE nên không đua được.
   */
  async upsertVocabularyReviewCard(
    userId: number,
    contentId: number,
    item: ReviewBankSyncItem,
    lastReviewedAt: Date | null,
  ): Promise<void> {
    const key = { userId, contentType: VOCABULARY_CONTENT_TYPE, contentId };
    const data = {
      wrongCount: item.wrongCount,
      reviewStreak: item.reviewStreak,
      mastered: item.mastered,
      lastReviewedAt,
    };
    if (lastReviewedAt) {
      const { count } = await this.prisma.srsCard.updateMany({
        where: {
          ...key,
          OR: [{ lastReviewedAt: null }, { lastReviewedAt: { lt: lastReviewedAt } }],
        },
        data,
      });
      if (count > 0) return;
    }
    // Chưa có thẻ thì tạo; đã có (và mới hơn hoặc bằng) thì giữ nguyên
    await this.prisma.srsCard.createMany({ data: [{ ...key, ...data }], skipDuplicates: true });
  }

  async findVocabularyReviewBank(userId: number): Promise<ReviewBankItem[]> {
    const cards = await this.prisma.srsCard.findMany({
      where: { userId, contentType: VOCABULARY_CONTENT_TYPE },
      orderBy: [{ mastered: 'asc' }, { wrongCount: 'desc' }],
    });
    if (!cards.length) return [];

    const vocabIds = cards.map((c) => c.contentId);
    const vocabularies = await this.prisma.vocabulary.findMany({
      where: { id: { in: vocabIds } },
      include: { lesson: { select: { lessonNumber: true } } },
    });
    const vocabById = new Map(vocabularies.map((v) => [v.id, v]));

    return cards
      .map((card) => {
        const vocab = vocabById.get(card.contentId);
        if (!vocab) return null;
        return {
          kana: vocab.kana,
          kanji: vocab.kanji,
          meaning: vocab.meaning,
          lessonNumber: vocab.lesson.lessonNumber,
          wrongCount: card.wrongCount,
          reviewStreak: card.reviewStreak,
          mastered: card.mastered,
          lastReviewedAt: card.lastReviewedAt?.toISOString() ?? null,
        };
      })
      .filter((item): item is ReviewBankItem => item !== null);
  }

  // ── SM-2 SRS ──────────────────────────────────────────────────────────────

  async getSrsDueCards(userId: number, limit: number): Promise<SrsDueCard[]> {
    const now = new Date();
    const cards = await this.prisma.srsCard.findMany({
      where: {
        userId,
        contentType: VOCABULARY_CONTENT_TYPE,
        mastered: false,
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
      },
      orderBy: [{ nextReviewAt: 'asc' }],
      take: limit,
    });
    if (!cards.length) return [];

    const vocabIds = cards.map((c) => c.contentId);
    const vocabularies = await this.prisma.vocabulary.findMany({
      where: { id: { in: vocabIds } },
      include: { lesson: { select: { lessonNumber: true } } },
    });
    const vocabById = new Map(vocabularies.map((v) => [v.id, v]));

    return cards
      .map((card) => {
        const vocab = vocabById.get(card.contentId);
        if (!vocab) return null;
        return {
          vocabId: vocab.id,
          kana: vocab.kana,
          kanji: vocab.kanji,
          meaning: vocab.meaning,
          lessonNumber: vocab.lesson.lessonNumber,
          easeFactor: card.easeFactor,
          interval: card.interval,
          repetitions: card.repetitions,
          nextReviewAt: card.nextReviewAt?.toISOString() ?? null,
        };
      })
      .filter((c): c is SrsDueCard => c !== null);
  }

  async submitSrsReview(
    userId: number,
    vocabId: number,
    quality: number,
  ): Promise<SrsReviewResult> {
    const existing = await this.prisma.srsCard.findUnique({
      where: {
        userId_contentType_contentId: {
          userId,
          contentType: VOCABULARY_CONTENT_TYPE,
          contentId: vocabId,
        },
      },
    });

    const { easeFactor, interval, repetitions, nextReviewAt } = sm2(
      quality,
      existing?.easeFactor ?? 2.5,
      existing?.interval ?? 0,
      existing?.repetitions ?? 0,
    );

    // Card is considered mastered after 5 successful reps with interval ≥ 21 days
    const mastered = repetitions >= 5 && interval >= 21;
    const passed = quality >= 3;

    await this.prisma.srsCard.upsert({
      where: {
        userId_contentType_contentId: {
          userId,
          contentType: VOCABULARY_CONTENT_TYPE,
          contentId: vocabId,
        },
      },
      create: {
        userId,
        contentType: VOCABULARY_CONTENT_TYPE,
        contentId: vocabId,
        easeFactor,
        interval,
        repetitions,
        nextReviewAt,
        lastReviewedAt: new Date(),
        correctCount: passed ? 1 : 0,
        wrongCount: passed ? 0 : 1,
        mastered,
      },
      update: {
        easeFactor,
        interval,
        repetitions,
        nextReviewAt,
        lastReviewedAt: new Date(),
        correctCount: passed ? { increment: 1 } : undefined,
        wrongCount: passed ? undefined : { increment: 1 },
        mastered,
      },
    });

    return { interval, nextReviewAt: nextReviewAt.toISOString(), mastered };
  }

  async addLessonToSrs(userId: number, lessonNumber: number): Promise<{ added: number }> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { lessonNumber },
      include: { vocabularies: { select: { id: true } } },
    });
    if (!lesson) return { added: 0 };

    const existing = await this.prisma.srsCard.findMany({
      where: {
        userId,
        contentType: VOCABULARY_CONTENT_TYPE,
        contentId: { in: lesson.vocabularies.map((v) => v.id) },
      },
      select: { contentId: true },
    });
    const existingIds = new Set(existing.map((c) => c.contentId));
    const newVocabs = lesson.vocabularies.filter((v) => !existingIds.has(v.id));

    if (newVocabs.length) {
      await this.prisma.srsCard.createMany({
        data: newVocabs.map((v) => ({
          userId,
          contentType: VOCABULARY_CONTENT_TYPE,
          contentId: v.id,
        })),
        skipDuplicates: true,
      });
    }
    return { added: newVocabs.length };
  }

  async getSrsStats(userId: number): Promise<SrsStats> {
    const now = new Date();
    const [total, dueToday, mastered, learning] = await Promise.all([
      this.prisma.srsCard.count({
        where: { userId, contentType: VOCABULARY_CONTENT_TYPE },
      }),
      this.prisma.srsCard.count({
        where: {
          userId,
          contentType: VOCABULARY_CONTENT_TYPE,
          mastered: false,
          OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
        },
      }),
      this.prisma.srsCard.count({
        where: { userId, contentType: VOCABULARY_CONTENT_TYPE, mastered: true },
      }),
      this.prisma.srsCard.count({
        where: {
          userId,
          contentType: VOCABULARY_CONTENT_TYPE,
          mastered: false,
          repetitions: { gt: 0 },
          nextReviewAt: { gt: now },
        },
      }),
    ]);
    return { total, dueToday, mastered, learning };
  }
}
