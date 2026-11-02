import { describe, expect, it } from 'vitest';
import { resolveVocabImage, viPhraseMatches } from '@edu/vocab-images';

const img = (kanji: string | null, kana: string, meaning: string, romaji = '') =>
  resolveVocabImage({ kanji, kana, meaning, word: romaji, imageUrl: null });

describe('viPhraseMatches', () => {
  it('matches a whole sense only, not part of a compound word', () => {
    expect(viPhraseMatches('nước', 'nước')).toBe(true);
    expect(viPhraseMatches('đất nước (của anh)', 'nước')).toBe(false);
    expect(viPhraseMatches('kính ngữ', 'kính')).toBe(false);
    expect(viPhraseMatches('phương pháp', 'pháp')).toBe(false);
  });

  it('ignores a leading classifier and the notes in brackets', () => {
    expect(viPhraseMatches('cái dù', 'dù')).toBe(true);
    expect(viPhraseMatches('thời gian (thể thao)', 'thể thao')).toBe(false);
  });
});

describe('resolveVocabImage', () => {
  it('does not guess from the reading when the word is written in kanji', () => {
    expect(img('髪', 'かみ', 'tóc', 'kami')).toContain('1F487');
    expect(img('髪', 'かみ', 'tóc', 'kami')).not.toBe(img('紙', 'かみ', 'giấy', 'kami'));
    expect(img('機能', 'きのう', 'chức năng', 'kinou')).toBeNull();
    expect(img('公演', 'こうえん', 'buổi biểu diễn', 'kouen')).toBeNull();
  });

  it('still finds pictures for concrete nouns', () => {
    expect(img('鼻', 'はな', 'mũi', 'hana')).toContain('1F443');
    expect(img('橋', 'はし', 'cầu', 'hashi')).toContain('1F309');
    expect(img(null, 'アメリカ', 'Mỹ', 'amerika')).not.toBeNull();
    expect(img('富士山', 'ふじさん', 'Núi Phú Sĩ', 'fujisan')).toContain('1F5FB');
  });

  it('leaves no picture rather than a wrong one', () => {
    expect(img('机', 'つくえ', 'cái bàn', 'tsukue')).toBeNull();
    expect(img('外国', 'がいこく', 'nước ngoài', 'gaikoku')).toBeNull();
  });
});
