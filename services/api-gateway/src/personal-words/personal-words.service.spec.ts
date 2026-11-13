import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { PersonalWordsService } from "./personal-words.service";

// Unit test: thay PrismaService bằng object giả, không cần DB. Kiểm LOGIC của service.
describe("PersonalWordsService", () => {
  let service: PersonalWordsService;
  const prisma = {
    personalWord: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [PersonalWordsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(PersonalWordsService);
  });

  it("get: luôn lọc theo cả id và userId (chống đọc trộm)", async () => {
    prisma.personalWord.findFirst.mockResolvedValue({ id: 5, kana: "わたし", meaning: "tôi", lesson: 1 });
    await service.get(7, 5);
    expect(prisma.personalWord.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5, userId: 7 } }),
    );
  });

  it("get: không thấy → 404", async () => {
    prisma.personalWord.findFirst.mockResolvedValue(null);
    await expect(service.get(7, 5)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("create: vi phạm UNIQUE (P2002) → 409", async () => {
    prisma.personalWord.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" }),
    );
    await expect(service.create(7, { kana: "わたし", meaning: "tôi", lesson: 1 })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("create: lỗi khác ném nguyên (không giấu thành 409)", async () => {
    prisma.personalWord.create.mockRejectedValue(new Error("DB sập"));
    await expect(service.create(7, { kana: "わたし", meaning: "tôi", lesson: 1 })).rejects.toThrow("DB sập");
  });

  it("update: body rỗng → 400, không gọi DB", async () => {
    await expect(service.update(7, 5, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.personalWord.findFirst).not.toHaveBeenCalled();
  });

  it("remove: không xóa được dòng nào → 404, điều kiện có userId", async () => {
    prisma.personalWord.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove(7, 5)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.personalWord.deleteMany).toHaveBeenCalledWith({ where: { id: 5, userId: 7 } });
  });
});
