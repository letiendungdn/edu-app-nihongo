import { splitKanaIntoMora } from './kana';
import { kanaToRomaji } from './kanaToRomaji';
import { hasKanji, toFurigana, type FuriganaSegment } from './toFurigana';

/** Trợ từ / cụm cố định thường gặp ở N5. */
const PARTICLE_META: Record<string, { gloss: string; pos: string; detail: string }> = {
  は: {
    gloss: 'Trợ từ chủ đề (wa), đánh dấu phần đang nói đến.',
    pos: 'Trợ từ chủ đề',
    detail: 'Topic marker — đánh dấu chủ đề của câu.',
  },
  が: {
    gloss: 'Trợ từ chủ ngữ / nhấn mạnh đối tượng.',
    pos: 'Trợ từ chủ ngữ',
    detail: 'Subject / focus marker.',
  },
  を: {
    gloss: 'Trợ từ tân ngữ trực tiếp (o), đối tượng của hành động.',
    pos: 'Trợ từ tân ngữ',
    detail: 'Direct object marker.',
  },
  に: {
    gloss: 'Trợ từ đích / thời điểm / đối tượng gián tiếp.',
    pos: 'Trợ từ',
    detail: 'Destination / time / indirect object.',
  },
  で: {
    gloss: 'Trợ từ nơi diễn ra hành động hoặc phương tiện.',
    pos: 'Trợ từ',
    detail: 'Place of action / means.',
  },
  と: {
    gloss: 'Trợ từ “với / và” hoặc mở phần trích dẫn.',
    pos: 'Trợ từ',
    detail: 'With / and / quotation.',
  },
  も: {
    gloss: 'Trợ từ “cũng”.',
    pos: 'Trợ từ',
    detail: 'Also / too.',
  },
  へ: {
    gloss: 'Trợ từ hướng đi (e).',
    pos: 'Trợ từ hướng',
    detail: 'Direction marker (e).',
  },
  から: {
    gloss: 'Trợ từ “từ / vì”.',
    pos: 'Trợ từ',
    detail: 'From / because.',
  },
  まで: {
    gloss: 'Trợ từ “đến / tới”.',
    pos: 'Trợ từ',
    detail: 'Until / to.',
  },
  より: {
    gloss: 'Trợ từ so sánh “hơn”.',
    pos: 'Trợ từ',
    detail: 'Than (comparison).',
  },
  の: {
    gloss: 'Trợ từ sở hữu / liên kết danh từ.',
    pos: 'Trợ từ sở hữu',
    detail: 'Possessive / noun linker.',
  },
  です: {
    gloss: 'Động từ copula thể lịch sự (là / thì).',
    pos: 'Hệ từ / đuôi lịch sự',
    detail: 'Polite copula — is / am / are.',
  },
  ます: {
    gloss: 'Hậu tố lịch sự của động từ nhóm I/II.',
    pos: 'Hậu tố lịch sự',
    detail: 'Polite verb ending.',
  },
  でした: {
    gloss: 'Thể quá khứ lịch sự của です.',
    pos: 'Hệ từ quá khứ',
    detail: 'Past polite copula.',
  },
  ません: {
    gloss: 'Phủ định lịch sự của động từ -masu.',
    pos: 'Phủ định lịch sự',
    detail: 'Polite negative verb ending.',
  },
};

/** Từ thường gặp trong câu ví dụ N5 — bổ sung nghĩa cho thẻ Clean Typography. */
const COMMON_WORDS: Record<
  string,
  { gloss: string; pos: string; detail: string; reading?: string }
> = {
  私: {
    gloss: 'Từ đang học: tôi.',
    pos: 'Đại từ',
    detail: 'Tôi (I, me) · Kanji: Tư (riêng tư, cá nhân)',
    reading: 'わたし',
  },
  学生: {
    gloss: 'Học sinh, sinh viên.',
    pos: 'Danh từ',
    detail: 'Học sinh, sinh viên (student)',
    reading: 'がくせい',
  },
  先生: {
    gloss: 'Thầy giáo, cô giáo.',
    pos: 'Danh từ',
    detail: 'Teacher',
    reading: 'せんせい',
  },
  人: {
    gloss: 'Người.',
    pos: 'Danh từ',
    detail: 'Person / people',
    reading: 'ひと',
  },
  日本: {
    gloss: 'Nhật Bản.',
    pos: 'Danh từ',
    detail: 'Japan',
    reading: 'にほん',
  },
  本: {
    gloss: 'Sách.',
    pos: 'Danh từ',
    detail: 'Book',
    reading: 'ほん',
  },
  方: {
    gloss: 'Vị / người (kính ngữ).',
    pos: 'Danh từ kính ngữ',
    detail: 'Person (polite) — かた',
    reading: 'かた',
  },
  木村: {
    gloss: 'Họ Kimura (tên người).',
    pos: 'Tên riêng',
    detail: 'Family name: Kimura',
    reading: 'きむら',
  },
};

const PARTICLE_KEYS = Object.keys(PARTICLE_META).sort((a, b) => b.length - a.length);

