import { Test, TestingModule } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { PrismaService } from "@app/prisma";
import { GrammarsService } from "./grammars.service";

describe("GrammarsService", () => {
  let service: GrammarsService;
  let prisma: {
    lesson: { findUnique: jest.Mock };
    grammar: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    example: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
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
      grammar: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      example: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockCache.del.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrammarsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get(GrammarsService);
  });

  it("findAll returns empty when lesson missing", async () => {
    prisma.lesson.findUnique.mockResolvedValue(null);
    const result = await service.findAll(404);
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("findAll includes examples", async () => {
    prisma.lesson.findUnique.mockResolvedValue({ id: 2 });
    prisma.$transaction.mockResolvedValue([
      [{ id: 1, pattern: "は", examples: [] }],
      1,
    ]);

    const result = await service.findAll(2);
    expect((result.data as Array<{ pattern: string }>)[0].pattern).toBe("は");
  });

  it("findOne includes examples", async () => {
    prisma.grammar.findUnique.mockResolvedValue({
      id: 1,
      examples: [{ jp: "test" }],
    });
    const result = await service.findOne(1);
    expect(result?.examples).toHaveLength(1);
  });
});
