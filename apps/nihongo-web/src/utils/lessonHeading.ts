import type { Lesson } from '../types/api';

const BOOK_NAMES: Record<string, string> = {
  SOUMATOME: 'Sou Matome',
  SHINKANZEN: 'Shinkanzen',
  TRY: 'TRY!',
};

/**
 * Tiêu đề trang Ngữ pháp / Từ vựng theo giáo trình của bài đang mở:
 * Minna (bài 1–50) · sách luyện thi (Sou Matome / Shinkanzen / TRY!) · JLPT chung.
 */
export function lessonHeading(kind: 'grammar' | 'vocab', lesson: Lesson | undefined): string {
  const what = kind === 'grammar' ? 'Ngữ pháp' : 'Từ vựng';
  if (!lesson) return `${what} Minna no Nihongo`;
  const level = lesson.jlptLevel ?? '';
  const book = lesson.textbook ? BOOK_NAMES[lesson.textbook] : undefined;
  if (book) return `${what} ${book} ${level}`.trim();
  if (lesson.textbook === 'MINNA' || lesson.lessonNumber <= 50) return `${what} Minna no Nihongo`;
  return `${what} JLPT ${level}`.trim();
}

/** Nhãn ngắn cho biết một từ nằm ở bài nào (kết quả tra từ). Tiêu đề bài sách/JLPT đã có tên sách. */
export function lessonShortLabel(lesson: {
  lessonNumber: number;
  title?: string | null;
  textbook?: string | null;
}): string {
  if (lesson.textbook === 'MINNA') return `Minna · Bài ${lesson.lessonNumber}`;
  return lesson.title?.trim() || `Bài ${lesson.lessonNumber}`;
}

/** Tách tiêu đề thành phần đầu ("Ngữ pháp" / "Từ vựng") và tên giáo trình để tô màu riêng. */
export function splitLessonHeading(title: string): { lead: string; rest: string } {
  const m = title.match(/^(Ngữ pháp|Từ vựng)\s+(.+)$/i);
  return m ? { lead: m[1], rest: m[2] } : { lead: title, rest: '' };
}