export type ExampleAnalysisPart = {
  surface: string;
  reading?: string;
  romaji?: string;
  /** Romaji tách mora: wa-ta-shi */
  moraRomaji?: string;
  gloss: string;
  pos: string;
  detail: string;
  kind: 'kanji' | 'particle' | 'other';
};

export type ExampleAnalysis = {
  lede: string;
  /** Romaji kiểu typography: Wa-ta-shi wa ga-ku-sei de-su. */
  typedRomaji: string;
  parts: ExampleAnalysisPart[];
  /** Phần dùng cho thẻ Clean Typography (bỏ dấu câu thuần). */
  cards: ExampleAnalysisPart[];
  kanjiChars: string[];
};

function capitalizeRomaji(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function particleRomaji(surface: string): string | undefined {
  const clean = surface.replace(/[。！？、．，\s]+/g, '');
  if (clean === 'は') return 'wa';
  if (clean === 'へ') return 'e';
  if (clean === 'を') return 'o';
  return undefined;
}

/**
 * Romaji tách nhịp kiểu typography: わたし → wa-ta-shi, がくせい → ga-ku-sei.
 * Gộp e+i / o+u (せい, こう) thành một khúc cho gần cách viết Hepburn trong ảnh.
 */
export function moraHyphenRomaji(kana: string): string {
  const morae = splitKanaIntoMora(kana);
  if (!morae.length) return kanaToRomaji(kana);
  const parts: string[] = [];
  for (const m of morae) {
    if (m.kind === 'sokuon') continue;
    let r =
      m.text === 'は' || m.text === 'ハ'
        ? 'wa'
        : m.text === 'へ' || m.text === 'ヘ'
          ? 'e'
          : m.text === 'を' || m.text === 'ヲ'
            ? 'o'
            : kanaToRomaji(m.text);
    if (!r) continue;
    const prev = parts[parts.length - 1];
    if (prev && ((prev.endsWith('e') && r === 'i') || (prev.endsWith('o') && r === 'u'))) {
      parts[parts.length - 1] = `${prev}${r}`;
    } else {
      parts.push(r);
    }
  }
  return parts.join('-');
}

function tokenRomaji(
  surface: string,
  reading: string | undefined,
  kind: ExampleAnalysisPart['kind'],
): string | undefined {
  if (kind === 'particle') {
    const special = particleRomaji(surface);
    if (special) return special;
  }
  if (!reading) return undefined;
  return kanaToRomaji(reading);
}

function splitKanaRun(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const key = PARTICLE_KEYS.find((k) => text.startsWith(k, i));
    if (key) {
      out.push(key);
      i += key.length;
      continue;
    }
    let j = i + 1;
    while (j < text.length && !PARTICLE_KEYS.some((k) => text.startsWith(k, j))) j += 1;
    out.push(text.slice(i, j));
    i = j;
  }
  return out.filter(Boolean);
}

function metaForKanji(
  surface: string,
  reading: string | undefined,
  focusKanji: string | null | undefined,
  focusMeaning: string | null | undefined,
): Pick<ExampleAnalysisPart, 'gloss' | 'pos' | 'detail'> {
  const known = COMMON_WORDS[surface];
  if (focusKanji && surface.includes(focusKanji) && focusMeaning?.trim()) {
    return {
      gloss: `Từ đang học: ${focusMeaning.trim()}.`,
      pos: known?.pos || 'Từ vựng',
      detail: known?.detail || focusMeaning.trim(),
    };
  }
  if (known) {
    return { gloss: known.gloss, pos: known.pos, detail: known.detail };
  }
  if (reading) {
    return {
      gloss: `Cụm kanji đọc ${reading}.`,
      pos: 'Cụm kanji',
      detail: `Cách đọc: ${reading}`,
    };
  }
  return { gloss: 'Cụm kanji trong câu.', pos: 'Cụm kanji', detail: 'Kanji trong câu ví dụ.' };
}

function metaForToken(surface: string): Pick<ExampleAnalysisPart, 'gloss' | 'pos' | 'detail'> {
  const trimmed = surface.replace(/[。！？、．，\s]+$/g, '');
  const particle = PARTICLE_META[trimmed] || PARTICLE_META[surface];
  if (particle) return particle;
  if (/^[。！？、．，\s]+$/.test(surface)) {
    return {
      gloss: 'Dấu câu ngắt nhịp / kết thúc câu.',
      pos: 'Dấu câu',
      detail: 'Kết thúc câu.',
    };
  }
  const known = COMMON_WORDS[trimmed];
  if (known) return { gloss: known.gloss, pos: known.pos, detail: known.detail };
  return { gloss: 'Thành phần trong câu.', pos: 'Thành phần', detail: surface };
}

