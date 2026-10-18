import { Inject, Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import type { ExerciseType, JlptLevel, MockExamTemplate } from "@prisma/client";
import {
  REDIS_CLIENT,
  sample,
  shuffle,
  speechTextFromJapanese,
  normalizeAnswer,
} from "@app/common";
import type {
  CreateMockExamQuestionDto,
  CreateMockExamTemplateDto,
  UpdateMockExamQuestionDto,
  UpdateMockExamTemplateDto,
} from "@app/contracts";
import { KafkaTopics } from "@app/contracts";
import { PrismaService } from "@app/prisma";
import type Redis from "ioredis";
import { randomUUID } from "crypto";
import { LEVEL_POOL_LESSON } from "@app/prisma/level-pool";

const SESSION_TTL_MS = 3 * 60 * 60 * 1000;
const sessionKey = (examId: string) => `mock-exam:${examId}`;

function exerciseOptions(exercise: { options?: { text: string }[] }): string[] {
  return exercise.options?.map((o) => o.text) ?? [];
}

function toQuestionType(
  type: ExerciseType,
): "multiple_choice" | "fill_in_blank" {
  return type === "MULTIPLE_CHOICE" ? "multiple_choice" : "fill_in_blank";
}

export type MockExamLevel = "n5" | "n4" | "n3" | "n2" | "n1";

export interface MockExamQuestionPublic {
  id: string;
  sectionId: string;
  sectionName: string;
  type: "multiple_choice" | "fill_in_blank" | "listening";
  question: string;
  options?: Array<{ text: string; imageUrl?: string }>;
  imageUrl?: string;
  audioText?: string;
  audioUrl?: string;
  lessonNumber?: number;
}

export interface MockExamReviewItem extends MockExamQuestionPublic {
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}

export interface MockExamSession {
  examId: string;
  templateId: number;
  templateSlug: string;
  level: MockExamLevel;
  title: string;
  durationMinutes: number;
  passThreshold: number;
  startedAt: string;
  questions: MockExamQuestionPublic[];
  answerKey: Record<string, string>;
}

interface LevelConfig {
  title: string;
  durationMinutes: number;
  lessonFrom: number;
  lessonTo: number;
  kanjiLessonFrom: number;
  kanjiLessonTo: number;
  vocabCount: number;
  grammarCount: number;
  kanjiCount: number;
  listeningWordCount: number;
  listeningSentenceCount: number;
  passThreshold: number;
  description: string;
}

function templateToConfig(row: MockExamTemplate): LevelConfig {
  return {
    title: row.title,
    durationMinutes: row.durationMinutes,
    lessonFrom: row.lessonFrom,
    lessonTo: row.lessonTo,
    kanjiLessonFrom: row.kanjiLessonFrom,
    kanjiLessonTo: row.kanjiLessonTo,
    vocabCount: row.vocabCount,
    grammarCount: row.grammarCount,
    kanjiCount: row.kanjiCount,
    listeningWordCount: row.listeningWordCount,
    listeningSentenceCount: row.listeningSentenceCount,
    passThreshold: row.passThreshold,
    description: row.description,
  };
}

function totalQuestions(
  row: Pick<
    MockExamTemplate,
    | "sourceMode"
    | "vocabCount"
    | "grammarCount"
    | "kanjiCount"
    | "listeningWordCount"
    | "listeningSentenceCount"
  > & { _count?: { questions?: number } },
) {
  if (row.sourceMode === "CUSTOM") {
    return row._count?.questions ?? 0;
  }
  return (
    row.vocabCount +
    row.grammarCount +
    row.kanjiCount +
    row.listeningWordCount +
    row.listeningSentenceCount
  );
}

const SECTION_NAMES: Record<string, string> = {
  vocab: "Từ vựng",
  grammar: "Ngữ pháp",
  kanji: "Kanji",
  listening: "Nghe",
  reading: "Đọc hiểu",
};

function resolveScope(row: MockExamTemplate): string {
  if (row.scope.trim()) return row.scope;
  if (row.sourceMode === "CUSTOM") return "Đề tự soạn";
  if (row.lessonFrom <= 50 && row.lessonTo <= 50) {
    return `Minna Bài ${row.lessonFrom}–${row.lessonTo}`;
  }
  return `Bộ ${row.level.toUpperCase()} trong app`;
}

function toListItem(
  row: MockExamTemplate & { _count?: { questions: number } },
) {
  return {
    id: row.id,
    slug: row.slug,
    level: row.level,
    title: row.title,
    sourceMode: row.sourceMode,
    durationMinutes: row.durationMinutes,
    totalQuestions: totalQuestions(row),
    lessonRange: `${row.lessonFrom}–${row.lessonTo}`,
    scope: resolveScope(row),
    description: row.description,
    isPublished: row.isPublished,
    sortOrder: row.sortOrder,
  };
}

function toAdminItem(
  row: MockExamTemplate & { _count?: { questions: number } },
) {
  return {
    ...toListItem(row),
    lessonFrom: row.lessonFrom,
    lessonTo: row.lessonTo,
    kanjiLessonFrom: row.kanjiLessonFrom,
    kanjiLessonTo: row.kanjiLessonTo,
    vocabCount: row.vocabCount,
    grammarCount: row.grammarCount,
    kanjiCount: row.kanjiCount,
    listeningWordCount: row.listeningWordCount,
    listeningSentenceCount: row.listeningSentenceCount,
    passThreshold: row.passThreshold,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toQuestionAdmin(q: {
  id: number;
  templateId: number;
  sectionId: string;
  type: string;
  question: string;
  correctAnswer: string;
  imageUrl: string | null;
  audioText: string | null;
  audioUrl: string | null;
  sortOrder: number;
  options: { text: string; imageUrl: string | null; sortOrder: number }[];
}) {
  return {
    id: q.id,
    templateId: q.templateId,
    sectionId: q.sectionId,
    type: q.type,
    question: q.question,
    correctAnswer: q.correctAnswer,
    imageUrl: q.imageUrl ?? undefined,
    audioText: q.audioText ?? undefined,
    audioUrl: q.audioUrl ?? undefined,
    sortOrder: q.sortOrder,
    options: q.options
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((o) => ({
        text: o.text,
        imageUrl: o.imageUrl ?? undefined,
      })),
  };
}

function normalizeOptionInputs(
  options?: Array<string | { text: string; imageUrl?: string | null }>,
) {
  if (!options?.length) return [];
  return options
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          text: item.trim(),
          imageUrl: null as string | null,
          sortOrder: index,
        };
      }
      return {
        text: item.text.trim(),
        imageUrl: item.imageUrl?.trim() || null,
        sortOrder: index,
      };
    })
    .filter((item) => item.text);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

