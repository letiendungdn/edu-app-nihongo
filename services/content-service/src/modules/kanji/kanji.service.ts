import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { JlptLevel, type Prisma } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import type { CreateKanjiVocabDto, UpdateKanjiVocabDto } from "@app/contracts";
import type { CreateKanjiEntryDto, UpdateKanjiEntryDto } from "@app/contracts";
import { LEVEL_POOL_LESSON } from "@app/prisma/level-pool";

function parseJlptLevel(value?: string): JlptLevel | undefined {
  if (!value) return undefined;
  return (Object.values(JlptLevel) as string[]).includes(value)
    ? (value as JlptLevel)
    : undefined;
}

const entryInclude = {
  lesson: {
    select: {
      lessonNumber: true,
      title: true,
      jlptLevel: true,
    },
  },
  vocabularies: {
    orderBy: { sortOrder: "asc" as const },
  },
} satisfies Prisma.KanjiEntryInclude;

@Injectable()
export class KanjiService {
  constructor(private prisma: PrismaService) {}

  findAllLessons() {
    return this.prisma.kanjiLesson.findMany({
      orderBy: { lessonNumber: "asc" },
      include: {
        _count: {
          select: { entries: true },
        },
      },
    });
  }

  createLesson(dto: {
    lessonNumber: number;
    title?: string;
    jlptLevel?: string;
    sortOrder?: number;
  }) {
    return this.prisma.kanjiLesson.create({
      data: {
        lessonNumber: dto.lessonNumber,
        title: dto.title ?? null,
        jlptLevel: parseJlptLevel(dto.jlptLevel),
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  updateLesson(
    id: number,
    dto: {
      lessonNumber?: number;
      title?: string;
      jlptLevel?: string;
      sortOrder?: number;
    },
  ) {
    return this.prisma.kanjiLesson.update({
      where: { id },
      data: {
        ...(dto.lessonNumber !== undefined
          ? { lessonNumber: dto.lessonNumber }
          : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.jlptLevel !== undefined
          ? { jlptLevel: parseJlptLevel(dto.jlptLevel) }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async removeLesson(id: number) {
    const entryCount = await this.prisma.kanjiEntry.count({
      where: { lessonId: id },
    });
    if (entryCount > 0) {
      throw new BadRequestException(
        `Không thể xoá: lesson này còn ${entryCount} kanji. Hãy xoá hết kanji trước.`,
      );
    }
    return this.prisma.kanjiLesson.delete({ where: { id } });
  }

  findEntries(lessonNumber?: number, query?: string, jlptLevel?: string) {
    const q = query?.trim();
    const level = parseJlptLevel(jlptLevel);
    const where: Prisma.KanjiEntryWhereInput = {};

    if (lessonNumber || level) {
      where.lesson = {
        ...(lessonNumber ? { lessonNumber } : {}),
        ...(level ? { jlptLevel: level } : {}),
        // Bảng kanji theo cấp: bỏ bài soạn theo sách (trùng chữ)
        ...(level && !lessonNumber ? LEVEL_POOL_LESSON : {}),
      };
    }

    if (q) {
      where.OR = [
        { character: { contains: q } },
        { hanViet: { contains: q, mode: "insensitive" } },
        { onyomi: { contains: q, mode: "insensitive" } },
        { kunyomi: { contains: q, mode: "insensitive" } },
        { meaningVi: { contains: q, mode: "insensitive" } },
        { meaningEn: { contains: q, mode: "insensitive" } },
        { mnemonicVi: { contains: q, mode: "insensitive" } },
        {
          vocabularies: {
            some: {
              OR: [
                { word: { contains: q } },
                { reading: { contains: q } },
                { meaningVi: { contains: q, mode: "insensitive" } },
                { exampleJa: { contains: q } },
                { exampleVi: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    return this.prisma.kanjiEntry.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [{ lesson: { lessonNumber: "asc" } }, { sortOrder: "asc" }],
      include: entryInclude,
    });
  }

  findOne(id: number) {
    return this.prisma.kanjiEntry.findUnique({
      where: { id },
      include: {
        lesson: true,
        vocabularies: { orderBy: { sortOrder: "asc" } },
      },
    });
  }

  private async resolveLesson(lessonNumber: number) {
    const lesson = await this.prisma.kanjiLesson.findUnique({
      where: { lessonNumber },
    });
    if (!lesson) {
      throw new BadRequestException(
        `Không tìm thấy bài kanji số ${lessonNumber}`,
      );
    }
    return lesson;
  }

  async createEntry(dto: CreateKanjiEntryDto) {
    const lesson = await this.resolveLesson(dto.lessonNumber);
    const level = dto.jlptLevel ?? lesson.jlptLevel ?? undefined;

    let sortOrder = dto.sortOrder;
    if (sortOrder == null) {
      const agg = await this.prisma.kanjiEntry.aggregate({
        where: { lessonId: lesson.id },
        _max: { sortOrder: true },
      });
      sortOrder = (agg._max.sortOrder ?? -1) + 1;
    }

    return this.prisma.kanjiEntry.create({
      data: {
        character: dto.character.trim(),
        meaningVi: dto.meaningVi.trim(),
        hanViet: dto.hanViet?.trim() || null,
        onyomi: dto.onyomi?.trim() || null,
        kunyomi: dto.kunyomi?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        jlptLevel: level,
        sortOrder,
        lessonId: lesson.id,
      },
      include: entryInclude,
    });
  }

  async updateEntry(id: number, dto: UpdateKanjiEntryDto) {
    const existing = await this.prisma.kanjiEntry.findUnique({
      where: { id },
      include: { lesson: true },
    });
    if (!existing) throw new NotFoundException(`Kanji entry ${id} not found`);

    let lessonId = existing.lessonId;
    if (
      dto.lessonNumber != null &&
      dto.lessonNumber !== existing.lesson.lessonNumber
    ) {
      const lesson = await this.resolveLesson(dto.lessonNumber);
      lessonId = lesson.id;
    }

    return this.prisma.kanjiEntry.update({
      where: { id },
      data: {
        ...(dto.character != null ? { character: dto.character.trim() } : {}),
        ...(dto.meaningVi != null ? { meaningVi: dto.meaningVi.trim() } : {}),
        ...(dto.hanViet !== undefined
          ? { hanViet: dto.hanViet?.trim() || null }
          : {}),
        ...(dto.onyomi !== undefined
          ? { onyomi: dto.onyomi?.trim() || null }
          : {}),
        ...(dto.kunyomi !== undefined
          ? { kunyomi: dto.kunyomi?.trim() || null }
          : {}),
        ...(dto.imageUrl !== undefined
          ? { imageUrl: dto.imageUrl?.trim() || null }
          : {}),
        ...(dto.jlptLevel !== undefined
          ? { jlptLevel: dto.jlptLevel ?? null }
          : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.lessonNumber != null ? { lessonId } : {}),
      },
      include: entryInclude,
    });
  }

  async removeEntry(id: number) {
    const existing = await this.prisma.kanjiEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Kanji entry ${id} not found`);
    await this.prisma.kanjiEntry.delete({ where: { id } });
    return { ok: true, id };
  }

  async createVocab(kanjiEntryId: number, dto: CreateKanjiVocabDto) {
    const entry = await this.prisma.kanjiEntry.findUnique({
      where: { id: kanjiEntryId },
      select: { id: true },
    });
    if (!entry)
      throw new NotFoundException(`Kanji entry ${kanjiEntryId} not found`);

    let sortOrder = dto.sortOrder;
    if (sortOrder == null) {
      const agg = await this.prisma.kanjiVocab.aggregate({
        where: { kanjiEntryId },
        _max: { sortOrder: true },
      });
      sortOrder = (agg._max.sortOrder ?? -1) + 1;
    }

    return this.prisma.kanjiVocab.create({
      data: {
        word: dto.word.trim(),
        reading: dto.reading.trim(),
        meaningVi: dto.meaningVi.trim(),
        exampleJa: dto.exampleJa?.trim() || null,
        exampleKana: dto.exampleKana?.trim() || null,
        exampleVi: dto.exampleVi?.trim() || null,
        sortOrder,
        kanjiEntryId,
      },
    });
  }

  async updateVocab(id: number, dto: UpdateKanjiVocabDto) {
    const existing = await this.prisma.kanjiVocab.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Kanji vocab ${id} not found`);

    return this.prisma.kanjiVocab.update({
      where: { id },
      data: {
        ...(dto.word != null ? { word: dto.word.trim() } : {}),
        ...(dto.reading != null ? { reading: dto.reading.trim() } : {}),
        ...(dto.meaningVi != null ? { meaningVi: dto.meaningVi.trim() } : {}),
        ...(dto.exampleJa !== undefined
          ? { exampleJa: dto.exampleJa?.trim() || null }
          : {}),
        ...(dto.exampleKana !== undefined
          ? { exampleKana: dto.exampleKana?.trim() || null }
          : {}),
        ...(dto.exampleVi !== undefined
          ? { exampleVi: dto.exampleVi?.trim() || null }
          : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async removeVocab(id: number) {
    const existing = await this.prisma.kanjiVocab.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Kanji vocab ${id} not found`);
    await this.prisma.kanjiVocab.delete({ where: { id } });
    return { ok: true, id };
  }

  async reorderVocab(kanjiEntryId: number, orderedIds: number[]) {
    const entry = await this.prisma.kanjiEntry.findUnique({
      where: { id: kanjiEntryId },
      select: { id: true },
    });
    if (!entry)
      throw new NotFoundException(`Kanji entry ${kanjiEntryId} not found`);

    const existing = await this.prisma.kanjiVocab.findMany({
      where: { kanjiEntryId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((v) => v.id));
    if (
      orderedIds.length !== existingIds.size ||
      orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new NotFoundException(
        "orderedIds must include every vocabulary for this kanji entry",
      );
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.kanjiVocab.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.prisma.kanjiVocab.findMany({
      where: { kanjiEntryId },
      orderBy: { sortOrder: "asc" },
    });
  }
}
