import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@app/prisma";

/** Payload do outbox ghi trong mock-exams.service.ts submit(). */
export type ExamSubmittedMessage = {
  eventId: string;
  examResultId: number;
  userId: number | null;
  submittedAt: string;
  percent?: number;
  passed?: boolean;
};

export const PROGRESS_UPDATER = "progress-updater";
const STUDY_TIMEZONE = "Asia/Ho_Chi_Minh";

/** Ngày học theo giờ Việt Nam ("YYYY-MM-DD"): 6 giờ sáng VN (23:00 UTC hôm trước) vẫn tính là hôm nay. */
export function studyDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function previousDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Streak mới sau khi học vào `today`:
 * cùng ngày → giữ nguyên; hôm qua có học → +1; bỏ ngày / chưa từng học → 1.
 * Sự kiện đến trễ (ngày cũ hơn lastStudyDate) không làm streak lùi.
 */
export function nextStreak(
  prev: {
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: string | null;
  } | null,
  today: string,
): { currentStreak: number; longestStreak: number; lastStudyDate: string } {
  if (!prev || !prev.lastStudyDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, prev?.longestStreak ?? 0),
      lastStudyDate: today,
    };
  }
  if (today <= prev.lastStudyDate) {
    return {
      currentStreak: prev.currentStreak,
      longestStreak: prev.longestStreak,
      lastStudyDate: prev.lastStudyDate,
    };
  }
  const current =
    previousDay(today) === prev.lastStudyDate ? prev.currentStreak + 1 : 1;
  return {
    currentStreak: current,
    longestStreak: Math.max(prev.longestStreak, current),
    lastStudyDate: today,
  };
}

/**
 * Consumer "progress-updater" của edu.exam.submitted: ghi hoạt động "exam" trong ngày và cập nhật StudyStreak.
 * Idempotent: dấu ProcessedEvent(eventId, consumer) ghi CÙNG transaction với cập nhật — event trùng bị bỏ qua.
 */
@Injectable()
export class ProgressUpdater {
  private readonly logger = new Logger(ProgressUpdater.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Trả về false nếu bỏ qua (khách, hoặc event đã xử lý). */
  async handle(msg: ExamSubmittedMessage): Promise<boolean> {
    if (!msg.userId) return false; // khách làm bài: không có tiến độ để cập nhật
    if (!msg.eventId || !msg.submittedAt) {
      throw new Error(
        `Event thiếu eventId/submittedAt: ${JSON.stringify(msg)}`,
      );
    }
    const userId = msg.userId;
    const today = studyDate(msg.submittedAt);

    return this.prisma.$transaction(async (tx) => {
      const marked = await tx.processedEvent.createMany({
        data: [{ eventId: msg.eventId, consumer: PROGRESS_UPDATER }],
        skipDuplicates: true,
      });
      if (marked.count === 0) {
        this.logger.debug(`Bỏ qua event trùng ${msg.eventId}`);
        return false;
      }

      await tx.dailyActivity.upsert({
        where: { userId_date_kind: { userId, date: today, kind: "exam" } },
        create: { userId, date: today, kind: "exam", count: 1 },
        update: { count: { increment: 1 } },
      });

      const prev = await tx.studyStreak.findUnique({ where: { userId } });
      const next = nextStreak(prev, today);
      await tx.studyStreak.upsert({
        where: { userId },
        create: { userId, ...next },
        update: next,
      });
      return true;
    });
  }
}
