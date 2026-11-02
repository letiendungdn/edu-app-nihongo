'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  clearMockExamResult,
  loadMockExamResult,
  pictureOption,
  type MockExamResult,
  type MockExamReviewItem,
} from '../utils/mockExam';
import { importWrongItemsFromReview } from '../utils/mistakeVocab';
import ListeningPlayer from '../components/ListeningPlayer';
import MockExamQuestionText from '../components/MockExamQuestionText';
import './MockExam.css';

type ReviewFilter = 'all' | 'wrong' | 'correct';

export default function MockExamAnswersPage() {
  const params = useParams();
  const level = String(params?.level ?? '');
  const router = useRouter();
  const [result, setResult] = useState<MockExamResult | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [savedWrongCount, setSavedWrongCount] = useState(0);
  const importedRef = useRef(false);

  useEffect(() => {
    const saved = loadMockExamResult();
    if (!saved || (level && saved.level !== level)) {
      router.replace('/mock-exam');
      return;
    }
    setResult(saved);

    if (!importedRef.current) {
      importedRef.current = true;
      const wrongItems = saved.review.filter((r) => !r.isCorrect);
      const added = importWrongItemsFromReview(wrongItems);
      setSavedWrongCount(added);
    }
  }, [level, router]);

  const filteredReview = useMemo((): MockExamReviewItem[] => {
    if (!result) return [];
    if (filter === 'wrong') return result.review.filter((r) => !r.isCorrect);
    if (filter === 'correct') return result.review.filter((r) => r.isCorrect);
    return result.review;
  }, [result, filter]);

  if (!result) {
    return (
      <div className="container mock-exam-page">
        <div className="empty-state glass-panel">
          <p>Đang tải kết quả...</p>
        </div>
      </div>
    );
  }

  const wrongCount = result.total - result.correctCount;

  return (
    <div className="container mock-exam-page mock-exam-answers">
      <header className="mock-exam-header">
        <h2 className="view-title">Đáp án &amp; kết quả</h2>
        <p className="mock-exam-subtitle">{result.title}</p>
      </header>

      <section className="mock-exam-score-summary glass-panel">
        <div className={`score-circle ${result.passed ? 'passed' : 'failed'}`}>
          <span className="score-percent">{result.percent}%</span>
          <span className="score-label">
            {result.correctCount}/{result.total} đúng
          </span>
        </div>
        <div className="score-details">
          <h3>{result.passed ? '🎉 Đạt đề thử!' : '📚 Cần ôn thêm'}</h3>
          <p>
            Ngưỡng gợi ý: {result.passThreshold}% · Bạn đạt {result.percent}%
          </p>
          <div className="section-scores">
            {result.sectionScores.map((sec) => (
              <div key={sec.sectionId} className="section-score-item">
                <strong>{sec.sectionName}</strong>
                <span>
                  {sec.correct}/{sec.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {savedWrongCount > 0 && (
        <p className="mock-exam-saved-wrong glass-panel">
          Đã lưu <strong>{savedWrongCount}</strong> từ sai vào bảng ôn.{' '}
          <Link href="/vocab-review">Ôn ngay →</Link>
        </p>
      )}

      <div className="answers-filter-bar">
        <button
          type="button"
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tất cả ({result.total})
        </button>
        <button
          type="button"
          className={`filter-btn ${filter === 'wrong' ? 'active' : ''}`}
          onClick={() => setFilter('wrong')}
        >
          Sai ({wrongCount})
        </button>
        <button
          type="button"
          className={`filter-btn ${filter === 'correct' ? 'active' : ''}`}
          onClick={() => setFilter('correct')}
        >
          Đúng ({result.correctCount})
        </button>
      </div>

      <div className="answers-list">
        {filteredReview.map((item, index) => (
          <article
            key={item.id}
            className={`answer-card glass-panel ${item.isCorrect ? 'correct' : 'wrong'}`}
          >
            <div className="answer-card-head">
              <span className="answer-badge">
                {item.sectionName} · Câu {result.review.findIndex((r) => r.id === item.id) + 1}
              </span>
              <span className={`answer-status ${item.isCorrect ? 'ok' : 'bad'}`}>
                {item.isCorrect ? '✓ Đúng' : '✗ Sai'}
              </span>
            </div>

            <MockExamQuestionText question={item.question} as="p" className="answer-question" />
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="mock-exam-question-image" />
            ) : null}

            {item.type === 'listening' && (item.audioUrl || item.audioText) && (
              <ListeningPlayer
                audioUrl={item.audioUrl}
                audioText={item.audioText}
                autoPlay={false}
                showText
                unlimited
              />
            )}

            {(item.type === 'multiple_choice' || item.type === 'listening') &&
              item.options && item.options.length > 0 && (
              <ul className="answer-options-review">
                {item.options.map((opt) => {
                  const isCorrect = opt.text === item.correctAnswer;
                  const isUser = opt.text === item.userAnswer;
                  let cls = '';
                  if (isCorrect) cls = 'opt-correct';
                  else if (isUser && !item.isCorrect) cls = 'opt-wrong';
                  return (
                    <li key={`${item.id}-${index}-${opt.text}`} className={cls}>
                      {opt.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={opt.imageUrl}
                          alt=""
                          className="mock-exam-option-image"
                        />
                      ) : null}
                      <span>
                        {pictureOption(opt.text).label}
                        {isCorrect && ' ✓'}
                        {isUser && !item.isCorrect && ' (bạn chọn)'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {item.type === 'fill_in_blank' && (
              <div className="answer-fill-review">
                <p>
                  Bạn trả lời:{' '}
                  <strong>{item.userAnswer ? pictureOption(item.userAnswer).label : '(bỏ trống)'}</strong>
                </p>
                <p>
                  Đáp án đúng: <strong className="text-correct">{pictureOption(item.correctAnswer).label}</strong>
                </p>
              </div>
            )}

            {item.lessonNumber && (
              <p className="answer-lesson-hint">
                Ôn lại:{' '}
                <Link href="/vocab">Minna Bài {item.lessonNumber}</Link>
                {' · '}
                <Link href="/grammar">Ngữ pháp</Link>
                {item.sectionId === 'kanji' && (
                  <>
                    {' · '}
                    <Link href="/kanji">Kanji</Link>
                  </>
                )}
                {item.sectionId === 'listening' && (
                  <>
                    {' · '}
                    <Link href="/vocab">Từ vựng</Link>
                  </>
                )}
              </p>
            )}
          </article>
        ))}
      </div>

      <div className="mock-exam-footer-actions">
        <Link
          href={`/mock-exam/${result.level}`}
          className="btn btn-primary"
          onClick={() => clearMockExamResult()}
        >
          Làm đề mới
        </Link>
        <Link href="/mock-exam" className="btn btn-outline">
          Chọn đề khác
        </Link>
        <Link href="/vocab-review" className="btn btn-outline">
          Bảng từ sai
        </Link>
        <Link href="/jlpt" className="btn btn-outline">
          Lộ trình JLPT
        </Link>
      </div>
    </div>
  );
}
