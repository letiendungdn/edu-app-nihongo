import { Controller, Logger, OnModuleInit } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { GrpcMethod } from "@nestjs/microservices";
import {
  EXAM_PATTERNS,
  LogActivityDto,
  LogListeningDto,
  PROGRESS_PATTERNS,
  SrsAddLessonDto,
  SrsReviewDto,
  SyncReviewDto,
  UpsertDailyNoteDto,
  UpsertDailyGoalsDto,
  CreateMockExamTemplateDto,
  UpdateMockExamTemplateDto,
  CreateMockExamQuestionDto,
  UpdateMockExamQuestionDto,
  ReorderMockExamQuestionsDto,
} from "@app/contracts";
import { handleGrpcDispatch, type PatternHandler } from "@app/common";
import { MockExamsService } from "./modules/mock-exams/mock-exams.service";
import { ProgressService } from "./modules/progress/progress.service";
import { SubmitExamCommand } from "./modules/mock-exams/commands/submit-exam.command";
import { GetResultsQuery } from "./modules/mock-exams/queries/get-results.query";

@Controller()
export class ExamMsController implements OnModuleInit {
  private readonly logger = new Logger(ExamMsController.name);
  private routes!: Record<string, PatternHandler>;

  constructor(
    private readonly mockExamsService: MockExamsService,
    private readonly progressService: ProgressService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  onModuleInit() {
    this.routes = {
      [EXAM_PATTERNS.LIST_TEMPLATES]: () => this.listTemplates(),
      [EXAM_PATTERNS.LIST_TEMPLATES_ADMIN]: () => this.listTemplatesAdmin(),
      [EXAM_PATTERNS.GET_TEMPLATE]: (data) =>
        this.getTemplate(data as { id: number }),
      [EXAM_PATTERNS.CREATE_TEMPLATE]: (data) =>
        this.createTemplate(data as CreateMockExamTemplateDto),
      [EXAM_PATTERNS.UPDATE_TEMPLATE]: (data) =>
        this.updateTemplate(
          data as { id: number; dto: UpdateMockExamTemplateDto },
        ),
      [EXAM_PATTERNS.DELETE_TEMPLATE]: (data) =>
        this.deleteTemplate(data as { id: number }),
      [EXAM_PATTERNS.LIST_QUESTIONS]: (data) =>
        this.listQuestions(data as { templateId: number }),
      [EXAM_PATTERNS.CREATE_QUESTION]: (data) =>
        this.createQuestion(
          data as { templateId: number; dto: CreateMockExamQuestionDto },
        ),
      [EXAM_PATTERNS.UPDATE_QUESTION]: (data) =>
        this.updateQuestion(
          data as {
            templateId: number;
            questionId: number;
            dto: UpdateMockExamQuestionDto;
          },
        ),
      [EXAM_PATTERNS.DELETE_QUESTION]: (data) =>
        this.deleteQuestion(data as { templateId: number; questionId: number }),
      [EXAM_PATTERNS.REORDER_QUESTIONS]: (data) =>
        this.reorderQuestions(
          data as { templateId: number; dto: ReorderMockExamQuestionsDto },
        ),
      [EXAM_PATTERNS.START_EXAM]: (data) =>
        this.startExam(data as { key: string }),
      [EXAM_PATTERNS.SUBMIT_EXAM]: (data) =>
        this.submitExam(
          data as {
            examId: string;
            answers: Record<string, string>;
            userId?: number;
          },
        ),
      [EXAM_PATTERNS.GET_HISTORY]: (data) =>
        this.getHistory(data as { userId: number }),
      [PROGRESS_PATTERNS.SYNC_REVIEW]: (data) =>
        this.syncReview(data as { userId: number; dto: SyncReviewDto }),
      [PROGRESS_PATTERNS.GET_REVIEW_BANK]: (data) =>
        this.getReviewBank(data as { userId: number }),
      [PROGRESS_PATTERNS.LOG_LISTENING]: (data) =>
        this.logListening(data as { userId: number; dto: LogListeningDto }),
      [PROGRESS_PATTERNS.GET_LISTENING_LOGS]: (data) =>
        this.getListeningLogs(data as { userId: number }),
      [PROGRESS_PATTERNS.GET_ANALYTICS]: (data) =>
        this.getAnalytics(data as { userId: number }),
      [PROGRESS_PATTERNS.UPSERT_DAILY_NOTE]: (data) =>
        this.upsertDailyNote(
          data as { userId: number; dto: UpsertDailyNoteDto },
        ),
      [PROGRESS_PATTERNS.GET_DAILY_NOTES]: (data) =>
        this.getDailyNotes(data as { userId: number; limit?: number }),
      [PROGRESS_PATTERNS.UPSERT_DAILY_GOALS]: (data) =>
        this.upsertDailyGoals(
          data as { userId: number; dto: UpsertDailyGoalsDto },
        ),
      [PROGRESS_PATTERNS.GET_DAILY_GOALS]: (data) =>
        this.getDailyGoals(data as { userId: number; limit?: number }),
      [PROGRESS_PATTERNS.SRS_GET_DUE]: (data) =>
        this.getSrsDue(data as { userId: number; limit?: number }),
      [PROGRESS_PATTERNS.SRS_SUBMIT_REVIEW]: (data) =>
        this.submitSrsReview(data as { userId: number; dto: SrsReviewDto }),
      [PROGRESS_PATTERNS.SRS_GET_STATS]: (data) =>
        this.getSrsStats(data as { userId: number }),
      [PROGRESS_PATTERNS.SRS_ADD_LESSON]: (data) =>
        this.addLessonToSrs(data as { userId: number; dto: SrsAddLessonDto }),
      [PROGRESS_PATTERNS.LOG_ACTIVITY]: (data) =>
        this.logActivity(data as { userId: number; dto: LogActivityDto }),
      [PROGRESS_PATTERNS.GET_TODAY]: (data) =>
        this.getTodayActivity(data as { userId: number }),
    };
  }

  @GrpcMethod("ExamService", "Dispatch")
  dispatch(data: { pattern: string; payload: string }) {
    return handleGrpcDispatch(this.routes, data);
  }

  listTemplates() {
    return this.mockExamsService.listTemplates();
  }

  listTemplatesAdmin() {
    return this.mockExamsService.listTemplatesAdmin();
  }

  getTemplate(data: { id: number }) {
    return this.mockExamsService.getTemplate(data.id);
  }

  createTemplate(dto: CreateMockExamTemplateDto) {
    return this.mockExamsService.createTemplate(dto);
  }

  updateTemplate(data: { id: number; dto: UpdateMockExamTemplateDto }) {
    return this.mockExamsService.updateTemplate(data.id, data.dto);
  }

  deleteTemplate(data: { id: number }) {
    return this.mockExamsService.deleteTemplate(data.id);
  }

  listQuestions(data: { templateId: number }) {
    return this.mockExamsService.listQuestions(data.templateId);
  }

  createQuestion(data: { templateId: number; dto: CreateMockExamQuestionDto }) {
    return this.mockExamsService.createQuestion(data.templateId, data.dto);
  }

  updateQuestion(data: {
    templateId: number;
    questionId: number;
    dto: UpdateMockExamQuestionDto;
  }) {
    return this.mockExamsService.updateQuestion(
      data.templateId,
      data.questionId,
      data.dto,
    );
  }

  deleteQuestion(data: { templateId: number; questionId: number }) {
    return this.mockExamsService.deleteQuestion(
      data.templateId,
      data.questionId,
    );
  }

  reorderQuestions(data: {
    templateId: number;
    dto: ReorderMockExamQuestionsDto;
  }) {
    return this.mockExamsService.reorderQuestions(
      data.templateId,
      data.dto.orderedIds,
    );
  }

  startExam(data: { key: string }) {
    return this.mockExamsService.start(data.key);
  }

  async submitExam(data: {
    examId: string;
    answers: Record<string, string>;
    userId?: number;
  }) {
    type SubmitExamResult = Awaited<ReturnType<MockExamsService["submit"]>>;
    const result = await this.commandBus.execute<
      SubmitExamCommand,
      SubmitExamResult
    >(new SubmitExamCommand(data.examId, data.answers, data.userId));
    this.logger.log(
      `Exam submitted: examId=${data.examId} userId=${data.userId ?? "guest"} level=${result.level} percent=${result.percent}% passed=${result.passed}`,
    );
    return result;
  }

  getHistory(data: { userId: number }) {
    return this.queryBus.execute(new GetResultsQuery(data.userId));
  }

  syncReview(data: { userId: number; dto: SyncReviewDto }) {
    return this.progressService.syncReviewBank(data.userId, data.dto);
  }

  getReviewBank(data: { userId: number }) {
    return this.progressService.getReviewBank(data.userId);
  }

  logListening(data: { userId: number; dto: LogListeningDto }) {
    return this.progressService.logListening(data.userId, data.dto);
  }

  getListeningLogs(data: { userId: number }) {
    return this.progressService.getListeningHistory(data.userId);
  }

  getAnalytics(data: { userId: number }) {
    return this.progressService.getAnalytics(data.userId);
  }

  upsertDailyNote(data: { userId: number; dto: UpsertDailyNoteDto }) {
    return this.progressService.upsertDailyNote(data.userId, data.dto);
  }

  getDailyNotes(data: { userId: number; limit?: number }) {
    return this.progressService.listDailyNotes(data.userId, data.limit);
  }

  upsertDailyGoals(data: { userId: number; dto: UpsertDailyGoalsDto }) {
    return this.progressService.upsertDailyGoals(data.userId, data.dto);
  }

  getDailyGoals(data: { userId: number; limit?: number }) {
    return this.progressService.listDailyGoals(data.userId, data.limit);
  }

  getSrsDue(data: { userId: number; limit?: number }) {
    return this.progressService.getSrsDueCards(data.userId, data.limit);
  }

  submitSrsReview(data: { userId: number; dto: SrsReviewDto }) {
    return this.progressService.submitSrsReview(data.userId, data.dto);
  }

  getSrsStats(data: { userId: number }) {
    return this.progressService.getSrsStats(data.userId);
  }

  addLessonToSrs(data: { userId: number; dto: SrsAddLessonDto }) {
    return this.progressService.addLessonToSrs(data.userId, data.dto);
  }

  logActivity(data: { userId: number; dto: LogActivityDto }) {
    return this.progressService.logActivity(data.userId, data.dto);
  }

  getTodayActivity(data: { userId: number }) {
    return this.progressService.getTodayActivity(data.userId);
  }
}
