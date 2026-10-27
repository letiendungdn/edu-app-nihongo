import { describe, expect, it } from 'vitest';
import { grammarPatternKeys, highlightExplanation, highlightKeys } from './grammarHighlight';

describe('grammarHighlight', () => {
  it('takes the fixed Japanese parts of a pattern, longest first', () => {
    expect(grammarPatternKeys('N1 は N2 です')).toEqual(['です', 'は']);
    expect(grammarPatternKeys('～ても いいです')).toEqual(['いいです', 'ても']);
    expect(grammarPatternKeys('Vましょう')).toEqual(['ましょう']);
    expect(grammarPatternKeys('本（ほん）を 読みます')).toEqual(['読みます', '本を']);
  });

  it('marks pattern keys inside an example sentence', () => {
    expect(highlightKeys('わたしは マイク・ミラーです。', ['です', 'は'])).toEqual([
      { text: 'わたし', kind: 'plain' },
      { text: 'は', kind: 'key' },
      { text: ' マイク・ミラー', kind: 'plain' },
      { text: 'です', kind: 'key' },
      { text: '。', kind: 'plain' },
    ]);
  });

  it('does not mark a one-kana particle that starts a word', () => {
    expect(highlightKeys('はなは きれいです', ['は'])).toEqual([
      { text: 'はな', kind: 'plain' },
      { text: 'は', kind: 'key' },
      { text: ' きれいです', kind: 'plain' },
    ]);
  });

  it('separates pattern keys from other Japanese in an explanation', () => {
    expect(highlightExplanation('は (đọc là wa) đánh dấu chủ đề; 職業 hay です', ['です', 'は'])).toEqual([
      { text: 'は', kind: 'key' },
      { text: ' (đọc là wa) đánh dấu chủ đề; ', kind: 'plain' },
      { text: '職業', kind: 'jp' },
      { text: ' hay ', kind: 'plain' },
      { text: 'です', kind: 'key' },
    ]);
  });
});