@Injectable()
export class MockExamsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async listTemplates() {
    const rows = await this.prisma.mockExamTemplate.findMany({
      where: { isPublished: true },
      include: { _count: { select: { questions: true } } },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    return rows.map(toListItem);
  }

  async listTemplatesAdmin() {
    const rows = await this.prisma.mockExamTemplate.findMany({
      include: { _count: { select: { questions: true } } },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    return rows.map(toAdminItem);
  }

  async getTemplate(id: number) {
    const row = await this.prisma.mockExamTemplate.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    });
    if (!row) {
      throw new RpcException({
        statusCode: 404,
        message: "Không tìm thấy đề thi",
      });
    }
    return toAdminItem(row);
  }

  async createTemplate(dto: CreateMockExamTemplateDto) {
    const slug =
      dto.slug?.trim() ||
      `${dto.level}-${slugify(dto.title) || "de"}-${Date.now()}`;

    const existing = await this.prisma.mockExamTemplate.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new RpcException({
        statusCode: 409,
        message: `Slug "${slug}" đã tồn tại`,
      });
    }

    const sourceMode = dto.sourceMode === "CUSTOM" ? "CUSTOM" : "GENERATED";
    const isCustom = sourceMode === "CUSTOM";

    const row = await this.prisma.mockExamTemplate.create({
      data: {
        slug,
        level: dto.level,
        title: dto.title,
        description: dto.description ?? "",
        sourceMode,
        durationMinutes: dto.durationMinutes,
        lessonFrom: dto.lessonFrom ?? 1,
        lessonTo: dto.lessonTo ?? 1,
        kanjiLessonFrom: dto.kanjiLessonFrom ?? 1,
        kanjiLessonTo: dto.kanjiLessonTo ?? 1,
        vocabCount: isCustom ? 0 : (dto.vocabCount ?? 12),
        grammarCount: isCustom ? 0 : (dto.grammarCount ?? 10),
        kanjiCount: isCustom ? 0 : (dto.kanjiCount ?? 5),
        listeningWordCount: isCustom ? 0 : (dto.listeningWordCount ?? 4),
        listeningSentenceCount: isCustom
          ? 0
          : (dto.listeningSentenceCount ?? 4),
        passThreshold: dto.passThreshold ?? 65,
        scope: dto.scope ?? (isCustom ? "Đề tự soạn" : ""),
        isPublished: dto.isPublished ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { _count: { select: { questions: true } } },
    });

    return toAdminItem(row);
  }

  async updateTemplate(id: number, dto: UpdateMockExamTemplateDto) {
    const current = await this.prisma.mockExamTemplate.findUnique({
      where: { id },
    });
    if (!current) {
      throw new RpcException({
        statusCode: 404,
        message: "Không tìm thấy đề thi",
      });
    }

    if (dto.slug && dto.slug !== current.slug) {
      const taken = await this.prisma.mockExamTemplate.findUnique({
        where: { slug: dto.slug },
      });
      if (taken) {
        throw new RpcException({
          statusCode: 409,
          message: `Slug "${dto.slug}" đã tồn tại`,
        });
      }
    }

    const row = await this.prisma.mockExamTemplate.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.level !== undefined ? { level: dto.level } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.sourceMode !== undefined ? { sourceMode: dto.sourceMode } : {}),
        ...(dto.durationMinutes !== undefined
          ? { durationMinutes: dto.durationMinutes }
          : {}),
        ...(dto.lessonFrom !== undefined ? { lessonFrom: dto.lessonFrom } : {}),
        ...(dto.lessonTo !== undefined ? { lessonTo: dto.lessonTo } : {}),
        ...(dto.kanjiLessonFrom !== undefined
          ? { kanjiLessonFrom: dto.kanjiLessonFrom }
          : {}),
        ...(dto.kanjiLessonTo !== undefined
          ? { kanjiLessonTo: dto.kanjiLessonTo }
          : {}),
        ...(dto.vocabCount !== undefined ? { vocabCount: dto.vocabCount } : {}),
        ...(dto.grammarCount !== undefined
          ? { grammarCount: dto.grammarCount }
          : {}),
        ...(dto.kanjiCount !== undefined ? { kanjiCount: dto.kanjiCount } : {}),
        ...(dto.listeningWordCount !== undefined
          ? { listeningWordCount: dto.listeningWordCount }
          : {}),
        ...(dto.listeningSentenceCount !== undefined
          ? { listeningSentenceCount: dto.listeningSentenceCount }
          : {}),
        ...(dto.passThreshold !== undefined
          ? { passThreshold: dto.passThreshold }
          : {}),
        ...(dto.scope !== undefined ? { scope: dto.scope } : {}),
        ...(dto.isPublished !== undefined
          ? { isPublished: dto.isPublished }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
      include: { _count: { select: { questions: true } } },
    });

