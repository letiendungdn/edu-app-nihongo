import { Injectable, Inject } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { Role } from "@prisma/client";
import { CONTENT_PATTERNS, EXAM_PATTERNS } from "@app/contracts";
import { PrismaService } from "@app/prisma";

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    @Inject("CONTENT_SERVICE") private readonly contentClient: ClientProxy,
    @Inject("EXAM_SERVICE") private readonly examClient: ClientProxy,
  ) {}

  async getDashboardStats() {
    const [
      lessons,
      vocabularies,
      grammars,
      exercises,
      kanjiLessons,
      kanjiEntries,
      reading,
      mockExams,
      mindMaps,
      users,
      examResults,
    ] = await Promise.all([
      this.prisma.lesson.count(),
      this.prisma.vocabulary.count(),
      this.prisma.grammar.count(),
      this.prisma.exercise.count(),
      this.prisma.kanjiLesson.count(),
      this.prisma.kanjiEntry.count(),
      this.prisma.readingPassage.count(),
      this.prisma.mockExamTemplate.count(),
      this.prisma.mindMapLevel.count(),
      this.prisma.user.count(),
      this.prisma.examResult.count(),
    ]);

    const recentLessons = await this.prisma.lesson.findMany({
      take: 5,
      orderBy: { lessonNumber: "desc" },
      select: {
        id: true,
        lessonNumber: true,
        title: true,
        _count: {
          select: { vocabularies: true, grammars: true, exercises: true },
        },
      },
    });

    return {
      counts: {
        lessons,
        vocabularies,
        grammars,
        exercises,
        kanjiLessons,
        kanjiEntries,
        reading,
        mockExams,
        mindMaps,
        users,
        examResults,
      },
      recentLessons,
      generatedAt: new Date().toISOString(),
    };
  }

  listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        createdAt: true,
        _count: { select: { examResults: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  updateUserRole(userId: number, role: Role) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        createdAt: true,
        _count: { select: { examResults: true } },
      },
    });
  }

  listExamResults(limit = 100) {
    return this.prisma.examResult.findMany({
      take: Math.min(Math.max(limit, 1), 500),
      orderBy: { submittedAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        sections: true,
      },
    });
  }

  /** ExamResult thuộc exam-service: xóa qua gRPC, không ghi thẳng bảng của service khác (ADR-0010). */
  deleteExamResult(id: number) {
    return firstValueFrom(
      this.examClient.send(EXAM_PATTERNS.DELETE_RESULT, { id }),
    );
  }

  importVocab(lessonNumber: number, text: string) {
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.IMPORT_VOCAB, {
        lessonNumber,
        text,
      }),
    );
  }
}
