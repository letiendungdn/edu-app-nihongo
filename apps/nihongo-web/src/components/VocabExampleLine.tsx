'use client';

import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ExampleEnglish } from './VocabReading';
import KanjiStructureButton from './KanjiStructureButton';
import SpeakerIcon from './SpeakerIcon';
import StrokeOrder from './StrokeOrder';
import VocabPicture from './VocabPicture';
import { highlightKeys } from '../utils/grammarHighlight';
import { getStrokeText } from '../utils/japanese';
import { useGrammarSearch } from '../api/hooks/use-grammar';
import {
  buildExampleAnalysis,
  exampleFuriganaSegments,
} from '../utils/vocabExampleAnalysis';
import { useVocabAnalysisMeta } from '../api/hooks/use-vocab';
import {
  grammarLessonHref,
  matchGrammarsInExample,
  type GrammarExampleMatch,
  type GrammarMatchInput,
} from '../utils/matchGrammarsInExample';
import type { VocabPatternExample } from '../utils/vocabPatternExample';
import type { FuriganaSegment } from '../utils/toFurigana';
import './VocabExampleLine.css';

const DEFAULT_KEYS = ['から', 'まで', 'より', 'は', 'が', 'を', 'に', 'で', 'と', 'も', 'へ'];

type AnalysisTab = 'detailed' | 'clean';

function renderHighlighted(text: string, keys: string[], keyPrefix: string): ReactNode[] {
  return highlightKeys(text, keys).map((seg, i) =>
    seg.kind === 'key' ? (
      <mark key={`${keyPrefix}-${i}`} className="vocab-examples__hl">
        {seg.text}
      </mark>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{seg.text}</span>
    ),
  );
}

function renderFurigana(
  ja: string,
  segments: FuriganaSegment[] | null,
  keys: string[],
): ReactNode {
  if (!segments) return <>{renderHighlighted(ja, keys, 'j')}</>;
  return (
    <>
      {segments.map(([text, ruby], i) =>
        ruby ? (
          <ruby key={i}>
            {renderHighlighted(text, keys, `r${i}`)}
            <rt>{ruby}</rt>
          </ruby>
        ) : (
          <span key={i}>{renderHighlighted(text, keys, `p${i}`)}</span>
        ),
      )}
    </>
  );
}

