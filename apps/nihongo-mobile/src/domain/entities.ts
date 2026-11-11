import type { FuriganaSegment } from '../utils/furigana';

export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface Vocabulary {
  id: number;
  lessonNumber: number;
  kana: string;
  kanji: string | null;
  meaning: string;
  romaji: string;
  sortOrder: number;
  syncStatus: SyncStatus;
  meaningEn?: string | null;
  /** manual | jmdict | ai — "ai" thì UI ghi "dịch máy". */
  meaningEnSource?: string | null;
  hanViet?: string | null;
  /** [[chữ, cách đọc], …]; rỗng = không tách được, hiện chữ trơn. */
  furigana?: FuriganaSegment[];
}

export interface SrsCard {
  id: number;
  vocabularyId: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: number;
  mastered: boolean;
  syncStatus: SyncStatus;
  updatedAt: number;
}

export interface ReviewCard {
  card: SrsCard;
  kana: string;
  kanji: string | null;
  meaning: string;
  romaji: string;
}

export interface OverlayLabel {
  left: number;
  top: number;
  width: number;
  height: number;
  original: string;
  translated: string;
}
