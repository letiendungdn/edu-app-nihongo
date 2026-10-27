import { describe, expect, it } from 'vitest';
import type { Lesson } from '../../types/api';
import { groupLessons } from '../lessonGroups';

const lesson = (lessonNumber: number, jlptLevel: string | null, textbook: string | null = null): Lesson => ({
  id: lessonNumber,
  lessonNumber,
  title: `Bài ${lessonNumber}`,
  jlptLevel,
  textbook,
});

describe('groupLessons', () => {
  it('puts supplementary topic lessons in their own group per level, after the JLPT groups', () => {
    const groups = groupLessons([
      lesson(53012, 'N3'),
      lesson(301, 'N3'),
      lesson(53011, 'N3'),
      lesson(51011, 'N1'),
      lesson(23101, 'N3', 'SOUMATOME'),
      lesson(5, 'N5', 'MINNA'),
    ]);

    expect(groups.map((g) => g.key)).toEqual([
      'minna',
      'n3',
      'n3-supplementary',
      'n1-supplementary',
      'SOUMATOME-N3',
    ]);
    expect(groups.find((g) => g.key === 'n3')!.items.map((l) => l.lessonNumber)).toEqual([301]);
    expect(groups.find((g) => g.key === 'n3-supplementary')).toMatchObject({
      label: 'JLPT N3 · Từ vựng bổ sung theo chủ đề',
      items: [{ lessonNumber: 53011 }, { lessonNumber: 53012 }],
    });
  });
});
