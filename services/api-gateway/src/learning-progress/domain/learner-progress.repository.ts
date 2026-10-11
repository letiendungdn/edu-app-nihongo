import type { LearnerProgress, QueryCosts, StudyDay } from "./learner-progress";

export interface LearnerProgressRepository {
  findSummary(userId: number): Promise<LearnerProgress>;
  findRecentDays(userId: number, limit: number): Promise<StudyDay[]>;
  /** analyze = true chạy thật cả hai câu (EXPLAIN ANALYZE) để lấy thời gian thực thi. */
  measureCosts(userId: number, analyze: boolean): Promise<QueryCosts>;
  /** false khi pod khác đang refresh (không lấy được advisory lock). */
  refreshSummary(): Promise<boolean>;
}
