import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { PrismaService } from "@app/prisma";
import { CacheKeys, CacheTTL } from "@app/common";
import { CreateVocabularyDto, UpdateVocabularyDto } from "@app/contracts";
import { LEVEL_POOL_LESSON } from "@app/prisma/level-pool";

/** Số ứng viên tối đa lấy về để xếp hạng khi tra từ. */
const SEARCH_POOL = 500;

/** Dạng viết (kanji nếu có, không thì kana) là katakana, không kèm hiragana hay Hán tự. */
export function isKatakanaWritten(
  kanji: string | null | undefined,
  kana: string,
): boolean {
  const written = (kanji?.trim() || kana || "").trim();
  return /[ァ-ヶ]/.test(written) && !/[ぁ-ん一-龯]/.test(written);
}

type SearchableVocab = {
  id: number;
  kanji: string | null;
  kana: string;
  romaji: string;
  meaning: string;
};

/**
 * Xếp kết quả tra từ: khớp đúng cả từ → bắt đầu bằng từ khóa → chứa từ khóa;
 * cùng mức thì từ ngắn hơn (từ đơn trước cụm/câu) rồi theo id.
 */
export function rankVocabSearch<T extends SearchableVocab>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  const tier = (v: T) => {
    const words = [v.kanji, v.kana, v.romaji]
      .filter(Boolean)
      .map((w) => w!.toLowerCase());
    const meanings = v.meaning
      .toLowerCase()
      .split(/[,;、，/]/)
      .map((m) => m.trim());
    if (words.includes(q) || meanings.includes(q)) return 0;
    if (
      words.some((w) => w.startsWith(q)) ||
      meanings.some((m) => m.startsWith(q))
    )
      return 1;
    return 2;
  };
  const len = (v: T) => (v.kanji || v.kana).length;
  return items
    .map((v) => ({ v, t: tier(v), l: len(v) }))
    .sort((a, b) => a.t - b.t || a.l - b.l || a.v.id - b.v.id)
    .map((x) => x.v);
}

