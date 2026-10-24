import { Controller, OnModuleInit } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import {
  CONTENT_PATTERNS,
  CreateExerciseDto,
  CreateGrammarDto,
  CreateKanjiVocabDto,
  CreateKanjiEntryDto,
  CreateLessonDto,
  CreateVocabularyDto,
  CreateVocabSuffixGroupDto,
  CreateVocabSuffixItemDto,
  UpdateVocabSuffixGroupDto,
  UpdateVocabSuffixItemDto,
  ReorderVocabSuffixItemsDto,
  UpdateExerciseDto,
  UpdateGrammarDto,
  UpdateKanjiVocabDto,
  UpdateKanjiEntryDto,
  UpdateLessonDto,
  UpdateVocabularyDto,
} from "@app/contracts";
import { handleGrpcDispatch, type PatternHandler } from "@app/common";
import { LessonsService } from "./modules/lessons/lessons.service";
import { VocabulariesService } from "./modules/vocabularies/vocabularies.service";
import { GrammarsService } from "./modules/grammars/grammars.service";
import { ExercisesService } from "./modules/exercises/exercises.service";
import { KanjiService } from "./modules/kanji/kanji.service";
import { ListeningService } from "./modules/listening/listening.service";
import { ImportService } from "./modules/import/import.service";
import { ReferenceService } from "./modules/reference/reference.service";
import { VocabSuffixesService } from "./modules/reference/vocab-suffixes.service";
import { ReadingService } from "./modules/reading/reading.service";

@Controller()
export class ContentMsController implements OnModuleInit {
  private routes!: Record<string, PatternHandler>;

  constructor(
    private readonly lessonsService: LessonsService,
    private readonly vocabulariesService: VocabulariesService,
    private readonly grammarsService: GrammarsService,
    private readonly exercisesService: ExercisesService,
    private readonly kanjiService: KanjiService,
    private readonly listeningService: ListeningService,
    private readonly importService: ImportService,
    private readonly referenceService: ReferenceService,
    private readonly vocabSuffixesService: VocabSuffixesService,
    private readonly readingService: ReadingService,
  ) {}

