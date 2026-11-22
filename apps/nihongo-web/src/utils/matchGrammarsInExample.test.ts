import { describe, expect, it } from 'vitest';
import {
  grammarLessonHref,
  matchGrammarsInExample,
  patternSkeletons,
  skeletonInSentence,
} from './matchGrammarsInExample';

describe('matchGrammarsInExample', () => {
  it('rút skeleton từ mẫu Minna', () => {
    expect(patternSkeletons('N1 は N2 です')).toEqual(['はです']);
    expect(patternSkeletons('N も')).toEqual(['も']);
    expect(patternSkeletons('S ＋ か')).toEqual(['か']);
    expect(patternSkeletons('N1 は N2 じゃ（では） ありません')).toEqual([
      'はじゃありません',
      'ではありません',
    ]);
  });

  it('khớp khung trong câu theo thứ tự', () => {
    expect(skeletonInSentence('はです', '私は学生です。')).toBe(true);
    expect(skeletonInSentence('はじゃありません', 'わたしは先生じゃありません。')).toBe(true);
    expect(skeletonInSentence('ではありません', 'わたしは先生ではありません。')).toBe(true);
    expect(skeletonInSentence('も', '私は学生です。')).toBe(false);
  });

  it('chọn mẫu ngữ pháp dùng trong câu ví dụ', () => {
    const hits = matchGrammarsInExample('私は学生です。', [
      { id: 1, pattern: 'N1 は N2 です', meaning: 'N1 là N2' },
      { id: 2, pattern: 'N も', meaning: 'N cũng' },
      { id: 3, pattern: 'S ＋ か', meaning: 'câu hỏi' },
    ]);
    expect(hits.map((h) => h.id)).toEqual([1]);
    expect(grammarLessonHref(1, 1)).toBe('/grammar?lesson=1&g=1');
  });

  it('không gắn N1 の N2 vào câu chỉ có あの', () => {
    const hits = matchGrammarsInExample('あの方は木村さんです。', [
      { id: 1, pattern: 'N1 は N2 です', meaning: 'N1 là N2' },
      { id: 2, pattern: 'N1 の N2', meaning: 'N2 thuộc N1' },
      { id: 3, pattern: '～さん', meaning: 'anh/chị' },
    ]);
    expect(hits.map((h) => h.id).sort()).toEqual([1, 3]);
  });
});