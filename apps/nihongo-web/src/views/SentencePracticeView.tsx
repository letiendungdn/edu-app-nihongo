'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import './SentencePracticeView.css';
import { errorMessage } from '@/lib/error-message';
import { fetchSentenceFeedback, type SentenceFeedback } from '@/api';

// ── Types ──────────────────────────────────────────────────────────────────

type AIFeedback = SentenceFeedback;

interface HistoryEntry {
  id: number;
  sentence: string;
  feedback: AIFeedback;
  timestamp: Date;
}

// ── Prompt starters ────────────────────────────────────────────────────────

const STARTERS = [
  'わたしは まいにち にほんご を べんきょう します。',
  'きのう ともだち と えいが を みました。',
  'すみません、えき は どこ ですか？',
  'わたし の しゅみ は おんがく を きく こと です。',
  'Dịch: Hôm nay trời đẹp nhỉ.',
  'Dịch: Tôi muốn đến Nhật Bản năm sau.',
];

// ── Component ──────────────────────────────────────────────────────────────

export default function SentencePracticeView() {
  const [sentence, setSentence] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [idCounter, setIdCounter] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [sentence]);

  const submit = useCallback(async () => {
    const trimmed = sentence.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError('');

    try {
      const feedback = await fetchSentenceFeedback(trimmed);

      const entry: HistoryEntry = {
        id: idCounter,
        sentence: trimmed,
        feedback,
        timestamp: new Date(),
      };
      setHistory((prev) => [entry, ...prev]);
      setIdCounter((n) => n + 1);
      setSentence('');
    } catch (e) {
      setError(errorMessage(e));
    }
    setLoading(false);
  }, [sentence, loading, idCounter]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  };

  const applyStarter = (s: string) => {
    setSentence(s);
    textareaRef.current?.focus();
  };

  const newest = history[0];

  return (
    <div className="page-wrap">
      {/* Hero */}
      <div className="page-hero">
        <div className="page-hero__main">
          <p className="page-hero__eyebrow">AI Sentence Practice</p>
          <h1 className="page-hero__title">Luyện câu cùng AI</h1>
          <p className="page-hero__desc">
            Viết một câu tiếng Nhật — AI sẽ sửa lỗi, giải thích ngữ pháp, và
            cho ví dụ thêm. Cũng có thể nhờ dịch câu tiếng Việt sang tiếng Nhật.
          </p>
        </div>
      </div>

      {/* Input area */}
      <div className="sp-input-card card">
        <label className="sp-input-label">
          Nhập câu tiếng Nhật hoặc "Dịch: câu tiếng Việt"
        </label>
        <textarea
          maxLength={500}
          ref={textareaRef}
          className="sp-textarea japanese-text"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="例: わたしは がくせい です。"
          rows={2}
          disabled={loading}
        />
        <div className="sp-input-actions">
          <span className="sp-hint">
            {loading ? '🤖 Đang phân tích…' : 'Ctrl+Enter để gửi'}
          </span>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={!sentence.trim() || loading}
          >
            {loading ? <span className="spinner-sm" /> : null}
            {loading ? 'Đang xử lý…' : 'Phân tích câu'}
          </button>
        </div>
        {error && <p className="sp-error">{error}</p>}
      </div>

      {/* Starters */}
      {!history.length && (
        <div className="sp-starters">
          <p className="sp-starters__label">Thử ngay:</p>
          <div className="sp-starters__grid">
            {STARTERS.map((s) => (
              <button
                key={s}
                className="sp-starter"
                onClick={() => applyStarter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Latest result (big card) */}
      {newest && (
        <FeedbackCard entry={newest} expanded />
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="sp-history">
          <h3 className="sp-history__title">Lịch sử ({history.length - 1} câu trước)</h3>
          {history.slice(1).map((entry) => (
            <FeedbackCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── FeedbackCard ───────────────────────────────────────────────────────────

function FeedbackCard({
  entry,
  expanded = false,
}: {
  entry: HistoryEntry;
  expanded?: boolean;
}) {
  const [open, setOpen] = useState(expanded);
  const { sentence, feedback: f, timestamp } = entry;
  const hasCorrection = f.corrected && f.corrected !== sentence;

  return (
    <div className={`sp-result-card card${open ? ' sp-result-card--open' : ''}`}>
      {/* Header row */}
      <div className="sp-result-card__header" onClick={() => setOpen((p) => !p)}>
        <div className="sp-result-card__sent japanese-text">
          {sentence}
          {hasCorrection && <span className="sp-badge sp-badge--fix">修正あり</span>}
          {!hasCorrection && <span className="sp-badge sp-badge--ok">✓ 正しい</span>}
        </div>
        <div className="sp-result-card__meta">
          <span>{timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="sp-chevron">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="sp-result-card__body">
          {/* Corrected sentence */}
          {hasCorrection && (
            <div className="sp-section sp-section--corrected">
              <span className="sp-section__label">Câu đã sửa</span>
              <p className="japanese-text sp-corrected">{f.corrected}</p>
              {f.reading && <p className="sp-reading">{f.reading}</p>}
            </div>
          )}

          {!hasCorrection && f.reading && (
            <div className="sp-section">
              <span className="sp-section__label">Phiên âm</span>
              <p className="sp-reading">{f.reading}</p>
            </div>
          )}

          {/* Meaning */}
          <div className="sp-section">
            <span className="sp-section__label">Nghĩa</span>
            <p className="sp-meaning">{f.meaning}</p>
          </div>

          {/* Explanation */}
          <div className="sp-section">
            <span className="sp-section__label">Giải thích</span>
            <p className="sp-explanation">{f.explanation}</p>
          </div>

          {/* Examples */}
          {f.examples?.length > 0 && (
            <div className="sp-section">
              <span className="sp-section__label">Ví dụ tương tự</span>
              <ul className="sp-examples">
                {f.examples.map((ex, i) => (
                  <li key={i} className="japanese-text">{ex}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
