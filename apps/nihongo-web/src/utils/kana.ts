import type { KanaCell, KanaChartItem, KanaSection } from '../types/reference';

export function flattenKanaSections(sections: KanaSection[]): KanaCell[] {
  return sections.flatMap((section) => section.rows.flat());
}

export function kanaChartToItems(chart: KanaCell[]): KanaChartItem[] {
  return chart
    .filter((item) => item.kana)
    .map((item) => ({
      speakText: item.kana,
      display: item.kana,
      romaji: item.romaji,
      hint: `Romaji: ${item.romaji}`,
    }));
}

export type MoraKind = 'regular' | 'sokuon' | 'syllabic-n' | 'long-vowel';

export type Mora = {
  text: string;
  kind: MoraKind;
};

const SMALL_KANA = new Set([
  'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゃ', 'ゅ', 'ょ', 'ゎ', 'ゕ', 'ゖ',
  'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ャ', 'ュ', 'ョ', 'ヮ', 'ヵ', 'ヶ',
]);

const SOKUON = new Set(['っ', 'ッ']);
const SYLLABIC_N = new Set(['ん', 'ン']);
const LONG_VOWEL_MARK = 'ー';

/**
 * Splits kana into mora (the equal beats of Japanese speech), not romaji syllables.
 * Small vowel/y kana attach to the preceding kana: きょう → きょ・う.
 * っ, ん and ー each occupy a beat of their own.
 */
export function splitKanaIntoMora(text: string): Mora[] {
  const morae: Mora[] = [];

  for (const char of Array.from(text.trim())) {
    if (/\s/.test(char)) continue;

    if (SOKUON.has(char)) {
      morae.push({ text: char, kind: 'sokuon' });
    } else if (SYLLABIC_N.has(char)) {
      morae.push({ text: char, kind: 'syllabic-n' });
    } else if (char === LONG_VOWEL_MARK) {
      morae.push({ text: char, kind: 'long-vowel' });
    } else if (SMALL_KANA.has(char) && morae.length > 0) {
      morae[morae.length - 1] = {
        ...morae[morae.length - 1],
        text: `${morae[morae.length - 1].text}${char}`,
      };
    } else {
      morae.push({ text: char, kind: 'regular' });
    }
  }

  return morae;
}
