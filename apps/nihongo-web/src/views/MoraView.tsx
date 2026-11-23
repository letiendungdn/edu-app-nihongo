'use client';

import { useEffect, useMemo, useState } from 'react';
import LessonSelector from '../components/LessonSelector';
import { useLessons, useMoraTrapPairsQuery, useVocab } from '../hooks/queries';
import { playAudio } from '../utils/speech';
import { splitKanaIntoMora, type Mora } from '../utils/kana';
import { lessonHeading, lessonShortLabel } from '../utils/lessonHeading';
import { groupLessons } from '../utils/lessonGroups';
import {
  MORA_DEMO,
  MORA_TRAP_PAIRS,
  beatLabel,
  beatRomajiHint,
  moraCount,
  moraJoin,
  moraRomaji,
  sokuonTrapOf,
  type MoraTrapKind,
} from '../utils/moraTraps';
import './MoraView.css';

type TrapFilter = 'all' | MoraTrapKind;

const TRAP_FILTERS: Array<{ id: TrapFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'sokuon', label: 'Âm ngắt [っ]' },
  { id: 'long-vowel', label: 'Trường âm' },
  { id: 'yoon', label: 'Âm ghép' },
];

const TRAP_PAGE_SIZE = 24;

function MoraBeatCard({ mora, index }: { mora: Mora; index: number }) {
  return (
    <div className={`mora-beat mora-beat--${mora.kind}`}>
      <span className="mora-beat-number">{index + 1}</span>
      <span className="mora-beat-character japanese-text">{mora.text}</span>
      <span className="mora-beat-romaji">{beatRomajiHint(mora)}</span>
      <span className="mora-beat-kind">{beatLabel(mora.kind)}</span>
    </div>
  );
}

