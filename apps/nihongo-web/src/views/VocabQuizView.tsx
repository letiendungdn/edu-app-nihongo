'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LessonSelector from '../components/LessonSelector';
import { useLessons, useVocabRangeQuery, useVocab } from '../hooks/queries';
import { addMistakeWord } from '../utils/mistakeVocab';
import { playAudio } from '../utils/speech';
import { buildVocabQuiz, type VocabQuizMode, type VocabQuizQuestion } from '../utils/vocabQuiz';
import { getVocabExamples } from '../utils/vocabPatternExample';
import './QuizView.css';
import './VocabQuizView.css';

type ScopeMode = 'single' | 'range';
type QuizResult = 'correct' | 'wrong' | null;

const RANGE_PRESETS = [
  { label: '1–10', from: 1, to: 10 },
  { label: '11–20', from: 11, to: 20 },
  { label: '21–30', from: 21, to: 30 },
  { label: '31–40', from: 31, to: 40 },
  { label: '41–50', from: 41, to: 50 },
];

export default function VocabQuizView() {
  const { data: lessons = [] } = useLessons();
  const maxLesson = lessons[lessons.length - 1]?.lessonNumber ?? 50;

  const [phase, setPhase] = useState<'setup' | 'quiz'>('setup');
  const [mode, setMode] = useState<VocabQuizMode>('jp-to-vi');
  const [scopeMode, setScopeMode] = useState<ScopeMode>('single');
  const [lesson, setLesson] = useState(1);
  const [lessonFrom, setLessonFrom] = useState(1);
  const [lessonTo, setLessonTo] = useState(10);
  const [questions, setQuestions] = useState<VocabQuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [result, setResult] = useState<QuizResult>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);

  const { data: singleVocab = [], isLoading: loadingSingle } = useVocab(lesson);
  const { data: rangeVocab = [], isLoading: loadingRange } = useVocabRangeQuery(
    lessonFrom,
    lessonTo,
    scopeMode === 'range',
  );

  const pool = useMemo(() => {
    if (scopeMode === 'single') {
      return singleVocab.map((item) => ({ ...item, lessonNumber: lesson }));
    }
    return rangeVocab;
  }, [scopeMode, singleVocab, lesson, rangeVocab]);

  const isLoading = scopeMode === 'single' ? loadingSingle : loadingRange;
  const rangeLabel =
    scopeMode === 'range'
      ? `Bài ${Math.min(lessonFrom, lessonTo)}–${Math.max(lessonFrom, lessonTo)}`
      : `Bài ${lesson}`;

  const lessonOptions = useMemo(
    () => lessons.map((entry) => entry.lessonNumber).filter((n) => n > 0),
    [lessons],
  );

  useEffect(() => {
    setPhase('setup');
    setQuestions([]);
    setIndex(0);
    setSelectedAnswer('');
    setResult(null);
    setScore({ correct: 0, total: 0 });
    setFinished(false);
  }, [mode, scopeMode, lesson, lessonFrom, lessonTo]);

  const current = questions[index];
  const patternExamples = current
    ? getVocabExamples({
        kanji: current.kanji,
        kana: current.kana,
        exampleJa: current.exampleJa,
        exampleKana: current.exampleKana,
        exampleVi: current.exampleVi,
      })
    : [];

  const startQuiz = () => {
    const built = buildVocabQuiz(pool, mode, { optionCount: 4 });
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
    if (!isCorrect) {
      addMistakeWord({
        kana: current.kana,
        kanji: current.kanji,
        romaji: current.romaji,
        meaning: current.meaning,
        lessonNumber: current.lessonNumber ?? lesson,
      });
    }
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

  const handleRetry = () => {
    startQuiz();
  };

  const speakCurrent = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!current?.kana) return;
    playAudio(current.kana);
  };

  const speakJapaneseOption = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    e.preventDefault();
    const kanaMatch = text.match(/（([^）]+)）/);
    playAudio(kanaMatch?.[1]?.trim() || text);
  };

  const speakExample = (e: React.MouseEvent, speak: string) => {
    e.stopPropagation();
    e.preventDefault();
    playAudio(speak);
  };

  return (
    <div className="container quiz-view vocab-quiz-view">
      <div className="quiz-header">
        <h2 className="view-title">Trắc nghiệm từ vựng</h2>
        <p className="vocab-quiz-subtitle">
          JP → VI hoặc VI → JP · {rangeLabel} · {pool.length} từ
        </p>
        <div className="vocab-quiz-links">
          <Link href="/vocab" className="btn btn-outline">
            Flashcard
          </Link>
          <Link href="/vocab-review" className="btn btn-outline">
            Từ sai
          </Link>
        </div>
      </div>

      {phase === 'setup' && (
        <div className="vocab-quiz-setup glass-panel">
          <div className="vocab-quiz-mode-tabs" role="tablist" aria-label="Hướng dịch">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'jp-to-vi'}
              className={`btn tab-btn ${mode === 'jp-to-vi' ? 'active' : ''}`}
              onClick={() => setMode('jp-to-vi')}
            >
              Nhật → Việt
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'vi-to-jp'}
              className={`btn tab-btn ${mode === 'vi-to-jp' ? 'active' : ''}`}
              onClick={() => setMode('vi-to-jp')}
            >
              Việt → Nhật
            </button>
          </div>

          <p className="vocab-quiz-mode-hint">
            {mode === 'jp-to-vi'
              ? 'Xem từ tiếng Nhật, chọn nghĩa tiếng Việt đúng.'
              : 'Xem nghĩa tiếng Việt, chọn từ tiếng Nhật đúng.'}
          </p>

          <div className="vocab-quiz-scope-tabs" role="tablist" aria-label="Phạm vi bài học">
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
            <LessonSelector value={lesson} onChange={setLesson} id="vocab-quiz-lesson" />
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
                {RANGE_PRESETS.filter((preset) => preset.to <= maxLesson).map((preset) => (
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
              {isLoading ? 'Đang tải từ...' : `Bắt đầu · ${pool.length} câu (random)`}
            </button>
          </div>
          {!isLoading && pool.length < 2 && (
            <p className="vocab-quiz-empty-hint">Cần ít nhất 2 từ để tạo trắc nghiệm.</p>
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
            <button type="button" className="btn btn-primary" onClick={handleRetry}>
              Làm lại (random mới)
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setPhase('setup')}>
              Đổi chế độ
            </button>
            {score.correct < questions.length && (
              <Link href="/vocab-review" className="btn btn-outline quiz-review-link">
                Ôn từ sai →
              </Link>
            )}
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
              {mode === 'jp-to-vi' ? 'Nhật → Việt' : 'Việt → Nhật'}
              {current.lessonNumber != null ? ` · Bài ${current.lessonNumber}` : ''}
            </span>

            <div className="vocab-quiz-prompt-row">
              <h3
                className={`quiz-question ${mode === 'jp-to-vi' ? 'japanese-text vocab-quiz-prompt-jp' : ''}`}
              >
                {current.prompt}
              </h3>
              <button
                type="button"
                className="btn-audio vocab-quiz-audio"
                onClick={speakCurrent}
                title="Nghe phát âm từ vựng"
                aria-label="Nghe phát âm từ vựng"
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
                    className={`quiz-option ${mode === 'vi-to-jp' ? 'japanese-text' : ''} ${
                      selectedAnswer === option.text ? 'selected' : ''
                    } ${result !== null && option.text === current.answer ? 'correct-answer' : ''} ${
                      result === 'wrong' && selectedAnswer === option.text ? 'wrong-answer' : ''
                    }`}
                    onClick={() => result === null && setSelectedAnswer(option.text)}
                    disabled={result !== null}
                  >
                    <span className="quiz-option-main">{option.text}</span>
                    {result !== null && (
                      <span
                        className={`quiz-option-reveal ${
                          mode === 'jp-to-vi' ? 'japanese-text' : ''
                        }`}
                      >
                        {option.reveal}
                      </span>
                    )}
                  </button>
                  {(mode === 'vi-to-jp' || result !== null) && option.speak && (
                    <button
                      type="button"
                      className="btn-audio-small vocab-quiz-option-audio"
                      onClick={(e) => speakJapaneseOption(e, option.speak || option.text)}
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
                {result === 'correct' ? 'Đúng rồi!' : `Sai rồi. Đáp án: ${current.answer}`}
              </div>
            )}

            {result !== null &&
              patternExamples.map((example) => (
                <div key={example.ja} className="vocab-pattern-example vocab-quiz-pattern-example">
                  <div className="vocab-pattern-example-head">
                    <span className="vocab-pattern-example-label">Ví dụ</span>
                    <button
                      type="button"
                      className="btn-audio-small"
                      title="Nghe ví dụ"
                      aria-label="Nghe ví dụ"
                      onClick={(e) => speakExample(e, example.speak)}
                    >
                      🔊
                    </button>
                  </div>
                  <span className="vocab-pattern-example-ja japanese-text">{example.ja}</span>
                  {example.kana && example.kana !== example.ja ? (
                    <span className="vocab-pattern-example-kana">{example.kana}</span>
                  ) : null}
                  <span className="vocab-pattern-example-vi">{example.vi}</span>
                </div>
              ))}

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
