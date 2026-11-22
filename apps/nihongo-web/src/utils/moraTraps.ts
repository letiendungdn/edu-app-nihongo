import { splitKanaIntoMora, type Mora } from './kana';
import { kanaToRomaji } from './kanaToRomaji';

export type MoraTrapSide = {
  kana: string;
  kanji?: string;
  meaning: string;
  emoji?: string;
};

export type MoraTrapKind = 'long-vowel' | 'yoon' | 'sokuon';

export type MoraTrapPair = {
  id: string;
  kind: MoraTrapKind;
  title: string;
  note: string;
  correct: MoraTrapSide;
  wrong: MoraTrapSide;
};

export type MoraTrapVocab = {
  id: number;
  kana: string;
  kanji?: string | null;
  meaning: string;
};

const TRAP_TITLE: Record<MoraTrapKind, string> = {
  'long-vowel': 'Trường âm (Âm dài)',
  yoon: 'Âm ghép (拗音)',
  sokuon: 'Âm ngắt [っ]',
};

const TRAP_NOTE: Record<MoraTrapKind, string> = {
  'long-vowel': 'Nuốt / thêm trường âm → thành từ khác trong CSDL!',
  yoon: 'Nhầm âm ghép [ゃゅょ] với [やゆよ] → đổi nghĩa!',
  sokuon: 'Bỏ âm ngắt [っ] → từ khác hoàn toàn!',
};

const YOON_SMALL_TO_LARGE: Record<string, string> = {
  ゃ: 'や',
  ゅ: 'ゆ',
  ょ: 'よ',
  ャ: 'ヤ',
  ュ: 'ユ',
  ョ: 'ヨ',
};

const YOON_LARGE_TO_SMALL: Record<string, string> = {
  や: 'ゃ',
  ゆ: 'ゅ',
  よ: 'ょ',
  ヤ: 'ャ',
  ユ: 'ュ',
  ヨ: 'ョ',
};

const LENGTHENING_VOWEL = /^[あいうえおアイウエオー]$/;

/** Các cặp bẫy mora điển hình (đọc sai → đổi nghĩa) — fallback / gợi ý. */
export const MORA_TRAP_PAIRS: MoraTrapPair[] = [
  {
    id: 'obasan',
    kind: 'long-vowel',
    title: 'Trường âm (Âm dài)',
    note: 'Nuốt trường âm [あ] biến Cô thành Bà!',
    correct: { kana: 'おばさん', meaning: 'Cô, dì', emoji: '👩' },
    wrong: { kana: 'おばあさん', meaning: 'Bà cụ', emoji: '👵' },
  },
  {
    id: 'biyouin',
    kind: 'yoon',
    title: 'Âm mũi [ん] / âm ghép',
    note: 'Sai âm ghép [よ] vs [ょ]!',
    correct: { kana: 'びよういん', kanji: '美容院', meaning: 'Thẩm mỹ viện', emoji: '💇‍♀️' },
    wrong: { kana: 'びょういん', kanji: '病院', meaning: 'Bệnh viện', emoji: '🏥' },
  },
  {
    id: 'sakka',
    kind: 'sokuon',
    title: 'Âm ngắt [っ]',
    note: 'Bỏ âm ngắt [っ] → từ khác hoàn toàn!',
    correct: { kana: 'さっか', kanji: '作家', meaning: 'Tác giả', emoji: '✍️' },
    wrong: { kana: 'さか', kanji: '坂', meaning: 'Dốc', emoji: '⛰️' },
  },
];

/** Demo mặc định trên trang (giống ảnh thiết kế). */
export const MORA_DEMO = {
  kana: 'きって',
  kanji: '切手',
  meaning: 'Con tem',
  emoji: '✉️',
  wrong: {
    kana: 'きて',
    meaning: 'Hãy đến! / Đến',
    emoji: '🏃',
  },
} as const;

export function moraCount(kana: string): number {
  return splitKanaIntoMora(kana).length;
}

export function moraJoin(morae: Mora[]): string {
  return morae.map((m) => m.text).join('・');
}

export function moraRomaji(kana: string): string {
  return kanaToRomaji(kana.replace(/[。！？、．，\s]/g, ''));
}

/** Nếu từ có っ/ッ, tạo bản “nuốt âm ngắt” để so sánh. */
export function sokuonTrapOf(kana: string): string | null {
  if (!/[っッ]/.test(kana)) return null;
  const stripped = kana.replace(/[っッ]/g, '');
  if (!stripped || stripped === kana) return null;
  return stripped;
}

function cleanKana(raw: string): string {
  return raw
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[^\u3040-\u309F\u30A0-\u30FFー]/g, '')
    .trim();
}

function expandYoon(kana: string): string {
  return [...kana].map((ch) => YOON_SMALL_TO_LARGE[ch] ?? ch).join('');
}

function contractYoon(kana: string): string {
  const chars = [...kana];
  let changed = false;
  for (let i = 1; i < chars.length; i += 1) {
    const prev = chars[i - 1];
    const cur = chars[i];
    const small = YOON_LARGE_TO_SMALL[cur];
    if (!small) continue;
    // Chỉ co khi đứng sau hàng i/e kiểu âm ghép (き+よ → きょ, …)
    if (/[きしちにひみりぎじぢびぴキシチニヒミリギジヂビピ]/.test(prev)) {
      chars[i] = small;
      changed = true;
    }
  }
  return changed ? chars.join('') : kana;
}