export default function MoraView() {
  const [lessonNumber, setLessonNumber] = useState(1);
  const [query, setQuery] = useState('');
  const [trapFilter, setTrapFilter] = useState<TrapFilter>('all');
  const [trapQuery, setTrapQuery] = useState('');
  const [trapPage, setTrapPage] = useState(1);
  const [moraInput, setMoraInput] = useState<string>(MORA_DEMO.kana);
  const { data: lessons = [] } = useLessons({ has: 'vocab' });
  const { data: lessonVocab = [], isLoading, isError } = useVocab(lessonNumber);
  const {
    data: dbTrapPairs,
    isLoading: trapsLoading,
    isError: trapsError,
  } = useMoraTrapPairsQuery();

  const currentLesson = useMemo(
    () => lessons.find((l) => l.lessonNumber === lessonNumber),
    [lessons, lessonNumber],
  );
  const curriculumGroups = useMemo(() => groupLessons(lessons), [lessons]);
  const activeGroupKey = useMemo(() => {
    const hit = curriculumGroups.find((g) =>
      g.items.some((l) => l.lessonNumber === lessonNumber),
    );
    return hit?.key ?? curriculumGroups[0]?.key ?? '';
  }, [curriculumGroups, lessonNumber]);
  const activeGroup = curriculumGroups.find((g) => g.key === activeGroupKey);

  const filteredVocab = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lessonVocab;
    return lessonVocab.filter((w) => {
      const hay = [w.kana, w.kanji, w.romaji, w.meaning]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [lessonVocab, query]);

  const kanaOnly = useMemo(
    () => moraInput.replace(/[（(].*?[）)]/g, '').replace(/[^\u3040-\u309F\u30A0-\u30FFーっッ]/g, ''),
    [moraInput],
  );
  const morae = useMemo(() => splitKanaIntoMora(kanaOnly), [kanaOnly]);

  const isDemo = kanaOnly === MORA_DEMO.kana;
  const trapKana = useMemo(() => {
    if (isDemo) return MORA_DEMO.wrong.kana;
    return sokuonTrapOf(kanaOnly);
  }, [isDemo, kanaOnly]);
  const trapMorae = useMemo(
    () => (trapKana ? splitKanaIntoMora(trapKana) : []),
    [trapKana],
  );

  const summaryRomaji = moraRomaji(kanaOnly);
  const trapMeaning = isDemo
    ? `${MORA_DEMO.wrong.meaning} ${MORA_DEMO.wrong.emoji}`
    : 'Từ khác (thiếu âm ngắt)';
  const lessonTitle = lessonHeading('vocab', currentLesson);

  const trapPairs = dbTrapPairs?.length ? dbTrapPairs : MORA_TRAP_PAIRS;
  const filteredTrapPairs = useMemo(() => {
    const q = trapQuery.trim().toLowerCase();
    return trapPairs.filter((pair) => {
      if (trapFilter !== 'all' && pair.kind !== trapFilter) return false;
      if (!q) return true;
      const hay = [
        pair.correct.kana,
        pair.correct.kanji,
        pair.correct.meaning,
        pair.wrong.kana,
        pair.wrong.kanji,
        pair.wrong.meaning,
        pair.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [trapPairs, trapFilter, trapQuery]);

  const trapPageCount = Math.max(1, Math.ceil(filteredTrapPairs.length / TRAP_PAGE_SIZE));
  const pagedTrapPairs = useMemo(() => {
    const start = (trapPage - 1) * TRAP_PAGE_SIZE;
    return filteredTrapPairs.slice(start, start + TRAP_PAGE_SIZE);
  }, [filteredTrapPairs, trapPage]);

  useEffect(() => setTrapPage(1), [trapFilter, trapQuery, dbTrapPairs]);
  useEffect(() => {
    if (trapPage > trapPageCount) setTrapPage(trapPageCount);
  }, [trapPage, trapPageCount]);

  return (
    <div className="container mora-view">
      <section className="mora-analyzer glass-panel" aria-labelledby="mora-analyzer-title">
        <div className="mora-analyzer-heading">
          <div>
            <h2 id="mora-analyzer-title" className="mora-analyzer-title">
              <span aria-hidden="true">🔊</span> Phân tích phát âm (Mora)
            </h2>
            <p className="mora-analyzer-warn">
              ⚠️ Ngắt nhịp sai là ra từ khác! (Lỗi phát âm kinh điển)
            </p>
          </div>
        </div>

        <div className="mora-input-row">
          <div className="mora-input-field">
            <label htmlFor="mora-text-input">Kana cần phân tích</label>
            <input
              id="mora-text-input"
              className="mora-text-input japanese-text"
              value={moraInput}
              onChange={(event) => setMoraInput(event.target.value)}
              placeholder="Ví dụ: きって (切手 - Con tem)"
            />
          </div>
          {morae.length > 0 ? (
            <span className="mora-count-badge" aria-live="polite">
              {morae.length} mora ({morae.length} nhịp)
            </span>
          ) : null}
        </div>

        {morae.length > 0 ? (
          <div className={`mora-compare${trapKana ? '' : ' mora-compare--solo'}`}>
            <article className="mora-panel mora-panel--ok">
              <h3 className="mora-panel-title mora-panel-title--ok">
                ⏱️ NHỊP CHUẨN ({morae.length} NHỊP)
              </h3>
              <div className="mora-beats" aria-label={`${morae.length} mora chuẩn`}>
                {morae.map((mora, index) => (
                  <MoraBeatCard key={`${mora.text}-${index}`} mora={mora} index={index} />
                ))}
              </div>
              <p className="mora-panel-summary">
                Total: {morae.length} nhịp • {moraJoin(morae)}
                {isDemo
                  ? ` (${capitalize(summaryRomaji)} - ${MORA_DEMO.meaning} ${MORA_DEMO.emoji})`
                  : summaryRomaji
                    ? ` (${capitalize(summaryRomaji)})`
                    : ''}
              </p>
              <button
                type="button"
                className="mora-listen-btn"
                onClick={() => playAudio(kanaOnly, 'ja-JP')}
              >
                📢 Nghe chuẩn: {summaryRomaji || kanaOnly}
              </button>
            </article>

            {trapKana ? (
              <article className="mora-panel mora-panel--trap">
                <h3 className="mora-panel-title mora-panel-title--trap">
                  ⚠️ CẢNH BÁO: BẪY NGẮT SAI! ⚠️
                </h3>
                <p className="mora-trap-lead">
                  Nếu nuốt âm ngắt <strong>[っ]</strong>, chỉ còn {trapMorae.length} nhịp:
                </p>
                <div className="mora-trap-equation">
                  {trapMorae.map((mora, index) => (
                    <span key={`${mora.text}-t-${index}`} className="mora-trap-chip japanese-text">
                      {mora.text}
                    </span>
                  ))}
                  <span className="mora-trap-eq">=</span>
                  <button
                    type="button"
                    className="mora-trap-result"
                    title="Bấm để nghe từ sai nhịp"
                    aria-label={`Nghe từ sai nhịp: ${trapKana}`}
                    onClick={() => playAudio(trapKana, 'ja-JP')}
                  >
                    <span className="japanese-text">{trapKana}</span>
                    <span className="mora-trap-result-meaning">({trapMeaning})</span>
                  </button>
                </div>
                <div className="mora-trap-pair">
                  <button
                    type="button"
                    className="mora-trap-box mora-trap-box--ok"
                    title="Bấm để nghe cách đọc đúng"
                    aria-label={`Nghe cách đọc đúng: ${kanaOnly}`}
                    onClick={() => playAudio(kanaOnly, 'ja-JP')}
                  >
                    <span className="japanese-text">{kanaOnly}</span>
                    <span>
                      {morae.length} nhịp ={' '}
                      {isDemo ? `${MORA_DEMO.meaning} ${MORA_DEMO.emoji}` : 'đúng'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="mora-trap-box mora-trap-box--bad"
                    title="Bấm để nghe cách đọc sai"
                    aria-label={`Nghe cách đọc sai: ${trapKana}`}
                    onClick={() => playAudio(trapKana, 'ja-JP')}
                  >
                    <span className="japanese-text">{trapKana}</span>
                    <span>
                      {trapMorae.length} nhịp = {trapMeaning}
                    </span>
                  </button>
                </div>
                <p className="mora-trap-banner">
                  ⚠️ Bỏ âm ngắt [っ] → Biến thành từ khác hoàn toàn!
                </p>
                <button
                  type="button"
                  className="mora-listen-btn mora-listen-btn--ghost"
                  onClick={() => playAudio(trapKana, 'ja-JP')}
                >
                  🔊 Nghe bản sai nhịp: {moraRomaji(trapKana) || trapKana}
                </button>
              </article>
            ) : null}
          </div>
        ) : (
          <p className="mora-placeholder">
            Nhập kana (vd. きって) hoặc chọn từ bên dưới để xem từng nhịp.
          </p>
        )}
      </section>

      <section className="mora-traps glass-panel" aria-labelledby="mora-traps-title">
        <div className="mora-traps-heading">
          <div>
            <h3 id="mora-traps-title" className="mora-traps-title">
              CẶP BẪY MORA TRONG CSDL{' '}
              <span className="mora-traps-title-warn">(⚠️ Đọc sai → Đổi nghĩa)</span>
            </h3>
            <p className="mora-traps-sub">
              {trapsLoading
                ? 'Đang quét toàn bộ từ vựng…'
                : trapsError
                  ? 'Không tải được CSDL — đang hiện 3 cặp mẫu.'
                  : `${filteredTrapPairs.length.toLocaleString('vi-VN')} cặp${
                      trapFilter !== 'all' || trapQuery.trim()
                        ? ` (lọc từ ${(dbTrapPairs?.length ?? 0).toLocaleString('vi-VN')})`
                        : ''
                    } — cả hai phía đều có trong DB`}
            </p>
          </div>
          <input
            className="mora-search"
            value={trapQuery}
            onChange={(event) => setTrapQuery(event.target.value)}
            placeholder="Lọc cặp: kana, kanji, nghĩa…"
            aria-label="Lọc cặp bẫy mora"
          />
        </div>

        <div className="mora-curriculum-tabs" aria-label="Loại bẫy mora">
          {TRAP_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={trapFilter === filter.id ? 'active' : ''}
              onClick={() => setTrapFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {trapsLoading && !dbTrapPairs ? (
          <p className="mora-placeholder">Đang tìm các cặp chỉ khác nhau một nhịp mora…</p>
        ) : filteredTrapPairs.length === 0 ? (
          <p className="mora-placeholder">Không có cặp bẫy khớp bộ lọc.</p>
        ) : (
          <>
            <div className="mora-traps-grid">
              {pagedTrapPairs.map((pair) => {
                const leftN = moraCount(pair.correct.kana);
                const rightN = moraCount(pair.wrong.kana);
                return (
                  <article key={pair.id} className="mora-trap-card">
                    <h4 className="mora-trap-card-title">{pair.title}</h4>
                    <div className="mora-trap-card-pair">
                      <button
                        type="button"
                        className="mora-trap-side"
                        onClick={() => {
                          setMoraInput(pair.correct.kana);
                          playAudio(pair.correct.kana, 'ja-JP');
                        }}
                      >
                        <span className="japanese-text mora-trap-side-kana">
                          {pair.correct.kana}
                        </span>
                        {pair.correct.kanji ? (
                          <span className="mora-trap-side-kanji japanese-text">
                            {pair.correct.kanji}
                          </span>
                        ) : null}
                        <span className="mora-trap-side-meta">
                          {leftN} nhịp · {moraRomaji(pair.correct.kana)}
                        </span>
                        <span className="mora-trap-side-meaning">
                          {pair.correct.meaning}
                          {pair.correct.emoji ? ` ${pair.correct.emoji}` : ''}
                        </span>
                      </button>
                      <span className="mora-trap-vs" aria-hidden="true">
                        vs
                      </span>
                      <button
                        type="button"
                        className="mora-trap-side mora-trap-side--alt"
                        onClick={() => {
                          setMoraInput(pair.wrong.kana);
                          playAudio(pair.wrong.kana, 'ja-JP');
                        }}
                      >
                        <span className="japanese-text mora-trap-side-kana">
                          {pair.wrong.kana}
                        </span>
                        {pair.wrong.kanji ? (
                          <span className="mora-trap-side-kanji japanese-text">
                            {pair.wrong.kanji}
                          </span>
                        ) : null}
                        <span className="mora-trap-side-meta">
                          {rightN} nhịp · {moraRomaji(pair.wrong.kana)}
                        </span>
                        <span className="mora-trap-side-meaning">
                          {pair.wrong.meaning}
                          {pair.wrong.emoji ? ` ${pair.wrong.emoji}` : ''}
                        </span>
                      </button>
                    </div>
                    <p className="mora-trap-card-note">{pair.note}</p>
                  </article>
                );
              })}
            </div>
            {trapPageCount > 1 ? (
              <nav className="mora-pagination" aria-label="Phân trang cặp bẫy mora">
                <button
                  type="button"
                  className="btn"
                  disabled={trapPage === 1}
                  onClick={() => setTrapPage((current) => current - 1)}
                >
                  ← Trước
                </button>
                <span>
                  Trang {trapPage}/{trapPageCount}
                </span>
                <button
                  type="button"
                  className="btn"
                  disabled={trapPage === trapPageCount}
                  onClick={() => setTrapPage((current) => current + 1)}
                >
                  Sau →
                </button>
              </nav>
            ) : null}
          </>
        )}
      </section>

      <section className="mora-database glass-panel" aria-labelledby="mora-database-title">
        <div className="mora-database-heading">
          <div>
            <h3 id="mora-database-title">Từ vựng theo giáo trình</h3>
            <p>
              Chọn bài → bấm từ để nghe và phân tích nhịp
              {isLoading
                ? ' · Đang tải…'
                : ` · ${filteredVocab.length}${
                    query.trim() ? `/${lessonVocab.length}` : ''
                  } từ trong bài`}
            </p>
          </div>
          <input
            className="mora-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Lọc trong bài: kana, kanji, nghĩa…"
            aria-label="Lọc từ trong bài"
          />
        </div>

        {curriculumGroups.length > 1 ? (
          <div className="mora-curriculum-tabs" aria-label="Giáo trình">
            {curriculumGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                className={group.key === activeGroupKey ? 'active' : ''}
                onClick={() => {
                  const first = group.items[0];
                  if (first) {
                    setLessonNumber(first.lessonNumber);
                    setQuery('');
                  }
                }}
              >
                {group.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mora-lesson-toolbar">
          <LessonSelector
            value={lessonNumber}
            onChange={(n) => {
              setLessonNumber(n);
              setQuery('');
            }}
            id="mora-lesson-select"
            countKind="vocab"
          />
        </div>

        {activeGroup && activeGroup.items.length > 1 ? (
          <div className="mora-lesson-chips" aria-label={`Bài trong ${activeGroup.label}`}>
            {activeGroup.items.map((lesson) => {
              const isMinna =
                lesson.textbook === 'MINNA' ||
                (lesson.lessonNumber >= 1 && lesson.lessonNumber <= 50);
              const label = isMinna
                ? String(lesson.lessonNumber)
                : lesson.title?.trim() || lessonShortLabel(lesson);
              return (
                <button
                  key={lesson.lessonNumber}
                  type="button"
                  className={
                    lesson.lessonNumber === lessonNumber
                      ? 'mora-lesson-chip active'
                      : 'mora-lesson-chip'
                  }
                  onClick={() => {
                    setLessonNumber(lesson.lessonNumber);
                    setQuery('');
                  }}
                  title={lesson.title || `Bài ${lesson.lessonNumber}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        <p className="mora-lesson-current" aria-live="polite">
          <span className="mora-lesson-current-book">{lessonTitle}</span>
          {currentLesson?.title ? (
            <span className="mora-lesson-current-title">
              · Bài {currentLesson.lessonNumber}: {currentLesson.title}
            </span>
          ) : currentLesson ? (
            <span className="mora-lesson-current-title">· Bài {currentLesson.lessonNumber}</span>
          ) : null}
        </p>

        {isError ? (
          <p className="mora-placeholder">Không tải được từ vựng bài này. Hãy thử lại sau.</p>
        ) : !isLoading && lessonVocab.length === 0 ? (
          <p className="mora-placeholder">Bài này chưa có từ vựng.</p>
        ) : !isLoading && filteredVocab.length === 0 ? (
          <p className="mora-placeholder">Không có từ khớp bộ lọc trong bài này.</p>
        ) : (
          <div className="mora-word-list">
            {filteredVocab.map((word) => {
              const beats = moraCount(word.kana);
              return (
                <button
                  key={word.id}
                  type="button"
                  className="mora-word"
                  title="Bấm để nghe và phân tích nhịp"
                  onClick={() => {
                    setMoraInput(word.kana);
                    playAudio(word.kana, 'ja-JP');
                  }}
                >
                  <span className="mora-word-kana japanese-text">{word.kana}</span>
                  {word.kanji ? (
                    <span className="mora-word-kanji japanese-text">{word.kanji}</span>
                  ) : null}
                  <span className="mora-word-meaning">{word.meaning}</span>
                  <span className="mora-word-beats">{beats} nhịp</span>
                  {word.jlptLevel ? <span className="mora-word-level">{word.jlptLevel}</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function capitalize(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
