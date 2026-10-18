import { Test, TestingModule } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { RpcException } from "@nestjs/microservices";
import { REDIS_CLIENT } from "@app/common";
import { MockExamsService } from "./mock-exams.service";
import { PrismaService } from "@app/prisma";

const baseSession = {
  examId: "exam-1",
  templateId: 1,
  templateSlug: "n5",
  level: "n5" as const,
  title: "N5 Test",
  durationMinutes: 50,
  passThreshold: 60,
  startedAt: new Date().toISOString(),
  questions: [
    {
      id: "q1",
      sectionId: "vocab",
      sectionName: "Từ vựng",
      type: "multiple_choice" as const,
      question: "Q1",
    },
    {
      id: "q2",
      sectionId: "grammar",
      sectionName: "Ngữ pháp",
      type: "fill_in_blank" as const,
      question: "Q2",
    },
  ],
  answerKey: { q1: "A", q2: "B" },
};

describe("MockExamsService", () => {
  let service: MockExamsService;
  const cacheStore = new Map<string, unknown>();

  const mockCache = {
    get: jest.fn((key: string) => cacheStore.get(key)),
    set: jest.fn((key: string, value: unknown) => {
      cacheStore.set(key, value);
    }),
    del: jest.fn((key: string) => {
      cacheStore.delete(key);
    }),
  };

  const mockPrisma: Record<string, unknown> = {
    examResult: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    outboxEvent: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    // submit() ghi ExamResult + OutboxEvent trong một transaction — mock chạy callback với chính mockPrisma
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(mockPrisma)),
    mockExamTemplate: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lesson: { findMany: jest.fn().mockResolvedValue([]) },
    exercise: { findMany: jest.fn().mockResolvedValue([]) },
    kanjiEntry: { findMany: jest.fn().mockResolvedValue([]) },
    vocabulary: { findMany: jest.fn().mockResolvedValue([]) },
    grammar: { findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeEach(async () => {
    cacheStore.clear();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockExamsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: REDIS_CLIENT, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get(MockExamsService);
    jest.clearAllMocks();
  });

  describe("submit()", () => {
    beforeEach(() => {
      cacheStore.set("mock-exam:exam-1", baseSession);
    });

    it("correctly scores all-right answers", async () => {
      const result = await service.submit("exam-1", { q1: "A", q2: "B" });
      expect(result.correctCount).toBe(2);
      expect(result.percent).toBe(100);
      expect(result.passed).toBe(true);
    });

    it("correctly scores all-wrong answers", async () => {
      const result = await service.submit("exam-1", { q1: "X", q2: "Y" });
      expect(result.correctCount).toBe(0);
      expect(result.percent).toBe(0);
      expect(result.passed).toBe(false);
    });

    it("normalizes answer case and whitespace", async () => {
      const result = await service.submit("exam-1", { q1: " a ", q2: "b" });
      expect(result.correctCount).toBe(2);
    });

    it("throws RpcException for unknown examId", async () => {
      await expect(service.submit("missing", {})).rejects.toBeInstanceOf(
        RpcException,
      );
    });

    it("calculates section scores correctly", async () => {
      const result = await service.submit("exam-1", { q1: "A", q2: "wrong" });
      const vocab = result.sectionScores.find((s) => s.sectionId === "vocab");
      const grammar = result.sectionScores.find(
        (s) => s.sectionId === "grammar",
      );
      expect(vocab).toEqual({
        sectionId: "vocab",
        sectionName: "Từ vựng",
        correct: 1,
        total: 1,
      });
      expect(grammar).toEqual({
        sectionId: "grammar",
        sectionName: "Ngữ pháp",
        correct: 0,
        total: 1,
      });
    });

    it("marks exam as passed when percent >= threshold", async () => {
      const result = await service.submit("exam-1", { q1: "A", q2: "B" });
      expect(result.passThreshold).toBe(60);
      expect(result.passed).toBe(true);
    });

    it("ghi event outbox trong cùng transaction với kết quả thi", async () => {
      const outbox = mockPrisma.outboxEvent as { create: jest.Mock };
      outbox.create.mockClear();
      await service.submit("exam-1", { q1: "A", q2: "B" }, 7);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(outbox.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          topic: "edu.exam.submitted",
          key: "7",
          payload: expect.objectContaining({
            eventId: "exam-result-1",
            userId: 7,
            percent: 100,
          }),
        }),
      });
    });
  });

  describe("start()", () => {
    it("throws RpcException for unsupported level", async () => {
      await expect(service.start("n0")).rejects.toBeInstanceOf(RpcException);
    });
  });
});
