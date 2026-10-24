'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useKatakanaVocabQuery } from '../hooks/queries';
import StrokeOrder from '../components/StrokeOrder';
import { playAudio } from '../utils/speech';
import { lessonShortLabel } from '../utils/lessonHeading';
import type { KatakanaVocabulary } from '../types/api';
import './VocabLessonListView.css';

type SortKey = 'lesson' | 'word' | 'jlpt';
type SortDir = 'asc' | 'desc';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
const JLPT_RANK: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };

function jlptRank(level: string | null): number {
  return level ? (JLPT_RANK[level] ?? 99) : 99;
}

const KANA_ROWS = [
  ['ア', 'イ', 'ウ', 'エ', 'オ'],
  ['カ', 'キ', 'ク', 'ケ', 'コ'],
  ['サ', 'シ', 'ス', 'セ', 'ソ'],
  ['タ', 'チ', 'ツ', 'テ', 'ト'],
  ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
  ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
  ['マ', 'ミ', 'ム', 'メ', 'モ'],
  ['ヤ', '', 'ユ', '', 'ヨ'],
  ['ラ', 'リ', 'ル', 'レ', 'ロ'],
  ['ワ', '', '', '', 'ヲ'],
  ['ン', '', '', '', ''],
] as const;

const VOICED_ROWS = [
  ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ'],
  ['ザ', 'ジ', 'ズ', 'ゼ', 'ゾ'],
  ['ダ', 'ヂ', 'ヅ', 'デ', 'ド'],
  ['バ', 'ビ', 'ブ', 'ベ', 'ボ'],
  ['パ', 'ピ', 'プ', 'ペ', 'ポ'],
  ['ヴ', '', '', '', ''],
] as const;

function writtenForm(word: KatakanaVocabulary): string {
  return word.kanji?.trim() || word.kana;
}

function initialKana(word: KatakanaVocabulary): string {
  return writtenForm(word).match(/[ァ-ヶ]/)?.[0] ?? '';
}

function compareWords(a: KatakanaVocabulary, b: KatakanaVocabulary, key: SortKey, dir: SortDir): number {
  if (key === 'jlpt') {
    const unsetA = jlptRank(a.jlptLevel) === 99;
    const unsetB = jlptRank(b.jlptLevel) === 99;
    if (unsetA !== unsetB) return unsetA ? 1 : -1;
  }
  const delta = key === 'lesson'
    ? a.lesson.lessonNumber - b.lesson.lessonNumber
    : key === 'word'
      ? writtenForm(a).localeCompare(writtenForm(b), 'ja')
      : jlptRank(a.jlptLevel) - jlptRank(b.jlptLevel);
  if (delta !== 0) return dir === 'asc' ? delta : -delta;
  return a.lesson.lessonNumber - b.lesson.lessonNumber || a.id - b.id;
}