export default function VocabExampleLine({
  example,
  keys = DEFAULT_KEYS,
  focusKanji,
  focusMeaning,
  focusKana,
  focusRomaji,
  imageUrl,
  lessonNumber,
  lessonGrammars = [],
  grammarLessonNumberById,
  onSpeakJa,
  onSpeakVi,
  onSpeakBoth,
  analysisOpen,
  onToggleAnalysis,
}: {
  example: VocabPatternExample;
  keys?: string[];
  focusKanji?: string | null;
  focusMeaning?: string | null;
  focusKana?: string | null;
  focusRomaji?: string | null;
  imageUrl?: string | null;
  /** Bài hiện tại — để link sang trang ngữ pháp cùng bài. */
  lessonNumber?: number;
  lessonGrammars?: GrammarMatchInput[];
  grammarLessonNumberById?: Record<number, number>;
  onSpeakJa: (e: MouseEvent, text: string) => void;
  onSpeakVi: (e: MouseEvent, text: string) => void;
  onSpeakBoth: (e: MouseEvent, speak: string, vi: string) => void;
  analysisOpen?: boolean;
  onToggleAnalysis?: () => void;
}) {
  const [localOpen, setLocalOpen] = useState(true);
  const [tab, setTab] = useState<AnalysisTab>('clean');
  const [openStrokeIndex, setOpenStrokeIndex] = useState<number | null>(null);
  const [copiedExample, setCopiedExample] = useState(false);
  const { data: analysisMeta = [], isError: analysisMetaError } = useVocabAnalysisMeta();
  const grammarSearchQuery = example.ja.includes('へ') ? 'へ' : '';
  const { data: searchedGrammars = [] } = useGrammarSearch(grammarSearchQuery);
  const open = analysisOpen ?? localOpen;
  const toggleOpen = () => {
    if (onToggleAnalysis) onToggleAnalysis();
    else setLocalOpen((v) => !v);
  };
  const copyExample = async () => {
    try {
      await navigator.clipboard.writeText(example.ja);
      setCopiedExample(true);
      window.setTimeout(() => setCopiedExample(false), 1500);
    } catch {
      setCopiedExample(false);
    }
  };

  const segments = useMemo(
    () => exampleFuriganaSegments(example.ja, example.kana),
    [example.ja, example.kana],
  );
  const analysis = useMemo(
    () =>
      buildExampleAnalysis(example.ja, example.kana, example.vi, {
        kanji: focusKanji,
        meaning: focusMeaning,
      }, analysisMeta),
    [example.ja, example.kana, example.vi, focusKanji, focusMeaning, analysisMeta],
  );
  const grammarLessonLinks = useMemo(
    () =>
      searchedGrammars.flatMap((grammar) => {
        const targetLesson = grammarLessonNumberById?.[grammar.lessonId];
        if (targetLesson == null) return [];
        return [
          {
            id: grammar.id,
            pattern: grammar.pattern,
            meaning: grammar.meaning,
            lessonNumber: targetLesson,
          },
        ];
      }),
    [searchedGrammars, grammarLessonNumberById],
  );
  const grammarHits = useMemo(
    () => matchGrammarsInExample(example.ja, [...lessonGrammars, ...grammarLessonLinks]),
    [example.ja, lessonGrammars, grammarLessonLinks],
  );
  const grammarHrefForHit = (hit?: GrammarExampleMatch) => {
    const targetLesson = hit?.lessonNumber ?? lessonNumber;
    return targetLesson == null ? '/grammar' : grammarLessonHref(targetLesson, hit?.id);
  };

  const picture = (
    <VocabPicture
      word={focusRomaji || undefined}
      meaning={focusMeaning || undefined}
      kana={focusKana || undefined}
      kanji={focusKanji || undefined}
      imageUrl={imageUrl}
      size="sm"
      className="vocab-example-analysis__picture"
      alt={focusKana || example.ja}
    />
  );

  return (
    <li className="vocab-examples__item">
      <div className="vocab-examples__item-main">
        <div className="vocab-examples__line">
          <button
            type="button"
            className="vocab-examples__ja japanese-text"
            title="Bấm để nghe tiếng Nhật"
            aria-label={`Nghe tiếng Nhật: ${example.ja}`}
            onClick={(e) => onSpeakJa(e, example.speak || example.ja)}
          >
            {renderFurigana(example.ja, segments, keys)}
          </button>
          {example.kana && example.kana !== example.ja && !segments ? (
            <span className="vocab-examples__kana japanese-text" title="Cách đọc hiragana">
              {example.kana}
            </span>
          ) : null}
          {example.vi ? (
            <button
              type="button"
              className="vocab-examples__vi"
              title="Bấm để nghe tiếng Việt"
              aria-label={`Nghe tiếng Việt: ${example.vi}`}
              onClick={(e) => onSpeakVi(e, example.vi)}
            >
              {example.vi}
            </button>
          ) : null}
          <ExampleEnglish text={example.en} className="vocab-examples__en" />
        </div>
        <div className="vocab-examples__actions">
          <button
            type="button"
            className="vocab-round-btn vocab-round-btn--sm"
            title="Nghe ví dụ (Nhật rồi Việt)"
            aria-label="Nghe ví dụ (Nhật rồi Việt)"
            onClick={(e) => onSpeakBoth(e, example.speak, example.vi)}
          >
            <SpeakerIcon className="vocab-speaker-icon" size={16} />
          </button>
          <button
            type="button"
            className={`vocab-examples__copy-btn${copiedExample ? ' is-copied' : ''}`}
            title={copiedExample ? 'Đã sao chép' : 'Sao chép câu ví dụ'}
            aria-label={copiedExample ? 'Đã sao chép câu ví dụ' : 'Sao chép câu ví dụ'}
            onClick={() => void copyExample()}
          >
            {copiedExample ? '✓ Đã copy' : 'Copy'}
          </button>
          {lessonNumber != null ? (
            <Link
              href={grammarHrefForHit(grammarHits[0])}
              className="vocab-examples__grammar-jump"
              target="_blank"
              rel="noopener noreferrer"
              title={
                grammarHits[0]
                  ? `Mở ngữ pháp: ${grammarHits[0].pattern}`
                  : `Mở ngữ pháp bài ${lessonNumber}`
              }
            >
              Ngữ pháp →
            </Link>
          ) : null}
          <button
            type="button"
            className={`vocab-examples__analyze${open ? ' is-open' : ''}`}
            aria-expanded={open}
            onClick={toggleOpen}
          >
            {open ? 'Ẩn phân tích' : 'Phân tích ngữ pháp'}
          </button>
        </div>
      </div>

      {lessonNumber != null ? (
        <section
          className="vocab-example-analysis__grammar-links vocab-example-analysis__grammar-links--outside"
          aria-label="Ngữ pháp dùng trong câu ví dụ"
        >
          <h4 className="vocab-example-analysis__title">Ngữ pháp dùng trong câu</h4>
          {grammarHits.length ? (
            <ul className="vocab-example-analysis__grammar-list">
              {grammarHits.map((g) => (
                <li key={g.id}>
                  <Link
                    href={grammarHrefForHit(g)}
                    className="vocab-example-analysis__grammar-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="vocab-example-analysis__grammar-pattern japanese-text">
                      {g.pattern}
                    </span>
                    <span className="vocab-example-analysis__grammar-meaning">{g.meaning}</span>
                    <span className="vocab-example-analysis__grammar-cta">Mở ngữ pháp →</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vocab-example-analysis__grammar-empty">
              Chưa khớp mẫu cụ thể — bấm mở ngữ pháp bài {lessonNumber}.
            </p>
          )}
          <div className="vocab-example-analysis__grammar-actions">
            <Link
              href={grammarHrefForHit(grammarHits[0])}
              className="vocab-example-analysis__grammar-lesson"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ngữ pháp bài {grammarHits[0]?.lessonNumber ?? lessonNumber}
            </Link>
            <Link
              href={`/particles?lesson=${lessonNumber}`}
              className="vocab-example-analysis__grammar-lesson"
              target="_blank"
              rel="noopener noreferrer"
            >
              Luyện trợ từ bài {lessonNumber}
            </Link>
          </div>
        </section>
      ) : null}

      {open ? (
        <div className="vocab-example-analysis" aria-label="Phân tích câu ví dụ">
          {analysisMetaError ? (
            <p className="vocab-example-analysis__meta-error" role="alert">
              Không tải được dữ liệu phân tích từ máy chủ.
            </p>
          ) : null}
          <div className="vocab-example-analysis__tabs" role="tablist" aria-label="Kiểu phân tích">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'detailed'}
              className={`vocab-example-analysis__tab${tab === 'detailed' ? ' is-active' : ''}`}
              onClick={() => setTab('detailed')}
            >
              Detailed Analysis
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'clean'}
              className={`vocab-example-analysis__tab${tab === 'clean' ? ' is-active' : ''}`}
              onClick={() => setTab('clean')}
            >
              Clean typography
            </button>
          </div>

          {tab === 'detailed' ? (
            <div className="vocab-example-analysis__panel" role="tabpanel">
              <div className="vocab-example-analysis__detailed-row">
                <div className="vocab-example-analysis__detailed-copy">
                  {analysis.cards.length ? (
                    <section className="vocab-example-analysis__section">
                      <h4 className="vocab-example-analysis__title">1. Cấu trúc câu</h4>
                      <ul className="vocab-example-analysis__list">
                        {analysis.cards.map((part, i) => (
                          <li key={`${part.surface}-${i}`}>
                            <span className="vocab-example-analysis__surface japanese-text">
                              {part.surface}
                            </span>
                            {part.romaji ? (
                              <span className="vocab-example-analysis__reading">
                                {' '}
                                (<span lang="en">{part.romaji}</span>)
                              </span>
                            ) : null}
                            <span className="vocab-example-analysis__gloss">: {part.gloss}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {analysis.kanjiChars.length ? (
                    <section className="vocab-example-analysis__section">
                      <h4 className="vocab-example-analysis__title">2. Cấu tạo Kanji &amp; từ vựng</h4>
                      <ul className="vocab-example-analysis__kanji">
                        {analysis.kanjiChars.map((ch) => (
                          <li key={ch} className="vocab-example-analysis__kanji-item">
                            <span className="vocab-example-analysis__kanji-char japanese-text">
                              {ch}
                            </span>
                            <KanjiStructureButton text={ch} char={ch} className="ks-open-btn--sm" />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
                {picture}
              </div>
            </div>
          ) : (
            <div
              className="vocab-example-analysis__panel vocab-example-analysis__panel--clean"
              role="tabpanel"
            >
              <h4 className="vocab-example-analysis__title">Typography &amp; phát âm</h4>
              <p className="vocab-example-analysis__clean-lead">
                Câu ví dụ với furigana và cách đọc tách mora
              </p>
              <div className="vocab-example-analysis__clean-ja-row">
                <div className="vocab-example-analysis__clean-ja japanese-text">
                  {renderFurigana(example.ja, segments, keys)}
                </div>
                <button
                  type="button"
                  className="vocab-round-btn vocab-round-btn--sm"
                  title="Nghe câu ví dụ tiếng Nhật"
                  aria-label={`Nghe câu ví dụ tiếng Nhật: ${example.ja}`}
                  onClick={(e) => onSpeakJa(e, example.speak || example.ja)}
                >
                  <SpeakerIcon className="vocab-speaker-icon" size={16} />
                </button>
              </div>
              {analysis.typedRomaji ? (
                <p className="vocab-example-analysis__typed-romaji" lang="en">
                  {analysis.typedRomaji}
                </p>
              ) : null}

              <div className="vocab-example-analysis__clean-body">
                <ul className="vocab-example-analysis__cards">
                  {analysis.cards.map((part, i) => {
                    const strokeText = getStrokeText(part.surface);
                    const strokeCount = [...strokeText].length;
                    const strokeSize = Math.max(
                      48,
                      Math.min(128, Math.floor(200 / Math.max(strokeCount, 1))),
                    );
                    const isStrokeOpen = openStrokeIndex === i;
                    const isHeParticle = part.kind === 'particle' && part.surface === 'へ';
                    const cardSpeakText = isHeParticle ? 'え' : part.reading || part.surface;
                    const cardGrammarHit =
                      part.kind === 'particle'
                        ? grammarHits.find((hit) => hit.skeleton.includes(part.surface))
                        : undefined;

                    return (
                      <li
                        key={`${part.surface}-card-${i}`}
                        className="vocab-example-analysis__card-item"
                      >
                        <div className="vocab-example-analysis__card">
                          <div className="vocab-example-analysis__card-content">
                            <span className="vocab-example-analysis__card-ja japanese-text">
                              {part.surface}
                            </span>
                            {part.reading ? (
                              <span className="vocab-example-analysis__card-reading japanese-text">
                                {part.reading}
                                {isHeParticle ? (
                                  <span> (he; khi là trợ từ đọc là e)</span>
                                ) : part.romaji ? (
                                  <span lang="en"> ({part.romaji})</span>
                                ) : null}
                              </span>
                            ) : part.romaji ? (
                              <span className="vocab-example-analysis__card-reading" lang="en">
                                {part.romaji}
                              </span>
                            ) : null}
                            <span className="vocab-example-analysis__card-pos">{part.pos}</span>
                            <span className="vocab-example-analysis__card-detail">{part.gloss}</span>
                          </div>
                          <div className="vocab-example-analysis__card-actions">
                            <button
                              type="button"
                              className="vocab-example-analysis__card-action"
                              title={
                                isHeParticle ? 'Nghe e (cách đọc trợ từ へ)' : `Nghe ${cardSpeakText}`
                              }
                              aria-label={
                                isHeParticle
                                  ? 'Nghe phát âm trợ từ へ: e'
                                  : `Nghe phát âm: ${cardSpeakText}`
                              }
                              onClick={(e) => onSpeakJa(e, cardSpeakText)}
                            >
                              <SpeakerIcon size={16} />
                            </button>
                            {cardGrammarHit ? (
                              <Link
                                href={grammarHrefForHit(cardGrammarHit)}
                                className="vocab-example-analysis__card-action"
                                title={`Mở ngữ pháp: ${cardGrammarHit.pattern}`}
                                aria-label={`Mở ngữ pháp: ${cardGrammarHit.pattern}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                文
                              </Link>
                            ) : null}
                            {strokeCount > 0 ? (
                              <button
                                type="button"
                                className="vocab-example-analysis__card-action"
                                title={isStrokeOpen ? 'Ẩn cách viết' : `Xem cách viết ${part.surface}`}
                                aria-label={
                                  isStrokeOpen ? 'Ẩn cách viết' : `Xem cách viết ${part.surface}`
                                }
                                aria-expanded={isStrokeOpen}
                                onClick={() => setOpenStrokeIndex(isStrokeOpen ? null : i)}
                              >
                                筆
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {isStrokeOpen ? (
                          <div className="vocab-example-analysis__stroke-preview">
                            <p className="vocab-example-analysis__stroke-label">
                              Cách viết · nhấn chữ để xem lại nét
                            </p>
                            <StrokeOrder
                              key={`${part.surface}-${part.reading ?? ''}`}
                              text={strokeText}
                              width={strokeSize}
                              height={strokeSize}
                              compact
                            />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {picture}
              </div>
            </div>
          )}

          <p className="vocab-example-analysis__footer">
            {lessonNumber != null ? (
              <>
                Học mẫu câu tại{' '}
                <Link
                  href={grammarHrefForHit(grammarHits[0])}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ngữ pháp bài {grammarHits[0]?.lessonNumber ?? lessonNumber}
                </Link>
                {' · '}
              </>
            ) : null}
            Cấu tạo chi tiết tại{' '}
            <Link href="/kanji/structure" target="_blank" rel="noopener noreferrer">
              Cấu tạo Kanji
            </Link>{' '}
            hoặc luyện viết từng nét ở{' '}
            <Link href="/strokes" target="_blank" rel="noopener noreferrer">
              Tra nét viết
            </Link>
            .
          </p>
        </div>
      ) : null}
    </li>
  );
}