function partsFromSegments(
  segments: FuriganaSegment[],
  focusKanji?: string | null,
  focusMeaning?: string | null,
): ExampleAnalysisPart[] {
  const parts: ExampleAnalysisPart[] = [];
  for (const [text, ruby] of segments) {
    if (hasKanji(text)) {
      const reading = ruby || COMMON_WORDS[text]?.reading || undefined;
      const romaji = reading ? kanaToRomaji(reading) : undefined;
      const meta = metaForKanji(text, reading, focusKanji, focusMeaning);
      parts.push({
        surface: text,
        reading,
        romaji,
        moraRomaji: reading ? moraHyphenRomaji(reading) : undefined,
        ...meta,
        kind: 'kanji',
      });
      continue;
    }
    for (const token of splitKanaRun(text)) {
      const clean = token.replace(/[。！？、．，]+/g, '');
      const isParticle = Boolean(PARTICLE_META[clean] || PARTICLE_META[token]);
      const kind: ExampleAnalysisPart['kind'] = isParticle ? 'particle' : 'other';
      const reading = /[ぁ-んァ-ンー]/.test(token)
        ? token.replace(/[。！？、．，\s]+/g, '')
        : undefined;
      const romaji = tokenRomaji(token, reading, kind);
      const specialParticle = particleRomaji(token);
      const moraRomaji = specialParticle
        ? specialParticle
        : reading
          ? moraHyphenRomaji(reading)
          : romaji;
      parts.push({
        surface: token,
        reading: reading || undefined,
        romaji,
        moraRomaji,
        ...metaForToken(token),
        kind,
      });
    }
  }
  return parts.filter((p) => p.surface.trim().length > 0);
}

function kanjiCharsOf(text: string): string[] {
  return [...new Set([...text].filter((ch) => hasKanji(ch)))];
}

function buildTypedRomaji(parts: ExampleAnalysisPart[]): string {
  const chunks = parts
    .filter((p) => !/^[。！？、．，\s]+$/.test(p.surface))
    .map((p) => p.moraRomaji || p.romaji)
    .filter((r): r is string => Boolean(r?.trim()));
  if (!chunks.length) return '';
  return `${capitalizeRomaji(chunks.join(' '))}.`;
}

/** Khi không ghép được furigana: vẫn tách trợ từ / cụm để có thẻ phân tích. */
function partsFromPlainJa(
  ja: string,
  focusKanji?: string | null,
  focusMeaning?: string | null,
): ExampleAnalysisPart[] {
  const tokens = splitKanaRun(ja);
  return tokens
    .filter((t) => t.trim().length > 0)
    .map((token) => {
      if (hasKanji(token)) {
        const meta = metaForKanji(token, undefined, focusKanji, focusMeaning);
        return {
          surface: token,
          ...meta,
          kind: 'kanji' as const,
        };
      }
      const clean = token.replace(/[。！？、．，\s]+/g, '');
      const isParticle = Boolean(PARTICLE_META[clean] || PARTICLE_META[token]);
      const kind: ExampleAnalysisPart['kind'] = isParticle ? 'particle' : 'other';
      const reading = /[ぁ-んァ-ンー]/.test(token)
        ? token.replace(/[。！？、．，\s]+/g, '')
        : undefined;
      const romaji = tokenRomaji(token, reading, kind);
      const specialParticle = particleRomaji(token);
      return {
        surface: token,
        reading: reading || undefined,
        romaji,
        moraRomaji: specialParticle || (reading ? moraHyphenRomaji(reading) : romaji),
        ...metaForToken(token),
        kind,
      };
    });
}

/**
 * Xây nội dung phân tích câu ví dụ từ ja + kana (+ nghĩa VI / từ đang học).
 */
export function buildExampleAnalysis(
  ja: string,
  kana: string | null | undefined,
  vi: string | null | undefined,
  focus?: { kanji?: string | null; meaning?: string | null },
): ExampleAnalysis {
  const segments = kana?.trim() ? toFurigana(ja, kana.trim()) : null;
  const parts = segments
    ? partsFromSegments(segments, focus?.kanji, focus?.meaning)
    : partsFromPlainJa(ja, focus?.kanji, focus?.meaning);
  const cards = parts.filter((p) => !/^[。！？、．，\s]+$/.test(p.surface));
  const readingLine = kana?.trim().replace(/[\s　]+/g, '') || '';
  const typedRomaji = buildTypedRomaji(parts);
  const romajiPlain = parts
    .map((p) => p.romaji)
    .filter((r): r is string => Boolean(r?.trim()))
    .join(' ');
  const romaji = typedRomaji
    ? typedRomaji.replace(/\.$/, '')
    : romajiPlain
      ? capitalizeRomaji(romajiPlain)
      : readingLine
        ? capitalizeRomaji(kanaToRomaji(readingLine).replace(/[。！？]/g, '').trim())
        : '';
  const viText = vi?.trim() || '';
  const paren =
    romaji && viText ? `${romaji}. — ${viText}` : romaji || viText || readingLine;
  const lede = paren ? `${ja} (${paren})` : ja;

  return {
    lede,
    typedRomaji: typedRomaji || (romaji ? `${romaji}.` : ''),
    parts,
    cards,
    kanjiChars: kanjiCharsOf(ja),
  };
}

export function exampleFuriganaSegments(
  ja: string,
  kana: string | null | undefined,
): FuriganaSegment[] | null {
  if (!kana?.trim()) return null;
  return toFurigana(ja, kana.trim());
}
