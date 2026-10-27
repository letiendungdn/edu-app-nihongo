/**
 * Tách chữ để tô màu phần "khung" của mẫu ngữ pháp (vd は, です trong 「N1 は N2 です」)
 * trong mẫu, ví dụ và phần giải thích. Chỉ cắt chuỗi — việc tô màu do component lo.
 */

export type HighlightSegment = { text: string; kind: 'plain' | 'key' | 'jp' };

const JP_CHAR = /[ぁ-ゖァ-ヺー一-龯々〆ヵヶ]/;
const JP_RUN = /[ぁ-ゖァ-ヺー一-龯々〆ヵヶ]+/g;
const HIRAGANA = /[ぁ-ゖ]/;

/** Các cụm tiếng Nhật cố định trong mẫu: 「N1 は N2 です」 → ["は", "です"]. */
export function grammarPatternKeys(pattern: string): string[] {
  const stripped = pattern.replace(/[（(][ぁ-んァ-ンー]+[）)]/g, '');
  const keys = stripped.match(JP_RUN) ?? [];
  return [...new Set(keys)].sort((a, b) => b.length - a.length);
}

function pushSegment(out: HighlightSegment[], text: string, kind: HighlightSegment['kind']) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.kind === kind) last.text += text;
  else out.push({ text, kind });
}

/**
 * Đánh dấu các key trong một câu. Key một chữ (trợ từ は, を, に…) chỉ khớp khi chữ sau
 * không phải hiragana — tránh tô nhầm は trong はな.
 */
export function highlightKeys(text: string, keys: string[]): HighlightSegment[] {
  const out: HighlightSegment[] = [];
  let i = 0;
  let plainStart = 0;
  while (i < text.length) {
    const key = keys.find((k) => {
      if (!text.startsWith(k, i)) return false;
      if (k.length > 1) return true;
      const next = text[i + k.length];
      return !next || !HIRAGANA.test(next);
    });
    if (key) {
      pushSegment(out, text.slice(plainStart, i), 'plain');
      pushSegment(out, key, 'key');
      i += key.length;
      plainStart = i;
    } else {
      i += 1;
    }
  }
  pushSegment(out, text.slice(plainStart), 'plain');
  return out;
}

/**
 * Câu giải thích tiếng Việt lẫn chữ Nhật: cụm chứa key của mẫu → `key`,
 * cụm tiếng Nhật khác → `jp`, còn lại `plain`.
 */
export function highlightExplanation(text: string, keys: string[]): HighlightSegment[] {
  const out: HighlightSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(JP_RUN)) {
    const start = m.index ?? 0;
    pushSegment(out, text.slice(last, start), 'plain');
    pushSegment(out, m[0], keys.some((k) => m[0].includes(k)) ? 'key' : 'jp');
    last = start + m[0].length;
  }
  pushSegment(out, text.slice(last), 'plain');
  return out;
}

export function hasJapanese(text: string): boolean {
  return JP_CHAR.test(text);
}
