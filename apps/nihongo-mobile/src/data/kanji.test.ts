import { describe, expect, it } from 'vitest';
import { parseKanjiEntries, parseKanjiLessons } from './kanji';

describe('parseKanjiEntries', () => {
  it('đọc mảng kanji, bỏ dòng hỏng, giữ nghĩa tiếng Anh', () => {
    const items = parseKanjiEntries([
      { id: 1, character: '一', hanViet: 'NHẤT', meaningVi: 'một', meaningEn: 'one', onyomi: 'いち', kunyomi: '' },
      { id: 'x', character: '二' },
      { id: 3, character: '' },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ character: '一', meaningEn: 'one', kunyomi: null });
  });

  it('đọc được dạng trang { data: [...] }', () => {
    expect(parseKanjiEntries({ data: [{ id: 1, character: '一' }] })).toHaveLength(1);
  });
});

describe('parseKanjiLessons', () => {
  it('ghép nhãn giáo trình, bỏ bài rỗng', () => {
    const lessons = parseKanjiLessons([
      { lessonNumber: 1, title: 'Bài 1', textbook: 'KLL', _count: { entries: 16 } },
      { lessonNumber: 2, title: 'Bài 2', _count: { entries: 0 } },
    ]);
    expect(lessons).toEqual([{ lessonNumber: 1, label: 'Bài 1 · KLL', count: 16 }]);
  });
});
