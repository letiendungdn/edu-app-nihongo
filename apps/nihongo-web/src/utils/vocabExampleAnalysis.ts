import { splitKanaIntoMora } from './kana';
import { kanaToRomaji } from './kanaToRomaji';
import { hasKanji, toFurigana, type FuriganaSegment } from './toFurigana';

export type VocabAnalysisTokenMeta = {
  surface: string;
  kind: 'particle' | 'common' | 'greeting';
  reading: string | null;
  romaji: string | null;
  gloss: string;
  pos: string;
  detail: string;
};

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

function particleRomaji(
  surface: string,
  particles: Record<string, VocabAnalysisTokenMeta>,
): string | undefined {
  const clean = surface.replace(/[。！？、．，\s]+/g, '');
  const known = particles[clean];
  if (!known?.reading || !known.romaji) return undefined;
  return known.romaji === kanaToRomaji(known.reading) ? undefined : known.romaji;
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
    const r = kanaToRomaji(m.text);
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
  metadata: Record<string, VocabAnalysisTokenMeta>,
): string | undefined {
  if (kind === 'particle') {
    const special = particleRomaji(surface, metadata);
    if (special) return special;
  }
  const known = metadata[surface];
  if (known?.romaji) return known.romaji;
  if (!reading) return undefined;
  return kanaToRomaji(reading);
}

function splitKanaRun(text: string, metadata: VocabAnalysisTokenMeta[]): string[] {
  const out: string[] = [];
  const particleKeys = metadata
    .filter((token) => token.kind === 'particle')
    .map((token) => token.surface)
    .sort((a, b) => b.length - a.length);
  const commonKeys = new Set(
    metadata.filter((token) => token.kind === 'common').map((token) => token.surface),
  );
  const greetingKeys = metadata
    .filter((token) => token.kind === 'greeting')
    .map((token) => token.surface)
    .sort((a, b) => b.length - a.length);
  let i = 0;
  while (i < text.length) {
    let greetingMatch: { index: number; key: string } | null = null;
    let particleMatch: { index: number; key: string } | null = null;
    let commonMatch: { index: number; key: string } | null = null;

    for (let j = i; j < text.length; j += 1) {
      if (!greetingMatch) {
        const key = greetingKeys.find((candidate) => text.startsWith(candidate, j));
        if (key) greetingMatch = { index: j, key };
      }
      if (!particleMatch) {
        const key = particleKeys.find((candidate) => text.startsWith(candidate, j));
        if (key) particleMatch = { index: j, key };
      }
      if (!commonMatch) {
        for (let end = text.length; end > j; end -= 1) {
          const key = text.slice(j, end);
          if (commonKeys.has(key)) {
            commonMatch = { index: j, key };
            break;
          }
        }
      }
      if (greetingMatch && particleMatch && commonMatch) break;
    }

    if (!greetingMatch && !particleMatch && !commonMatch) {
      out.push(text.slice(i));
      break;
    }

    const match = [greetingMatch, particleMatch, commonMatch]
      .filter((candidate): candidate is { index: number; key: string } => candidate !== null)
      .sort((a, b) => a.index - b.index || b.key.length - a.key.length)[0];
    if (!match) break;

    if (match.index > i) out.push(text.slice(i, match.index));
    out.push(match.key);
    i = match.index + match.key.length;
  }
  return out.filter(Boolean);
}

