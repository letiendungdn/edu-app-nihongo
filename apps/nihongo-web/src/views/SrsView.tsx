'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api-client';
import { playAudio } from '@/utils/speech';
import { normalizeTypedJp } from '@/utils/conjugate';
import './SrsView.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface SrsDueCard {
  vocabId: number;
  kana: string;
  kanji: string | null;
  meaning: string;
  lessonNumber: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
}

interface SrsStats {
  total: number;
  dueToday: number;
  mastered: number;
  learning: number;
}

interface ReviewResult {
  interval: number;
  nextReviewAt: string;
  mastered: boolean;
}

// Quality: 1=Again  2=Hard  3=Good  4=Easy
const RATINGS = [
  { quality: 1, label: 'Lại', color: 'again',  key: '1' },
  { quality: 2, label: 'Khó', color: 'hard',   key: '2' },
  { quality: 3, label: 'Ổn',  color: 'good',   key: '3' },
  { quality: 4, label: 'Dễ',  color: 'easy',   key: '4' },
] as const;

// SM-2 preview for button labels (client-side estimate)
function previewInterval(quality: number, ef: number, interval: number, reps: number): string {
  const q = quality;
  const newEf = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  let days: number;
  if (q < 3) { days = 1; }
  else if (reps === 0) { days = 1; }
  else if (reps === 1) { days = 6; }
  else { days = Math.round(interval * newEf); }
  if (days < 1) return '<1d';
  if (days === 1) return '1 ngày';
  if (days < 30) return `${days} ngày`;
  const months = Math.round(days / 30);
  return `${months} tháng`;
}

// ── Lesson groups ──────────────────────────────────────────────────────────

const LESSON_GROUPS = [
  {
    id: 'minna1',
    label: 'Minna 上 (1–25)',
    lessons: Array.from({ length: 25 }, (_, i) => i + 1),
  },
  {
    id: 'minna2',
    label: 'Minna 下 (26–50)',
    lessons: Array.from({ length: 25 }, (_, i) => i + 26),
  },
  {
    id: 'n3',
    label: 'JLPT N3',
    lessons: [301, 302, 303, 304],
  },
  {
    id: 'n2',
    label: 'JLPT N2',
    lessons: [401, 402, 403, 404],
  },
  {
    id: 'n1',
    label: 'JLPT N1',
    lessons: [501, 502, 503],
  },
] as const;

// ── Component ──────────────────────────────────────────────────────────────

type Phase = 'loading' | 'needs-auth' | 'stats' | 'review' | 'done';
type SrsMode = 'jp-vi' | 'vi-jp' | 'listen-type';

const SRS_MODES: { id: SrsMode; label: string; hint: string }[] = [
  { id: 'jp-vi', label: 'JP → VN', hint: 'Xem chữ Nhật, nhớ nghĩa' },
  { id: 'vi-jp', label: 'VN → JP', hint: 'Xem nghĩa, nhớ chữ / kana' },
  { id: 'listen-type', label: 'Nghe → gõ', hint: 'Nghe phát âm, gõ kana' },
];

