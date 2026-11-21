import { describe, expect, it } from 'vitest';
import { splitKanaIntoMora } from './kana';

describe('splitKanaIntoMora', () => {
  it('groups small kana with the preceding kana', () => {
    expect(splitKanaIntoMora('きょう').map((mora) => mora.text)).toEqual(['きょ', 'う']);
    expect(splitKanaIntoMora('キャット').map((mora) => mora.text)).toEqual(['キャ', 'ッ', 'ト']);
  });

  it('keeps sokuon, ん, and the long-vowel mark as separate beats', () => {
    expect(splitKanaIntoMora('がっこう')).toEqual([
      { text: 'が', kind: 'regular' },
      { text: 'っ', kind: 'sokuon' },
      { text: 'こ', kind: 'regular' },
      { text: 'う', kind: 'regular' },
    ]);
    expect(splitKanaIntoMora('スーパー')).toEqual([
      { text: 'ス', kind: 'regular' },
      { text: 'ー', kind: 'long-vowel' },
      { text: 'パ', kind: 'regular' },
      { text: 'ー', kind: 'long-vowel' },
    ]);
    expect(splitKanaIntoMora('にほん')).toHaveLength(3);
  });
});
