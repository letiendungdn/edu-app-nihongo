import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { PrismaService } from "@app/prisma";
import {
  CacheKeys,
  CacheTTL,
  RomajiTrie,
  looksLikeRomaji,
  normalizeRomaji,
  romajiKeys,
} from "@app/common";
import { CreateVocabularyDto, UpdateVocabularyDto } from "@app/contracts";
import { LEVEL_POOL_LESSON } from "@app/prisma/level-pool";
import { withAlsoIn } from "../shared/book-overlap";

/** Câu ví dụ nằm ở bảng VocabularyExample; đọc kèm theo thứ tự hiển thị. */
const EXAMPLES_INCLUDE = {
  examples: {
    orderBy: { sortOrder: "asc" as const },
    select: { ja: true, kana: true, vi: true },
  },
};

type VocabExampleRow = { ja: string; kana: string | null; vi: string | null };

/**
 * Giữ exampleJa/Kana/Vi (câu đầu tiên) trong response để client cũ vẫn chạy;
 * `examples` là toàn bộ câu của từ.
 */
export function withExampleFields<T extends { examples?: VocabExampleRow[] }>(
  vocab: T,
) {
  const examples = vocab.examples ?? [];
  const [first] = examples;
  return {
    ...vocab,
    examples,
    exampleJa: first?.ja ?? null,
    exampleKana: first?.kana ?? null,
    exampleVi: first?.vi ?? null,
  };
}

type ExampleDto = {
  exampleJa?: string | null;
  exampleKana?: string | null;
  exampleVi?: string | null;
};

/** Ghi câu ví dụ đầu tiên (sortOrder 0) theo các trường example* của DTO. */
function firstExampleWrite(vocabularyId: number, dto: ExampleDto) {
  const kana = dto.exampleKana?.trim() || null;
  const vi = dto.exampleVi?.trim() || null;
  if (dto.exampleJa !== undefined) {
    const ja = dto.exampleJa?.trim();
    if (!ja) return { deleteMany: { sortOrder: 0 } };
    const fields = {
      ja,
      ...(dto.exampleKana !== undefined ? { kana } : {}),
      ...(dto.exampleVi !== undefined ? { vi } : {}),
    };
    return {
      upsert: {
        where: { vocabularyId_sortOrder: { vocabularyId, sortOrder: 0 } },
        create: { ...fields, sortOrder: 0 },
        update: fields,
      },
    };
  }
  if (dto.exampleKana === undefined && dto.exampleVi === undefined)
    return undefined;
  return {
    updateMany: {
      where: { sortOrder: 0 },
      data: {
        ...(dto.exampleKana !== undefined ? { kana } : {}),
        ...(dto.exampleVi !== undefined ? { vi } : {}),
      },
    },
  };
}

function splitExampleDto<T extends ExampleDto>(dto: T) {
  const { exampleJa, exampleKana, exampleVi, ...rest } = dto;
  return { examples: { exampleJa, exampleKana, exampleVi }, rest };
}

/** Số ứng viên tối đa lấy về để xếp hạng khi tra từ. */
const SEARCH_POOL = 500;

/**
 * Chỉ mục romaji → id trong bộ nhớ được dựng lại sau khoảng này. Mỗi pod content-service giữ bản riêng:
 * sửa từ ở pod này thì pod này xóa chỉ mục ngay, pod khác cập nhật chậm nhất sau TTL.
 */
