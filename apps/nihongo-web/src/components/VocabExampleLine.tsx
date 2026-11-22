'use client';

import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ExampleEnglish } from './VocabReading';
import KanjiStructureButton from './KanjiStructureButton';
import SpeakerIcon from './SpeakerIcon';
import VocabPicture from './VocabPicture';
import { highlightKeys } from '../utils/grammarHighlight';
import {
  buildExampleAnalysis,
  exampleFuriganaSegments,
} from '../utils/vocabExampleAnalysis';
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
  onSpeakJa: (e: MouseEvent, text: string) => void;
  onSpeakVi: (e: MouseEvent, text: string) => void;
  onSpeakBoth: (e: MouseEvent, speak: string, vi: string) => void;
  analysisOpen?: boolean;
  onToggleAnalysis?: () => void;
}) {
  const [localOpen, setLocalOpen] = useState(true);
  const [tab, setTab] = useState<AnalysisTab>('clean');
  const open = analysisOpen ?? localOpen;
  const toggleOpen = () => {
    if (onToggleAnalysis) onToggleAnalysis();
    else setLocalOpen((v) => !v);
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
      }),
    [example.ja, example.kana, example.vi, focusKanji, focusMeaning],
  );

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
            className={`vocab-examples__analyze${open ? ' is-open' : ''}`}
            aria-expanded={open}
            onClick={toggleOpen}
          >
            {open ? 'Ẩn phân tích' : 'Phân tích ngữ pháp'}
          </button>
        </div>
      </div>

      {open ? (
        <div className="vocab-example-analysis" aria-label="Phân tích câu ví dụ">
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
                      <h4 className="vocab-example-analysis__title">1. Cấu trúc ngữ pháp</h4>
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
              <div className="vocab-example-analysis__clean-ja japanese-text">
                {renderFurigana(example.ja, segments, keys)}
              </div>
              {analysis.typedRomaji ? (
                <p className="vocab-example-analysis__typed-romaji" lang="en">
                  {analysis.typedRomaji}
                </p>
              ) : null}

              <div className="vocab-example-analysis__clean-body">
                <ul className="vocab-example-analysis__cards">
                  {analysis.cards.map((part, i) => (
                    <li key={`${part.surface}-card-${i}`} className="vocab-example-analysis__card">
                      <span className="vocab-example-analysis__card-ja japanese-text">
                        {part.surface}
                      </span>
                      {part.reading ? (
                        <span className="vocab-example-analysis__card-reading japanese-text">
                          {part.reading}
                          {part.romaji ? <span lang="en"> ({part.romaji})</span> : null}
                        </span>
                      ) : part.romaji ? (
                        <span className="vocab-example-analysis__card-reading" lang="en">
                          {part.romaji}
                        </span>
                      ) : null}
                      <span className="vocab-example-analysis__card-pos">{part.pos}</span>
                      <span className="vocab-example-analysis__card-detail">{part.detail}</span>
                    </li>
                  ))}
                </ul>
                {picture}
              </div>
            </div>
          )}

          <p className="vocab-example-analysis__footer">
            Xem thêm cấu tạo chi tiết tại{' '}
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
