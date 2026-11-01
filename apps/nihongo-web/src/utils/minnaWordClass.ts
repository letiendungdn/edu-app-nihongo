/** Phân loại từ vựng Minna no Nihongo bài 1–50: danh từ / tính từ / động từ. */

export type MinnaWordClass = 'noun' | 'i-adj' | 'na-adj' | 'verb' | 'other';

export const WORD_CLASS_TABS = [
  { id: 'noun' as const, label: 'Danh từ', ja: '名詞' },
  { id: 'i-adj' as const, label: 'Tính từ い', ja: 'い形容詞' },
  { id: 'na-adj' as const, label: 'Tính từ な', ja: 'な形容詞' },
  { id: 'verb' as const, label: 'Động từ', ja: '動詞' },
  { id: 'other' as const, label: 'Khác', ja: 'その他' },
] as const;

export type WordClassTabId = (typeof WORD_CLASS_TABS)[number]['id'];

/** Tính từ い trong Minna 1–50 (kana đã bỏ khoảng trắng). */
const I_ADJECTIVES = new Set([
  'あおい',
  'あかい',
  'あかるい',
  'あたたかい',
  'あたまがいい',
  'あたらしい',
  'あつい',
  'あぶない',
  'あまい',
  'いい',
  'いそがしい',
  'うすい',
  'うつくしい',
  'うまい',
  'うるさい',
  'うれしい',
  'えらい',
  'えんぎがわるい',
  'おいしい',
  'おおきい',
  'おかしい',
  'おそい',
  'おとなしい',
  'おもい',
  'おもしろい',
  'かたい',
  'かなしい',
  'からい',
  'からだにいい',
  'かるい',
  'かわいい',
  'きがつよい',
  'きたない',
  'きびしい',
  'きぶんがいい',
  'きぶんがわるい',
  'きもちがいい',
  'きもちがわるい',
  'くらい',
  'くろい',
  'くわしい',
  'こい',
  'こまかい',
  'こわい',
  'さびしい',
  'さむい',
  'しろい',
  'すごい',
  'すずしい',
  'すばらしい',
  'せがたかい',
  'せまい',
  'たかい',
  'ただしい',
  'たのしい',
  'ちいさい',
  'ちかい',
  'ちょうしがいい',
  'ちょうしがわるい',
  'ちょうどいい',
  'つまらない',
  'つめたい',
  'つよい',
  'つごうがいい',
  'つごうがわるい',
  'とおい',
  'ながい',
  'にがい',
  'ねむい',
  'はずかしい',
  'はやい',
  'ひくい',
  'ひどい',
  'ひろい',
  'ふとい',
  'ふるい',
  'ほしい',
  'ほそい',
  'まずい',
  'まるい',
  'みじかい',
  'むずかしい',
  'めずらしい',
  'やさしい',
  'やすい',
  'やわらかい',
  'よい',
  'よわい',
  'わかい',
  'わるい',
]);

/** Phó từ, câu chào, công thức thư — không phải N/V/A. */
const OTHER_EXACT = new Set([
  'はい',
  'たいてい',
  'だいたい',
  'このくらい',
  'どのくらい',
  'いっしょうけんめい',
  'はいけい',
]);

export function compactKana(kana: string): string {
  return kana
    .replace(/[\s　]/g, '')
    .replace(/［な］|\[な\]|［ナ］/g, '')
    .replace(/［お］|\[お\]/g, 'お')
    .replace(/[／/]/g, '')
    .trim();
}

/**
 * Loại từ lưu trong DB: id tiếng Anh ('noun', 'verb'…) hoặc nhãn tiếng Việt
 * ("danh từ", "động từ nhóm 1", "danh từ, động từ する"…). Nhãn nhiều loại lấy loại đầu tiên.
 */
export function parseStoredWordClass(
  value: string | null | undefined,
): MinnaWordClass | null {
  if (WORD_CLASS_TABS.some((tab) => tab.id === value)) {
    return value as MinnaWordClass;
  }
  const first = value?.split(',')[0]?.trim().toLowerCase();
  if (!first) return null;
  if (first.startsWith('danh từ')) return 'noun';
  if (first.startsWith('tính từ i')) return 'i-adj';
  if (first.startsWith('tính từ na')) return 'na-adj';
  if (first.startsWith('động từ')) return 'verb';
  // cụm từ, cụm động từ, phó từ, trợ từ, thán từ, hậu tố…
  return 'other';
}

export function classifyMinnaWord(input: {
  kana: string;
  kanji?: string | null;
  partOfSpeech?: string | null;
}): MinnaWordClass {
  const stored = parseStoredWordClass(input.partOfSpeech);
  if (stored) return stored;

  const kana = input.kana.trim();
  const kanji = (input.kanji ?? '').trim();
  const blob = `${kana}${kanji}`;

  if (/[。！？]/.test(kana) || /[。！？]/.test(kanji)) return 'other';
  if (/^[～〜－\-~]/.test(kana) || /^[～〜－\-~]/.test(kanji)) return 'other';
  if (/［な］|\[な\]/.test(blob)) return 'na-adj';

  const compact = compactKana(kana);
  if (compact.endsWith('ます')) return 'verb';
  if (OTHER_EXACT.has(compact)) return 'other';
  if (I_ADJECTIVES.has(compact)) return 'i-adj';
  if (compact.endsWith('しい') && compact.length >= 4) return 'i-adj';
  return 'noun';
}

export function wordClassLabel(wordClass: MinnaWordClass): string {
  switch (wordClass) {
    case 'noun':
      return 'Danh từ';
    case 'i-adj':
      return 'Tính từ い';
    case 'na-adj':
      return 'Tính từ な';
    case 'verb':
      return 'Động từ';
    default:
      return 'Khác';
  }
}
