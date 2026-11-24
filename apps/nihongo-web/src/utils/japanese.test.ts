import { describe, it, expect } from 'vitest';
import {
  getStrokeText,
  hasReadingVariants,
  parseReadingVariants,
  shouldShowKanaStroke,
  flashcardTextTier,
  flashcardStrokeText,
  parseOptionalBracketSegments,
  hasOptionalBracketParts,
} from './japanese';

describe('getStrokeText', () => {
  it('giữ lại hiragana', () => {
    expect(getStrokeText('たべる')).toBe('たべる');
  });

  it('giữ lại katakana', () => {
    expect(getStrokeText('テレビ')).toBe('テレビ');
  });

  it('giữ lại kanji', () => {
    expect(getStrokeText('食べる')).toBe('食べる');
  });

  it('bỏ romaji và dấu câu', () => {
    expect(getStrokeText('taberu')).toBe('');
    expect(getStrokeText('～、。')).toBe('');
  });

  it('xử lý chuỗi rỗng', () => {
    expect(getStrokeText('')).toBe('');
  });

  it('xử lý mixed text', () => {
    expect(getStrokeText('食べる (taberu)')).toBe('食べる');
  });
});

describe('flashcardStrokeText', () => {
  it('keeps kana that is part of a mixed kanji spelling', () => {
    expect(flashcardStrokeText('此れ', 'これ')).toBe('此れ');
  });

  it('excludes optional notes and falls back to kana when the spelling has no kanji', () => {
    expect(flashcardStrokeText('食べます［朝食を～］', 'たべます')).toBe('食べます');
    expect(flashcardStrokeText('あいます［事故に～］', 'あいます')).toBe('あいます');
    expect(flashcardStrokeText(null, 'テレビです')).toBe('テレビで');
  });
});

describe('parseReadingVariants', () => {
  it('tách 2 cách đọc trong ngoặc', () => {
    expect(parseReadingVariants('あの ひと（あの かた）', 'ano hito (ano kata)')).toEqual([
      { text: 'あの ひと', label: 'ano hito' },
      { text: 'あの かた', label: 'ano kata' },
    ]);
  });

  it('tách nhiều biến thể cách nhau bằng dấu phẩy', () => {
    expect(parseReadingVariants('－ほん（－ぽん、－ぼん）', '-hon (-pon, -bon)')).toEqual([
      { text: '－ほん', label: '-hon' },
      { text: '－ぽん', label: '-pon' },
      { text: '－ぼん', label: '-bon' },
    ]);
  });

  it('giữ nguyên khi không có ngoặc', () => {
    expect(parseReadingVariants('たべる', 'taberu')).toEqual([
      { text: 'たべる', label: 'taberu' },
    ]);
  });
});

describe('hasReadingVariants', () => {
  it('true khi có ngoặc biến thể', () => {
    expect(hasReadingVariants('だれ（どなた）')).toBe(true);
  });

  it('false khi chỉ một cách đọc', () => {
    expect(hasReadingVariants('わたし')).toBe(false);
  });
});

describe('flashcardTextTier', () => {
  it('sm cho từ ngắn', () => {
    expect(flashcardTextTier('私', 'わたし')).toBe('sm');
  });

  it('md cho cụm [] khi phần chính ngắn (よろしく)', () => {
    expect(
      flashcardTextTier(
        '［どうぞ］よろしく［お願いします］。',
        '［どうぞ］よろしく［おねがいします］。',
      ),
    ).toBe('md');
  });

  it('xl cho cụm dài không có []', () => {
    expect(flashcardTextTier('あ'.repeat(20), 'あ'.repeat(20))).toBe('xl');
  });
});

describe('parseOptionalBracketSegments', () => {
  it('tách phần tùy chọn trong ngoặc vuông', () => {
    expect(parseOptionalBracketSegments('［どうぞ］よろしく［おねがいします］。')).toEqual([
      { text: 'どうぞ', optional: true, openBracket: '［', closeBracket: '］' },
      { text: 'よろしく', optional: false },
      { text: 'おねがいします', optional: true, openBracket: '［', closeBracket: '］' },
      { text: '。', optional: false },
    ]);
  });
});

describe('hasOptionalBracketParts', () => {
  it('true khi có []', () => {
    expect(hasOptionalBracketParts('[dozo] yoroshiku')).toBe(true);
  });

  it('false khi không có []', () => {
    expect(hasOptionalBracketParts('よろしく')).toBe(false);
  });
});

describe('shouldShowKanaStroke', () => {
  it('true khi kanji và kana khác nhau', () => {
    expect(shouldShowKanaStroke('私', 'わたし')).toBe(true);
  });

  it('false khi chỉ có kana', () => {
    expect(shouldShowKanaStroke(null, 'わたし')).toBe(false);
  });

  it('false khi kanji và kana cùng nội dung viết', () => {
    expect(shouldShowKanaStroke('先生', 'せんせい')).toBe(true);
    expect(shouldShowKanaStroke('食べる', '食べる')).toBe(false);
  });
});
