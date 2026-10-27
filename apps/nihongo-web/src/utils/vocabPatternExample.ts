/**
 * Map example sentences from the API (`examples`, or the first one as exampleJa / exampleKana / exampleVi).
 * Sentences live in DB (VocabularyExample) — do not rebuild them on the client.
 */

export type VocabPatternSource = {
  kanji?: string | null;
  kana?: string | null;
  exampleJa?: string | null;
  exampleKana?: string | null;
  exampleVi?: string | null;
  examples?: Array<{ ja: string; kana?: string | null; vi?: string | null }>;
};

export type VocabPatternExample = {
  ja: string;
  kana?: string;
  vi: string;
  speak: string;
};

const WAVE = /[～〜]/;

export function isVocabPattern(vocab: {
  kanji?: string | null;
  kana?: string | null;
  meaning?: string | null;
}): boolean {
  return Boolean(
    (vocab.kanji && WAVE.test(vocab.kanji)) ||
      (vocab.kana && WAVE.test(vocab.kana)) ||
      (vocab.meaning && WAVE.test(vocab.meaning)),
  );
}

function toExample(
  jaRaw: string | null | undefined,
  kanaRaw: string | null | undefined,
  viRaw: string | null | undefined,
): VocabPatternExample | null {
  const ja = jaRaw?.trim();
  if (!ja) return null;
  const kana = kanaRaw?.trim() || undefined;
  return {
    ja,
    kana,
    vi: viRaw?.trim() || '',
    speak: (kana || ja).replace(/[。！？]/g, ''),
  };
}

export function getVocabExamples(vocab: VocabPatternSource): VocabPatternExample[] {
  if (vocab.examples?.length) {
    return vocab.examples
      .map((e) => toExample(e.ja, e.kana, e.vi))
      .filter((e): e is VocabPatternExample => e !== null);
  }
  const single = toExample(vocab.exampleJa, vocab.exampleKana, vocab.exampleVi);
  return single ? [single] : [];
}

/** @deprecated Dùng getVocabExamples */
export function getVocabPatternExamples(
  vocab: VocabPatternSource,
): VocabPatternExample[] | null {
  const examples = getVocabExamples(vocab);
  return examples.length ? examples : null;
}
