import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { PrismaService } from "@app/prisma";
import { LessonsService } from "./lessons.service";

describe("LessonsService", () => {
  let service: LessonsService;
  let prisma: {
    lesson: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    prisma = {
      lesson: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockCache.del.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get(LessonsService);
  });

  it("findAll returns ordered lessons with counts", async () => {
    const lessons = [{ id: 1, lessonNumber: 1 }];
    prisma.lesson.findMany.mockResolvedValue(lessons);

    const result = await service.findAll();

    expect(result).toEqual(lessons);
    expect(prisma.lesson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { lessonNumber: "asc" } }),
    );
  });

  it("findOne returns lesson by lessonNumber", async () => {
    prisma.lesson.findUnique.mockResolvedValue({ id: 1, lessonNumber: 5 });
    const result = await service.findOne(5);
    expect(result?.lessonNumber).toBe(5);
  });

  it("findOne throws NotFoundException when the lesson does not exist", async () => {
    prisma.lesson.findUnique.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it("create delegates to prisma", async () => {
    const dto = { lessonNumber: 3, title: "Bài 3" };
    prisma.lesson.create.mockResolvedValue({ id: 3, ...dto });
    await service.create(dto);
    expect(prisma.lesson.create).toHaveBeenCalledWith({ data: dto });
  });

  it("remove deletes by id", async () => {
    prisma.lesson.delete.mockResolvedValue({ id: 1 });
    await service.remove(1);
    expect(prisma.lesson.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
