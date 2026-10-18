'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LessonSelector from '../components/LessonSelector';
import StrokeOrder from '../components/StrokeOrder';
import { useLessons, useVocabRangeQuery, useVocab } from '../hooks/queries';
import { playAudio } from '../utils/speech';
import { getStrokeText, parseReadingVariants, shouldShowKanaStroke } from '../utils/japanese';
import { resolveVocabImage } from '@edu/vocab-images';
import type { Vocabulary } from '../types/api';
import './PictureDictionaryView.css';

type ScopeMode = 'single' | 'range';

type PictureVocab = Vocabulary & {
  resolvedImage: string | null;
  lessonNumber?: number;
};

const RANGE_PRESETS = [
  { label: '1 → 50', from: 1, to: 50 },
  { label: '1 → 25', from: 1, to: 25 },
  { label: '26 → 50', from: 26, to: 50 },
] as const;

function PictureImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className="picture-card-placeholder">📷</div>;
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function modalStrokeSize(charCount: number): number {
  if (charCount <= 1) return 120;
  if (charCount <= 2) return 100;
  if (charCount <= 4) return 82;
  return 68;
}

function ModalStrokeBlock({
  text,
  label,
  onCharClick,
}: {
  text: string;
  label?: string;
  onCharClick: (char: string) => void;
}) {
  const strokeText = getStrokeText(text);
  if (!strokeText) return null;
  const size = modalStrokeSize([...strokeText].length);

  return (
    <div className="picture-modal-stroke-block">
      {label ? <p className="picture-modal-stroke-label">{label}</p> : null}
      <StrokeOrder
        text={text}
        width={size}
        height={size}
        compact
        onCharClick={onCharClick}
      />
    </div>
  );
}

