'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LessonSelector from '../components/LessonSelector';
import PlayAllButton from '../components/PlayAllButton';
import StrokeOrder from '../components/StrokeOrder';
import { kanjiCharsOf, useKanjiStructure } from '../contexts/KanjiStructureContext';
import { usePlayAll } from '../hooks/usePlayAll';
import { useLessons, useVocab } from '../hooks/queries';
import { getStrokeText } from '../utils/japanese';
import { isKanji } from '../utils/kanji-structure';
import { meaningForSpeech, speakJapaneseThenMeaning } from '../utils/speech';
import { lessonHeading, lessonShortLabel } from '../utils/lessonHeading';
import type { Vocabulary } from '../types/api';
import './VocabLessonListView.css';

function speakWord(vocab: Vocabulary) {
  speakJapaneseThenMeaning(vocab.kana, vocab.meaning);
}

function strokeBoxSize(text: string): number {
  const count = Math.max(1, [...getStrokeText(text)].length);
  const available = 860;
  const size = Math.floor((available - (count - 1) * 12) / count);
  return Math.max(96, Math.min(count === 1 ? 300 : 220, size));
}

type StrokeField = 'kanji' | 'kana';

type StrokeFocus = {
  vocabId: number;
  field: StrokeField;
};

function WritingWord({
  text,
  emphasize,
  onOpen,
}: {
  text: string;
  emphasize?: boolean;
  onOpen: () => void;
}) {
  if (!getStrokeText(text)) {
    return <span className="japanese-text">{text || '—'}</span>;
  }

  return (
    <button
      type="button"
      className={`vocab-lesson-list__word japanese-text${emphasize ? ' vocab-lesson-list__word--strong' : ''}`}
      aria-label={`Xem cách viết ${text}`}
      onClick={onOpen}
    >
      {text}
    </button>
  );
}

