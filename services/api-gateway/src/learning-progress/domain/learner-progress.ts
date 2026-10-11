/** Đường đọc tiến độ. Materialized view là bản gom sẵn, live join tính lại từ bảng chuẩn hóa. */
export type QueryPath = "materialized_view" | "live_join";

export function chooseFasterPlan(
  summaryCost: number,
  liveJoinCost: number,
): QueryPath {
  return summaryCost <= liveJoinCost ? "materialized_view" : "live_join";
}

export class ProgressViewsMissingError extends Error {
  constructor() {
    super(
      "Chưa có view tiến độ học. Chạy Flyway: docker compose up flyway (infra/flyway/sql).",
    );
    this.name = "ProgressViewsMissingError";
  }
}

export interface LearnerProgressProps {
  userId: number;
  currentStreak: number;
  longestStreak: number;
  totalSeconds: number;
  totalCards: number;
  vocabTotal: number;
  kanjiTotal: number;
}

/** Aggregate đọc. Streak dài nhất luôn ≥ streak hiện tại, mọi số đếm ≥ 0. */
export class LearnerProgress {
  readonly userId: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly totalSeconds: number;
  readonly totalCards: number;
  readonly vocabTotal: number;
  readonly kanjiTotal: number;

  private constructor(props: LearnerProgressProps) {
    this.userId = props.userId;
    this.currentStreak = props.currentStreak;
    this.longestStreak = props.longestStreak;
    this.totalSeconds = props.totalSeconds;
    this.totalCards = props.totalCards;
    this.vocabTotal = props.vocabTotal;
    this.kanjiTotal = props.kanjiTotal;
  }

  static empty(userId: number): LearnerProgress {
    return new LearnerProgress({
      userId,
      currentStreak: 0,
      longestStreak: 0,
      totalSeconds: 0,
      totalCards: 0,
      vocabTotal: 0,
      kanjiTotal: 0,
    });
  }

  static rehydrate(props: LearnerProgressProps): LearnerProgress {
    const currentStreak = Math.max(0, props.currentStreak);
    const longestStreak = Math.max(currentStreak, props.longestStreak);
    return new LearnerProgress({
      userId: props.userId,
      currentStreak,
      longestStreak,
      totalSeconds: Math.max(0, props.totalSeconds),
      totalCards: Math.max(0, props.totalCards),
      vocabTotal: Math.max(0, props.vocabTotal),
      kanjiTotal: Math.max(0, props.kanjiTotal),
    });
  }
}

export interface StudyDay {
  studyDate: string;
  seconds: number;
  cardsReviewed: number;
  vocabCount: number;
  kanjiCount: number;
}

/**
 * Cost là ước tính của planner (đơn vị tùy ý). Ms chỉ có khi chạy EXPLAIN ANALYZE,
 * là thời gian thực thi thật nên đáng tin hơn cost khi có.
 */
export interface QueryCosts {
  summaryCost: number;
  liveJoinCost: number;
  summaryMs: number | null;
  liveJoinMs: number | null;
}

export type ComparisonBasis = "execution_time" | "estimated_cost";

export interface QueryPlanComparison extends QueryCosts {
  basis: ComparisonBasis;
  faster: QueryPath;
}

export function compareQueryPlans(costs: QueryCosts): QueryPlanComparison {
  if (costs.summaryMs !== null && costs.liveJoinMs !== null) {
    return {
      ...costs,
      basis: "execution_time",
      faster: chooseFasterPlan(costs.summaryMs, costs.liveJoinMs),
    };
  }
  return {
    ...costs,
    basis: "estimated_cost",
    faster: chooseFasterPlan(costs.summaryCost, costs.liveJoinCost),
  };
}
