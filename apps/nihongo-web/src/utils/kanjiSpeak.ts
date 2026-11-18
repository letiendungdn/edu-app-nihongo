type KanjiSpeakSource = {
  character?: string;
  onyomi?: string | null;
  kunyomi?: string | null;
  vocabularies?: Array<{ id?: number; reading?: string | null }>;
};

export type KanjiReadingToken = {
  display: string;
  speak: string;
};

/** Đánh dấu mục đang đọc để tô on/kun/từ vựng trên thẻ kanji. */
export type KanjiSpokenMark =
  | { kind: 'reading'; tone: 'on' | 'kun'; index: number }
  | { kind: 'vocab'; id: number };

export type KanjiSpeakClip = {
  text: string;
  mark: KanjiSpokenMark | null;
};

function speakForm(display: string): string {
  return display.replace(/-/g, '').trim();
}

export function splitKanjiReadingField(raw: string | null | undefined): KanjiReadingToken[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,、;／/]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((display) => ({ display, speak: speakForm(display) }))
    .filter((part) => part.speak);
}

export function getKanjiReadingGroups(kanji: KanjiSpeakSource): KanjiReadingToken[][] {
  return [splitKanjiReadingField(kanji.onyomi), splitKanjiReadingField(kanji.kunyomi)].filter(
    (group) => group.length > 0,
  );
}

/**
 * Hàng đợi phát âm một chữ: on → kun → từ vựng, kèm mark để UI tô đúng chỗ đang đọc
 * (giống lúc vào trang / bấm «Từ vựng»).
 */
export function getKanjiSpeakClips(kanji: KanjiSpeakSource): KanjiSpeakClip[] {
  const clips: KanjiSpeakClip[] = [];
  const add = (text: string | null | undefined, mark: KanjiSpokenMark | null) => {
    const value = speakForm(text ?? '');
    if (!value) return;
    clips.push({ text: value, mark });
  };

  splitKanjiReadingField(kanji.onyomi).forEach((token, index) =>
    add(token.speak, { kind: 'reading', tone: 'on', index }),
  );
  splitKanjiReadingField(kanji.kunyomi).forEach((token, index) =>
    add(token.speak, { kind: 'reading', tone: 'kun', index }),
  );
  for (const vocab of kanji.vocabularies ?? []) {
    if (vocab.id == null) {
      add(vocab.reading, null);
      continue;
    }
    add(vocab.reading, { kind: 'vocab', id: vocab.id });
  }
  if (!clips.length && kanji.character) add(kanji.character, null);
  return clips;
}

export function getKanjiSpeakItems(kanji: KanjiSpeakSource): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const clip of getKanjiSpeakClips(kanji)) {
    if (seen.has(clip.text)) continue;
    seen.add(clip.text);
    out.push(clip.text);
  }
  return out;
}
