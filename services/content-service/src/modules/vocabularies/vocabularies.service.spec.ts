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
    kanjiEntry: { findMany: jest.Mock };
    vocabulary: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      aggregate: jest.Mock;
    };
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
  };
  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    prisma = {
      lesson: { findUnique: jest.fn() },
      kanjiEntry: { findMany: jest.fn().mockResolvedValue([]) },
      vocabulary: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: -1 } }),
      },
      $transaction: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([]),
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
    expect(prisma.vocabulary.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kana: "う",
          lessonId: 1,
          partOfSpeech: "noun",
          sortOrder: 3,
        }),
      }),
    );
  });

  it("create tính furigana và ghi nguồn manual cho nghĩa tiếng Anh", async () => {
    prisma.vocabulary.create.mockResolvedValue({ id: 1 });
    await service.create({
      kanji: "食べます",
      kana: "たべます",
      romaji: "tabemasu",
      meaning: "ăn",
      meaningEn: " to eat ",
      lessonId: 1,
    });
    const data = prisma.vocabulary.create.mock.calls[0][0].data;
    expect(JSON.parse(data.furigana)).toEqual([
      ["食", "た"],
      ["べます", ""],
    ]);
    expect(data.meaningEn).toBe("to eat");
    expect(data.meaningEnSource).toBe("manual");
  });

  it("update tính lại furigana khi đổi kanji; sửa nghĩa EN thì nguồn thành manual", async () => {
    prisma.vocabulary.findUnique.mockResolvedValue({
      lessonId: 1,
      kanji: "食べます",
      kana: "たべます",
      meaningEn: "to eat",
    });
    prisma.vocabulary.update.mockResolvedValue({ id: 7, lessonId: 1 });
    await service.update(7, { kanji: "喰べます", meaningEn: "to devour" });
    const data = prisma.vocabulary.update.mock.calls[0][0].data;
    expect(JSON.parse(data.furigana)).toEqual([
      ["喰", "た"],
      ["べます", ""],
    ]);
    expect(data.meaningEnSource).toBe("manual");
  });

  it("tạo/sửa kanji thì tính Hán Việt từ KanjiEntry (chữ nhiều âm lấy âm đầu)", async () => {
    prisma.kanjiEntry.findMany.mockResolvedValue([
      { character: "学", hanViet: "học" },
      { character: "生", hanViet: "SINH" },
      { character: "行", hanViet: "HÀNH, HÀNG" },
    ]);
    prisma.vocabulary.create.mockResolvedValue({ id: 1 });
    await service.create({ kanji: "学生", kana: "がくせい", romaji: "gakusei", meaning: "học sinh", lessonId: 1 });
    expect(prisma.vocabulary.create.mock.calls[0][0].data.hanViet).toBe("HỌC SINH");

    prisma.vocabulary.findUnique.mockResolvedValue({ lessonId: 1, kanji: "学生", kana: "がくせい", meaningEn: null });
    prisma.vocabulary.update.mockResolvedValue({ id: 7, lessonId: 1 });
    await service.update(7, { kanji: "行", kana: "ぎょう" });
    expect(prisma.vocabulary.update.mock.calls[0][0].data.hanViet).toBe("HÀNH");
  });

  it("dùng lại Hán Việt của từ khác cùng chữ (đã qua bảng ngoại lệ: 銀行 → NGÂN HÀNG)", async () => {
    prisma.vocabulary.findFirst.mockResolvedValue({ hanViet: "NGÂN HÀNG" });
    prisma.kanjiEntry.findMany.mockResolvedValue([
      { character: "銀", hanViet: "NGÂN" },
      { character: "行", hanViet: "HÀNH, HÀNG" },
    ]);
    prisma.vocabulary.create.mockResolvedValue({ id: 1 });
    await service.create({ kanji: "銀行", kana: "ぎんこう", romaji: "ginkou", meaning: "ngân hàng", lessonId: 1 });
    expect(prisma.vocabulary.create.mock.calls[0][0].data.hanViet).toBe("NGÂN HÀNG");
    expect(prisma.kanjiEntry.findMany).not.toHaveBeenCalled();
  });

  it("Hán Việt null khi thiếu âm của một chữ hoặc có chữ số", async () => {
    prisma.kanjiEntry.findMany.mockResolvedValue([{ character: "日", hanViet: "NHẬT" }]);
    prisma.vocabulary.create.mockResolvedValue({ id: 1 });
    await service.create({ kanji: "１４日", kana: "じゅうよっか", romaji: "juuyokka", meaning: "ngày 14", lessonId: 1 });
    await service.create({ kanji: "日本", kana: "にほん", romaji: "nihon", meaning: "Nhật Bản", lessonId: 1 });
    expect(prisma.vocabulary.create.mock.calls[0][0].data.hanViet).toBeNull();
    expect(prisma.vocabulary.create.mock.calls[1][0].data.hanViet).toBeNull();
  });

  it("update không đụng kanji/kana thì giữ furigana cũ", async () => {
    prisma.vocabulary.findUnique.mockResolvedValue({ lessonId: 1, kanji: "私", kana: "わたし" });
    prisma.vocabulary.update.mockResolvedValue({ id: 7, lessonId: 1 });
    await service.update(7, { meaning: "tôi" });
    const data = prisma.vocabulary.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("furigana");
    expect(data).not.toHaveProperty("meaningEnSource");
    expect(data).not.toHaveProperty("hanViet");
  });

  it("create stores the example sentence in VocabularyExample", async () => {
    prisma.vocabulary.create.mockResolvedValue({
      id: 1,
      kana: "え",
      examples: [{ ja: "絵を描く。", kana: "えを かく。", vi: "Vẽ tranh." }],
    });
    const result = await service.create({
      kana: "え",
      romaji: "e",
      meaning: "tranh",
      lessonId: 1,
      exampleJa: " 絵を描く。 ",
      exampleKana: "えを かく。",
      exampleVi: "Vẽ tranh.",
    });
    expect(prisma.vocabulary.create.mock.calls[0][0].data.examples).toEqual({
      create: {
        ja: "絵を描く。",
        kana: "えを かく。",
        vi: "Vẽ tranh.",
        sortOrder: 0,
      },
    });
    expect(result).toMatchObject({
      exampleJa: "絵を描く。",
      exampleKana: "えを かく。",
      exampleVi: "Vẽ tranh.",
    });
  });

  it("withExampleFields exposes the English translation of the first example", async () => {
    prisma.vocabulary.create.mockResolvedValue({
      id: 2,
      kana: "え",
      examples: [
        { ja: "絵を描く。", kana: "えを かく。", vi: "Vẽ tranh.", en: "I draw a picture." },
      ],
    });
    const result = await service.create({
      kana: "え",
      romaji: "e",
      meaning: "tranh",
      lessonId: 1,
      exampleJa: "絵を描く。",
    });
    expect(result).toMatchObject({
      exampleEn: "I draw a picture.",
      examples: [expect.objectContaining({ en: "I draw a picture." })],
    });
  });

  it("update upserts the first example and keeps other fields", async () => {
    prisma.vocabulary.findUnique.mockResolvedValue({ lessonId: 1 });
    prisma.vocabulary.update.mockResolvedValue({ id: 7, lessonId: 1 });
    const result = await service.update(7, {
      meaning: "mới",
      exampleJa: "新しい。",
    });
    const arg = prisma.vocabulary.update.mock.calls[0][0];
    expect(arg.data.meaning).toBe("mới");
    expect(arg.data.exampleJa).toBeUndefined();
    expect(arg.data.examples.upsert).toEqual({
      where: { vocabularyId_sortOrder: { vocabularyId: 7, sortOrder: 0 } },
      create: { ja: "新しい。", sortOrder: 0 },
      update: { ja: "新しい。" },
    });
    expect(result).toMatchObject({ examples: [], exampleJa: null });
  });

  it("update with an empty exampleJa removes the first example", async () => {
    prisma.vocabulary.findUnique.mockResolvedValue({ lessonId: 1 });
    prisma.vocabulary.update.mockResolvedValue({ id: 7, lessonId: 1 });
    await service.update(7, { exampleJa: "" });
    expect(prisma.vocabulary.update.mock.calls[0][0].data.examples).toEqual({
      deleteMany: { sortOrder: 0 },
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

describe("tra từ romaji không dấu (Trie)", () => {
  const rows = [
    { id: 1, romaji: "kandō shimasu" },
    { id: 2, romaji: "kanji" },
  ];
  let prisma: {
    lesson: { findUnique: jest.Mock };
    vocabulary: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let service: VocabulariesService;

  beforeEach(async () => {
    prisma = {
      lesson: { findUnique: jest.fn() },
      vocabulary: {
        // Lần gọi chỉ select id+romaji là lần dựng chỉ mục; các lần khác là truy vấn tìm kiếm
        findMany: jest.fn((args: { select?: unknown }) =>
          Promise.resolve(args?.select ? rows : []),
        ),
        count: jest.fn().mockResolvedValue(0),
        delete: jest.fn().mockResolvedValue({ id: 1, lessonId: 30 }),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VocabulariesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(VocabulariesService);
  });

  const indexBuilds = () =>
    prisma.vocabulary.findMany.mock.calls.filter(([a]) => a?.select).length;
  const containsWhere = () =>
    prisma.vocabulary.count.mock.calls.at(-1)![0].where as { OR: unknown[] };

  it("gõ 'kandou' thì điều kiện tìm có thêm id của 'kandō shimasu'", async () => {
    await service.findAll(undefined, 1, 20, undefined, "kandou");
    expect(containsWhere().OR).toContainEqual({ id: { in: [1] } });
  });

  it("query không phải romaji (kana) thì không đụng tới chỉ mục", async () => {
    await service.findAll(undefined, 1, 20, undefined, "かんどう");
    expect(indexBuilds()).toBe(0);
    // kanji, kana, romaji, meaning, meaningEn — không có điều kiện id từ chỉ mục romaji
    expect(containsWhere().OR).toHaveLength(5);
  });

  it("chỉ mục dựng một lần rồi dùng lại; sửa từ thì dựng lại", async () => {
    await service.findAll(undefined, 1, 20, undefined, "kando");
    await service.findAll(undefined, 1, 20, undefined, "kanji");
    expect(indexBuilds()).toBe(1);

    await service.remove(1);
    await service.findAll(undefined, 1, 20, undefined, "kando");
    expect(indexBuilds()).toBe(2);
  });

  it("xếp hạng: 'kando' coi 'kandō shimasu' là bắt đầu bằng, đứng trước từ chỉ chứa", () => {
    const ranked = rankVocabSearch(
      [
        {
          id: 9,
          kanji: null,
          kana: "ほんかんどう",
          romaji: "honkandou",
          meaning: "x",
        },
        {
          id: 1,
          kanji: "感動します",
          kana: "かんどうします",
          romaji: "kandō shimasu",
          meaning: "cảm động",
        },
      ],
      "kando",
    );
    expect(ranked.map((v) => v.id)).toEqual([1, 9]);
  });
});
