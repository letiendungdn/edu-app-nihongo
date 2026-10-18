import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { PrismaService } from "@app/prisma";
import { CacheKeys, CacheTTL } from "@app/common";
import { CreateLessonDto, UpdateLessonDto } from "@app/contracts";

@Injectable()
export class LessonsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreateLessonDto) {
    const lesson = await this.prisma.lesson.create({ data: dto });
    await this.invalidateLessonLists();
    return lesson;
  }

  async findAll(options?: {
    has?: "grammar" | "vocab";
    jlptLevel?: string;
    query?: string;
  }) {
    // jlptLevel/query là filter dành cho admin (không cache theo tổ hợp đó,
    // chỉ path "has"-only mới cache vì được gọi lặp lại nhiều từ app học viên).
    if (!options?.jlptLevel && !options?.query) {
      const cacheKey = CacheKeys.lessonList(options?.has);
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;

      const where =
        options?.has === "grammar"
          ? { grammars: { some: {} } }
          : options?.has === "vocab"
            ? { vocabularies: { some: {} } }
            : undefined;

      const lessons = await this.prisma.lesson.findMany({
        where,
        orderBy: { lessonNumber: "asc" },
        include: {
          _count: {
            select: { vocabularies: true, grammars: true, exercises: true },
          },
        },
      });

      await this.cacheManager.set(cacheKey, lessons, CacheTTL.medium * 1000);
      return lessons;
    }

    const where: Record<string, unknown> = {};
    if (options.has === "grammar") where.grammars = { some: {} };
    if (options.has === "vocab") where.vocabularies = { some: {} };
    if (options.jlptLevel) where.jlptLevel = options.jlptLevel;
    if (options.query) {
      where.title = { contains: options.query, mode: "insensitive" };
    }

    return this.prisma.lesson.findMany({
      where,
      orderBy: { lessonNumber: "asc" },
      include: {
        _count: {
          select: { vocabularies: true, grammars: true, exercises: true },
        },
      },
    });
  }

  findOne(lessonNumber: number) {
    return this.prisma.lesson.findUnique({
      where: { lessonNumber },
    });
  }

  async update(id: number, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.update({
      where: { id },
      data: dto,
    });
    await this.invalidateLessonLists();
    return lesson;
  }

  async remove(id: number) {
    const lesson = await this.prisma.lesson.delete({
      where: { id },
    });
    await this.invalidateLessonLists();
    return lesson;
  }

  private async invalidateLessonLists() {
    await Promise.all(
      CacheKeys.lessonListAll().map((key) => this.cacheManager.del(key)),
    );
  }
}
