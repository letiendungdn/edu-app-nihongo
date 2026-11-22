import { describe, expect, it } from 'vitest';
import {
  buildMoraTrapPairsFromVocab,
  moraCount,
  moraTrapVariants,
  sokuonTrapOf,
} from './moraTraps';

describe('moraTraps', () => {
  it('đếm mora đúng cho demo きって / きて', () => {
    expect(moraCount('きって')).toBe(3);
    expect(moraCount('きて')).toBe(2);
  });

  it('tạo bẫy nuốt っ', () => {
    expect(sokuonTrapOf('きって')).toBe('きて');
    expect(sokuonTrapOf('さっか')).toBe('さか');
    expect(sokuonTrapOf('おばさん')).toBeNull();
  });

  it('đếm mora cặp trường âm / âm ghép', () => {
    expect(moraCount('おばさん')).toBe(4);
    expect(moraCount('おばあさん')).toBe(5);
    expect(moraCount('びよういん')).toBe(5);
    expect(moraCount('びょういん')).toBe(4);
  });

  it('sinh biến thể bẫy mora', () => {
    expect(moraTrapVariants('さっか').some((v) => v.variant === 'さか' && v.kind === 'sokuon')).toBe(
      true,
    );
    expect(
      moraTrapVariants('おばあさん').some(
        (v) => v.variant === 'おばさん' && v.kind === 'long-vowel',
      ),
    ).toBe(true);
    expect(
      moraTrapVariants('びょういん').some((v) => v.variant === 'びよういん' && v.kind === 'yoon'),
    ).toBe(true);
  });

  it('ghép cặp từ danh sách CSDL khi cả hai phía tồn tại', () => {
    const pairs = buildMoraTrapPairsFromVocab([
      { id: 1, kana: 'さっか', kanji: '作家', meaning: 'Tác giả' },
      { id: 2, kana: 'さか', kanji: '坂', meaning: 'Dốc' },
      { id: 3, kana: 'おばさん', meaning: 'Cô, dì' },
      { id: 4, kana: 'おばあさん', meaning: 'Bà cụ' },
      { id: 5, kana: 'びよういん', kanji: '美容院', meaning: 'Thẩm mỹ viện' },
      { id: 6, kana: 'びょういん', kanji: '病院', meaning: 'Bệnh viện' },
      { id: 7, kana: 'ねこ', meaning: 'Mèo' },
    ]);
    expect(pairs.length).toBe(3);
    expect(pairs.some((p) => p.kind === 'sokuon' && p.correct.kana === 'さっか')).toBe(true);
    expect(pairs.some((p) => p.kind === 'long-vowel')).toBe(true);
    expect(pairs.some((p) => p.kind === 'yoon')).toBe(true);
  });
});
