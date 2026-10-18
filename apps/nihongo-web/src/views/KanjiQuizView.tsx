'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  useKanjiEntriesQuery,
  useKanjiLessonsQuery,
  useKanjiRangeQuery,
  useLessons,
  useVocabRangeQuery,
  useVocab,
} from '../hooks/queries';
import { playAudio } from '../utils/speech';
import KanjiStructureButton from '../components/KanjiStructureButton';
import {
  buildKanjiQuiz,
  toKanjiQuizSource,
  toKanjiQuizSourceFromVocab,
  type KanjiQuizMode,
  type KanjiQuizQuestion,
} from '../utils/kanjiQuiz';
import './QuizView.css';
import './VocabQuizView.css';

type ScopeMode = 'single' | 'range';
type PoolSource = 'kanji' | 'minna';
type QuizResult = 'correct' | 'wrong' | null;

const KANJI_RANGE_PRESETS = [
  { label: '1–5', from: 1, to: 5 },
  { label: '6–10', from: 6, to: 10 },
  { label: '1–10', from: 1, to: 10 },
];

const MINNA_RANGE_PRESETS = [
  { label: '1–10', from: 1, to: 10 },
  { label: '11–20', from: 11, to: 20 },
  { label: '21–30', from: 21, to: 30 },
  { label: '31–40', from: 31, to: 40 },
  { label: '41–50', from: 41, to: 50 },
];

