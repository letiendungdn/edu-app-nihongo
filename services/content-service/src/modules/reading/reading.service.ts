import { Injectable } from "@nestjs/common";
import { JlptLevel } from "@prisma/client";
import { PrismaService } from "@app/prisma";

function parseJlptLevel(value?: string): JlptLevel | undefined {
  if (!value) return undefined;
  return (Object.values(JlptLevel) as string[]).includes(value)
    ? (value as JlptLevel)
    : undefined;
}

@Injectable()
export class ReadingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(jlptLevel?: string) {
    const level = parseJlptLevel(jlptLevel);
    return this.prisma.readingPassage.findMany({
      where: level ? { jlptLevel: level } : undefined,
      select: {
        id: true,
        title: true,
        jlptLevel: true,
        estimatedMin: true,
        sortOrder: true,
        _count: { select: { questions: true } },
      },
      orderBy: [{ jlptLevel: "asc" }, { sortOrder: "asc" }],
    });
  }

  create(dto: {
    title: string;
    content: string;
    jlptLevel?: string;
    source?: string;
    estimatedMin?: number;
    sortOrder?: number;
    questions?: {
      question: string;
      answer: string;
      explanation?: string;
      options: string[];
    }[];
  }) {
    return this.prisma.readingPassage.create({
      data: {
        title: dto.title,
        content: dto.content,
        jlptLevel: parseJlptLevel(dto.jlptLevel),
        source: dto.source ?? null,
        estimatedMin: dto.estimatedMin ?? 3,
        sortOrder: dto.sortOrder ?? 0,
        questions: dto.questions?.length
          ? {
              create: dto.questions.map((q, qi) => ({
                question: q.question,
                answer: q.answer,
                explanation: q.explanation ?? null,
                sortOrder: qi,
                options: {
                  create: q.options.map((text, oi) => ({
                    text,
                    sortOrder: oi,
                  })),
                },
              })),
            }
          : undefined,
      },
      include: { questions: { include: { options: true } } },
    });
  }

  async update(
    id: number,
    dto: {
      title?: string;
      content?: string;
      jlptLevel?: string;
      source?: string;
      estimatedMin?: number;
      sortOrder?: number;
      questions?: {
        question: string;
        answer: string;
        explanation?: string;
        options: string[];
      }[];
    },
  ) {
    if (dto.questions !== undefined) {
      // Thay toàn bộ câu hỏi cũ (cascade xoá option theo schema).
      await this.prisma.readingQuestion.deleteMany({
        where: { passageId: id },
      });
    }

    return this.prisma.readingPassage.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.jlptLevel !== undefined
          ? { jlptLevel: parseJlptLevel(dto.jlptLevel) }
          : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
        ...(dto.estimatedMin !== undefined
          ? { estimatedMin: dto.estimatedMin }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.questions !== undefined
          ? {
              questions: {
                create: dto.questions.map((q, qi) => ({
                  question: q.question,
                  answer: q.answer,
                  explanation: q.explanation ?? null,
                  sortOrder: qi,
                  options: {
                    create: q.options.map((text, oi) => ({
                      text,
                      sortOrder: oi,
                    })),
                  },
                })),
              },
            }
          : {}),
      },
      include: { questions: { include: { options: true } } },
    });
  }

  remove(id: number) {
    return this.prisma.readingPassage.delete({ where: { id } });
  }

  findOne(id: number) {
    return this.prisma.readingPassage.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
          include: {
            options: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });
  }

  async submit(
    passageId: number,
    answers: Record<string, string>,
    userId?: number,
  ) {
    const passage = await this.prisma.readingPassage.findUnique({
      where: { id: passageId },
      include: { questions: true },
    });
    if (!passage) throw new Error("Passage not found");

    let correct = 0;
    const results = passage.questions.map((q) => {
      const isCorrect = answers[q.id] === q.answer;
      if (isCorrect) correct++;
      return {
        questionId: q.id,
        correct: isCorrect,
        correctAnswer: q.answer,
        explanation: q.explanation,
      };
    });

    const total = passage.questions.length;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

    await this.prisma.readingAttempt.create({
      data: { passageId, userId: userId ?? null, correct, total, percent },
    });

    return { correct, total, percent, results };
  }
}
