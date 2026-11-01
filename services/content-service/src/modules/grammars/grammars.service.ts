import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { PrismaService } from "@app/prisma";
import { CacheKeys, CacheTTL } from "@app/common";
import {
  CreateExampleDto,
  CreateGrammarDto,
  UpdateGrammarDto,
} from "@app/contracts";
import { LEVEL_POOL_LESSON } from "@app/prisma/level-pool";
import { withAlsoIn } from "../shared/book-overlap";

@Injectable()
export class GrammarsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreateGrammarDto) {
    const examples = this.exampleRows(dto.examples);
    const grammar = await this.prisma.grammar.create({
      data: {
        pattern: dto.pattern,
        meaning: dto.meaning,
        explanation: dto.explanation ?? null,
        lessonId: dto.lessonId,
        ...(examples.length ? { examples: { create: examples } } : {}),
      },
      include: { examples: true },
    });
    await this.invalidateLessonCaches(dto.lessonId);
    return grammar;
  }

  async findAll(
    lessonNumber?: number,
    page = 1,
    limit = 50,
    jlptLevel?: string,
    query?: string,
  ) {
    if (jlptLevel || query) {
      const where: Record<string, unknown> = {};
      let lessonTextbook: string | null = null;
      if (lessonNumber) {
        const lesson = await this.prisma.lesson.findUnique({
          where: { lessonNumber },
          select: { id: true, textbook: true },
        });
        if (!lesson) return { data: [], total: 0, page, limit };
        where.lessonId = lesson.id;
        lessonTextbook = lesson.textbook;
      }
      if (jlptLevel) {
        where.jlptLevel = jlptLevel;
        // Kho theo cấp: bỏ bài soạn theo sách (trùng mục JLPT)
        if (!lessonNumber) where.lesson = LEVEL_POOL_LESSON;
      }
      if (query) {
        where.OR = [
          { pattern: { contains: query, mode: "insensitive" } },
          { meaning: { contains: query, mode: "insensitive" } },
        ];
      }
      const [data, total] = await this.prisma.$transaction([
        this.prisma.grammar.findMany({
          where,
          include: { examples: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.grammar.count({ where }),
      ]);
      const dataWithBooks = lessonNumber
        ? await withAlsoIn(this.prisma, "grammar", data, (row) => row.pattern, lessonTextbook)
        : data;
      return { data: dataWithBooks, total, page, limit };
    }

    let lessonId: number | undefined;
    let lessonTextbook: string | null = null;
    if (lessonNumber) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { lessonNumber },
        select: { id: true, textbook: true },
      });
      if (!lesson) return { data: [], total: 0, page, limit };
      lessonId = lesson.id;
      lessonTextbook = lesson.textbook;

      const cacheKey = `${CacheKeys.grammarByLesson(lessonId)}:books`;
      const cached = await this.cacheManager.get<{
        data: unknown[];
        total: number;
        page: number;
        limit: number;
      }>(cacheKey);
      if (cached && cached.page === page && cached.limit === limit) {
        return cached;
      }
    }

    const where = lessonId ? { lessonId } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.grammar.findMany({
        where,
        include: { examples: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.grammar.count({ where }),
    ]);

    const dataWithBooks = lessonId
      ? await withAlsoIn(this.prisma, "grammar", data, (row) => row.pattern, lessonTextbook)
      : data;
    const result = { data: dataWithBooks, total, page, limit };
    if (lessonId) {
      await this.cacheManager.set(
        `${CacheKeys.grammarByLesson(lessonId)}:books`,
        result,
        CacheTTL.medium * 1000,
      );
    }
    return result;
  }

  findOne(id: number) {
    return this.prisma.grammar.findUnique({
      where: { id },
      include: { examples: true },
    });
  }

  async update(id: number, dto: UpdateGrammarDto) {
    const prev = await this.prisma.grammar.findUnique({
      where: { id },
      select: { lessonId: true },
    });
    const { examples, ...fields } = dto;
    await this.prisma.grammar.update({ where: { id }, data: fields });

    if (examples !== undefined) {
      await this.prisma.example.deleteMany({ where: { grammarId: id } });
      const rows = this.exampleRows(examples);
      if (rows.length) {
        await this.prisma.example.createMany({
          data: rows.map((row) => ({ ...row, grammarId: id })),
        });
      }
    }

    const grammar = await this.findOne(id);
    if (grammar) {
      await this.invalidateLessonCaches(grammar.lessonId);
      if (prev && prev.lessonId !== grammar.lessonId) {
        await this.invalidateLessonCaches(prev.lessonId);
      }
    }
    return grammar;
  }

  async remove(id: number) {
    const grammar = await this.prisma.grammar.delete({ where: { id } });
    await this.invalidateLessonCaches(grammar.lessonId);
    return grammar;
  }

  private exampleRows(examples?: CreateExampleDto[]) {
    return (examples ?? [])
      .map((example, index) => ({
        jp: example.jp.trim(),
        romaji: (example.romaji ?? "").trim(),
        en: example.en?.trim() || null,
        vi: example.vi?.trim() || null,
        sortOrder: index,
      }))
      .filter((example) => example.jp);
  }

  private async invalidateLessonCaches(lessonId: number) {
    await this.cacheManager.del(CacheKeys.grammarByLesson(lessonId));
    await Promise.all(
      CacheKeys.lessonListAll().map((key) => this.cacheManager.del(key)),
    );
  }
}
