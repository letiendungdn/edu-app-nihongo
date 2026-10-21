import { PrismaService, SrsCardRepository } from "@app/prisma";
import { createUser, resetTables } from "../../../../test/db-fixtures";

describe("Đồng bộ thẻ SRS từ máy lên (Postgres thật)", () => {
  const prisma = new PrismaService();
  const repo = new SrsCardRepository(prisma);
  const item = (wrongCount: number) => ({
    kana: "ねこ",
    kanji: "猫",
    meaning: "con mèo",
    lessonNumber: 1,
    wrongCount,
    reviewStreak: 0,
    mastered: false,
  });

  beforeEach(() => resetTables(prisma));
  afterAll(() => prisma.$disconnect());

  const card = (userId: number) =>
    prisma.srsCard.findFirstOrThrow({ where: { userId, contentId: 1 } });

  it("bản gửi lên MỚI HƠN → ghi đè", async () => {
    const u = await createUser(prisma);
    await repo.upsertVocabularyReviewCard(
      u.id,
      1,
      item(1),
      new Date("2026-10-20T08:00:00Z"),
    );
    await repo.upsertVocabularyReviewCard(
      u.id,
      1,
      item(5),
      new Date("2026-10-21T08:00:00Z"),
    );

    expect((await card(u.id)).wrongCount).toBe(5);
  });

  it("máy offline lâu gửi bản CŨ HƠN lên sau → giữ bản mới (bản cũ: bị đè)", async () => {
    const u = await createUser(prisma);
    await repo.upsertVocabularyReviewCard(
      u.id,
      1,
      item(5),
      new Date("2026-10-21T08:00:00Z"),
    );
    await repo.upsertVocabularyReviewCard(
      u.id,
      1,
      item(1),
      new Date("2026-10-14T08:00:00Z"),
    );

    const saved = await card(u.id);
    expect(saved.wrongCount).toBe(5);
    expect(saved.lastReviewedAt?.toISOString()).toBe(
      "2026-10-21T08:00:00.000Z",
    );
  });

  it("bản gửi lên không có lastReviewedAt → chỉ tạo khi chưa có thẻ, không đè thẻ đã ôn", async () => {
    const u = await createUser(prisma);
    await repo.upsertVocabularyReviewCard(u.id, 1, item(0), null);
    expect((await card(u.id)).wrongCount).toBe(0);

    await repo.upsertVocabularyReviewCard(
      u.id,
      1,
      item(3),
      new Date("2026-10-21T08:00:00Z"),
    );
    await repo.upsertVocabularyReviewCard(u.id, 1, item(9), null);

    expect((await card(u.id)).wrongCount).toBe(3);
    expect(await prisma.srsCard.count()).toBe(1);
  });
});
