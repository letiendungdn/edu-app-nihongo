import { Test, TestingModule } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { PrismaService } from "@app/prisma";
import {
  VocabulariesService,
  isKatakanaWritten,
  rankVocabSearch,
} from "./vocabularies.service";

describe("VocabulariesService", () => {
  let service: VocabulariesService;
  let prisma: {
    lesson: { findUnique: jest.Mock };
    vocabulary: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      aggregate: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    prisma = {
      lesson: { findUnique: jest.fn() },
      vocabulary: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: -1 } }),
      },
      $transaction: jest.fn(),
    };
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockCache.del.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VocabulariesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get(VocabulariesService);
  });

  it("isKatakanaWritten accepts a katakana spelling", () => {
    expect(isKatakanaWritten("コーヒー", "コーヒー")).toBe(true);
    expect(isKatakanaWritten(null, "ノート")).toBe(true);
    expect(isKatakanaWritten("私", "わたし")).toBe(false);
    expect(isKatakanaWritten("パン屋", "パンや")).toBe(false);
  });

  it("findAll script=katakana returns only katakana spellings", async () => {
    prisma.vocabulary.findMany.mockResolvedValue([
      {
        id: 1,
        kanji: "コーヒー",
        kana: "コーヒー",
        romaji: "kohii",
        meaning: "cà phê",
        jlptLevel: "N5",
        lesson: { lessonNumber: 2, textbook: "MINNA", title: null },
      },
      {
        id: 2,
        kanji: "私",
        kana: "わたし",
        romaji: "watashi",
        meaning: "tôi",
        jlptLevel: "N5",
        lesson: { lessonNumber: 1, textbook: "MINNA", title: null },
      },
    ]);

    const result = await service.findAll(
      undefined,
      1,
      50,
      undefined,
      undefined,
      "katakana",
    );

    expect(result.total).toBe(1);
    expect(result.data).toEqual([
      expect.objectContaining({ kana: "コーヒー" }),
    ]);
  });

  it("findAll returns empty when lesson not found", async () => {
    prisma.lesson.findUnique.mockResolvedValue(null);
    const result = await service.findAll(99);
    expect(result).toEqual({ data: [], total: 0, page: 1, limit: 50 });
  });

  it("findAll paginates by lesson", async () => {
    prisma.lesson.findUnique.mockResolvedValue({ id: 10 });
    prisma.$transaction.mockResolvedValue([[{ id: 1, kana: "あ" }], 1]);

    const result = await service.findAll(1, 1, 50);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("findOne returns vocabulary by id", async () => {
    prisma.vocabulary.findUnique.mockResolvedValue({ id: 5, kana: "い" });
    const result = await service.findOne(5);
    expect(result?.kana).toBe("い");
  });

  it("create maps dto to prisma data", async () => {
    const dto = {
      kana: "う",
      romaji: "u",
      meaning: "test",
      lessonId: 1,
      partOfSpeech: "noun" as const,
    };
    prisma.vocabulary.aggregate.mockResolvedValue({ _max: { sortOrder: 2 } });
    prisma.vocabulary.create.mockResolvedValue({ id: 1, ...dto, sortOrder: 3 });
    await service.create(dto);
    expect(prisma.vocabulary.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kana: "う",
        lessonId: 1,
        partOfSpeech: "noun",
        sortOrder: 3,
      }),
    });
  });

  it("reorder writes sortOrder for every id", async () => {
    prisma.vocabulary.findMany
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
      .mockResolvedValueOnce([{ id: 2 }, { id: 1 }]);
    prisma.$transaction.mockResolvedValue([]);
    prisma.vocabulary.update.mockResolvedValue({});

    await service.reorder(9, [2, 1]);

    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe("rankVocabSearch", () => {
  const v = (
    id: number,
    kanji: string | null,
    kana: string,
    romaji: string,
    meaning: string,
  ) => ({
    id,
    kanji,
    kana,
    romaji,
    meaning,
  });

  it("puts the exact word before phrases that contain it", () => {
    const ranked = rankVocabSearch(
      [
        v(1, "お願いします。", "おねがいします。", "onegaishimasu", "xin nhờ"),
        v(
          2,
          "また 今度 お願いします。",
          "また こんど おねがいします。",
          "mata kondo",
          "hẹn lần sau",
        ),
        v(3, "願い", "ねがい", "negai", "ước nguyện, lời thỉnh cầu"),
      ],
      "願い",
    );
    expect(ranked.map((x) => x.id)).toEqual([3, 1, 2]);
  });

  it("matches a Vietnamese meaning exactly within a comma-separated list", () => {
    const ranked = rankVocabSearch(
      [
        v(
          1,
          "一生懸命",
          "いっしょうけんめい",
          "isshoukenmei",
          "cố gắng hết sức",
        ),
        v(2, "頑張る", "がんばる", "ganbaru", "nỗ lực, cố gắng"),
      ],
      "cố gắng",
    );
    expect(ranked[0].id).toBe(2);
  });
});
