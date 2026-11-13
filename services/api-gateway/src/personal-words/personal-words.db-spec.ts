import { ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@app/prisma";
import { createUser, resetTables } from "../../../test/db-fixtures";
import { PersonalWordsService } from "./personal-words.service";

// Postgres thật (npm run test:db, DB test riêng): kiểm ràng buộc UNIQUE và chống IDOR ở tầng DB.
describe("Sổ từ vựng cá nhân (Postgres thật)", () => {
  const prisma = new PrismaService();
  const service = new PersonalWordsService(prisma);
  beforeEach(() => resetTables(prisma)); // TRUNCATE "User" CASCADE → xóa luôn PersonalWord
  afterAll(() => prisma.$disconnect());

  it("thêm, lọc theo bài, phân trang có tổng", async () => {
    const an = await createUser(prisma);
    await service.create(an.id, { kana: "わたし", meaning: "tôi", lesson: 1 });
    await service.create(an.id, { kana: "たべます", meaning: "ăn", lesson: 6 });
    await service.create(an.id, { kana: "のみます", meaning: "uống", lesson: 6 });

    const bai6 = await service.list(an.id, { lesson: 6, page: 1, limit: 1 });
    expect(bai6.total).toBe(2);
    expect(bai6.data).toEqual([expect.objectContaining({ kana: "たべます" })]);
    expect(Object.keys(bai6.data[0]).sort()).toEqual(["id", "kana", "lesson", "meaning"]); // không lộ userId
  });

  it("trùng cách đọc trong sổ của mình → 409; người khác thì được", async () => {
    const an = await createUser(prisma);
    const binh = await createUser(prisma);
    await service.create(an.id, { kana: "わたし", meaning: "tôi", lesson: 1 });
    await expect(service.create(an.id, { kana: "わたし", meaning: "tôi", lesson: 1 })).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.create(binh.id, { kana: "わたし", meaning: "tôi", lesson: 1 })).resolves.toBeDefined();
  });

  it("hai request thêm CÙNG LÚC cùng một từ → đúng một cái thành công (DB chặn, không phải code)", async () => {
    const an = await createUser(prisma);
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => service.create(an.id, { kana: "ねこ", meaning: "mèo", lesson: 2 })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.personalWord.count({ where: { userId: an.id } })).toBe(1);
  });

  it("người khác không đọc, không sửa, không xóa được (IDOR)", async () => {
    const an = await createUser(prisma);
    const binh = await createUser(prisma);
    const word = await service.create(an.id, { kana: "わたし", meaning: "tôi", lesson: 1 });

    await expect(service.get(binh.id, word.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(binh.id, word.id, { meaning: "x" })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(binh.id, word.id)).rejects.toBeInstanceOf(NotFoundException);
    expect((await service.list(binh.id, {})).total).toBe(0);
    expect(await prisma.personalWord.findUnique({ where: { id: word.id } })).not.toBeNull();
  });

  it("xóa người dùng → xóa luôn sổ của họ (onDelete: Cascade)", async () => {
    const an = await createUser(prisma);
    await service.create(an.id, { kana: "わたし", meaning: "tôi", lesson: 1 });
    await prisma.user.delete({ where: { id: an.id } });
    expect(await prisma.personalWord.count()).toBe(0);
  });
});