function ModalReadingStrokes({
  kanji,
  kana,
  romaji,
  onCharClick,
}: {
  kanji: string | null;
  kana: string;
  romaji: string;
  onCharClick: (char: string) => void;
}) {
  const showDual = shouldShowKanaStroke(kanji, kana);
  const kanaVariants = parseReadingVariants(kana, romaji);
  const kanjiVariants = kanji ? parseReadingVariants(kanji, romaji) : [];
  const pairCount = showDual
    ? Math.max(kanjiVariants.length, kanaVariants.length, 1)
    : kanaVariants.length;

  if (pairCount > 1) {
    return (
      <div className="picture-modal-reading-pairs">
        {Array.from({ length: pairCount }, (_, index) => {
          const kanjiVariant = kanjiVariants[index];
          const kanaVariant = kanaVariants[index];
          const pairLabel = kanaVariant?.label ?? kanjiVariant?.label;

          return (
            <div key={index} className="picture-modal-reading-pair">
              {pairLabel ? (
                <p className="picture-modal-reading-pair-label">{pairLabel}</p>
              ) : null}
              <div className="picture-modal-reading-pair-strokes">
                {showDual && kanjiVariant ? (
                  <ModalStrokeBlock
                    text={kanjiVariant.text}
                    label="Kanji"
                    onCharClick={onCharClick}
                  />
                ) : null}
                {kanaVariant ? (
                  <ModalStrokeBlock
                    text={kanaVariant.text}
                    label={showDual ? 'Kana' : undefined}
                    onCharClick={onCharClick}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (showDual) {
    return (
      <div className="picture-modal-stroke-dual">
        <ModalStrokeBlock text={kanji!} label="Kanji" onCharClick={onCharClick} />
        <ModalStrokeBlock text={kana} label="Kana" onCharClick={onCharClick} />
      </div>
    );
  }

  return <ModalStrokeBlock text={kanji || kana} onCharClick={onCharClick} />;
}

function mapPictureVocab(list: Vocabulary[], lessonNumber?: number): PictureVocab[] {
  return list.map((v) => ({
    ...v,
    lessonNumber,
    resolvedImage: resolveVocabImage({
      word: v.romaji,
      meaning: v.meaning,
      kana: v.kana,
      kanji: v.kanji,
      imageUrl: v.imageUrl,
    }),
  }));
}

export default function PictureDictionaryView() {
  const searchParams = useSearchParams();
  const { data: lessons = [] } = useLessons();
  const maxLesson = lessons[lessons.length - 1]?.lessonNumber ?? 50;

  const initialLesson = useMemo(() => {
    const raw = searchParams.get('lesson');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  }, [searchParams]);

  const [scopeMode, setScopeMode] = useState<ScopeMode>('single');
  const [lesson, setLesson] = useState(initialLesson);
  const [lessonFrom, setLessonFrom] = useState(1);
  const [lessonTo, setLessonTo] = useState(50);
  const [picturesOnly, setPicturesOnly] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<PictureVocab | null>(null);

  useEffect(() => {
    if (initialLesson > 0) setLesson(initialLesson);
  }, [initialLesson]);

  const { data: singleLessonVocab = [], isLoading: loadingSingle } = useVocab(lesson);
  const { data: rangeVocab = [], isLoading: loadingRange } = useVocabRangeQuery(
    lessonFrom,
    lessonTo,
    scopeMode === 'range',
  );

  const rawItems = useMemo(() => {
    if (scopeMode === 'single') {
      return mapPictureVocab(singleLessonVocab, lesson);
    }
    return mapPictureVocab(rangeVocab);
  }, [scopeMode, singleLessonVocab, lesson, rangeVocab]);

  const items = useMemo(() => {
    const withPictures = picturesOnly ? rawItems.filter((v) => v.resolvedImage) : rawItems;
    const query = searchInput.trim().toLowerCase();
    if (!query) return withPictures;

    return withPictures.filter((item) =>
      [item.kanji, item.kana, item.romaji, item.meaning, item.lessonNumber != null ? `bài ${item.lessonNumber}` : '']
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [rawItems, picturesOnly, searchInput]);

  const isLoading = scopeMode === 'single' ? loadingSingle : loadingRange;
  const rangeLabel =
    scopeMode === 'range'
      ? `Bài ${Math.min(lessonFrom, lessonTo)}–${Math.max(lessonFrom, lessonTo)}`
      : `Bài ${lesson}`;

  useEffect(() => {
    if (!selected?.kana) return;
    const timer = setTimeout(() => playAudio(selected.kana), 200);
    return () => clearTimeout(timer);
  }, [selected?.id, selected?.kana]);

  const handleSpeak = (v: PictureVocab, e?: React.MouseEvent) => {
    e?.stopPropagation();
    playAudio(v.kana);
  };

  const lessonOptions = useMemo(
    () => lessons.map((entry) => entry.lessonNumber).filter((n) => n > 0),
    [lessons],
  );

  return (
    <div className="container picture-dict-view">
      <div className="picture-dict-header">
        <div>
          <h2 className="view-title">Từ điển hình ảnh</h2>
          <p className="picture-dict-subtitle">
            Minna no Nihongo · {rangeLabel} · {items.length} từ {picturesOnly ? 'có ảnh' : ''}
            {items.length === 0 && !isLoading && ' · thử bài 3–15 cho từ vật thể'}
          </p>
        </div>
        <div className="picture-dict-links">
          <Link href="/vocab" className="btn btn-outline">
            Flashcard
          </Link>
          <Link href="/kanji" className="btn btn-primary">
            Kanji
          </Link>
        </div>
      </div>

      <div className="picture-dict-scope-tabs" role="tablist" aria-label="Phạm vi bài học">
        <button
          type="button"
          role="tab"
          aria-selected={scopeMode === 'single'}
          className={`btn tab-btn ${scopeMode === 'single' ? 'active' : ''}`}
          onClick={() => setScopeMode('single')}
        >
          Một bài
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scopeMode === 'range'}
          className={`btn tab-btn ${scopeMode === 'range' ? 'active' : ''}`}
          onClick={() => setScopeMode('range')}
        >
          Nhiều bài
        </button>
      </div>

      {scopeMode === 'single' ? (
        <LessonSelector value={lesson} onChange={setLesson} />
      ) : (
        <div className="picture-dict-range">
          <div className="picture-dict-range-fields">
            <label>
              Từ bài
              <select
                className="select-input"
                value={lessonFrom}
                onChange={(e) => setLessonFrom(Number(e.target.value))}
              >
                {lessonOptions.map((n) => (
                  <option key={n} value={n}>
                    Bài {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Đến bài
              <select
                className="select-input"
                value={lessonTo}
                onChange={(e) => setLessonTo(Number(e.target.value))}
              >
                {lessonOptions.map((n) => (
                  <option key={n} value={n}>
                    Bài {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="picture-dict-range-presets">
            {RANGE_PRESETS.filter((preset) => preset.to <= maxLesson).map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="btn btn-outline picture-dict-preset-btn"
                onClick={() => {
                  setLessonFrom(preset.from);
                  setLessonTo(Math.min(preset.to, maxLesson));
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="picture-dict-filters">
        <label className="picture-dict-toggle">
          <input
            type="checkbox"
            checked={picturesOnly}
            onChange={(e) => setPicturesOnly(e.target.checked)}
          />
          Chỉ từ có ảnh
        </label>
        <input
          type="search"
          className="picture-dict-search"
          placeholder="Tìm kanji, kana, romaji, nghĩa..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Tìm từ trong từ điển tranh"
        />
      </div>

      {isLoading ? (
        <p className="picture-dict-empty">Đang tải từ {rangeLabel}...</p>
      ) : items.length === 0 ? (
        <div className="empty-state glass-panel">
          <p>
            {scopeMode === 'range'
              ? `Chưa có từ có hình trong ${rangeLabel}. Thử mở rộng phạm vi hoặc tắt lọc "Chỉ từ có ảnh".`
              : `Bài ${lesson} chưa có từ có hình ảnh. Thử bài khác, chuyển sang "Nhiều bài", hoặc tắt lọc.`}
          </p>
        </div>
      ) : (
        <div className="picture-dict-grid">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="picture-card glass-panel"
              onClick={() => setSelected(item)}
            >
              <div className="picture-card-image-wrap">
                {item.resolvedImage ? (
                  <PictureImg src={item.resolvedImage} alt={item.kana} />
                ) : (
                  <div className="picture-card-placeholder">📷</div>
                )}
              </div>
              <div className="picture-card-body">
                {scopeMode === 'range' && item.lessonNumber != null ? (
                  <span className="picture-card-lesson">Bài {item.lessonNumber}</span>
                ) : null}
                <span className="japanese-text">{item.kanji || item.kana}</span>
                <span className="picture-card-meaning">{item.meaning}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="picture-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="picture-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="picture-modal-close" onClick={() => setSelected(null)}>
              ✕
            </button>
            {selected.resolvedImage && (
              <PictureImg src={selected.resolvedImage} alt={selected.kana} className="picture-modal-image" />
            )}
            <button type="button" className="btn-audio picture-modal-audio" onClick={(e) => handleSpeak(selected, e)}>
              🔊
            </button>
            <div className="picture-modal-strokes">
              <ModalReadingStrokes
                kanji={selected.kanji}
                kana={selected.kana}
                romaji={selected.romaji}
                onCharClick={() => playAudio(selected.kana)}
              />
            </div>
            {selected.lessonNumber != null ? (
              <span className="picture-modal-lesson">Bài {selected.lessonNumber}</span>
            ) : null}
            <span className="picture-modal-kanji japanese-text">{selected.kanji || selected.kana}</span>
            <span className="picture-modal-kana japanese-text">{selected.kana}</span>
            <span className="picture-modal-romaji">{selected.romaji}</span>
            <p className="picture-modal-meaning">{selected.meaning}</p>
          </div>
        </div>
      )}
    </div>
  );
}
