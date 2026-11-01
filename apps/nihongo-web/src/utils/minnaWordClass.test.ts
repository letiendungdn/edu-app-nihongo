import { describe, expect, it } from 'vitest';
import { classifyMinnaWord, compactKana, parseStoredWordClass } from './minnaWordClass';

describe('classifyMinnaWord', () => {
  it('nhận động từ dạng ます', () => {
    expect(classifyMinnaWord({ kana: 'たべます', kanji: '食べます' })).toBe('verb');
    expect(classifyMinnaWord({ kana: 'けっこんします', kanji: '結婚します' })).toBe('verb');
    expect(classifyMinnaWord({ kana: 'いきます' })).toBe('verb');
  });

  it('nhận tính từ な có ［な］', () => {
    expect(classifyMinnaWord({ kana: 'きれい［な］' })).toBe('na-adj');
    expect(classifyMinnaWord({ kana: 'しずか［な］', kanji: '静か［な］' })).toBe('na-adj');
    expect(classifyMinnaWord({ kana: 'きらい［な］', kanji: '嫌い［な］' })).toBe('na-adj');
  });

  it('nhận tính từ い (không nhầm danh từ hết い)', () => {
    expect(classifyMinnaWord({ kana: 'あたらしい', kanji: '新しい' })).toBe('i-adj');
    expect(classifyMinnaWord({ kana: 'おいしい' })).toBe('i-adj');
    expect(classifyMinnaWord({ kana: 'せが たかい', kanji: '背が 高い' })).toBe('i-adj');
    expect(classifyMinnaWord({ kana: 'がくせい', kanji: '学生' })).toBe('noun');
    expect(classifyMinnaWord({ kana: 'せかい', kanji: '世界' })).toBe('noun');
    expect(classifyMinnaWord({ kana: 'せんせい', kanji: '先生' })).toBe('noun');
  });

  it('đưa câu, hậu tố, phó từ vào Khác', () => {
    expect(classifyMinnaWord({ kana: 'おはようございます。' })).toBe('other');
    expect(classifyMinnaWord({ kana: '～さん' })).toBe('other');
    expect(classifyMinnaWord({ kana: '－かい', kanji: '－回' })).toBe('other');
    expect(classifyMinnaWord({ kana: 'たいてい' })).toBe('other');
    expect(classifyMinnaWord({ kana: 'はい' })).toBe('other');
  });

  it('ưu tiên loại từ admin đã lưu', () => {
    expect(classifyMinnaWord({ kana: 'がくせい', kanji: '学生', partOfSpeech: 'i-adj' })).toBe(
      'i-adj',
    );
    expect(classifyMinnaWord({ kana: 'たべます', partOfSpeech: 'noun' })).toBe('noun');
  });
});

describe('compactKana', () => {
  it('bỏ khoảng trắng và đánh dấu ［な］', () => {
    expect(compactKana('せが たかい')).toBe('せがたかい');
    expect(compactKana('きれい［な］')).toBe('きれい');
  });

  it('reads Vietnamese part-of-speech labels stored in the DB', () => {
    expect(parseStoredWordClass('danh từ')).toBe('noun');
    expect(parseStoredWordClass('danh từ, động từ する')).toBe('noun');
    expect(parseStoredWordClass('động từ nhóm 2')).toBe('verb');
    expect(parseStoredWordClass('tính từ i')).toBe('i-adj');
    expect(parseStoredWordClass('tính từ na, phó từ')).toBe('na-adj');
    expect(parseStoredWordClass('cụm động từ')).toBe('other');
    expect(parseStoredWordClass('phó từ')).toBe('other');
    expect(parseStoredWordClass('')).toBeNull();
  });
});
