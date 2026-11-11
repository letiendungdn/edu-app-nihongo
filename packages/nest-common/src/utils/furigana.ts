/**
 * Tách furigana: ghép từng cụm kanji với phần cách đọc tương ứng.
 *
 *   toFurigana("食べます", "たべます") → [["食", "た"], ["べます", ""]]
 *   toFurigana("［お］湯", "［お］ゆ") → [["［お］", ""], ["湯", "ゆ"]]
 *
 * Cách làm: mỗi cụm kanji thành một nhóm `(.+?)`, phần còn lại (kana, dấu) phải khớp nguyên văn
 * với cách đọc. Katakana và hiragana coi như nhau khi so (コピー機 / こぴーき vẫn khớp).
 * Không khớp được (kanji và cách đọc lệch nhau) thì trả null: app hiện kana ở dòng riêng như cũ.
 *
 * Kết quả lưu ở cột Vocabulary.furigana (JSON) để 5 app chỉ việc vẽ, không phải tự tách.
 */
export type FuriganaSegment = [text: string, ruby: string];

const KANJI = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3005\u3006\u30f6\u30f5]/;
/** Chữ số đọc liền với kanji bên cạnh (２４日 → にじゅうよっか, １人 → ひとり) nên gom chung một cụm. */
const DIGIT = /[0-9０-９]/;
/** Nhiều cách viết cùng một cách đọc: 暑い、熱い / あつい. */
const VARIANT_SEP = '、';

function toHiragana(s: string): string {
  return s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function alignOne(kanji: string, kana: string): FuriganaSegment[] | null {
  // Chia chuỗi kanji thành các cụm: cụm kanji (kèm chữ số) liên tiếp / cụm còn lại
  const runs: { text: string; isKanji: boolean }[] = [];
  for (const ch of kanji) {
    const isKanji = KANJI.test(ch) || DIGIT.test(ch);
    const last = runs[runs.length - 1];
    if (last && last.isKanji === isKanji) last.text += ch;
    else runs.push({ text: ch, isKanji });
  }

  const pattern = runs.map((r) => (r.isKanji ? '(.+?)' : escapeRegex(toHiragana(r.text)))).join('');
  // toHiragana giữ nguyên độ dài chuỗi nên vị trí trong bản đổi = vị trí trong bản gốc
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
    // Cụm chỉ có chữ số mà "cách đọc" y hệt (１０４ / １０４): không cần furigana
    segments.push([r.text, ruby === r.text ? '' : ruby]);
  }
  return segments;
}

export function toFurigana(kanji: string | null | undefined, kana: string): FuriganaSegment[] | null {
  if (!kanji || !kana || !KANJI.test(kanji)) return null;
  const whole = alignOne(kanji, kana);
  if (whole) return whole;

  // 暑い、熱い + あつい: tách từng cách viết, mỗi cách phải khớp nguyên cách đọc
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