function StrokeModal({
  vocab,
  field,
  order,
  onClose,
  onStep,
}: {
  vocab: Vocabulary;
  field: StrokeField;
  order: number;
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
}) {
  const { openKanjiStructure } = useKanjiStructure();
  const kanji = vocab.kanji?.trim() ?? '';
  const kana = vocab.kana.trim();
  const kanjiStroke = getStrokeText(kanji);
  const kanaStroke = getStrokeText(kana);
  // Cột nào vừa bấm thì vẽ cột đó. Từ chỉ có kana thì cột Kanji cũng rơi về kana.
  const script: StrokeField = field === 'kana' || !kanjiStroke ? 'kana' : 'kanji';
  const headline = script === 'kanji' ? kanji : kana;
  const counterpart =
    script === 'kanji'
      ? kanaStroke && kanaStroke !== kanjiStroke
        ? kana
        : ''
      : kanjiStroke && kanjiStroke !== kanaStroke
        ? kanji
        : '';
  const analyzable = script === 'kanji' && kanjiCharsOf(headline).length > 0;
  const size = strokeBoxSize(headline);
  const speak = () => speakWord(vocab);

  const openStructure = (char?: string) => {
    if (!analyzable) {
      speak();
      return;
    }
    openKanjiStructure(headline, char);
  };

  useEffect(() => {
    speakWord(vocab);
  }, [vocab.id, vocab.kana, vocab.meaning]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        speakWord(vocab);
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        onStep(1);
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        onStep(-1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onStep, vocab]);

  return createPortal(
    <div
      className="vocab-stroke-modal__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="vocab-stroke-modal" role="dialog" aria-modal="true" aria-label={`Cách viết ${headline}`}>
        <button type="button" className="vocab-stroke-modal__close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <div className="vocab-stroke-modal__nav">
          <button type="button" className="vocab-stroke-modal__step" onClick={() => onStep(-1)} aria-label="Từ trước">
            ←
          </button>
          <div className="vocab-stroke-modal__heading">
            <span className="vocab-stroke-modal__order">{order}</span>
            <button
              type="button"
              className="vocab-stroke-modal__char japanese-text"
              onClick={() => openStructure()}
              title={analyzable ? 'Phân tích từng chữ kanji' : `Nghe ${vocab.kana}`}
              aria-label={analyzable ? `Phân tích cấu tạo kanji của ${headline}` : `Nghe ${vocab.kana}`}
            >
              {headline}
            </button>
            {counterpart ? (
              <p className="vocab-stroke-modal__reading japanese-text">{counterpart}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="vocab-stroke-modal__speak"
            onClick={speak}
            aria-label={`Nghe ${vocab.kana}`}
            title={`Nghe ${vocab.kana}`}
          >
            🔊
          </button>
          <button type="button" className="vocab-stroke-modal__step" onClick={() => onStep(1)} aria-label="Từ sau">
            →
          </button>
        </div>
        <p className="vocab-stroke-modal__label">
          {script === 'kana'
            ? 'Cách viết hiragana · 🔊 / phím cách nghe · ← → sang từ kế'
            : analyzable
              ? 'Cách viết kanji · nhấn chữ để phân tích · 🔊 / phím cách nghe · ← → sang từ kế'
              : 'Tự đọc tiếng Nhật rồi nghĩa tiếng Việt · phím cách nghe lại · ← → sang từ kế'}
        </p>
        <div className="vocab-stroke-modal__canvas">
          <StrokeOrder
            key={`${vocab.id}-${script}-${headline}`}
            text={headline}
            width={size}
            height={size}
            onCharClick={(char) => {
              if (isKanji(char)) openStructure(char);
              else speak();
            }}
          />
        </div>
        <p className="vocab-stroke-modal__meta">
          {vocab.romaji} · {vocab.meaning}
        </p>
      </div>
    </div>,
    document.body,
  );
}

function matches(vocab: Vocabulary, query: string): boolean {
  return [vocab.kanji, vocab.kana, vocab.romaji, vocab.meaning]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(query);
}

export default function VocabLessonListView({
  initialLessonNumber,
}: {
  initialLessonNumber?: number;
}) {
  const router = useRouter();
  const [lessonNumber, setLessonNumber] = useState(initialLessonNumber ?? 1);
  const [filter, setFilter] = useState('');
  const [stroke, setStroke] = useState<StrokeFocus | null>(null);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const { isPlayingAll, startPlayAll, stopPlayAll } = usePlayAll();
  const { data: lessons = [] } = useLessons();
  const { data: words = [], isLoading, isError } = useVocab(lessonNumber);

  useEffect(() => {
    if (initialLessonNumber != null && initialLessonNumber > 0) {
      setLessonNumber(initialLessonNumber);
    }
  }, [initialLessonNumber]);

  const lesson = lessons.find((item) => item.lessonNumber === lessonNumber);
  const query = filter.trim().toLowerCase();
  const rows = useMemo(
    () =>
      words
        .map((vocab, index) => ({ vocab, index }))
        .filter(({ vocab }) => !query || matches(vocab, query)),
    [words, query],
  );

  const strokeRow = stroke ? rows.findIndex((row) => row.vocab.id === stroke.vocabId) : -1;
  const strokeVocab = strokeRow >= 0 ? rows[strokeRow].vocab : null;

  const stepStroke = (direction: -1 | 1) => {
    if (!stroke || rows.length === 0 || strokeRow < 0) return;
    const next = (strokeRow + direction + rows.length) % rows.length;
    setStroke({ vocabId: rows[next].vocab.id, field: stroke.field });
  };

  const selectLesson = (next: number) => {
    setLessonNumber(next);
    setFilter('');
    router.replace(`/vocab/list?lesson=${next}`, { scroll: false });
  };

  useEffect(() => {
    stopPlayAll();
    setSpeakingId(null);
  }, [lessonNumber, query, stopPlayAll]);

  useEffect(() => {
    if (!isPlayingAll) setSpeakingId(null);
  }, [isPlayingAll]);

  useEffect(() => {
    if (speakingId == null) return;
    document.querySelector(`[data-vocab-id="${speakingId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [speakingId]);

  const handlePlayAll = () => {
    startPlayAll(
      rows.flatMap(({ vocab }) => {
        const clips: { text: string; lang: string; cue?: number }[] = [
          { text: vocab.kana, lang: 'ja-JP', cue: vocab.id },
        ];
        const meaning = meaningForSpeech(vocab.meaning);
        if (meaning) clips.push({ text: meaning, lang: 'vi-VN' });
        return clips;
      }),
      {
        onItemIndex: (id) => setSpeakingId(id),
      },
    );
  };

  const handleStopAll = () => {
    stopPlayAll();
    setSpeakingId(null);
  };

  return (
    <div className="container vocab-lesson-list">
      <header className="vocab-lesson-list__header">
        <div className="vocab-lesson-list__title-row">
          <div>
            <h1 className="view-title">{lessonHeading('vocab', lesson)}</h1>
            <p className="vocab-lesson-list__meta">
              {lesson ? lessonShortLabel(lesson) : `Bài ${lessonNumber}`}
              {words.length > 0 ? ` · ${words.length} từ` : ''}
            </p>
          </div>
          <nav className="vocab-lesson-list__links" aria-label="Học từ vựng">
            <Link href="/vocab/list" className="btn btn-outline btn-sm">
              ← Chọn bài
            </Link>
            <Link href={`/vocab?lesson=${lessonNumber}`} className="btn btn-primary btn-sm">
              Học thẻ
            </Link>
            <Link href={`/vocab/picture?lesson=${lessonNumber}`} className="btn btn-outline btn-sm">
              Từ điển tranh
            </Link>
            <Link href="/vocab/quiz" className="btn btn-outline btn-sm">
              Trắc nghiệm
            </Link>
            <Link href="/vocab/katakana" className="btn btn-outline btn-sm">
              Từ katakana
            </Link>
          </nav>
        </div>
        <div className="vocab-lesson-list__toolbar">
          <LessonSelector value={lessonNumber} onChange={selectLesson} id="vocab-list-lesson" />
          <input
            type="search"
            className="vocab-lesson-list__search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Lọc trong bài: kanji, kana, romaji, nghĩa"
            aria-label="Lọc từ trong bài"
          />
          <PlayAllButton
            isPlaying={isPlayingAll}
            onPlay={handlePlayAll}
            onStop={handleStopAll}
            disabled={rows.length === 0}
          />
        </div>
      </header>

      {isLoading ? (
        <p className="vocab-lesson-list__status">Đang tải từ vựng...</p>
      ) : isError ? (
        <p className="vocab-lesson-list__status">Không tải được danh sách. Kiểm tra API rồi tải lại trang.</p>
      ) : rows.length === 0 ? (
        <p className="vocab-lesson-list__status">
          {words.length === 0 ? 'Bài này chưa có từ.' : 'Không có từ khớp bộ lọc.'}
        </p>
      ) : (
        <div className="vocab-lesson-list__table-wrap">
          <table className="vocab-lesson-list__table">
            <caption className="sr-only">
              Từ vựng {lesson ? lessonShortLabel(lesson) : `bài ${lessonNumber}`}
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Kanji</th>
                <th scope="col">Kana</th>
                <th scope="col">Romaji</th>
                <th scope="col">Nghĩa</th>
                <th scope="col">
                  <span className="sr-only">Nghe</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ vocab, index }) => (
                <tr
                  key={vocab.id}
                  data-vocab-id={vocab.id}
                  className={speakingId === vocab.id ? 'is-speaking' : undefined}
                >
                  <td className="vocab-lesson-list__num">{index + 1}</td>
                  <td>
                    <WritingWord
                      text={vocab.kanji || ''}
                      emphasize
                      onOpen={() => setStroke({ vocabId: vocab.id, field: 'kanji' })}
                    />
                  </td>
                  <td>
                    <WritingWord
                      text={vocab.kana}
                      onOpen={() => setStroke({ vocabId: vocab.id, field: 'kana' })}
                    />
                  </td>
                  <td>{vocab.romaji}</td>
                  <td>{vocab.meaning}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-audio-small"
                      title={`Nghe ${vocab.kana}`}
                      aria-label={`Nghe ${vocab.kana}`}
                      onClick={() => speakWord(vocab)}
                    >
                      🔊
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {stroke && strokeVocab && (
        <StrokeModal
          vocab={strokeVocab}
          field={stroke.field}
          order={rows[strokeRow].index + 1}
          onClose={() => setStroke(null)}
          onStep={stepStroke}
        />
      )}
    </div>
  );
}
