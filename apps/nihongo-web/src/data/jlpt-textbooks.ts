/**
 * Kiểu + hàm tiện ích cho danh mục giáo trình. Dữ liệu nằm trong DB
 * (TextbookSeries / TextbookBook, seed: infra/postgres/nihongo-content-seed.sql),
 * đọc qua GET /reference/textbooks — xem hooks/useTextbookCatalog.
 */
import type { JlptMindKind, JlptMindLevel } from './jlpt-mind-map-shared';

/** Mã bộ sách = enum Textbook trong schema */
export type JlptTextbookSeries = 'MINNA' | 'SOUMATOME' | 'SHINKANZEN' | 'TRY' | 'KLL';
export const TEXTBOOK_CODES: JlptTextbookSeries[] = ['MINNA', 'SOUMATOME', 'SHINKANZEN', 'TRY', 'KLL'];

export type TextbookBookInfo = {
  level: JlptMindLevel;
  title: string;
  note?: string;
  url?: string;
  kinds: JlptMindKind[];
};

export type TextbookSeriesInfo = {
  code: JlptTextbookSeries;
  name: string;
  nameJa: string;
  publisher: string;
  url: string;
  blurb: string;
  icon: string;
  planLevels: JlptMindLevel[];
  audioMatch: string | null;
  books: TextbookBookInfo[];
};

export type TextbookCatalog = { series: TextbookSeriesInfo[] };

export function seriesInfo(catalog: TextbookCatalog | undefined, code: JlptTextbookSeries) {
  return catalog?.series.find((s) => s.code === code);
}

/** Sách của một bộ ở cấp + kỹ năng */
export function booksFor(series: TextbookSeriesInfo | undefined, level: JlptMindLevel, kind?: JlptMindKind) {
  return (series?.books ?? []).filter((b) => b.level === level && (!kind || b.kinds.includes(kind)));
}

/** Regex nhận diện mục của bộ sách trong "File nghe sách" (null nếu bộ không có audio / regex hỏng). */
export function audioRegex(series: TextbookSeriesInfo | undefined): RegExp | null {
  if (!series?.audioMatch) return null;
  try {
    return new RegExp(series.audioMatch, 'i');
  } catch {
    return null;
  }
}

/** Cấp hợp lệ gần nhất: giữ `level` nếu bộ có lộ trình cấp đó, không thì cấp đầu tiên. */
export function planLevelFor(series: TextbookSeriesInfo | undefined, level: JlptMindLevel): JlptMindLevel {
  const levels = series?.planLevels ?? [];
  return levels.includes(level) ? level : (levels[0] ?? level);
}
