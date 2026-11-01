import { describe, expect, it } from 'vitest';
import { groupKanjiLessons } from '../../views/KanjiLessonPickerView';
import type { KanjiLesson } from '../../types/api';

const lesson = (lessonNumber: number, textbook: string | null, jlptLevel: string | null): KanjiLesson => ({
  id: lessonNumber,
  lessonNumber,
  title: `Bài ${lessonNumber}`,
  jlptLevel,
  textbook,
});

describe('groupKanjiLessons', () => {
  it('groups by textbook then level, KLL first and N5 before N1', () => {
    const groups = groupKanjiLessons([
      lesson(300, null, 'N1'),
      lesson(200, 'SOUMATOME', 'N4'),
      lesson(11, 'KLL', 'N4'),
      lesson(1, 'KLL', 'N5'),
      lesson(201, 'SOUMATOME', 'N5'),
      lesson(2, 'KLL', 'N5'),
      lesson(60001, 'MINNA', 'N5'),
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      'Kanji Look and Learn · N5',
      'Kanji Look and Learn · N4',
      'Kanji theo bài Minna no Nihongo · N5',
      'Sou Matome · N5',
      'Sou Matome · N4',
      'JLPT · N1',
    ]);
    expect(groups[0].items.map((l) => l.lessonNumber)).toEqual([1, 2]);
  });
});
