/**
 * Bảng nào thuộc service nào (docs/adr/0010-shared-database-ownership.md).
 *
 * Mọi service dùng CHUNG database `nihongo`. Để vẫn tách được về sau, mỗi bảng có đúng một service
 * được GHI (create/update/upsert/delete). Service khác muốn thay đổi dữ liệu đó phải gọi service chủ
 * qua gRPC. Đọc chéo vẫn tạm chấp nhận. Test `table-ownership.spec.ts` quét code và báo lỗi khi vi phạm.
 *
 * Bảng không có trong hai danh sách dưới thuộc api-gateway (gồm cả code payment-service chạy trong gateway).
 */
export type TableOwner = 'api-gateway' | 'content-service' | 'exam-service';

export const CONTENT_SERVICE_TABLES = [
  'Lesson',
  'Vocabulary',
  'Example',
  'Grammar',
  'Exercise',
  'ExerciseOption',
  'KanjiLesson',
  'KanjiEntry',
  'KanjiVocab',
  'ReadingPassage',
  'ReadingQuestion',
  'ReadingAttempt',
  'VocabSuffixGroup',
  'VocabSuffixItem',
] as const;

export const EXAM_SERVICE_TABLES = [
  'MockExamTemplate',
  'MockExamQuestion',
  'MockExamQuestionOption',
  'ExamResult',
  'SrsCard',
  'DailyActivity',
  'DailyGoal',
  'DailyGoalItem',
  'DailyNote',
  'ListeningLog',
  'StudyStreak',
  'ProcessedEvent',
] as const;

/**
 * Bảng hạ tầng dùng chung có chủ ý: mỗi service chỉ ghi dòng của chính nó.
 * OutboxEvent: gateway (payment) và exam ghi sự kiện của mình; relay ở exam-service đẩy lên Kafka.
 * CronRun: claimCronRun() — mỗi pod/service giành lượt cron của mình.
 */
export const SHARED_INFRA_TABLES = ['OutboxEvent', 'CronRun'] as const;

export function tableOwner(model: string): TableOwner | 'shared' {
  if ((SHARED_INFRA_TABLES as readonly string[]).includes(model)) return 'shared';
  if ((CONTENT_SERVICE_TABLES as readonly string[]).includes(model)) return 'content-service';
  if ((EXAM_SERVICE_TABLES as readonly string[]).includes(model)) return 'exam-service';
  return 'api-gateway';
}