@Injectable()
export class VocabulariesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreateVocabularyDto) {
    const maxOrder = await this.prisma.vocabulary.aggregate({
      where: { lessonId: dto.lessonId },
      _max: { sortOrder: true },
    });
    const vocab = await this.prisma.vocabulary.create({
      data: {
        kanji: dto.kanji ?? null,
        kana: dto.kana,
        romaji: dto.romaji,
        meaning: dto.meaning,
        lessonId: dto.lessonId,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        ...(dto.partOfSpeech !== undefined
          ? { partOfSpeech: dto.partOfSpeech }
          : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.exampleJa !== undefined ? { exampleJa: dto.exampleJa } : {}),
        ...(dto.exampleKana !== undefined
          ? { exampleKana: dto.exampleKana }
          : {}),
        ...(dto.exampleVi !== undefined ? { exampleVi: dto.exampleVi } : {}),
      },
    });
    await this.invalidateLessonCaches(dto.lessonId);
    return vocab;
  }

  /**
   * Tra từ trên mọi bài (kanji / kana / romaji / nghĩa), xếp theo độ khớp.
   * Lấy thêm riêng các từ khớp chính xác để không bị lọt khi truy vấn quá rộng.
   */
  private async search(
    base: Record<string, unknown>,
    query: string,
    page: number,
    limit: number,
  ) {
    const fields = ["kanji", "kana", "romaji", "meaning"] as const;
    const match = (op: "contains" | "equals") => ({
      ...base,
      OR: fields.map((f) => ({ [f]: { [op]: query, mode: "insensitive" } })),
    });
    const include = {
      // Kết quả tra từ cần biết từ nằm ở bài nào để mở đúng bài
      lesson: {
        select: {
          lessonNumber: true,
          title: true,
          jlptLevel: true,
          textbook: true,
        },
      },
    };
    const [exact, candidates, total] = await this.prisma.$transaction([
      this.prisma.vocabulary.findMany({
        where: match("equals"),
        include,
        take: SEARCH_POOL,
      }),
      this.prisma.vocabulary.findMany({
        where: match("contains"),
        include,
        orderBy: { id: "asc" },
        take: SEARCH_POOL,
      }),
      this.prisma.vocabulary.count({ where: match("contains") }),
    ]);
    const byId = new Map([...exact, ...candidates].map((v) => [v.id, v]));
    const ranked = rankVocabSearch([...byId.values()], query);
    const data = ranked.slice((page - 1) * limit, page * limit);
    return { data, total, page, limit };
  }

  async findAll(
    lessonNumber?: number,
    page = 1,
    limit = 50,
    jlptLevel?: string,
    query?: string,
    script?: string,
  ) {
    if (script === "katakana") return this.findKatakana();

    if (jlptLevel || query) {
      const where: Record<string, unknown> = {};
      if (lessonNumber) {
        const lesson = await this.prisma.lesson.findUnique({
          where: { lessonNumber },
          select: { id: true },
        });
        if (!lesson) return { data: [], total: 0, page, limit };
        where.lessonId = lesson.id;
      }
      if (jlptLevel) {
        where.jlptLevel = jlptLevel;
        // Kho theo cấp: bỏ bài soạn theo sách (trùng mục JLPT)
        if (!lessonNumber) where.lesson = LEVEL_POOL_LESSON;
      }
      if (query) return this.search(where, query, page, limit);
      const [data, total] = await this.prisma.$transaction([
        this.prisma.vocabulary.findMany({
          where,
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.vocabulary.count({ where }),
      ]);
      return { data, total, page, limit };
    }

    let lessonId: number | undefined;
    if (lessonNumber) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { lessonNumber },
        select: { id: true },
      });
      if (!lesson) return { data: [], total: 0, page, limit };
      lessonId = lesson.id;

      const cacheKey = CacheKeys.vocabByLesson(lessonId);
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
      this.prisma.vocabulary.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vocabulary.count({ where }),
    ]);

    const result = { data, total, page, limit };
    if (lessonId) {
      await this.cacheManager.set(
        CacheKeys.vocabByLesson(lessonId),
        result,
        CacheTTL.medium * 1000,
      );
    }
    return result;
  }

  private async findKatakana() {
    const cacheKey = CacheKeys.vocabKatakana();
    const cached = await this.cacheManager.get<{
      data: unknown[];
      total: number;
      page: number;
      limit: number;
    }>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.vocabulary.findMany({
      select: {
        id: true,
        kanji: true,
        kana: true,
        romaji: true,
        meaning: true,
        jlptLevel: true,
        lesson: {
          select: { lessonNumber: true, title: true, textbook: true },
        },
      },
      orderBy: [
        { lesson: { lessonNumber: "asc" } },
        { sortOrder: "asc" },
        { id: "asc" },
      ],
    });
    const data = rows.filter((row) => isKatakanaWritten(row.kanji, row.kana));
    const result = { data, total: data.length, page: 1, limit: data.length };
    await this.cacheManager.set(cacheKey, result, CacheTTL.medium * 1000);
    return result;
  }

  findOne(id: number) {
    return this.prisma.vocabulary.findUnique({ where: { id } });
  }

  async update(id: number, dto: UpdateVocabularyDto) {
    const prev = await this.prisma.vocabulary.findUnique({
      where: { id },
      select: { lessonId: true },
    });
    const vocab = await this.prisma.vocabulary.update({
      where: { id },
      data: dto,
    });
    await this.invalidateLessonCaches(vocab.lessonId);
    if (prev && prev.lessonId !== vocab.lessonId) {
      await this.invalidateLessonCaches(prev.lessonId);
    }
    return vocab;
  }

  async remove(id: number) {
    const vocab = await this.prisma.vocabulary.delete({ where: { id } });
    await this.invalidateLessonCaches(vocab.lessonId);
    return vocab;
  }

  async reorder(lessonId: number, orderedIds: number[]) {
    const existing = await this.prisma.vocabulary.findMany({
      where: { lessonId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    if (
      orderedIds.length !== existingIds.size ||
      orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new NotFoundException(
        "orderedIds must include every vocabulary for this lesson",
      );
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.vocabulary.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    await this.invalidateLessonCaches(lessonId);
    return this.prisma.vocabulary.findMany({
      where: { lessonId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
  }

  private async invalidateLessonCaches(lessonId: number) {
    await this.cacheManager.del(CacheKeys.vocabByLesson(lessonId));
    await this.cacheManager.del(CacheKeys.vocabKatakana());
    await Promise.all(
      CacheKeys.lessonListAll().map((key) => this.cacheManager.del(key)),
    );
  }
}
