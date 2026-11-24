export interface ReadingVariant {
  text: string;
  label?: string;
}

function splitRomajiVariants(romaji: string): string[] {
  const trimmed = romaji.trim();
  const parenMatch = trimmed.match(/^(.+?)\s*\((.+?)\)\s*$/);
  if (!parenMatch) return [trimmed];

  const inner = parenMatch[2].trim();
  const alternates =
    inner.includes('、') || inner.includes(',')
      ? inner.split(/[,、]/).map((part) => part.trim())
      : [inner];

  return [parenMatch[1].trim(), ...alternates];
}

/**
 * Tách biến thể đọc trong ngoặc: あの ひと（あの かた） → 2 mục có nhãn romaji.
 */
export function parseReadingVariants(text: string, romaji?: string): ReadingVariant[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const romajiLabels = romaji ? splitRomajiVariants(romaji) : [];
  const parenMatch =
    trimmed.match(/^(.+?)（(.+?)）$/) ?? trimmed.match(/^(.+?)\((.+?)\)$/);

  if (parenMatch) {
    const primary = parenMatch[1].trim();
    const inner = parenMatch[2].trim();
    const alternates =
      inner.includes('、') || inner.includes(',')
        ? inner.split(/[,、]/).map((part) => part.trim())
        : [inner];

    return [primary, ...alternates].map((variantText, index) => ({
      text: variantText,
      label: romajiLabels[index],
    }));
  }

  return [{ text: trimmed, label: romajiLabels[0] }];
}

export function hasReadingVariants(text: string): boolean {
  return parseReadingVariants(text).length > 1;
}

export type FlashcardTextTier = 'sm' | 'md' | 'lg' | 'xl';

export interface OptionalBracketSegment {
  text: string;
  optional: boolean;
  openBracket?: '[' | '［';
  closeBracket?: ']' | '］';
}

const OPTIONAL_BRACKET_RE = /(\[|［)([^\]］]+)(]|］)/g;

/** Tách phần tùy chọn trong [] / ［］ (vd. ［どうぞ］よろしく［おねがいします］). */
export function parseOptionalBracketSegments(text: string): OptionalBracketSegment[] {
  const segments: OptionalBracketSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(OPTIONAL_BRACKET_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, index), optional: false });
    }

    const open = match[1] as '[' | '［';
    segments.push({
      text: match[2],
      optional: true,
      openBracket: open,
      closeBracket: open === '[' ? ']' : '］',
    });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), optional: false });
  }

  return segments.length ? segments : [{ text, optional: false }];
}

export function hasOptionalBracketParts(text: string | null | undefined): boolean {
  if (!text) return false;
  return /(\[|［)[^\]］]+(]|］)/.test(text);
}

function flashcardEffectiveLength(text: string): number {
  if (hasOptionalBracketParts(text)) {
    return parseOptionalBracketSegments(text)
      .filter((segment) => !segment.optional)
      .map((segment) => segment.text)
      .join('')
      .replace(/\s/g, '').length;
  }

  return text.replace(/\s/g, '').length;
}

/** Cỡ chữ flashcard theo độ dài — tránh cụm dài bị font quá to. */
export function flashcardTextTier(...texts: (string | null | undefined)[]): FlashcardTextTier {
  const len = Math.max(0, ...texts.map((text) => flashcardEffectiveLength(text ?? '')));
  if (len <= 4) return 'sm';
  if (len <= 9) return 'md';
  if (len <= 16) return 'lg';
  return 'xl';
}

export function flashcardPhraseStrokeScale(totalChars: number): number {
  if (totalChars <= 6) return 1;
  if (totalChars <= 10) return 0.76;
  if (totalChars <= 14) return 0.62;
  return 0.52;
}

/** Chỉ chữ Latin — coi là romaji (không có kana/kanji). */
export function isRomajiInput(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(trimmed)) return false;
  return /^[a-zA-Z0-9\s\-'.,!?]+$/.test(trimmed);
}

/** Chỉ giữ kana và kanji — bỏ ~, romaji, dấu câu (tránh HanziWriter hiện ký tự lỗi) */
export function getStrokeText(text: string): string {
  if (!text) return '';
  return [...text]
    .filter((char) => {
      const code = char.charCodeAt(0);
      return (
        (code >= 0x3040 && code <= 0x309f) ||
        (code >= 0x30a0 && code <= 0x30ff) ||
        (code >= 0x4e00 && code <= 0x9fff)
      );
    })
    .join('');
}

/** Kanji và kana khác nhau (vd. 私 vs わたし) → cần vẽ cả hai */
export function shouldShowKanaStroke(
  kanji: string | null | undefined,
  kana: string,
): boolean {
  const kanjiStroke = kanji ? getStrokeText(kanji) : '';
  const kanaStroke = getStrokeText(kana);
  return Boolean(kanjiStroke && kanaStroke && kanjiStroke !== kanaStroke);
}

function isKanjiChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
}

/** Các chữ kanji trong từ, theo thứ tự, mỗi chữ một lần (vd さくら大学／富士大学 → 大学富士). */
export function uniqueKanji(text: string | null | undefined): string {
  if (!text) return '';
  return [...new Set([...text].filter(isKanjiChar))].join('');
}

/** Chữ cần vẽ trên thẻ từ: giữ kana trong cách viết, bỏ phần chú thích tùy chọn. */
export function flashcardStrokeText(
  kanji: string | null | undefined,
  kana: string,
): string {
  const writtenText = parseOptionalBracketSegments(kanji ?? '')
    .filter((segment) => !segment.optional)
    .map((segment) => segment.text)
    .join('');
  if (uniqueKanji(writtenText)) return getStrokeText(writtenText);
  return [...getStrokeText(kana)].slice(0, 4).join('');
}

export type FlashcardStrokeRow = { label?: string; text: string };

/**
 * Chọn phần cần vẽ nét ở mặt sau thẻ từ vựng sao cho luôn gọn:
 * - có kanji → chỉ vẽ các chữ kanji (không vẽ lại kana xen giữa, không lặp chữ);
 *   thêm hàng kana khi cách đọc ngắn (≤ `shortKana` chữ), vd 私 + わたし;
 * - không có kanji → vẽ kana.
 * `size` là cạnh ô mỗi chữ để mọi chữ nằm vừa một hàng trong `width` px.
 */
export function flashcardStrokePlan(
  kanji: string | null | undefined,
  kana: string,
  { width = 540, minSize = 56, maxSize = 150, shortKana = 4 } = {},
): { rows: FlashcardStrokeRow[]; size: number } {
  const kanjiChars = uniqueKanji(kanji);
  const kanaChars = getStrokeText(kana);
  const rows: FlashcardStrokeRow[] = [];
  if (kanjiChars) {
    rows.push({ label: 'Kanji', text: kanjiChars });
    const kanaLen = [...kanaChars].length;
    if (kanaLen > 0 && kanaLen <= shortKana && kanaChars !== kanjiChars) {
      rows.push({ label: 'Kana', text: kanaChars });
    }
  } else if (kanaChars) {
    rows.push({ text: kanaChars });
  }
  // Hàng kanji và kana đứng cạnh nhau → chia bề ngang cho tổng số chữ (+1 ô cho khoảng cách)
  const slots = rows.reduce((sum, row) => sum + [...row.text].length, 0) + (rows.length > 1 ? 1 : 0);
  const size = Math.max(minSize, Math.min(maxSize, Math.floor(width / Math.max(slots, 1))));
  return { rows, size };
}
