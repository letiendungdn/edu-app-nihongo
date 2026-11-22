import { describe, expect, it } from 'vitest';
import { buildExampleAnalysis } from './vocabExampleAnalysis';

describe('buildExampleAnalysis', () => {
  it('tạo lede + cấu trúc cho 私は学生です。', () => {
    const analysis = buildExampleAnalysis(
      '私は学生です。',
      'わたしはがくせいです。',
      'Tôi là học sinh.',
      { kanji: '学生', meaning: 'học sinh' },
    );

    expect(analysis.lede).toContain('私は学生です。');
    expect(analysis.typedRomaji).toMatch(/Wa-ta-shi wa ga-ku-sei de-su/i);
    expect(analysis.lede).toContain('Tôi là học sinh.');
    expect(analysis.kanjiChars).toEqual(expect.arrayContaining(['私', '学', '生']));
    expect(analysis.cards.map((c) => c.surface)).toEqual(['私', 'は', '学生', 'です']);

    const student = analysis.parts.find((p) => p.surface === '学生');
    expect(student?.reading).toBe('がくせい');
    expect(student?.pos).toBe('Danh từ');

    const wa = analysis.parts.find((p) => p.surface === 'は');
    expect(wa?.kind).toBe('particle');
    expect(wa?.romaji).toBe('wa');
    expect(wa?.gloss).toMatch(/chủ đề/i);
  });

  it('phân tích được câu có khoảng trắng trong kana CSDL', () => {
    const analysis = buildExampleAnalysis(
      'あの方は木村さんです。',
      'あの かたは きむらさん です。',
      'Vị kia là chị Kimura.',
      { kanji: '方', meaning: 'người kia (kính ngữ)' },
    );

    expect(analysis.cards.map((c) => c.surface)).toEqual(
      expect.arrayContaining(['方', 'は', '木村', 'です']),
    );
    expect(analysis.typedRomaji.toLowerCase()).toMatch(/ka-?ta/);
    expect(analysis.typedRomaji.toLowerCase()).toMatch(/ki-?mu-?ra/);
    const kata = analysis.cards.find((c) => c.surface === '方');
    expect(kata?.reading).toBe('かた');
    expect(analysis.cards.length).toBeGreaterThanOrEqual(4);
  });
});
