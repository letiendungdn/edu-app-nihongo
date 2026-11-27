export type GrammarMatchInput = {
  id: number;
  pattern: string;
  meaning: string;
  lessonNumber?: number;
};

export type GrammarExampleMatch = GrammarMatchInput & {
  skeleton: string;
};

/**
 * Rút khung chữ Nhật từ mẫu (bỏ N1/N2/S/～), bung dạng （では） thành vài biến thể.
 * Ví dụ: "N1 は N2 です" → ["はです"]; "じゃ（では）ありません" → ["じゃありません","ではあります"…]
 */
export function patternSkeletons(pattern: string): string[] {
  const base = pattern
    .replace(/N\d*\s*[（(][^）)]*[）)]/gi, '')
    .replace(/N\d*/gi, '')
    .replace(/(^|[^A-Za-z])S(?=[^A-Za-z]|$)/g, '$1')
    .replace(/[〜～＋+\s　]/g, '')
    .trim();
  if (!base) return [];

  // じゃ（では）ありません → じゃありません | ではありません (giữ phần đứng trước, vd. は)
  const paren = base.match(/^(.*?)([\u3040-\u30FFー]+)（([^）]+)）(.*)$/);
  if (paren) {
    const [, prefix, primary, alt, suffix] = paren;
    return [`${prefix}${primary}${suffix}`, `${prefix}${alt}${suffix}`]
      .map((s) => s.replace(/[（）()]/g, ''))
      .filter(Boolean);
  }
  const slashAlternatives = base.split(/[／/]/);
  if (slashAlternatives.length > 1) {
    const first = slashAlternatives[0];
    const verb = first.match(/(行きます|来ます|帰ります)$/)?.[0];
    if (verb) {
      const prefix = first.slice(0, -verb.length);
      return [verb, ...slashAlternatives.slice(1)]
        .map((alternative) => `${prefix}${alternative}`)
        .map((s) => s.replace(/[（）()]/g, ''))
        .filter(Boolean);
    }
    return slashAlternatives.map((s) => s.replace(/[（）()]/g, '')).filter(Boolean);
  }
  return [base.replace(/[（）()]/g, '')].filter(Boolean);
}

/** Skeleton xuất hiện trong câu theo đúng thứ tự ký tự (cho phép chen chữ khác). */
export function skeletonInSentence(skeleton: string, ja: string): boolean {
  if (!skeleton) return false;
  const hay = ja.replace(/[\s　]/g, '');
  // Tránh khớp giả: の trong あの／この… không phải mẫu N1 の N2
  if (skeleton === 'の') {
    return /[\u4E00-\u9FFFァ-ヶー0-9]の[\u4E00-\u9FFFァ-ヶぁ-ん]/.test(hay);
  }
  // か nghi vấn: ưu tiên cuối câu
  if (skeleton === 'か') {
    return /か[。．？?\s]*$/.test(hay) || /ですか/.test(hay);
  }
  let idx = 0;
  for (const ch of skeleton) {
    const at = hay.indexOf(ch, idx);
    if (at < 0) return false;
    idx = at + 1;
  }
  return true;
}

/** Câu ví dụ có dùng mẫu ngữ pháp này không. */
export function exampleMatchesGrammar(ja: string, pattern: string): boolean {
  return patternSkeletons(pattern).some((sk) => skeletonInSentence(sk, ja));
}

/** Các mẫu ngữ pháp của bài khớp câu ví dụ — mẫu dài / cụ thể hơn đứng trước. */
export function matchGrammarsInExample(
  ja: string,
  grammars: GrammarMatchInput[],
): GrammarExampleMatch[] {
  if (!ja.trim() || !grammars.length) return [];
  const hits: GrammarExampleMatch[] = [];
  for (const g of grammars) {
    const skeletons = patternSkeletons(g.pattern);
    const hit = skeletons.find((sk) => skeletonInSentence(sk, ja));
    if (!hit) continue;
    hits.push({ ...g, skeleton: hit });
  }
  hits.sort((a, b) => b.skeleton.length - a.skeleton.length || a.id - b.id);
  // Tránh trùng id
  const seen = new Set<number>();
  return hits.filter((h) => {
    if (seen.has(h.id)) return false;
    seen.add(h.id);
    return true;
  });
}

export function grammarLessonHref(lessonNumber: number, grammarId?: number): string {
  const base = `/grammar?lesson=${lessonNumber}`;
  return grammarId != null ? `${base}&g=${grammarId}` : base;
}