function KanaChart({
  caption,
  rows,
  selected,
  counts,
  onPick,
}: {
  caption: string;
  rows: readonly (readonly string[])[];
  selected: string | null;
  counts: Map<string, number>;
  onPick: (kana: string) => void;
}) {
  return (
    <div className="vocab-kana-chart__block">
      <p className="vocab-kana-chart__caption">{caption}</p>
      <div className="vocab-kana-chart__rows">
        {rows.map((row) => (
          <div className="vocab-kana-chart__row" key={row.join('-')}>
            {row.map((kana, index) => {
              if (!kana) return <span key={`${index}-blank`} className="vocab-kana-chart__blank" aria-hidden="true" />;
              const count = counts.get(kana) ?? 0;
              return (
                <button
                  key={kana}
                  type="button"
                  className="vocab-kana-chart__cell japanese-text"
                  aria-pressed={selected === kana}
                  aria-label={`${kana}, ${count} từ`}
                  disabled={count === 0 && selected !== kana}
                  onClick={() => onPick(kana)}
                >
                  <span className="vocab-kana-chart__glyph">{kana}</span>
                  <span className="vocab-kana-chart__count">{count}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KatakanaVocabView() {
  const { data, isLoading, isError } = useKatakanaVocabQuery();
  const words = data?.data ?? [];
  const [sortKey, setSortKey] = useState<SortKey>('lesson');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [jlpt, setJlpt] = useState('all');
  const [lessonNumbers, setLessonNumbers] = useState<number[]>([]);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonQuery, setLessonQuery] = useState('');
  const [query, setQuery] = useState('');
  const [initial, setInitial] = useState<string | null>(null);
  const lessonPickerRef = useRef<HTMLDivElement>(null);

  const lessons = useMemo(() => {
    const byNumber = new Map<number, KatakanaVocabulary['lesson']>();
    for (const word of words) byNumber.set(word.lesson.lessonNumber, word.lesson);
    return [...byNumber.values()].sort((a, b) => a.lessonNumber - b.lessonNumber);
  }, [words]);

  const lessonsForLevel = useMemo(() => {
    if (jlpt === 'all') return lessons;
    const numbers = new Set(
      words
        .filter((word) => (jlpt === 'none' ? !word.jlptLevel : word.jlptLevel === jlpt))
        .map((word) => word.lesson.lessonNumber),
    );
    return lessons.filter((item) => numbers.has(item.lessonNumber));
  }, [lessons, words, jlpt]);

  const levelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const word of words) {
      if (!word.jlptLevel) continue;
      counts.set(word.jlptLevel, (counts.get(word.jlptLevel) ?? 0) + 1);
    }
    return counts;
  }, [words]);

  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter((word) => {
      if (jlpt === 'none' && word.jlptLevel) return false;
      if (jlpt !== 'all' && jlpt !== 'none' && word.jlptLevel !== jlpt) return false;
      if (lessonNumbers.length > 0 && !lessonNumbers.includes(word.lesson.lessonNumber)) return false;
      if (!q) return true;
      return [writtenForm(word), word.kana, word.romaji, word.meaning, lessonShortLabel(word.lesson)]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [words, jlpt, lessonNumbers, query]);

  const kanaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const word of scoped) {
      const kana = initialKana(word);
      if (!kana) continue;
      counts.set(kana, (counts.get(kana) ?? 0) + 1);
    }
    return counts;
  }, [scoped]);

  const visible = useMemo(() => {
    const filtered = initial ? scoped.filter((word) => initialKana(word) === initial) : scoped;
    return [...filtered].sort((a, b) => compareWords(a, b, sortKey, sortDir));
  }, [scoped, initial, sortKey, sortDir]);

  const lessonChoices = useMemo(() => {
    const q = lessonQuery.trim().toLowerCase();
    if (!q) return lessonsForLevel;
    return lessonsForLevel.filter((item) => lessonShortLabel(item).toLowerCase().includes(q));
  }, [lessonsForLevel, lessonQuery]);

  const lessonLabel = lessonNumbers.length === 0
    ? 'Mọi bài'
    : lessonNumbers.length === 1
      ? lessonShortLabel(lessons.find((item) => item.lessonNumber === lessonNumbers[0]) ?? { lessonNumber: lessonNumbers[0] })
      : `${lessonNumbers.length} bài`;

  useEffect(() => {
    const allowed = new Set(lessonsForLevel.map((item) => item.lessonNumber));
    setLessonNumbers((current) => {
      const next = current.filter((number) => allowed.has(number));
      return next.length === current.length ? current : next;
    });
  }, [lessonsForLevel]);

  useEffect(() => {
    if (!lessonOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!lessonPickerRef.current?.contains(event.target as Node)) setLessonOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [lessonOpen]);

  function toggleLesson(lessonNumber: number) {
    setLessonNumbers((current) => (
      current.includes(lessonNumber)
        ? current.filter((number) => number !== lessonNumber)
        : [...current, lessonNumber].sort((a, b) => a - b)
    ));
  }

  function filterByLesson(lessonNumber: number) {
    setLessonNumbers((current) => (
      current.length === 1 && current[0] === lessonNumber ? [] : [lessonNumber]
    ));
  }

  function pickKana(kana: string) {
    setInitial((current) => {
      const next = current === kana ? null : kana;
      if (next) playAudio(next);
      return next;
    });
  }

  function onSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  }

  const sortMark = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div className="container vocab-lesson-list">
      <header className="vocab-lesson-list__header">
        <div>
          <h1 className="view-title">Từ viết bằng katakana</h1>
          <p className="vocab-lesson-list__meta">
            {words.length > 0 ? `${visible.length} / ${words.length} từ` : 'Các từ có dạng viết là katakana'}
          </p>
        </div>
        <div className="vocab-lesson-list__toolbar">
          <input
            type="search"
            className="vocab-lesson-list__search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Lọc từ, cách đọc hoặc nghĩa"
            aria-label="Lọc từ katakana"
          />
          <div className="vocab-lesson-list__lesson-picker" ref={lessonPickerRef}>
            <button
              type="button"
              className="vocab-lesson-list__lesson-toggle"
              aria-expanded={lessonOpen}
              aria-label="Lọc theo bài"
              onClick={() => setLessonOpen((open) => !open)}
            >
              {`Bài · ${lessonLabel}`}
            </button>
            {lessonOpen && (
              <div className="vocab-lesson-list__lesson-panel" role="group" aria-label="Chọn nhiều bài">
                <input
                  type="search"
                  className="vocab-lesson-list__search"
                  value={lessonQuery}
                  onChange={(event) => setLessonQuery(event.target.value)}
                  placeholder="Tìm bài"
                  aria-label="Tìm bài"
                />
                <button
                  type="button"
                  className="vocab-lesson-list__lesson-clear"
                  onClick={() => setLessonNumbers([])}
                >
                  Bỏ chọn
                </button>
                {lessonChoices.length === 0 && (
                  <p className="vocab-lesson-list__lesson-empty">Không có bài ở cấp này.</p>
                )}
                {lessonChoices.map((item) => (
                  <label key={item.lessonNumber} className="vocab-lesson-list__lesson-option">
                    <input
                      type="checkbox"
                      checked={lessonNumbers.includes(item.lessonNumber)}
                      onChange={() => toggleLesson(item.lessonNumber)}
                    />
                    <span>{lessonShortLabel(item)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="vocab-lesson-list__levels" role="group" aria-label="Lọc theo cấp JLPT">
          <button
            type="button"
            className="vocab-lesson-list__level"
            aria-pressed={jlpt === 'all'}
            onClick={() => setJlpt('all')}
          >
            {`Tất cả · ${words.length}`}
          </button>
          {JLPT_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className="vocab-lesson-list__level"
              aria-pressed={jlpt === level}
              onClick={() => setJlpt(level)}
            >
              {`${level} · ${levelCounts.get(level) ?? 0}`}
            </button>
          ))}
        </div>
      </header>

      <div className="vocab-katakana-body">
        <div className="vocab-katakana-main">
      {isLoading && <p className="vocab-lesson-list__status">Đang tải từ katakana...</p>}
      {isError && <p className="vocab-lesson-list__status">Không tải được danh sách từ katakana.</p>}

      {!isLoading && !isError && visible.length === 0 && (
        <p className="vocab-lesson-list__status">Không có từ khớp bộ lọc.</p>
      )}

      {!isLoading && !isError && visible.length > 0 && (
        <div className="vocab-lesson-list__table-wrap">
          <table className="vocab-lesson-list__table">
            <thead>
              <tr>
                <th aria-sort={sortKey === 'lesson' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button
                    type="button"
                    className="vocab-lesson-list__sort"
                    aria-pressed={sortKey === 'lesson'}
                    onClick={() => onSort('lesson')}
                  >
                    {`Bài${sortMark('lesson')}`}
                  </button>
                </th>
                <th aria-sort={sortKey === 'word' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button
                    type="button"
                    className="vocab-lesson-list__sort"
                    aria-pressed={sortKey === 'word'}
                    onClick={() => onSort('word')}
                  >
                    {`Từ${sortMark('word')}`}
                  </button>
                </th>
                <th>Cách đọc</th>
                <th>Nghĩa</th>
                <th aria-sort={sortKey === 'jlpt' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button
                    type="button"
                    className="vocab-lesson-list__sort"
                    aria-pressed={sortKey === 'jlpt'}
                    onClick={() => onSort('jlpt')}
                  >
                    {`JLPT${sortMark('jlpt')}`}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((word) => {
                const written = writtenForm(word);
                return (
                  <tr key={word.id}>
                    <td>
                      <button
                        type="button"
                        className="vocab-lesson-list__word"
                        aria-pressed={lessonNumbers.length === 1 && lessonNumbers[0] === word.lesson.lessonNumber}
                        onClick={() => filterByLesson(word.lesson.lessonNumber)}
                      >
                        {lessonShortLabel(word.lesson)}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="vocab-lesson-list__word vocab-lesson-list__word--strong japanese-text"
                        onClick={() => playAudio(word.kana)}
                      >
                        {written}
                      </button>
                    </td>
                    <td>{word.romaji}</td>
                    <td>{word.meaning}</td>
                    <td>{word.jlptLevel ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
        </div>

        {words.length > 0 && (
          <aside className="vocab-kana-rail">
            <div className="vocab-kana-stroke">
              {initial ? (
                <>
                  <p className="vocab-kana-stroke__title">
                    <span className="japanese-text">{initial}</span>
                    <span>Cách viết</span>
                  </p>
                  <StrokeOrder key={initial} text={initial} width={148} height={148} compact />
                </>
              ) : (
                <p className="vocab-kana-stroke__empty">Chọn một chữ bên dưới để xem cách viết.</p>
              )}
            </div>
            <section className="vocab-kana-chart" aria-label="Bảng chữ cái katakana">
              <KanaChart caption="清音" rows={KANA_ROWS} selected={initial} counts={kanaCounts} onPick={pickKana} />
              <KanaChart caption="濁音" rows={VOICED_ROWS} selected={initial} counts={kanaCounts} onPick={pickKana} />
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}