export default function KanjiQuizView() {
  const searchParams = useSearchParams();
  const initialSource: PoolSource =
    searchParams?.get('source') === 'minna' ? 'minna' : 'kanji';

  const { data: kanjiLessons = [] } = useKanjiLessonsQuery();
  const { data: minnaLessons = [] } = useLessons();

  const [phase, setPhase] = useState<'setup' | 'quiz'>('setup');
  const [poolSource, setPoolSource] = useState<PoolSource>(initialSource);
  const [mode, setMode] = useState<KanjiQuizMode>('char-to-meaning');
  const [scopeMode, setScopeMode] = useState<ScopeMode>('single');
  const [lesson, setLesson] = useState(1);
  const [lessonFrom, setLessonFrom] = useState(1);
  const [lessonTo, setLessonTo] = useState(poolSource === 'minna' ? 10 : 5);
  const [questions, setQuestions] = useState<KanjiQuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [result, setResult] = useState<QuizResult>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);

  const lessons = poolSource === 'minna' ? minnaLessons : kanjiLessons;
  const maxLesson = lessons[lessons.length - 1]?.lessonNumber ?? (poolSource === 'minna' ? 50 : 10);
  const rangePresets = poolSource === 'minna' ? MINNA_RANGE_PRESETS : KANJI_RANGE_PRESETS;

  const { data: singleKanji = [], isLoading: loadingKanjiSingle } = useKanjiEntriesQuery(
    lesson,
    poolSource === 'kanji' && scopeMode === 'single',
  );
  const { data: rangeKanji = [], isLoading: loadingKanjiRange } = useKanjiRangeQuery(
    lessonFrom,
    lessonTo,
    poolSource === 'kanji' && scopeMode === 'range',
  );
  const { data: singleVocab = [], isLoading: loadingVocabSingle } = useVocab(
    lesson,
    poolSource === 'minna' && scopeMode === 'single',
  );
  const { data: rangeVocab = [], isLoading: loadingVocabRange } = useVocabRangeQuery(
    lessonFrom,
    lessonTo,
    poolSource === 'minna' && scopeMode === 'range',
  );

  const pool = useMemo(() => {
    if (poolSource === 'minna') {
      const raw =
        scopeMode === 'single'
          ? singleVocab.map((item) => toKanjiQuizSourceFromVocab(item, lesson))
          : rangeVocab.map((item) => toKanjiQuizSourceFromVocab(item, item.lessonNumber));
      return raw.filter((item): item is NonNullable<typeof item> => Boolean(item));
    }
    const raw =
      scopeMode === 'single'
        ? singleKanji.map((entry) => toKanjiQuizSource(entry, lesson))
        : rangeKanji.map((entry) => toKanjiQuizSource(entry, entry.lessonNumber));
    return raw.filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [
    poolSource,
    scopeMode,
    singleVocab,
    rangeVocab,
    singleKanji,
    rangeKanji,
    lesson,
  ]);

  const isLoading =
    poolSource === 'minna'
      ? scopeMode === 'single'
        ? loadingVocabSingle
        : loadingVocabRange
      : scopeMode === 'single'
        ? loadingKanjiSingle
        : loadingKanjiRange;

  const rangeLabel =
    scopeMode === 'range'
      ? `Bài ${Math.min(lessonFrom, lessonTo)}–${Math.max(lessonFrom, lessonTo)}`
      : `Bài ${lesson}`;

  const lessonOptions = useMemo(
    () => lessons.map((entry) => entry.lessonNumber).filter((n) => n > 0),
    [lessons],
  );

  useEffect(() => {
    const fromQuery = searchParams?.get('source') === 'minna' ? 'minna' : 'kanji';
    setPoolSource(fromQuery);
  }, [searchParams]);

  useEffect(() => {
    setPhase('setup');
    setQuestions([]);
    setIndex(0);
    setSelectedAnswer('');
    setResult(null);
    setScore({ correct: 0, total: 0 });
    setFinished(false);
  }, [mode, scopeMode, lesson, lessonFrom, lessonTo, poolSource]);

  useEffect(() => {
    if (!lessonOptions.length) return;
    if (!lessonOptions.includes(lesson)) setLesson(lessonOptions[0]);
    if (!lessonOptions.includes(lessonFrom)) setLessonFrom(lessonOptions[0]);
    if (!lessonOptions.includes(lessonTo)) {
      setLessonTo(lessonOptions[Math.min(lessonOptions.length - 1, poolSource === 'minna' ? 9 : 4)] ?? lessonOptions[0]);
    }
  }, [poolSource, lessonOptions, lesson, lessonFrom, lessonTo]);

  const current = questions[index];

  const startQuiz = () => {
    const built = buildKanjiQuiz(pool, mode, { optionCount: 4 });
    setQuestions(built);
    setIndex(0);
    setSelectedAnswer('');
    setResult(null);
    setScore({ correct: 0, total: 0 });
    setFinished(false);
    setPhase('quiz');
  };

  const handleSubmit = () => {
    if (!current || result !== null || !selectedAnswer) return;
    const isCorrect = selectedAnswer === current.answer;
    setResult(isCorrect ? 'correct' : 'wrong');
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((prev) => prev + 1);
    setSelectedAnswer('');
    setResult(null);
  };

  const speakCurrent = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!current?.speak) return;
    playAudio(current.speak);
  };

  const speakOption = (e: React.MouseEvent, speak?: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (speak) playAudio(speak);
  };

  const modeLabel =
    mode === 'char-to-meaning'
      ? 'Kanji → Nghĩa'
      : mode === 'meaning-to-char'
        ? 'Nghĩa → Kanji'
        : 'Kanji → Đọc';

  const sourceLabel = poolSource === 'minna' ? 'Minna (từ có kanji)' : 'Bài kanji';

  return (
    <div className="container quiz-view vocab-quiz-view">
      <div className="quiz-header">
        <h2 className="view-title">Trắc nghiệm Kanji</h2>
        <p className="vocab-quiz-subtitle">
          {modeLabel} · {sourceLabel} · {rangeLabel} · {pool.length}{' '}
          {poolSource === 'minna' ? 'từ' : 'chữ'}
        </p>
        <div className="vocab-quiz-links">
          <Link href="/kanji" className="btn btn-outline">
            Flashcard
          </Link>
          <Link href="/kanji/list" className="btn btn-outline">
            Danh sách
          </Link>
          <Link href="/vocab" className="btn btn-outline">
            Từ vựng Minna
          </Link>
          <Link href="/vocab/quiz" className="btn btn-outline">
            TN từ vựng
          </Link>
        </div>
      </div>

      {phase === 'setup' && (
        <div className="vocab-quiz-setup glass-panel">
          <div className="vocab-quiz-scope-tabs" role="tablist" aria-label="Nguồn dữ liệu">
            <button
              type="button"
              role="tab"
              aria-selected={poolSource === 'kanji'}
              className={`btn tab-btn ${poolSource === 'kanji' ? 'active' : ''}`}
              onClick={() => {
                setPoolSource('kanji');
                setLesson(1);
                setLessonFrom(1);
                setLessonTo(5);
              }}
            >
              Bài kanji
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={poolSource === 'minna'}
              className={`btn tab-btn ${poolSource === 'minna' ? 'active' : ''}`}
              onClick={() => {
                setPoolSource('minna');
                setLesson(1);
                setLessonFrom(1);
                setLessonTo(10);
              }}
            >
              Minna (có kanji)
            </button>
          </div>

          <div className="vocab-quiz-mode-tabs" role="tablist" aria-label="Hướng hỏi">
            {(
              [
                ['char-to-meaning', 'Kanji → Nghĩa'],
                ['meaning-to-char', 'Nghĩa → Kanji'],
                ['char-to-reading', 'Kanji → Đọc'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                className={`btn tab-btn ${mode === value ? 'active' : ''}`}
                onClick={() => setMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="vocab-quiz-mode-hint">
            {poolSource === 'minna'
              ? mode === 'char-to-meaning'
                ? 'Xem chữ Hán của từ Minna, chọn nghĩa tiếng Việt.'
                : mode === 'meaning-to-char'
                  ? 'Xem nghĩa tiếng Việt, chọn dạng kanji của từ Minna.'
                  : 'Xem chữ Hán của từ Minna, chọn cách đọc (kana).'
              : mode === 'char-to-meaning'
                ? 'Xem kanji, chọn nghĩa tiếng Việt.'
                : mode === 'meaning-to-char'
                  ? 'Xem nghĩa tiếng Việt, chọn chữ kanji.'
                  : 'Xem kanji, chọn cách đọc on/kun.'}
          </p>

          <div className="vocab-quiz-scope-tabs" role="tablist" aria-label="Phạm vi bài">
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
            <div className="lesson-selector">
              <label htmlFor="kanji-quiz-lesson">
                {poolSource === 'minna' ? 'Chọn bài Minna: ' : 'Chọn bài kanji: '}
              </label>
              <select
                id="kanji-quiz-lesson"
                className="select-input"
                value={lesson}
                onChange={(e) => setLesson(Number(e.target.value))}
              >
                {lessonOptions.map((n) => (
                  <option key={n} value={n}>
                    Bài {n}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="vocab-quiz-range">
              <div className="vocab-quiz-range-fields">
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
              <div className="vocab-quiz-presets">
                {rangePresets.filter((preset) => preset.to <= maxLesson).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="btn btn-outline vocab-quiz-preset-btn"
                    onClick={() => {
                      setLessonFrom(preset.from);
                      setLessonTo(preset.to);
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="quiz-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={startQuiz}
              disabled={isLoading || pool.length < 2}
            >
              {isLoading ? 'Đang tải...' : `Bắt đầu · ${pool.length} câu (random)`}
            </button>
          </div>
          {!isLoading && pool.length < 2 && (
            <p className="vocab-quiz-empty-hint">
              {poolSource === 'minna'
                ? 'Cần ít nhất 2 từ có kanji trong phạm vi đã chọn.'
                : 'Cần ít nhất 2 kanji để tạo trắc nghiệm.'}
            </p>
          )}
        </div>
      )}

      {phase === 'quiz' && finished && (
        <div className="quiz-result glass-panel">
          <div className="result-icon">{score.correct === questions.length ? '🎉' : '📚'}</div>
          <h3>Hoàn thành!</h3>
          <p className="result-score">
            Bạn trả lời đúng <strong>{score.correct}</strong> / <strong>{questions.length}</strong>{' '}
            câu
          </p>
          <p className="result-percent">
            {questions.length ? Math.round((score.correct / questions.length) * 100) : 0}%
          </p>
          <div className="quiz-actions">
            <button type="button" className="btn btn-primary" onClick={startQuiz}>
              Làm lại (random mới)
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setPhase('setup')}>
              Đổi chế độ
            </button>
          </div>
        </div>
      )}

      {phase === 'quiz' && !finished && current && (
        <>
          <p className="quiz-progress">
            Câu {index + 1} / {questions.length}
            {score.total > 0 && (
              <span className="quiz-score">
                {' '}
                · Đúng {score.correct}/{score.total}
              </span>
            )}
          </p>

          <div className="quiz-card glass-panel">
            <span className="quiz-type-badge">
              {modeLabel}
              {current.lessonNumber != null ? ` · Bài ${current.lessonNumber}` : ''}
            </span>

            <div className="vocab-quiz-prompt-row">
              <h3
                className={`quiz-question ${
                  mode !== 'meaning-to-char' ? 'japanese-text vocab-quiz-prompt-jp' : ''
                }`}
              >
                {current.prompt}
              </h3>
              <button
                type="button"
                className="btn-audio vocab-quiz-audio"
                onClick={speakCurrent}
                title="Nghe phát âm"
                aria-label="Nghe phát âm"
              >
                🔊
              </button>
            </div>
            {current.promptSub && <p className="vocab-quiz-prompt-sub">{current.promptSub}</p>}

            <div className="quiz-options">
              {current.options.map((option) => (
                <div key={option.text} className="vocab-quiz-option-wrap">
                  <button
                    type="button"
                    className={`quiz-option ${
                      mode === 'meaning-to-char' || mode === 'char-to-reading'
                        ? 'japanese-text'
                        : ''
                    } ${selectedAnswer === option.text ? 'selected' : ''} ${
                      result !== null && option.text === current.answer ? 'correct-answer' : ''
                    } ${
                      result === 'wrong' && selectedAnswer === option.text ? 'wrong-answer' : ''
                    }`}
                    onClick={() => result === null && setSelectedAnswer(option.text)}
                    disabled={result !== null}
                  >
                    <span className="quiz-option-main">{option.text}</span>
                    {result !== null && (
                      <span className="quiz-option-reveal">{option.reveal}</span>
                    )}
                  </button>
                  {(mode === 'meaning-to-char' || result !== null) && option.speak && (
                    <button
                      type="button"
                      className="btn-audio-small vocab-quiz-option-audio"
                      onClick={(e) => speakOption(e, option.speak)}
                      title={`Nghe ${option.speak}`}
                      aria-label={`Nghe ${option.speak}`}
                    >
                      🔊
                    </button>
                  )}
                </div>
              ))}
            </div>

            {result && (
              <div className={`feedback ${result}`}>
                {result === 'correct' ? 'Đúng rồi!' : `Sai rồi. Đáp án: ${current.answer}`}{' '}
                <KanjiStructureButton text={`${current.prompt} ${current.answer}`} withLabel />
              </div>
            )}

            <div className="quiz-actions">
              {result === null ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={!selectedAnswer}
                >
                  Kiểm tra
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={handleNext}>
                  {index + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
