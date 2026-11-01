import { describe, expect, it } from 'vitest';
import { unlabeledStrokes, type KanjiNode } from '../kanji-structure';

describe('unlabeledStrokes', () => {
  it('counts strokes KanjiVG left out of every component (方 = 亠 + 2 nét)', () => {
    const fang: KanjiNode = {
      id: '',
      n: 4,
      e: '方',
      r: 'general',
      c: [
        { id: 'g1', n: 2, e: '亠', p: 'top' },
        { id: 'g2', n: 2, p: 'bottom' },
      ],
    } as KanjiNode;
    const rest = unlabeledStrokes(fang);
    expect(rest.strokes).toBe(2);
    expect(rest.groups.map((g) => g.id)).toEqual(['g2']);
  });

  it('is zero when components cover the whole kanji', () => {
    const ri: KanjiNode = {
      id: '',
      n: 11,
      e: '理',
      c: [
        { id: 'g1', n: 4, e: '王', p: 'left' },
        { id: 'g2', n: 7, e: '里', p: 'right' },
      ],
    } as KanjiNode;
    expect(unlabeledStrokes(ri)).toEqual({ strokes: 0, groups: [] });
  });
});