    return toAdminItem(row);
  }

  async deleteTemplate(id: number) {
    const current = await this.prisma.mockExamTemplate.findUnique({
      where: { id },
    });
    if (!current) {
      throw new RpcException({
        statusCode: 404,
        message: "Không tìm thấy đề thi",
      });
    }

    await this.prisma.mockExamTemplate.delete({ where: { id } });
    return { id, deleted: true };
  }

  async listQuestions(templateId: number) {
    await this.requireTemplate(templateId);
    const rows = await this.prisma.mockExamQuestion.findMany({
      where: { templateId },
      include: { options: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    return rows.map(toQuestionAdmin);
  }

  async createQuestion(templateId: number, dto: CreateMockExamQuestionDto) {
    await this.requireTemplate(templateId);
    this.assertQuestionPayload(dto);

    let sortOrder = dto.sortOrder;
    if (sortOrder == null) {
      const agg = await this.prisma.mockExamQuestion.aggregate({
        where: { templateId },
        _max: { sortOrder: true },
      });
      sortOrder = (agg._max.sortOrder ?? -1) + 1;
    }

    const options = normalizeOptionInputs(dto.options);

    const row = await this.prisma.mockExamQuestion.create({
      data: {
        templateId,
        sectionId: dto.sectionId,
        type: dto.type,
        question: dto.question.trim(),
        correctAnswer: dto.correctAnswer.trim(),
        imageUrl: dto.imageUrl?.trim() || null,
        audioText: dto.audioText?.trim() || null,
        audioUrl: dto.audioUrl?.trim() || null,
        sortOrder,
        options: {
          create: options.map((opt) => ({
            text: opt.text,
            imageUrl: opt.imageUrl,
            sortOrder: opt.sortOrder,
          })),
        },
      },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });

    return toQuestionAdmin(row);
  }

  async updateQuestion(
    templateId: number,
    questionId: number,
    dto: UpdateMockExamQuestionDto,
  ) {
    const existing = await this.prisma.mockExamQuestion.findFirst({
      where: { id: questionId, templateId },
    });
    if (!existing) {
      throw new RpcException({
        statusCode: 404,
        message: "Không tìm thấy câu hỏi",
      });
    }

    const nextType = dto.type ?? existing.type;
    const nextOptions =
      dto.options !== undefined
        ? normalizeOptionInputs(dto.options)
        : undefined;
    if (nextType === "multiple_choice" || nextType === "listening") {
      const opts =
        nextOptions ??
        (
          await this.prisma.mockExamQuestionOption.findMany({
            where: { questionId },
            orderBy: { sortOrder: "asc" },
          })
        ).map((o) => ({ text: o.text, imageUrl: o.imageUrl }));
      if (opts.filter((t) => t.text.trim()).length < 2) {
        throw new RpcException({
          statusCode: 400,
          message: "Câu trắc nghiệm / nghe cần ít nhất 2 đáp án",
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.mockExamQuestion.update({
        where: { id: questionId },
        data: {
          ...(dto.sectionId !== undefined ? { sectionId: dto.sectionId } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.question !== undefined
            ? { question: dto.question.trim() }
            : {}),
          ...(dto.correctAnswer !== undefined
            ? { correctAnswer: dto.correctAnswer.trim() }
            : {}),
          ...(dto.imageUrl !== undefined
            ? { imageUrl: dto.imageUrl?.trim() || null }
            : {}),
          ...(dto.audioText !== undefined
            ? { audioText: dto.audioText?.trim() || null }
            : {}),
          ...(dto.audioUrl !== undefined
            ? { audioUrl: dto.audioUrl?.trim() || null }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });

      if (nextOptions !== undefined) {
        await tx.mockExamQuestionOption.deleteMany({ where: { questionId } });
        if (nextOptions.length) {
          await tx.mockExamQuestionOption.createMany({
            data: nextOptions.map((opt) => ({
              questionId,
              text: opt.text,
              imageUrl: opt.imageUrl,
              sortOrder: opt.sortOrder,
            })),
          });
        }
      }
    });

    const row = await this.prisma.mockExamQuestion.findUniqueOrThrow({
      where: { id: questionId },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });
    return toQuestionAdmin(row);
  }

  async deleteQuestion(templateId: number, questionId: number) {
    const existing = await this.prisma.mockExamQuestion.findFirst({
      where: { id: questionId, templateId },
    });
    if (!existing) {
      throw new RpcException({
        statusCode: 404,
        message: "Không tìm thấy câu hỏi",
      });
    }
    await this.prisma.mockExamQuestion.delete({ where: { id: questionId } });
    return { id: questionId, deleted: true };
  }

  async reorderQuestions(templateId: number, orderedIds: number[]) {
    await this.requireTemplate(templateId);
    const existing = await this.prisma.mockExamQuestion.findMany({
      where: { templateId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((q) => q.id));
    if (
      orderedIds.length !== existingIds.size ||
      orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new RpcException({
        statusCode: 400,
        message: "orderedIds phải gồm mọi câu hỏi của đề",
      });
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.mockExamQuestion.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.listQuestions(templateId);
  }

  private async requireTemplate(id: number) {
    const row = await this.prisma.mockExamTemplate.findUnique({
      where: { id },
    });
    if (!row) {
      throw new RpcException({
        statusCode: 404,
        message: "Không tìm thấy đề thi",
      });
    }
    return row;
  }

  private assertQuestionPayload(
    dto: Pick<
      CreateMockExamQuestionDto,
      "type" | "options" | "audioText" | "audioUrl" | "correctAnswer"
    >,
  ) {
    if (dto.type === "multiple_choice" || dto.type === "listening") {
      const opts = normalizeOptionInputs(dto.options);
      if (opts.length < 2) {
        throw new RpcException({
          statusCode: 400,
          message: "Câu trắc nghiệm / nghe cần ít nhất 2 đáp án",
        });
      }
      if (!opts.some((o) => o.text === dto.correctAnswer.trim())) {
        throw new RpcException({
          statusCode: 400,
          message: "Đáp án đúng phải nằm trong danh sách lựa chọn",
        });
      }
    }
    if (
      dto.type === "listening" &&
      !dto.audioUrl?.trim() &&
      !dto.audioText?.trim()
    ) {
      throw new RpcException({
        statusCode: 400,
        message: "Câu nghe cần file âm thanh hoặc audioText (TTS)",
      });
    }
  }

  private async startCustomExam(template: MockExamTemplate) {
    const rows = await this.prisma.mockExamQuestion.findMany({
      where: { templateId: template.id },
      include: { options: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    if (rows.length === 0) {
      throw new RpcException({
        statusCode: 400,
        message: "Đề tự soạn chưa có câu hỏi. Admin hãy thêm câu hỏi trước.",
      });
    }

    const level = template.level as MockExamLevel;
    const questions: MockExamQuestionPublic[] = [];
    const answerKey: Record<string, string> = {};

    rows.forEach((row, index) => {
      const id = `q${index + 1}`;
      const optionItems = row.options.map((o) => ({
        text: o.text,
        imageUrl: o.imageUrl ?? undefined,
      }));
      const type = row.type as MockExamQuestionPublic["type"];
      questions.push({
        id,
        sectionId: row.sectionId,
        sectionName: SECTION_NAMES[row.sectionId] ?? row.sectionId,
        type,
        question: row.question,
        imageUrl: row.imageUrl ?? undefined,
        options:
          type === "multiple_choice" || type === "listening"
            ? shuffle(optionItems)
            : undefined,
        audioText: row.audioText ?? undefined,
        audioUrl: row.audioUrl ?? undefined,
      });
      answerKey[id] = row.correctAnswer;
    });

    const examId = randomUUID();
    const session: MockExamSession = {
      examId,
      templateId: template.id,
      templateSlug: template.slug,
      level,
      title: template.title,
      durationMinutes: template.durationMinutes,
      passThreshold: template.passThreshold,
      startedAt: new Date().toISOString(),
      questions,
      answerKey,
    };

    await this.cacheManager.set(sessionKey(examId), session, SESSION_TTL_MS);

    return {
      examId,
      templateId: template.id,
      slug: template.slug,
      level,
      title: template.title,
      durationMinutes: template.durationMinutes,
      totalQuestions: questions.length,
      sections: this.groupBySection(questions),
      questions,
    };
  }

  private async findTemplateByKey(key: string) {
    const numericId = Number(key);
    if (Number.isInteger(numericId) && numericId > 0) {
      const byId = await this.prisma.mockExamTemplate.findUnique({
        where: { id: numericId },
      });
      if (byId) return byId;
    }

    return this.prisma.mockExamTemplate.findUnique({
      where: { slug: key.toLowerCase() },
    });
  }

  async start(key: string) {
    const template = await this.findTemplateByKey(key);
    if (!template) {
      throw new RpcException({
        statusCode: 404,
        message: `Đề thi "${key}" không tồn tại`,
      });
    }
    if (!template.isPublished) {
      throw new RpcException({
        statusCode: 404,
        message: "Đề thi chưa được công bố",
      });
    }

    if (template.sourceMode === "CUSTOM") {
      return this.startCustomExam(template);
    }

    const cfg = templateToConfig(template);
    const level = template.level as MockExamLevel;
    const jlptLevel = level.toUpperCase() as JlptLevel;

    // Lọc theo jlptLevel thay vì lessonNumber range: các file "boost/expand"
    // seed nội dung ở nhiều dải lessonNumber khác nhau, không nằm gọn trong
    // [lessonFrom, lessonTo] của template, nên lọc theo range sẽ bỏ sót phần
    // lớn nội dung N2/N1 đã seed. jlptLevel là nguồn sự thật đáng tin cậy hơn.
    const lessons = await this.prisma.lesson.findMany({
      // Bài soạn theo sách lặp lại mục JLPT → bỏ để đề không trùng câu
      where: { jlptLevel, ...LEVEL_POOL_LESSON },
      select: { id: true, lessonNumber: true },
    });

    const lessonIds = lessons.map((l) => l.id);
    const lessonById = new Map(lessons.map((l) => [l.id, l.lessonNumber]));

    const exercises = lessonIds.length
      ? await this.prisma.exercise.findMany({
          where: { lessonId: { in: lessonIds } },
          include: { options: { orderBy: { sortOrder: "asc" } } },
        })
      : [];

    const vocabPool = exercises.filter((e) => e.type === "MULTIPLE_CHOICE");
    const grammarPool = exercises.filter(
      (e) => e.type === "MULTIPLE_CHOICE" || e.type === "FILL_IN_BLANK",
    );

    const pickedVocab = sample(vocabPool, cfg.vocabCount);
    const vocabIds = new Set(pickedVocab.map((e) => e.id));
    const grammarCandidates = grammarPool.filter((e) => !vocabIds.has(e.id));
    const pickedGrammar = sample(grammarCandidates, cfg.grammarCount);

    const kanjiEntries = await this.prisma.kanjiEntry.findMany({
      where: { lesson: { jlptLevel, ...LEVEL_POOL_LESSON } },
      include: { lesson: { select: { lessonNumber: true } } },
    });

    const pickedKanji = sample(kanjiEntries, cfg.kanjiCount);
    const kanjiQuestions = this.buildKanjiQuestions(pickedKanji, kanjiEntries);

    const vocabularies = lessonIds.length
      ? await this.prisma.vocabulary.findMany({
          where: { lessonId: { in: lessonIds } },
          include: { lesson: { select: { lessonNumber: true } } },
        })
      : [];

    const grammars = lessonIds.length
      ? await this.prisma.grammar.findMany({
          where: { lessonId: { in: lessonIds } },
          include: {
            examples: true,
            lesson: { select: { lessonNumber: true } },
          },
        })
      : [];

    const listeningWordQuestions = this.buildVocabListeningQuestions(
      sample(
        vocabularies.filter((v) => v.kana && v.meaning?.trim()),
        cfg.listeningWordCount,
      ),
      vocabularies,
    );

    const examplePool = grammars.flatMap((g) =>
      g.examples
        .filter((e) => e.vi?.trim() && e.jp?.trim())
        .map((e) => ({
          jp: e.jp,
          vi: e.vi as string,
          lessonNumber: g.lesson.lessonNumber,
        })),
    );

    const listeningSentenceQuestions = this.buildSentenceListeningQuestions(
      sample(examplePool, cfg.listeningSentenceCount),
      examplePool,
    );

    let index = 0;
    const questions: MockExamQuestionPublic[] = [];
    const answerKey: Record<string, string> = {};

    const pushQuestion = (
      sectionId: string,
      sectionName: string,
      type: "multiple_choice" | "fill_in_blank" | "listening",
      question: string,
      answer: string,
      options?: string[],
      lessonNumber?: number,
      audioText?: string,
      audioUrl?: string,
    ) => {
      index += 1;
      const id = `q${index}`;
      questions.push({
        id,
        sectionId,
        sectionName,
        type,
        question,
        options: options?.map((text) => ({ text })),
        lessonNumber,
        audioText,
        audioUrl,
      });
      answerKey[id] = answer;
    };

    for (const ex of pickedVocab) {
      pushQuestion(
        "vocab",
        "Từ vựng",
        "multiple_choice",
        ex.question,
        ex.answer,
        shuffle(exerciseOptions(ex)),
        lessonById.get(ex.lessonId),
      );
    }

    for (const ex of pickedGrammar) {
      const type = toQuestionType(ex.type);
      pushQuestion(
        "grammar",
        "Ngữ pháp",
        type,
        ex.question,
        ex.answer,
        type === "multiple_choice" ? shuffle(exerciseOptions(ex)) : undefined,
        lessonById.get(ex.lessonId),
      );
    }

    for (const kq of kanjiQuestions) {
      pushQuestion(
        "kanji",
        "Kanji",
        "multiple_choice",
        kq.question,
        kq.answer,
        shuffle(kq.options),
        kq.lessonNumber,
      );
    }

    for (const lq of listeningWordQuestions) {
      pushQuestion(
        "listening",
        "Nghe",
        "listening",
        lq.question,
        lq.answer,
        shuffle(lq.options),
        lq.lessonNumber,
        lq.audioText,
      );
    }

    for (const lq of listeningSentenceQuestions) {
      pushQuestion(
        "listening",
        "Nghe",
        "listening",
        lq.question,
        lq.answer,
        shuffle(lq.options),
        lq.lessonNumber,
        lq.audioText,
      );
    }

    const examId = randomUUID();
    const session: MockExamSession = {
      examId,
      templateId: template.id,
      templateSlug: template.slug,
      level,
      title: cfg.title,
      durationMinutes: cfg.durationMinutes,
      passThreshold: cfg.passThreshold,
      startedAt: new Date().toISOString(),
      questions,
      answerKey,
    };

    await this.cacheManager.set(sessionKey(examId), session, SESSION_TTL_MS);

    return {
      examId,
      templateId: template.id,
      slug: template.slug,
      level,
      title: cfg.title,
      durationMinutes: cfg.durationMinutes,
      totalQuestions: questions.length,
      sections: this.groupBySection(questions),
      questions,
    };
  }

  async submit(
    examId: string,
    answers: Record<string, string>,
    userId?: number,
  ) {
    const session = await this.cacheManager.get<MockExamSession>(
      sessionKey(examId),
    );
    if (!session) {
      throw new RpcException({
        statusCode: 404,
        message: "Phiên thi không tồn tại hoặc đã hết hạn. Hãy bắt đầu đề mới.",
      });
    }

    const review: MockExamReviewItem[] = session.questions.map((q) => {
      const correctAnswer = session.answerKey[q.id] ?? "";
      const userAnswer = answers[q.id] ?? "";
      const isCorrect =
        normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
      return {
        ...q,
        correctAnswer,
        userAnswer,
        isCorrect,
      };
    });

    const correctCount = review.filter((r) => r.isCorrect).length;
    const total = review.length;
    const percent = total ? Math.round((correctCount / total) * 100) : 0;
    const passThreshold = session.passThreshold ?? 65;
    const passed = percent >= passThreshold;

    const sectionScores = ["vocab", "grammar", "kanji", "listening"].map(
      (sectionId) => {
        const items = review.filter((r) => r.sectionId === sectionId);
        const sectionCorrect = items.filter((r) => r.isCorrect).length;
        return {
          sectionId,
          sectionName: items[0]?.sectionName ?? sectionId,
          correct: sectionCorrect,
          total: items.length,
        };
      },
    );

    await this.cacheManager.del(sessionKey(examId));

    const submittedAt = new Date();
    let runningScore = 0;

    if (userId) {
      for (let i = 0; i < review.length; i += 1) {
        if (review[i].isCorrect) runningScore += 1;
        await this.redis.publish(
          "exam:question-scored",
          JSON.stringify({
            userId,
            examResultId: 0,
            questionIndex: i,
            correct: review[i].isCorrect,
            score: runningScore,
          }),
        );
      }
    }

    // Kết quả thi + event "đã nộp bài" ghi CÙNG một transaction (transactional outbox):
    // không còn trường hợp lưu điểm xong mà event bị mất vì Kafka lỗi / service chết giữa chừng.
    // OutboxRelayService đẩy event lên Kafka sau.
    const examResult = await this.prisma.$transaction(async (tx) => {
      const created = await tx.examResult.create({
        data: {
          userId: userId ?? null,
          examId,
          level: session.level,
          title: session.title,
          correctCount,
          total,
          percent,
          passed,
          submittedAt,
          sections: {
            create: sectionScores.map((section) => ({
              section: section.sectionId,
              correct: section.correct,
              total: section.total,
              percent: section.total
                ? Math.round((section.correct / section.total) * 100)
                : 0,
            })),
          },
        },
      });
      await tx.outboxEvent.create({
        data: {
          topic: KafkaTopics.EXAM_SUBMITTED,
          key: userId ? String(userId) : null,
          payload: {
            eventId: `exam-result-${created.id}`,
            examResultId: created.id,
            examId,
            userId: userId ?? null,
            level: session.level,
            percent,
            passed,
            correctCount,
            total,
            submittedAt: submittedAt.toISOString(),
          },
        },
      });
      return created;
    });

    if (userId) {
      await this.redis.publish(
        "exam:completed",
        JSON.stringify({
          userId,
          examResultId: examResult.id,
          totalScore: correctCount,
          passed,
          percent,
        }),
      );
    }

    return {
      examId,
      level: session.level,
      slug: session.templateSlug,
      title: session.title,
      correctCount,
      total,
      percent,
      passThreshold,
      passed,
      sectionScores,
      review,
      submittedAt: submittedAt.toISOString(),
    };
  }

  getHistory(userId: number) {
    return this.prisma.examResult.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      take: 20,
    });
  }

  getSession(examId: string) {
    return this.cacheManager.get<MockExamSession>(sessionKey(examId));
  }

  private buildKanjiQuestions(
    picked: Array<{
      character: string;
      meaningVi: string;
      onyomi: string | null;
      kunyomi: string | null;
      lesson: { lessonNumber: number };
    }>,
    pool: Array<{ character: string; meaningVi: string }>,
  ) {
    return picked.map((entry) => {
      const distractors = sample(
        pool.filter((k) => k.character !== entry.character),
        3,
      ).map((k) => k.meaningVi);

      const options = [...distractors, entry.meaningVi];
      return {
        question: `Kanji 「${entry.character}」 có nghĩa tiếng Việt là gì?`,
        answer: entry.meaningVi,
        options,
        lessonNumber: entry.lesson.lessonNumber,
      };
    });
  }

  private groupBySection(questions: MockExamQuestionPublic[]) {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const q of questions) {
      const existing = map.get(q.sectionId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(q.sectionId, {
          id: q.sectionId,
          name: q.sectionName,
          count: 1,
        });
      }
    }
    return Array.from(map.values());
  }

  private buildVocabListeningQuestions(
    picked: Array<{
      kana: string;
      meaning: string;
      lesson: { lessonNumber: number };
    }>,
    pool: Array<{ kana: string; meaning: string }>,
  ) {
    return picked.map((entry) => {
      const distractors = sample(
        pool.filter(
          (v) => v.kana !== entry.kana && v.meaning !== entry.meaning,
        ),
        3,
      ).map((v) => v.meaning);

      return {
        question: "Nghe từ vựng và chọn nghĩa tiếng Việt đúng.",
        answer: entry.meaning,
        options: [...distractors, entry.meaning],
        audioText: entry.kana,
        lessonNumber: entry.lesson.lessonNumber,
      };
    });
  }

  private buildSentenceListeningQuestions(
    picked: Array<{ jp: string; vi: string; lessonNumber: number }>,
    pool: Array<{ jp: string; vi: string }>,
  ) {
    return picked.map((entry) => {
      const distractors = sample(
        pool.filter((e) => e.jp !== entry.jp && e.vi !== entry.vi),
        3,
      ).map((e) => e.vi);

      return {
        question: "Nghe câu tiếng Nhật và chọn nghĩa tiếng Việt đúng.",
        answer: entry.vi,
        options: [...distractors, entry.vi],
        audioText: speechTextFromJapanese(entry.jp),
        lessonNumber: entry.lessonNumber,
      };
    });
  }
}