export default function SrsView() {
  const { isAuthenticated, authReady } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');
  const [stats, setStats] = useState<SrsStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [queue, setQueue] = useState<SrsDueCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<ReviewResult | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [selectedLessons, setSelectedLessons] = useState<Set<number>>(new Set());
  const [addLessonGroup, setAddLessonGroup] = useState<typeof LESSON_GROUPS[number]['id']>(LESSON_GROUPS[0].id);
  const [addingLesson, setAddingLesson] = useState(false);
  const [addMsg, setAddMsg] = useState('');
  const [mode, setMode] = useState<SrsMode>('jp-vi');
  const [typed, setTyped] = useState('');
  const [typedChecked, setTypedChecked] = useState(false);

  useEffect(() => {
    if (phase !== 'review' || mode !== 'listen-type') return;
    const current = queue[index];
    if (current?.kana) playAudio(current.kana);
  }, [phase, mode, index, queue]);

  // Lỗi tải thì BÁO lỗi. Bản cũ gán toàn số 0: người dùng tưởng mất hết thẻ đã học.
  const loadStats = useCallback(async () => {
    try {
      const data = await apiRequest<SrsStats>('/progress/srs/stats');
      setStats(data);
      setStatsError(false);
    } catch {
      setStatsError(true);
    }
  }, []);

  useEffect(() => {
    // Chờ đọc xong token: bản cũ chớp màn "Đăng nhập để dùng SRS" với người đã đăng nhập
    if (!authReady) return;
    if (!isAuthenticated) { setPhase('needs-auth'); return; }
    void loadStats().then(() => setPhase('stats'));
  }, [authReady, isAuthenticated, loadStats]);

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'review') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === ' ' && !flipped && mode !== 'listen-type') {
        e.preventDefault();
        setFlipped(true);
        return;
      }
      if ((!flipped && mode !== 'listen-type') || submitting) return;
      if (mode === 'listen-type' && !typedChecked) return;
      const rating = RATINGS.find((r) => r.key === e.key);
      if (rating) rate(rating.quality);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const startSession = async () => {
    setPhase('loading');
    try {
      const cards = await apiRequest<SrsDueCard[]>('/progress/srs/due?limit=20');
      if (!cards.length) { await loadStats(); setPhase('stats'); return; }
      setQueue(cards);
      setIndex(0);
      setFlipped(false);
      setLastResult(null);
      setTyped('');
      setTypedChecked(false);
      setSessionCorrect(0);
      setSessionTotal(0);
      setPhase('review');
    } catch {
      setPhase('stats');
    }
  };

  const rate = async (quality: number) => {
    if (submitting) return;
    const card = queue[index];
    if (!card) return;
    setSubmitting(true);
    try {
      const result = await apiRequest<ReviewResult>('/progress/srs/review', {
        method: 'POST',
        body: JSON.stringify({ vocabId: card.vocabId, quality }),
      });
      setLastResult(result);
      if (quality >= 3) setSessionCorrect((n) => n + 1);
      setSessionTotal((n) => n + 1);
    } catch {
      // continue even on error
    }
    setSubmitting(false);

    if (index + 1 >= queue.length) {
      await loadStats();
      setPhase('done');
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
      setLastResult(null);
      setTyped('');
      setTypedChecked(false);
    }
  };

  const checkTyped = () => {
    const card = queue[index];
    if (!card || typedChecked) return;
    setTypedChecked(true);
    setFlipped(true);
  };

  const handleAddLesson = async () => {
    if (selectedLessons.size === 0) return;
    setAddingLesson(true);
    let totalAdded = 0;
    const failed: number[] = [];
    for (const n of selectedLessons) {
      try {
        const r = await apiRequest<{ added: number }>('/progress/srs/add-lesson', {
          method: 'POST',
          body: JSON.stringify({ lessonNumber: n }),
        });
        totalAdded += r.added;
      } catch {
        failed.push(n);
      }
    }
    if (failed.length > 0) {
      setAddMsg(`Thêm xong. ${totalAdded} từ đã thêm. Lỗi bài: ${failed.join(', ')}.`);
    } else {
      setAddMsg(`Đã thêm ${totalAdded} từ từ ${selectedLessons.size} bài vào bộ thẻ.`);
    }
    await loadStats();
    setAddingLesson(false);
    setSelectedLessons(new Set());
    setTimeout(() => setAddMsg(''), 5000);
  };

  const card = queue[index];

  // ── Renders ──────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="page-wrap">
        <div className="page-loading"><span className="spinner" /></div>
      </div>
    );
  }

  if (phase === 'needs-auth') {
    return (
      <div className="page-wrap">
        <div className="srs-auth-gate card">
          <span style={{ fontSize: '2.5rem' }}>🔐</span>
          <h2>Đăng nhập để dùng SRS</h2>
          <p>Tiến độ ôn tập được lưu theo tài khoản — cần đăng nhập để sử dụng.</p>
          <Link href="/login?redirect=/srs" className="btn btn-primary">Đăng nhập</Link>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    const pct = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;
    return (
      <div className="page-wrap">
        <div className="srs-done card">
          <div className="srs-done__emoji">{pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📚'}</div>
          <h2 className="srs-done__title">Xong phiên ôn!</h2>
          <div className="srs-done__score">
            <span>{sessionCorrect}/{sessionTotal}</span>
            <span className="srs-done__pct">{pct}%</span>
          </div>
          <div className="srs-done__stats">
            {stats && (
              <>
                <div className="srs-stat-pill srs-stat-pill--due">
                  <span>{stats.dueToday}</span> còn hôm nay
                </div>
                <div className="srs-stat-pill srs-stat-pill--mastered">
                  <span>{stats.mastered}</span> đã thuộc
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {stats && stats.dueToday > 0 && (
              <button className="btn btn-primary" onClick={startSession}>
                Tiếp tục ({stats.dueToday} thẻ)
              </button>
            )}
            <button className="btn btn-outline" onClick={() => setPhase('stats')}>
              Về trang SRS
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'review' && card) {
    const progress = ((index) / queue.length) * 100;
    const typedOk = typedChecked && (
      normalizeTypedJp(typed) === normalizeTypedJp(card.kana)
      || (!!card.kanji && normalizeTypedJp(typed) === normalizeTypedJp(card.kanji))
    );
    const showAnswer = flipped || typedChecked;
    const canRate = mode === 'listen-type' ? typedChecked : flipped;

    return (
      <div className="srs-session">
        <div className="srs-session__bar">
          <button className="btn btn-ghost btn-sm" onClick={() => { setPhase('stats'); loadStats(); }}>
            ✕ Thoát
          </button>
          <div className="srs-session__prog-wrap">
            <div className="progress-bar">
              <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <span className="srs-session__count">{index + 1}/{queue.length}</span>
        </div>

        <p className="srs-mode-label">{SRS_MODES.find((m) => m.id === mode)?.label}</p>

        <div
          className={`srs-card${showAnswer ? ' srs-card--flipped' : ''}`}
          onClick={() => {
            if (mode === 'listen-type') return;
            if (!flipped) setFlipped(true);
          }}
        >
          <div className="srs-card__inner">
            <div className="srs-card__face srs-card__front">
              <span className="srs-card__lesson">Bài {card.lessonNumber}</span>
              {mode === 'jp-vi' && (
                <>
                  <div className="srs-card__word japanese-text">{card.kanji || card.kana}</div>
                  {card.kanji && <div className="srs-card__kana japanese-text">{card.kana}</div>}
                  <p className="srs-card__hint">Nhấn để xem nghĩa</p>
                </>
              )}
              {mode === 'vi-jp' && (
                <>
                  <div className="srs-card__meaning">{card.meaning}</div>
                  <p className="srs-card__hint">Nhấn để xem chữ Nhật</p>
                </>
              )}
              {mode === 'listen-type' && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={(e) => { e.stopPropagation(); playAudio(card.kana); }}
                  >
                    🔊 Nghe
                  </button>
                  <p className="srs-card__hint">Gõ kana (hoặc kanji) rồi kiểm tra</p>
                </>
              )}
            </div>

            <div className="srs-card__face srs-card__back">
              <span className="srs-card__lesson">Bài {card.lessonNumber}</span>
              <div className="srs-card__word japanese-text">{card.kanji || card.kana}</div>
              {card.kanji && <div className="srs-card__kana japanese-text">{card.kana}</div>}
              <div className="srs-card__meaning">{card.meaning}</div>
              {mode === 'listen-type' && typedChecked && (
                <p className={typedOk ? 'srs-typed-ok' : 'srs-typed-bad'}>
                  {typedOk ? 'Đúng' : `Bạn gõ: ${typed || '—'} · đáp án ${card.kana}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {mode === 'listen-type' && !typedChecked && (
          <form
            className="srs-type-row"
            onSubmit={(e) => { e.preventDefault(); checkTyped(); }}
          >
            <input
              className="japanese-text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Gõ kana"
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={!typed.trim()}>Kiểm tra</button>
          </form>
        )}

        {canRate && !lastResult && (
          <div className="srs-ratings">
            {RATINGS.map((r) => (
              <button
                key={r.quality}
                className={`srs-btn srs-btn--${r.color}`}
                onClick={() => rate(r.quality)}
                disabled={submitting}
              >
                <span className="srs-btn__label">{r.label}</span>
                <span className="srs-btn__interval">
                  {previewInterval(r.quality, card.easeFactor, card.interval, card.repetitions)}
                </span>
              </button>
            ))}
          </div>
        )}

        {mode !== 'listen-type' && !flipped && (
          <p className="srs-hint">Nhấn <kbd>Space</kbd> để lật thẻ</p>
        )}
        {canRate && !lastResult && (
          <p className="srs-hint">
            <kbd>1</kbd> Lại &nbsp;·&nbsp; <kbd>2</kbd> Khó &nbsp;·&nbsp;
            <kbd>3</kbd> Ổn &nbsp;·&nbsp; <kbd>4</kbd> Dễ
          </p>
        )}
      </div>
    );
  }

  // ── Stats / home page ─────────────────────────────────────────────────────

  return (
    <div className="page-wrap">
      <div className="page-hero">
        <div className="page-hero__main">
          <p className="page-hero__eyebrow">Spaced Repetition</p>
          <h1 className="page-hero__title">Luyện từ vựng SRS</h1>
          <p className="page-hero__desc">
            Hệ thống lập lịch thông minh SM-2 — tự động đưa từ khó ôn sớm hơn,
            từ dễ ôn thưa hơn. Học đúng lúc, nhớ lâu hơn.
          </p>
        </div>
      </div>

      <div className="srs-modes">
        {SRS_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`srs-mode-btn${mode === item.id ? ' is-active' : ''}`}
            onClick={() => setMode(item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.hint}</span>
          </button>
        ))}
      </div>

      {statsError && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: '1rem' }}>
          Không tải được thống kê SRS.{' '}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void loadStats()}>
            Thử lại
          </button>
        </div>
      )}

      {stats && (
        <div className="srs-stats-grid">
          <div className="srs-stat-card srs-stat-card--due">
            <div className="srs-stat-card__value">{stats.dueToday}</div>
            <div className="srs-stat-card__label">Đến hạn hôm nay</div>
          </div>
          <div className="srs-stat-card srs-stat-card--learning">
            <div className="srs-stat-card__value">{stats.learning}</div>
            <div className="srs-stat-card__label">Đang học</div>
          </div>
          <div className="srs-stat-card srs-stat-card--mastered">
            <div className="srs-stat-card__value">{stats.mastered}</div>
            <div className="srs-stat-card__label">Đã thuộc</div>
          </div>
          <div className="srs-stat-card">
            <div className="srs-stat-card__value">{stats.total}</div>
            <div className="srs-stat-card__label">Tổng thẻ</div>
          </div>
        </div>
      )}

      <div className="srs-actions">
        {stats && stats.dueToday > 0 ? (
          <button className="btn btn-primary btn-lg" onClick={startSession}>
            Ôn ngay ({stats.dueToday} thẻ)
          </button>
        ) : (
          <div className="srs-empty">
            <span className="srs-empty__icon">✅</span>
            <p><strong>Hết thẻ hôm nay!</strong></p>
            <p>Quay lại sau để ôn các thẻ tiếp theo.</p>
          </div>
        )}
      </div>

      {/* Add lesson panel */}
      <div className="srs-add-panel card card--sm">
        <h3 className="srs-add-panel__title">Thêm bài học vào bộ thẻ</h3>

        {/* Group tabs */}
        <div className="srs-add-tabs">
          {LESSON_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`srs-add-tab${addLessonGroup === g.id ? ' srs-add-tab--active' : ''}`}
              onClick={() => setAddLessonGroup(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Lesson pills */}
        {LESSON_GROUPS.map((g) => g.id === addLessonGroup && (
          <div key={g.id} className="srs-add-lessons">
            <div className="srs-add-lessons__grid">
              {g.lessons.map((n) => {
                const sel = selectedLessons.has(n);
                return (
                  <button
                    key={n}
                    type="button"
                    className={`srs-lesson-pill${sel ? ' srs-lesson-pill--selected' : ''}`}
                    onClick={() => {
                      setSelectedLessons((prev) => {
                        const next = new Set(prev);
                        if (next.has(n)) next.delete(n); else next.add(n);
                        return next;
                      });
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="srs-add-lessons__actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setSelectedLessons((prev) => {
                    const next = new Set(prev);
                    const allSelected = g.lessons.every((n) => next.has(n));
                    if (allSelected) {
                      g.lessons.forEach((n) => next.delete(n));
                    } else {
                      g.lessons.forEach((n) => next.add(n));
                    }
                    return next;
                  });
                }}
              >
                {g.lessons.every((n) => selectedLessons.has(n)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
          </div>
        ))}

        <div className="srs-add-form">
          <span className="srs-add-selected-count">
            {selectedLessons.size > 0
              ? `${selectedLessons.size} bài đã chọn`
              : 'Chưa chọn bài nào'}
          </span>
          <button
            className="btn btn-outline"
            onClick={handleAddLesson}
            disabled={addingLesson || selectedLessons.size === 0}
          >
            {addingLesson ? 'Đang thêm…' : `Thêm${selectedLessons.size > 0 ? ` ${selectedLessons.size} bài` : ''}`}
          </button>
        </div>
        {addMsg && <p className="srs-add-msg">{addMsg}</p>}
      </div>

      {/* How SRS works */}
      <div className="srs-info card card--sm">
        <h3 className="srs-info__title">Cách hoạt động</h3>
        <div className="srs-info__grid">
          {[
            { icon: '🔁', label: 'Lại',  desc: 'Không nhớ — ôn lại ngay ngày mai' },
            { icon: '💪', label: 'Khó',  desc: 'Nhớ mơ hồ — ôn lại sớm' },
            { icon: '✅', label: 'Ổn',   desc: 'Nhớ ổn — ôn sau vài ngày' },
            { icon: '⚡', label: 'Dễ',   desc: 'Nhớ tốt — ôn sau vài tuần' },
          ].map((item) => (
            <div key={item.label} className="srs-info__item">
              <span className="srs-info__icon">{item.icon}</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
