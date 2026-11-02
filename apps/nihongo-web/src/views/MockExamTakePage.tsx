'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { startMockExam, submitMockExam } from '../api';
import {
  formatTimer,
  saveMockExamResult,
  type MockExamQuestion,
  type MockExamSession,
  pictureOption,
} from '../utils/mockExam';
import ListeningPlayer from '../components/ListeningPlayer';
import MockExamQuestionText from '../components/MockExamQuestionText';
import './MockExam.css';
import './QuizView.css';

export default function MockExamTakePage() {
  const params = useParams();
  const level = String(params?.level ?? '');
  const router = useRouter();

  const [exam, setExam] = useState<MockExamSession | null>(null);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittedRef = useRef(false);

  const startMutation = useMutation({
    mutationFn: () => startMockExam(level),
    onSuccess: (data) => {
      const session = data as unknown as MockExamSession;
      setExam(session);
      setTimeLeft(session.durationMinutes * 60);
      setError('');
    },
    onError: () => {
      setError('Không tạo được đề thi. Hãy thử lại sau.');
    },
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { examId: string; answers: Record<string, string> }) =>
      submitMockExam(payload.examId, payload.answers),
    onSuccess: (result) => {
      saveMockExamResult(result as unknown as Parameters<typeof saveMockExamResult>[0]);
      router.replace(`/mock-exam/${level}/answers`);
    },
    onError: () => {
      setError('Nộp bài thất bại. Phiên thi có thể đã hết hạn — hãy làm đề mới.');
      submittedRef.current = false;
    },
  });

  const submitting = submitMutation.isPending;
  const loading = startMutation.isPending && !exam;

  const doSubmit = useCallback(async () => {
    if (!exam || submitting || submittedRef.current) return;
    submittedRef.current = true;
    submitMutation.mutate({ examId: exam.examId, answers: answersRef.current });
  }, [exam, submitting, submitMutation]);

  useEffect(() => {
    if (!level) return;
    submittedRef.current = false;
    setExam(null);
    setAnswers({});
    setCurrentIndex(0);
    setConfirmSubmit(false);
    startMutation.mutate();
  }, [level]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!exam || submitting) return undefined;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void doSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [exam, submitting, doSubmit]);

  const questions: MockExamQuestion[] = exam?.questions ?? [];
  const current = questions[currentIndex];
  const answeredCount = useMemo(
    () => Object.values(answers).filter((a) => a?.trim()).length,
    [answers],
  );

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  if (loading) {
    return (
      <div className="container mock-exam-page">
        <div className="empty-state glass-panel">
          <p>Đang tạo đề thi {level?.toUpperCase()}...</p>
        </div>
      </div>
    );
  }

  if (error || !exam || !current) {
    return (
      <div className="container mock-exam-page">
        <div className="empty-state glass-panel">
          <p>{error || 'Không có câu hỏi trong đề thi.'}</p>
          <Link href="/mock-exam" className="btn btn-primary">Quay lại</Link>
        </div>
      </div>
    );
  }

  const isLowTime = timeLeft <= 300;

  return (
    <div className="container mock-exam-page mock-exam-take">
      <div className="mock-exam-toolbar glass-panel">
        <div>
          <h3 className="mock-exam-toolbar-title">{exam.title}</h3>
          <p className="mock-exam-toolbar-meta">
            Đã làm {answeredCount}/{questions.length} câu
          </p>
        </div>
        <div className={`mock-exam-timer ${isLowTime ? 'urgent' : ''}`}>
          ⏱ {formatTimer(timeLeft)}
        </div>
      </div>

      <div className="mock-exam-layout">
        <aside className="mock-exam-palette glass-panel">
          <p className="palette-title">Danh sách câu</p>
          {exam.sections.map((sec) => (
            <div key={sec.id} className="palette-section">
              <span className="palette-section-name">{sec.name}</span>
              <div className="palette-grid">
                {questions
                  .map((q, idx) => ({ ...q, idx }))
                  .filter((q) => q.sectionId === sec.id)
                  .map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      className={`palette-btn ${
                        currentIndex === q.idx ? 'active' : ''
                      } ${answers[q.id]?.trim() ? 'answered' : ''}`}
                      onClick={() => setCurrentIndex(q.idx)}
                    >
                      {q.idx + 1}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="mock-exam-main">
          <div className="quiz-card glass-panel mock-exam-question-card">
            <div className="mock-exam-question-head">
              <span className="quiz-type-badge">
                {current.sectionName} · Câu {currentIndex + 1}
              </span>
              <span className="mock-exam-type-label">
                {current.type === 'listening'
                  ? 'Nghe'
                  : current.type === 'multiple_choice'
                    ? 'Trắc nghiệm'
                    : 'Điền từ'}
              </span>
            </div>

            {current.type === 'listening' && (current.audioUrl || current.audioText) && (
              <ListeningPlayer
                audioUrl={current.audioUrl}
                audioText={current.audioText}
              />
            )}

            <MockExamQuestionText question={current.question} className="quiz-question" />
            {current.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.imageUrl}
                alt=""
                className="mock-exam-question-image"
              />
            ) : null}

            {current.type === 'multiple_choice' || current.type === 'listening' ? (
              <div
                className={`quiz-options${
                  (current.options ?? []).every((option) => option.imageUrl) ? ' quiz-options--pictures' : ''
                }`}
              >
                {(current.options ?? []).map((option, optionIndex) => (
                  <button
                    key={option.text}
                    type="button"
                    className={`quiz-option ${
                      answers[current.id] === option.text ? 'selected' : ''
                    }`}
                    onClick={() => setAnswer(current.id, option.text)}
                  >
                    {option.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={option.imageUrl}
                        alt={`Tranh ${optionIndex + 1}`}
                        className="mock-exam-option-image"
                      />
                    ) : null}
                    {pictureOption(option.text).pictureOnly ? null : <span>{option.text}</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="quiz-fill">
                <input
                  type="text"
                  className="fill-input"
                  placeholder="Nhập đáp án..."
                  value={answers[current.id] ?? ''}
                  onChange={(e) => setAnswer(current.id, e.target.value)}
                />
              </div>
            )}

            {(current.imageUrl || (current.options ?? []).some((option) => option.imageUrl)) &&
              (current.imageUrl ?? current.options?.find((option) => option.imageUrl)?.imageUrl ?? '').startsWith('/media/exam/') && (
                <p className="mock-exam-credit">
                  Tranh minh họa ghép từ{' '}
                  <a href="https://openmoji.org" target="_blank" rel="noreferrer">
                    OpenMoji
                  </a>{' '}
                  (CC BY-SA 4.0)
                </p>
              )}

            <div className="mock-exam-nav">
              <button
                type="button"
                className="btn btn-outline"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => i - 1)}
              >
                ← Câu trước
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={currentIndex >= questions.length - 1}
                onClick={() => setCurrentIndex((i) => i + 1)}
              >
                Câu sau →
              </button>
            </div>
          </div>

          <div className="mock-exam-submit-bar glass-panel">
            {!confirmSubmit ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setConfirmSubmit(true)}
                disabled={submitting}
              >
                Nộp bài
              </button>
            ) : (
              <div className="submit-confirm">
                <p>
                  Bạn đã làm {answeredCount}/{questions.length} câu. Nộp bài ngay?
                </p>
                <div className="submit-confirm-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setConfirmSubmit(false)}
                    disabled={submitting}
                  >
                    Tiếp tục làm
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void doSubmit()}
                    disabled={submitting}
                  >
                    {submitting ? 'Đang nộp...' : 'Xác nhận nộp'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
