import type { Lesson } from '../types/api';

export type LessonGroup = {
  key: string;
  label: string;
  items: Lesson[];
};

/** Bài "Từ vựng bổ sung" theo chủ đề: N1 51xxx … N5 55xxx (lessonNumber lưu trong DB). */
export const isSupplementaryTopicLesson = (n: number) => n >= 51000 && n <= 55999;

/** Nhóm bài như dropdown LessonSelector: Minna 1–50, JLPT, từ vựng bổ sung theo chủ đề, rồi sách luyện thi. */
export function groupLessons(lessons: Lesson[]): LessonGroup[] {
  const isMinna = (n: number) => n >= 1 && n <= 50;
  const byNumber = (a: Lesson, b: Lesson) => a.lessonNumber - b.lessonNumber;

  const BOOKS: Array<{ code: string; name: string }> = [
    { code: 'SOUMATOME', name: 'Sou Matome' },
    { code: 'SHINKANZEN', name: 'Shinkanzen' },
    { code: 'TRY', name: 'TRY!' },
  ];
  const isBook = (l: Lesson) => BOOKS.some((b) => b.code === l.textbook);

  const minna = lessons.filter((l) => isMinna(l.lessonNumber)).sort(byNumber);
  const rest = lessons.filter(
    (l) => !isMinna(l.lessonNumber) && !isBook(l) && !isSupplementaryTopicLesson(l.lessonNumber),
  );
  const bookGroups = BOOKS.flatMap((b) =>
    ['N5', 'N4', 'N3', 'N2', 'N1'].map((lv) => ({
      key: `${b.code}-${lv}`,
      label: `${b.name} ${lv}`,
      items: lessons
        .filter((l) => l.textbook === b.code && l.jlptLevel === lv)
        .sort(byNumber),
    })),
  ).filter((g) => g.items.length > 0);

  const order: Array<{ key: string; label: string; levels: string[] }> = [
    { key: 'n5', label: 'JLPT N5', levels: ['N5', ''] },
    { key: 'n4', label: 'JLPT N4', levels: ['N4'] },
    { key: 'n3', label: 'JLPT N3', levels: ['N3'] },
    { key: 'n2', label: 'JLPT N2', levels: ['N2'] },
    { key: 'n1', label: 'JLPT N1', levels: ['N1'] },
  ];

  const levelGroups = order
    .map((g) => ({
      key: g.key,
      label: g.label,
      items: rest
        .filter((l) => g.levels.includes(l.jlptLevel ?? ''))
        .sort(byNumber),
    }))
    .filter((g) => g.items.length > 0);

  const supplementaryGroups = order
    .map((g) => ({
      key: `${g.key}-supplementary`,
      label: `${g.label} · Từ vựng bổ sung theo chủ đề`,
      items: lessons
        .filter((l) => isSupplementaryTopicLesson(l.lessonNumber) && g.levels.includes(l.jlptLevel ?? ''))
        .sort(byNumber),
    }))
    .filter((g) => g.items.length > 0);

  return [
    ...(minna.length
      ? [{ key: 'minna', label: 'Minna no Nihongo (bài 1–50)', items: minna }]
      : []),
    ...levelGroups,
    ...supplementaryGroups,
    ...bookGroups,
  ];
}
