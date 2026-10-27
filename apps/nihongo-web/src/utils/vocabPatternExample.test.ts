import { describe, expect, it } from 'vitest';
import {
  getVocabExamples,
  getVocabPatternExamples,
  isVocabPattern,
} from './vocabPatternExample';

describe('vocabPatternExample', () => {
  it('detects pattern vocab by ～', () => {
    expect(isVocabPattern({ kana: 'ほん', meaning: 'sách' })).toBe(false);
    expect(
      isVocabPattern({
        kanji: '～から 来ました。',
        kana: '～から きました。',
        meaning: 'đến từ ～',
      }),
    ).toBe(true);
  });

  it('returns DB example fields only', () => {
    const examples = getVocabExamples({
      kana: 'がくせい',
      exampleJa: '私は学生です。',
      exampleKana: 'わたしはがくせいです。',
      exampleVi: 'Tôi là học sinh.',
    });
    expect(examples).toHaveLength(1);
    expect(examples[0].ja).toBe('私は学生です。');
    expect(examples[0].kana).toBe('わたしはがくせいです。');
    expect(examples[0].vi).toBe('Tôi là học sinh.');
    expect(examples[0].speak).toBe('わたしはがくせいです');
  });

  it('returns every sentence from examples[] in order', () => {
    const examples = getVocabExamples({
      kana: 'ほん',
      exampleJa: '本を読む。',
      examples: [
        { ja: '本を読む。', kana: 'ほんを よむ。', vi: 'Đọc sách.' },
        { ja: ' 本を買った。 ', kana: null, vi: null },
        { ja: '   ', kana: null, vi: null },
      ],
    });
    expect(examples.map((e) => e.ja)).toEqual(['本を読む。', '本を買った。']);
    expect(examples[1]).toMatchObject({ kana: undefined, vi: '', speak: '本を買った' });
  });

  it('returns empty when DB example is missing', () => {
    expect(
      getVocabExamples({
        kanji: '本',
        kana: 'ほん',
      }),
    ).toEqual([]);
    expect(
      getVocabPatternExamples({
        kana: '～さん',
      }),
    ).toBeNull();
  });
});