  onModuleInit() {
    this.routes = {
      [CONTENT_PATTERNS.GET_LESSONS]: (data) =>
        this.getLessons(
          data as {
            has?: "grammar" | "vocab";
            jlptLevel?: string;
            query?: string;
          },
        ),
      [CONTENT_PATTERNS.GET_LESSON]: (data) =>
        this.getLesson(data as { lessonNumber: number }),
      [CONTENT_PATTERNS.CREATE_LESSON]: (dto) =>
        this.createLesson(dto as CreateLessonDto),
      [CONTENT_PATTERNS.UPDATE_LESSON]: (data) =>
        this.updateLesson(data as { id: number; dto: UpdateLessonDto }),
      [CONTENT_PATTERNS.DELETE_LESSON]: (data) =>
        this.deleteLesson(data as { id: number }),
      [CONTENT_PATTERNS.GET_VOCABULARIES]: (data) =>
        this.getVocabularies(
          data as {
            lessonNumber?: number;
            page?: number;
            limit?: number;
            jlptLevel?: string;
            query?: string;
            script?: string;
          },
        ),
      [CONTENT_PATTERNS.GET_VOCABULARY]: (data) =>
        this.getVocabulary(data as { id: number }),
      [CONTENT_PATTERNS.CREATE_VOCABULARY]: (dto) =>
        this.createVocabulary(dto as CreateVocabularyDto),
      [CONTENT_PATTERNS.UPDATE_VOCABULARY]: (data) =>
        this.updateVocabulary(data as { id: number; dto: UpdateVocabularyDto }),
      [CONTENT_PATTERNS.DELETE_VOCABULARY]: (data) =>
        this.deleteVocabulary(data as { id: number }),
      [CONTENT_PATTERNS.REORDER_VOCABULARY]: (data) =>
        this.reorderVocabulary(
          data as { lessonId: number; orderedIds: number[] },
        ),
      [CONTENT_PATTERNS.GET_GRAMMARS]: (data) =>
        this.getGrammars(
          data as {
            lessonNumber?: number;
            page?: number;
            limit?: number;
            jlptLevel?: string;
            query?: string;
          },
        ),
      [CONTENT_PATTERNS.GET_GRAMMAR]: (data) =>
        this.getGrammar(data as { id: number }),
      [CONTENT_PATTERNS.CREATE_GRAMMAR]: (dto) =>
        this.createGrammar(dto as CreateGrammarDto),
      [CONTENT_PATTERNS.UPDATE_GRAMMAR]: (data) =>
        this.updateGrammar(data as { id: number; dto: UpdateGrammarDto }),
      [CONTENT_PATTERNS.DELETE_GRAMMAR]: (data) =>
        this.deleteGrammar(data as { id: number }),
      [CONTENT_PATTERNS.GET_EXERCISES]: (data) =>
        this.getExercises(
          data as {
            lessonNumber?: number;
            jlptLevel?: string;
            query?: string;
            page?: number;
            limit?: number;
          },
        ),
      [CONTENT_PATTERNS.GET_EXERCISE]: (data) =>
        this.getExercise(data as { id: number }),
      [CONTENT_PATTERNS.CREATE_EXERCISE]: (dto) =>
        this.createExercise(dto as CreateExerciseDto),
      [CONTENT_PATTERNS.UPDATE_EXERCISE]: (data) =>
        this.updateExercise(data as { id: number; dto: UpdateExerciseDto }),
      [CONTENT_PATTERNS.DELETE_EXERCISE]: (data) =>
        this.deleteExercise(data as { id: number }),
      [CONTENT_PATTERNS.GET_KANJI_LESSONS]: () => this.getKanjiLessons(),
      [CONTENT_PATTERNS.CREATE_KANJI_LESSON]: (dto) =>
        this.createKanjiLesson(
          dto as {
            lessonNumber: number;
            title?: string;
            jlptLevel?: string;
            sortOrder?: number;
          },
        ),
      [CONTENT_PATTERNS.UPDATE_KANJI_LESSON]: (data) =>
        this.updateKanjiLesson(
          data as {
            id: number;
            dto: {
              lessonNumber?: number;
              title?: string;
              jlptLevel?: string;
              sortOrder?: number;
            };
          },
        ),
      [CONTENT_PATTERNS.DELETE_KANJI_LESSON]: (data) =>
        this.deleteKanjiLesson(data as { id: number }),
      [CONTENT_PATTERNS.GET_KANJI_ENTRIES]: (data) =>
        this.getKanjiEntries(
          data as { lessonNumber?: number; query?: string; jlptLevel?: string },
        ),
      [CONTENT_PATTERNS.GET_KANJI_ENTRY]: (data) =>
        this.getKanjiEntry(data as { id: number }),
      [CONTENT_PATTERNS.CREATE_KANJI_ENTRY]: (dto) =>
        this.createKanjiEntry(dto as CreateKanjiEntryDto),
      [CONTENT_PATTERNS.UPDATE_KANJI_ENTRY]: (data) =>
        this.updateKanjiEntry(data as { id: number; dto: UpdateKanjiEntryDto }),
      [CONTENT_PATTERNS.DELETE_KANJI_ENTRY]: (data) =>
        this.deleteKanjiEntry(data as { id: number }),
      [CONTENT_PATTERNS.CREATE_KANJI_VOCAB]: (data) =>
        this.createKanjiVocab(
          data as { kanjiEntryId: number; dto: CreateKanjiVocabDto },
        ),
      [CONTENT_PATTERNS.UPDATE_KANJI_VOCAB]: (data) =>
        this.updateKanjiVocab(data as { id: number; dto: UpdateKanjiVocabDto }),
      [CONTENT_PATTERNS.DELETE_KANJI_VOCAB]: (data) =>
        this.deleteKanjiVocab(data as { id: number }),
      [CONTENT_PATTERNS.REORDER_KANJI_VOCAB]: (data) =>
        this.reorderKanjiVocab(
          data as { kanjiEntryId: number; orderedIds: number[] },
        ),
      [CONTENT_PATTERNS.GET_LISTENING_PLAYLIST]: (data) =>
        this.getListeningPlaylist(
          data as {
            lessonFrom: number;
            lessonTo: number;
            limit: number;
            jlptLevel?: "N5" | "N4" | "N3" | "N2" | "N1";
          },
        ),
      [CONTENT_PATTERNS.IMPORT_VOCAB]: (data) =>
        this.importVocab(data as { lessonNumber: number; text: string }),
      [CONTENT_PATTERNS.GET_REFERENCE_LIST]: () => this.getReferenceList(),
      [CONTENT_PATTERNS.GET_REFERENCE]: (data) =>
        this.getReference(data as { slug: string }),
      [CONTENT_PATTERNS.GET_VOCAB_SUFFIXES]: () => this.getVocabSuffixes(),
      [CONTENT_PATTERNS.CREATE_VOCAB_SUFFIX_GROUP]: (dto) =>
        this.createVocabSuffixGroup(dto as CreateVocabSuffixGroupDto),
      [CONTENT_PATTERNS.UPDATE_VOCAB_SUFFIX_GROUP]: (data) =>
        this.updateVocabSuffixGroup(
          data as { slug: string; dto: UpdateVocabSuffixGroupDto },
        ),
      [CONTENT_PATTERNS.DELETE_VOCAB_SUFFIX_GROUP]: (data) =>
        this.deleteVocabSuffixGroup(data as { slug: string }),
      [CONTENT_PATTERNS.CREATE_VOCAB_SUFFIX_ITEM]: (dto) =>
        this.createVocabSuffixItem(dto as CreateVocabSuffixItemDto),
      [CONTENT_PATTERNS.UPDATE_VOCAB_SUFFIX_ITEM]: (data) =>
        this.updateVocabSuffixItem(
          data as { id: number; dto: UpdateVocabSuffixItemDto },
        ),
      [CONTENT_PATTERNS.DELETE_VOCAB_SUFFIX_ITEM]: (data) =>
        this.deleteVocabSuffixItem(data as { id: number }),
      [CONTENT_PATTERNS.REORDER_VOCAB_SUFFIX_ITEMS]: (dto) =>
        this.reorderVocabSuffixItems(dto as ReorderVocabSuffixItemsDto),
      [CONTENT_PATTERNS.GET_READING_PASSAGES]: (data) =>
        this.getReadingPassages(data as { jlptLevel?: string }),
      [CONTENT_PATTERNS.GET_READING_PASSAGE]: (data) =>
        this.getReadingPassage(data as { id: number }),
      [CONTENT_PATTERNS.SUBMIT_READING]: (data) =>
        this.submitReading(
          data as {
            passageId: number;
            answers: Record<string, string>;
            userId?: number;
          },
        ),
      [CONTENT_PATTERNS.CREATE_READING_PASSAGE]: (dto) =>
        this.createReadingPassage(
          dto as {
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
          },
        ),
      [CONTENT_PATTERNS.UPDATE_READING_PASSAGE]: (data) =>
        this.updateReadingPassage(
          data as {
            id: number;
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
            };
          },
        ),
      [CONTENT_PATTERNS.DELETE_READING_PASSAGE]: (data) =>
        this.deleteReadingPassage(data as { id: number }),
    };
  }

  @GrpcMethod("ContentService", "Dispatch")
  dispatch(data: { pattern: string; payload: string }) {
    return handleGrpcDispatch(this.routes, data);
  }

  getLessons(data?: {
    has?: "grammar" | "vocab";
    jlptLevel?: string;
    query?: string;
  }) {
    return this.lessonsService.findAll(data);
  }

  getLesson(data: { lessonNumber: number }) {
    return this.lessonsService.findOne(data.lessonNumber);
  }

  createLesson(dto: CreateLessonDto) {
    return this.lessonsService.create(dto);
  }

  updateLesson(data: { id: number; dto: UpdateLessonDto }) {
    return this.lessonsService.update(data.id, data.dto);
  }

  deleteLesson(data: { id: number }) {
    return this.lessonsService.remove(data.id);
  }

  getVocabularies(data: {
    lessonNumber?: number;
    page?: number;
    limit?: number;
    jlptLevel?: string;
    query?: string;
    script?: string;
  }) {
    return this.vocabulariesService.findAll(
      data.lessonNumber,
      data.page,
      data.limit,
      data.jlptLevel,
      data.query,
      data.script,
    );
  }

  getVocabulary(data: { id: number }) {
    return this.vocabulariesService.findOne(data.id);
  }

  createVocabulary(dto: CreateVocabularyDto) {
    return this.vocabulariesService.create(dto);
  }

  updateVocabulary(data: { id: number; dto: UpdateVocabularyDto }) {
    return this.vocabulariesService.update(data.id, data.dto);
  }

  deleteVocabulary(data: { id: number }) {
    return this.vocabulariesService.remove(data.id);
  }

  reorderVocabulary(data: { lessonId: number; orderedIds: number[] }) {
    return this.vocabulariesService.reorder(data.lessonId, data.orderedIds);
  }

  getGrammars(data: {
    lessonNumber?: number;
    page?: number;
    limit?: number;
    jlptLevel?: string;
    query?: string;
  }) {
    return this.grammarsService.findAll(
      data.lessonNumber,
      data.page,
      data.limit,
      data.jlptLevel,
      data.query,
    );
  }

  getGrammar(data: { id: number }) {
    return this.grammarsService.findOne(data.id);
  }

  createGrammar(dto: CreateGrammarDto) {
    return this.grammarsService.create(dto);
  }

  updateGrammar(data: { id: number; dto: UpdateGrammarDto }) {
    return this.grammarsService.update(data.id, data.dto);
  }

  deleteGrammar(data: { id: number }) {
    return this.grammarsService.remove(data.id);
  }

  getExercises(data: {
    lessonNumber?: number;
    jlptLevel?: string;
    query?: string;
    page?: number;
    limit?: number;
  }) {
    return this.exercisesService.findAll(data);
  }

  getExercise(data: { id: number }) {
    return this.exercisesService.findOne(data.id);
  }

  createExercise(dto: CreateExerciseDto) {
    return this.exercisesService.create(dto);
  }

  updateExercise(data: { id: number; dto: UpdateExerciseDto }) {
    return this.exercisesService.update(data.id, data.dto);
  }

  deleteExercise(data: { id: number }) {
    return this.exercisesService.remove(data.id);
  }

  getKanjiLessons() {
    return this.kanjiService.findAllLessons();
  }

  createKanjiLesson(dto: {
    lessonNumber: number;
    title?: string;
    jlptLevel?: string;
    sortOrder?: number;
  }) {
    return this.kanjiService.createLesson(dto);
  }

  updateKanjiLesson(data: {
    id: number;
    dto: {
      lessonNumber?: number;
      title?: string;
      jlptLevel?: string;
      sortOrder?: number;
    };
  }) {
    return this.kanjiService.updateLesson(data.id, data.dto);
  }

  deleteKanjiLesson(data: { id: number }) {
    return this.kanjiService.removeLesson(data.id);
  }

  getKanjiEntries(data: {
    lessonNumber?: number;
    query?: string;
    jlptLevel?: string;
  }) {
    return this.kanjiService.findEntries(
      data.lessonNumber,
      data.query,
      data.jlptLevel,
    );
  }

  getKanjiEntry(data: { id: number }) {
    return this.kanjiService.findOne(data.id);
  }

  createKanjiEntry(dto: CreateKanjiEntryDto) {
    return this.kanjiService.createEntry(dto);
  }

  updateKanjiEntry(data: { id: number; dto: UpdateKanjiEntryDto }) {
    return this.kanjiService.updateEntry(data.id, data.dto);
  }

  deleteKanjiEntry(data: { id: number }) {
    return this.kanjiService.removeEntry(data.id);
  }

  createKanjiVocab(data: { kanjiEntryId: number; dto: CreateKanjiVocabDto }) {
    return this.kanjiService.createVocab(data.kanjiEntryId, data.dto);
  }

  updateKanjiVocab(data: { id: number; dto: UpdateKanjiVocabDto }) {
    return this.kanjiService.updateVocab(data.id, data.dto);
  }

  deleteKanjiVocab(data: { id: number }) {
    return this.kanjiService.removeVocab(data.id);
  }

  reorderKanjiVocab(data: { kanjiEntryId: number; orderedIds: number[] }) {
    return this.kanjiService.reorderVocab(data.kanjiEntryId, data.orderedIds);
  }

  getListeningPlaylist(data: {
    lessonFrom: number;
    lessonTo: number;
    limit: number;
    jlptLevel?: "N5" | "N4" | "N3" | "N2" | "N1";
  }) {
    return this.listeningService.getPlaylist(
      data.lessonFrom,
      data.lessonTo,
      data.limit,
      data.jlptLevel,
    );
  }

  importVocab(data: { lessonNumber: number; text: string }) {
    return this.importService.importVocabFromText(data.lessonNumber, data.text);
  }

  getReferenceList() {
    return this.referenceService.findAll();
  }

  getReference(data: { slug: string }) {
    return this.referenceService.findBySlug(data.slug);
  }

  getVocabSuffixes() {
    return this.vocabSuffixesService.findAll();
  }

  createVocabSuffixGroup(dto: CreateVocabSuffixGroupDto) {
    return this.vocabSuffixesService.createGroup(dto);
  }

  updateVocabSuffixGroup(data: {
    slug: string;
    dto: UpdateVocabSuffixGroupDto;
  }) {
    return this.vocabSuffixesService.updateGroup(data.slug, data.dto);
  }

  deleteVocabSuffixGroup(data: { slug: string }) {
    return this.vocabSuffixesService.removeGroup(data.slug);
  }

  createVocabSuffixItem(dto: CreateVocabSuffixItemDto) {
    return this.vocabSuffixesService.createItem(dto);
  }

  updateVocabSuffixItem(data: { id: number; dto: UpdateVocabSuffixItemDto }) {
    return this.vocabSuffixesService.updateItem(data.id, data.dto);
  }

  deleteVocabSuffixItem(data: { id: number }) {
    return this.vocabSuffixesService.removeItem(data.id);
  }

  reorderVocabSuffixItems(dto: ReorderVocabSuffixItemsDto) {
    return this.vocabSuffixesService.reorderItems(
      dto.groupSlug,
      dto.orderedIds,
    );
  }

  getReadingPassages(data: { jlptLevel?: string }) {
    return this.readingService.findAll(data.jlptLevel);
  }

  getReadingPassage(data: { id: number }) {
    return this.readingService.findOne(data.id);
  }

  submitReading(data: {
    passageId: number;
    answers: Record<string, string>;
    userId?: number;
  }) {
    return this.readingService.submit(
      data.passageId,
      data.answers,
      data.userId,
    );
  }

  createReadingPassage(dto: {
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
    return this.readingService.create(dto);
  }

  updateReadingPassage(data: {
    id: number;
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
    };
  }) {
    return this.readingService.update(data.id, data.dto);
  }

  deleteReadingPassage(data: { id: number }) {
    return this.readingService.remove(data.id);
  }
}