function metaForKanji(
  surface: string,
  reading: string | undefined,
  focusKanji: string | null | undefined,
  focusMeaning: string | null | undefined,
  metadata: Record<string, VocabAnalysisTokenMeta>,
): Pick<ExampleAnalysisPart, 'gloss' | 'pos' | 'detail'> {
  const known = metadata[surface];
  if (focusKanji && surface.includes(focusKanji) && focusMeaning?.trim()) {
    return {
      gloss: focusMeaning.trim(),
      pos: known?.pos || 'Từ vựng',
      detail: focusMeaning.trim(),
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

function metaForToken(
  surface: string,
  metadata: Record<string, VocabAnalysisTokenMeta>,
): Pick<ExampleAnalysisPart, 'gloss' | 'pos' | 'detail'> {
  const trimmed = surface.replace(/[。！？、．，\s]+$/g, '');
  const particle = metadata[trimmed] || metadata[surface];
  if (particle) return particle;
  if (/^[。！？、．，\s]+$/.test(surface)) {
    return {
      gloss: 'Dấu câu ngắt nhịp / kết thúc câu.',
      pos: 'Dấu câu',
      detail: 'Kết thúc câu.',
    };
  }
  const known = metadata[trimmed];
  if (known) return { gloss: known.gloss, pos: known.pos, detail: known.detail };
  return { gloss: 'Thành phần trong câu.', pos: 'Thành phần', detail: surface };
}

function partsFromSegments(
  segments: FuriganaSegment[],
  focusKanji?: string | null,
  focusMeaning?: string | null,
  metadata: VocabAnalysisTokenMeta[] = [],
): ExampleAnalysisPart[] {
  const metadataBySurface = Object.fromEntries(metadata.map((token) => [token.surface, token]));
  const parts: ExampleAnalysisPart[] = [];
  for (const [text, ruby] of segments) {
    if (hasKanji(text)) {
      const reading = ruby || metadataBySurface[text]?.reading || undefined;
      const romaji = reading ? kanaToRomaji(reading) : undefined;
      const meta = metaForKanji(text, reading, focusKanji, focusMeaning, metadataBySurface);
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
    for (const token of splitKanaRun(text, metadata)) {
      const clean = token.replace(/[。！？、．，]+/g, '');
      const isParticle = Boolean(
        metadataBySurface[clean]?.kind === 'particle' ||
          metadataBySurface[token]?.kind === 'particle',
      );
      const kind: ExampleAnalysisPart['kind'] = isParticle ? 'particle' : 'other';
      const reading = /[ぁ-んァ-ンー]/.test(token)
        ? token.replace(/[。！？、．，\s]+/g, '')
        : undefined;
      const romaji = tokenRomaji(token, reading, kind, metadataBySurface);
      const specialParticle = particleRomaji(token, metadataBySurface);
      const known = metadataBySurface[token];
      const moraRomaji =
        known?.kind === 'greeting' && known.romaji
          ? known.romaji
          : specialParticle
            ? specialParticle
            : reading
              ? moraHyphenRomaji(reading)
              : romaji;
      parts.push({
        surface: token,
        reading: reading || undefined,
        romaji,
        moraRomaji,
        ...metaForToken(token, metadataBySurface),
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
  metadata: VocabAnalysisTokenMeta[] = [],
): ExampleAnalysisPart[] {
  const metadataBySurface = Object.fromEntries(metadata.map((token) => [token.surface, token]));
  const tokens = splitKanaRun(ja, metadata);
  return tokens
    .filter((t) => t.trim().length > 0)
    .map((token) => {
      if (hasKanji(token)) {
        const known = metadataBySurface[token];
        const meta = metaForKanji(token, undefined, focusKanji, focusMeaning, metadataBySurface);
        return {
          surface: token,
          reading: known?.reading || undefined,
          romaji: known?.romaji || undefined,
          moraRomaji: known?.reading ? moraHyphenRomaji(known.reading) : known?.romaji || undefined,
          ...meta,
          kind: 'kanji' as const,
        };
      }
      const clean = token.replace(/[。！？、．，\s]+/g, '');
      const isParticle = Boolean(
        metadataBySurface[clean]?.kind === 'particle' ||
          metadataBySurface[token]?.kind === 'particle',
      );
      const kind: ExampleAnalysisPart['kind'] = isParticle ? 'particle' : 'other';
      const reading = /[ぁ-んァ-ンー]/.test(token)
        ? token.replace(/[。！？、．，\s]+/g, '')
        : undefined;
      const romaji = tokenRomaji(token, reading, kind, metadataBySurface);
      const specialParticle = particleRomaji(token, metadataBySurface);
      const known = metadataBySurface[token];
      return {
        surface: token,
        reading: reading || undefined,
        romaji,
        moraRomaji:
          (known?.kind === 'greeting' ? known.romaji : null) ||
          specialParticle ||
          (reading ? moraHyphenRomaji(reading) : romaji),
        ...metaForToken(token, metadataBySurface),
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
  metadata: VocabAnalysisTokenMeta[] = [],
): ExampleAnalysis {
  const segments = kana?.trim() ? toFurigana(ja, kana.trim()) : null;
  const parts = segments
    ? partsFromSegments(segments, focus?.kanji, focus?.meaning, metadata)
    : partsFromPlainJa(ja, focus?.kanji, focus?.meaning, metadata);
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