export const ROMAJI_INDEX_TTL_MS = 10 * 60 * 1000;

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
  // Gõ romaji không dấu ("kando") vẫn khớp từ lưu có dấu trường âm ("kandō shimasu")
  const nq = looksLikeRomaji(q) ? normalizeRomaji(q) : "";
  const tier = (v: T) => {
    const words = [v.kanji, v.kana, v.romaji]
      .filter(Boolean)
      .map((w) => w!.toLowerCase());
    const romaji = nq ? romajiKeys(v.romaji) : [];
    const meanings = v.meaning
      .toLowerCase()
      .split(/[,;、，/]/)
      .map((m) => m.trim());
    if (words.includes(q) || meanings.includes(q) || romaji.includes(nq))
      return 0;
    if (
      words.some((w) => w.startsWith(q)) ||
      meanings.some((m) => m.startsWith(q)) ||
      romaji.some((k) => k.startsWith(nq))
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
  private romajiIndex?: { trie: RomajiTrie<number>; builtAt: number };
  /** Đang dựng: các request đến cùng lúc dùng chung một lần dựng, không đọc DB nhiều lần. */
  private romajiIndexBuild?: Promise<RomajiTrie<number>>;
  /** Tăng mỗi lần từ vựng đổi: bản dựng bắt đầu trước khi đổi thì không được lưu lại (dữ liệu cũ). */
  private romajiGeneration = 0;

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
        ...(dto.exampleJa?.trim()
          ? {
              examples: {
                create: {
                  ja: dto.exampleJa.trim(),
                  kana: dto.exampleKana?.trim() || null,
                  vi: dto.exampleVi?.trim() || null,
                  sortOrder: 0,
                },
              },
            }
          : {}),
      },
      include: EXAMPLES_INCLUDE,
    });
    await this.invalidateLessonCaches(dto.lessonId);
    return withExampleFields(vocab);
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
    // ILIKE không bỏ dấu: "kando" không chứa trong "kandō shimasu". Trie romaji bù phần này.
    const romajiIds = looksLikeRomaji(query)
      ? (await this.getRomajiIndex()).search(query, SEARCH_POOL)
      : [];
    const match = (op: "contains" | "equals") => ({
      ...base,
      OR: [
        ...fields.map((f) => ({ [f]: { [op]: query, mode: "insensitive" } })),
        ...(op === "contains" && romajiIds.length > 0
          ? [{ id: { in: romajiIds } }]
          : []),
      ],
    });
    const include = {
      ...EXAMPLES_INCLUDE,
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
    const data = ranked
      .slice((page - 1) * limit, page * limit)
      .map(withExampleFields);
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
      if (query) return this.search(where, query, page, limit);
      const [data, total] = await this.prisma.$transaction([
        this.prisma.vocabulary.findMany({
          where,
          include: EXAMPLES_INCLUDE,
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.vocabulary.count({ where }),
      ]);
      const dataWithBooks = lessonNumber
        ? await withAlsoIn(
            this.prisma,
            "vocab",
            data.map(withExampleFields),
            (row) => row.kana,
            lessonTextbook,
          )
        : data.map(withExampleFields);
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

      const cacheKey = `${CacheKeys.vocabByLesson(lessonId)}:places`;
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
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vocabulary.findMany({
        where,
        include: EXAMPLES_INCLUDE,
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vocabulary.count({ where }),
    ]);

    const mapped = rows.map(withExampleFields);
    const data = lessonId
      ? await withAlsoIn(
          this.prisma,
          "vocab",
          mapped,
          (row) => row.kana,
          lessonTextbook,
        )
      : mapped;
    const result = { data, total, page, limit };
    if (lessonId) {
      await this.cacheManager.set(
        `${CacheKeys.vocabByLesson(lessonId)}:places`,
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

  async findOne(id: number) {
    const vocab = await this.prisma.vocabulary.findUnique({
      where: { id },
      include: EXAMPLES_INCLUDE,
    });
    return vocab ? withExampleFields(vocab) : null;
  }

  async update(id: number, dto: UpdateVocabularyDto) {
    const prev = await this.prisma.vocabulary.findUnique({
      where: { id },
      select: { lessonId: true },
    });
    const { examples, rest } = splitExampleDto(dto);
    const examplesWrite = firstExampleWrite(id, examples);
    const vocab = await this.prisma.vocabulary.update({
      where: { id },
      data: { ...rest, ...(examplesWrite ? { examples: examplesWrite } : {}) },
      include: EXAMPLES_INCLUDE,
    });
    await this.invalidateLessonCaches(vocab.lessonId);
    if (prev && prev.lessonId !== vocab.lessonId) {
      await this.invalidateLessonCaches(prev.lessonId);
    }
    return withExampleFields(vocab);
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
    const rows = await this.prisma.vocabulary.findMany({
      where: { lessonId },
      include: EXAMPLES_INCLUDE,
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    return rows.map(withExampleFields);
  }

  private async getRomajiIndex(): Promise<RomajiTrie<number>> {
    const fresh =
      this.romajiIndex &&
      Date.now() - this.romajiIndex.builtAt < ROMAJI_INDEX_TTL_MS;
    if (fresh) return this.romajiIndex!.trie;
    const generation = this.romajiGeneration;
    this.romajiIndexBuild ??= this.prisma.vocabulary
      .findMany({ select: { id: true, romaji: true } })
      .then((rows) => {
        const trie = new RomajiTrie<number>();
        for (const r of rows) trie.insert(r.romaji, r.id);
        if (generation === this.romajiGeneration) {
          this.romajiIndex = { trie, builtAt: Date.now() };
        }
        return trie;
      })
      .finally(() => {
        this.romajiIndexBuild = undefined;
      });
    return this.romajiIndexBuild;
  }

  private async invalidateLessonCaches(lessonId: number) {
    // Từ vựng đổi: chỉ mục romaji dựng lại ở lần tra kế tiếp
    this.romajiIndex = undefined;
    this.romajiGeneration++;
    await this.cacheManager.del(CacheKeys.vocabByLesson(lessonId));
    await this.cacheManager.del(CacheKeys.vocabKatakana());
    await Promise.all(
      CacheKeys.lessonListAll().map((key) => this.cacheManager.del(key)),
    );
  }
}