/** Bỏ từng mora trường âm / nguyên âm kéo dài để tìm từ ngắn hơn trong CSDL. */
function collapseLongVowelCandidates(kana: string): string[] {
  const morae = splitKanaIntoMora(kana);
  const out: string[] = [];
  for (let i = 0; i < morae.length; i += 1) {
    const beat = morae[i];
    const isLength =
      beat.kind === 'long-vowel' || (LENGTHENING_VOWEL.test(beat.text) && i > 0);
    if (!isLength) continue;
    const next = morae
      .filter((_, j) => j !== i)
      .map((m) => m.text)
      .join('');
    if (next && next !== kana) out.push(next);
  }
  return out;
}

/** Sinh các biến thể “đọc sai một nhịp” để tìm từ đối ứng trong CSDL. */
export function moraTrapVariants(kana: string): Array<{ kind: MoraTrapKind; variant: string }> {
  const base = cleanKana(kana);
  if (!base) return [];
  const out: Array<{ kind: MoraTrapKind; variant: string }> = [];
  const push = (kind: MoraTrapKind, variant: string) => {
    const v = cleanKana(variant);
    if (!v || v === base) return;
    out.push({ kind, variant: v });
  };

  if (/[っッ]/.test(base)) {
    push('sokuon', base.replace(/[っッ]/g, ''));
  }

  for (const variant of collapseLongVowelCandidates(base)) {
    push('long-vowel', variant);
  }

  const expanded = expandYoon(base);
  if (expanded !== base) push('yoon', expanded);
  const contracted = contractYoon(base);
  if (contracted !== base) push('yoon', contracted);

  return out;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function toSide(word: MoraTrapVocab): MoraTrapSide {
  return {
    kana: cleanKana(word.kana) || word.kana,
    kanji: word.kanji || undefined,
    meaning: word.meaning,
  };
}

function orderPair(
  kind: MoraTrapKind,
  left: MoraTrapVocab,
  right: MoraTrapVocab,
): { correct: MoraTrapVocab; wrong: MoraTrapVocab } {
  const a = cleanKana(left.kana);
  const b = cleanKana(right.kana);
  if (kind === 'sokuon') {
    const leftHas = /[っッ]/.test(a);
    const rightHas = /[っッ]/.test(b);
    if (leftHas && !rightHas) return { correct: left, wrong: right };
    if (rightHas && !leftHas) return { correct: right, wrong: left };
  }
  if (kind === 'long-vowel') {
    const leftN = moraCount(a);
    const rightN = moraCount(b);
    if (leftN !== rightN) {
      return leftN > rightN
        ? { correct: left, wrong: right }
        : { correct: right, wrong: left };
    }
  }
  if (kind === 'yoon') {
    const leftSmall = /[ゃゅょャュョ]/.test(a);
    const rightSmall = /[ゃゅょャュョ]/.test(b);
    // Giống cặp mẫu: dạng không ょ (びよういん) đứng trước khi so với びょういん
    if (leftSmall !== rightSmall) {
      return leftSmall
        ? { correct: right, wrong: left }
        : { correct: left, wrong: right };
    }
  }
  return { correct: left, wrong: right };
}

/**
 * Tìm mọi cặp từ trong CSDL chỉ khác nhau bởi một bẫy mora
 * (っ, trường âm, âm ghép ゃゅょ).
 */
export function buildMoraTrapPairsFromVocab(vocab: MoraTrapVocab[]): MoraTrapPair[] {
  const byKana = new Map<string, MoraTrapVocab>();
  for (const word of vocab) {
    const kana = cleanKana(word.kana);
    if (!kana || kana.length < 2) continue;
    // Giữ bản ghi đầu (id nhỏ hơn thường là bài Minna cơ bản)
    if (!byKana.has(kana)) byKana.set(kana, { ...word, kana });
  }

  const seen = new Set<string>();
  const pairs: MoraTrapPair[] = [];

  for (const word of byKana.values()) {
    for (const { kind, variant } of moraTrapVariants(word.kana)) {
      const other = byKana.get(variant);
      if (!other) continue;
      const key = `${kind}:${pairKey(word.kana, other.kana)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const ordered = orderPair(kind, word, other);
      pairs.push({
        id: `${kind}-${ordered.correct.id}-${ordered.wrong.id}`,
        kind,
        title: TRAP_TITLE[kind],
        note: TRAP_NOTE[kind],
        correct: toSide(ordered.correct),
        wrong: toSide(ordered.wrong),
      });
    }
  }

  pairs.sort((a, b) => {
    const kindOrder = { sokuon: 0, 'long-vowel': 1, yoon: 2 } as const;
    const d = kindOrder[a.kind] - kindOrder[b.kind];
    if (d !== 0) return d;
    return a.correct.kana.localeCompare(b.correct.kana, 'ja');
  });

  return pairs;
}

export function beatLabel(kind: Mora['kind']): string {
  switch (kind) {
    case 'sokuon':
      return '1 nhịp dừng ⏸️ (Cực kỳ quan trọng!)';
    case 'syllabic-n':
      return 'ん: 1 nhịp mũi';
    case 'long-vowel':
      return '1 nhịp kéo dài';
    default:
      return '1 nhịp thường';
  }
}

export function beatRomajiHint(mora: Mora): string {
  if (mora.kind === 'sokuon') return 'âm ngắt';
  if (mora.kind === 'syllabic-n') return 'n';
  if (mora.kind === 'long-vowel') return 'kéo dài';
  return kanaToRomaji(mora.text);
}
