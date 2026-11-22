/**
 * Tách furigana: ghép từng cụm kanji với phần cách đọc tương ứng.
 * (Cùng thuật toán với packages/nest-common — dùng trên client cho câu ví dụ.)
 *
 *   toFurigana("食べます", "たべます") → [["食", "た"], ["べます", ""]]
 *   toFurigana("私は学生です。", "わたしはがくせいです。") →
 *     [["私","わたし"],["は",""],["学生","がくせい"],["です。",""]]
 */

export type FuriganaSegment = [text: string, ruby: string];

const KANJI = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3005\u3006\u30f6\u30f5]/;
const DIGIT = /[0-9０-９]/;
const VARIANT_SEP = '、';

function toHiragana(s: string): string {
  return s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function alignOne(kanji: string, kana: string): FuriganaSegment[] | null {
  const runs: { text: string; isKanji: boolean }[] = [];
  for (const ch of kanji) {
    const isKanji = KANJI.test(ch) || DIGIT.test(ch);
    const last = runs[runs.length - 1];
    if (last && last.isKanji === isKanji) last.text += ch;
    else runs.push({ text: ch, isKanji });
  }

  const pattern = runs.map((r) => (r.isKanji ? '(.+?)' : escapeRegex(toHiragana(r.text)))).join('');
  const m = new RegExp(`^${pattern}$`, 'u').exec(toHiragana(kana));
  if (!m) return null;

  const segments: FuriganaSegment[] = [];
  let group = 1;
  for (const r of runs) {
    if (!r.isKanji) {
      segments.push([r.text, '']);
      continue;
    }
    const ruby = m[group++];
    segments.push([r.text, ruby === r.text ? '' : ruby]);
  }
  return segments;
}

export function toFurigana(kanji: string | null | undefined, kana: string): FuriganaSegment[] | null {
  if (!kanji || !kana || !KANJI.test(kanji)) return null;
  const whole = alignOne(kanji, kana);
  if (whole) return whole;

  if (kanji.includes(VARIANT_SEP) && !kana.includes(VARIANT_SEP)) {
    const out: FuriganaSegment[] = [];
    for (const [i, variant] of kanji.split(VARIANT_SEP).entries()) {
      const seg = KANJI.test(variant) ? alignOne(variant, kana) : null;
      if (!seg) return null;
      if (i > 0) out.push([VARIANT_SEP, '']);
      out.push(...seg);
    }
    return out;
  }
  return null;
}

export function hasKanji(text: string): boolean {
  return KANJI.test(text);
}
