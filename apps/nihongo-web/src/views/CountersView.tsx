'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playAudio } from '../utils/speech';
import PlayAllButton from '../components/PlayAllButton';
import { usePlayAll } from '../hooks/usePlayAll';
import { useJapaneseCountersQuery } from '../hooks/queries';
import StrokeOrder from '../components/StrokeOrder';
import type { CounterItem } from '../types/reference';
import { counterHintBullets } from '../utils/counter-hint';
import { buildCounterSentenceQuestions } from '../utils/counterSentences';
import './CountersView.css';
import './DrillView.css';

function CounterPopup({
  item,
  onClose,
  onStep,
}: {
  item: CounterItem;
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onStep(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onStep(1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onStep]);

  const heardKey = useRef<string | null>(null);
  useEffect(() => {
    const key = `${item.n}:${item.kana}`;
    if (heardKey.current == null) {
      heardKey.current = key;
      return;
    }
    if (heardKey.current === key) return;
    heardKey.current = key;
    playAudio(item.kana);
  }, [item.n, item.kana]);

  const strokeText = item.kanji || item.kana;

  return (
    <div className="counter-popup-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="counter-popup" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="counter-popup-close" onClick={onClose} aria-label="Đóng">✕</button>

        <div className="counter-popup-nav">
          <button type="button" className="counter-popup-step" onClick={() => onStep(-1)} aria-label="Chữ trước">
            ←
          </button>
          <div className="counter-popup-header">
            {item.kanji && <span className="counter-popup-kanji japanese-text">{item.kanji}</span>}
            <div className="counter-popup-meta">
              <span className="counter-popup-num">{item.n}</span>
              <span className="counter-popup-kana japanese-text">{item.kana}</span>
              <span className="counter-popup-romaji">{item.romaji}</span>
            </div>
          </div>
          <button type="button" className="counter-popup-step" onClick={() => onStep(1)} aria-label="Chữ sau">
            →
          </button>
        </div>
        <p className="counter-popup-key-hint">← → đổi chữ</p>

        <div className="counter-popup-stroke">
          <StrokeOrder key={`${item.n}-${strokeText}`} text={strokeText} width={200} height={200} />
          <p className="counter-popup-stroke-hint">Nhấn vào chữ để xem lại nét</p>
        </div>

        <p className="counter-popup-vi">{item.vi}</p>

        <button
          type="button"
          className="btn btn-outline counter-popup-audio"
          onClick={() => playAudio(item.kana)}
        >
          🔊 Nghe đọc
        </button>
      </div>
    </div>
  );
}

export default function CountersView() {
  const { data, isLoading } = useJapaneseCountersQuery();
  const counterCategories = data?.categories ?? [];
  const [activeId, setActiveId] = useState('');
  const [tab, setTab] = useState<'learn' | 'drill'>('learn');
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ ok: 0, n: 0 });
  const { isPlayingAll, startPlayAll, stopPlayAll } = usePlayAll();

  const [popupItem, setPopupItem] = useState<CounterItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function handleCopyItem(e: React.MouseEvent, item: CounterItem) {
    e.stopPropagation();
    const key = `${item.n}-${item.kana}`;
    const parts = [item.kanji, item.kana, item.romaji, item.vi].filter(Boolean);
    void navigator.clipboard.writeText(parts.join('\t')).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    });
  }

  const resolvedActiveId = activeId || counterCategories[0]?.id || '';
  const category =
    counterCategories.find((c) => c.id === resolvedActiveId) ?? counterCategories[0];

  const questions = useMemo(
    () => buildCounterSentenceQuestions((category?.items ?? []) as CounterItem[]),
    [category],
  );
  const currentQ = questions[qIndex];
  const hintBullets = category ? counterHintBullets(category.hint) : [];

  const stepPopup = useCallback((direction: -1 | 1) => {
    setPopupItem((current) => {
      const items = (category?.items ?? []) as CounterItem[];
      if (!current || items.length === 0) return current;
      const idx = items.findIndex((entry) => entry.n === current.n && entry.kana === current.kana);
      if (idx < 0) return current;
      return items[(idx + direction + items.length) % items.length];
    });
  }, [category]);

  if (isLoading || !category) {
    return (
      <div className="container counters-view">
        <p className="counters-empty">Đang tải dữ liệu đếm số...</p>
      </div>
    );
  }

  const handlePlayAll = () => {
    startPlayAll(category.items.map((item) => item.kana));
  };

  const playItem = (kana: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    playAudio(kana);
  };

  return (
    <div className="container counters-view">
      <div className="counters-header">
        <h2 className="view-title counters-view-title">Đếm số & thứ tự</h2>
        <p className="counters-subtitle">
          Tiếng Nhật dùng nhiều chất đếm khác nhau tùy loại sự vật. Chọn chủ đề bên dưới để học.
        </p>

        <div className="counters-tabs">
          <button
            type="button"
            className={`tab-btn ${tab === 'learn' ? 'active' : ''}`}
            onClick={() => setTab('learn')}
          >
            Học bảng
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === 'drill' ? 'active' : ''}`}
            onClick={() => { setTab('drill'); setPicked(null); setQIndex(0); }}
          >
            Đếm trong câu
          </button>
        </div>

        <div className="counters-tabs">
          {counterCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`tab-btn ${resolvedActiveId === cat.id ? 'active' : ''}`}
              onClick={() => {
                stopPlayAll();
                setActiveId(cat.id);
                setQIndex(0);
                setPicked(null);
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'learn' ? (
      <div className="counters-panel">
        <div className="counters-hint-box">
          <ul className="counters-hint-list">
            {hintBullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="counters-play-top">
          <PlayAllButton
            isPlaying={isPlayingAll}
            onPlay={handlePlayAll}
            onStop={stopPlayAll}
            label="Phát tất cả"
          />
        </div>

        <div className="counters-grid">
          {(category.items as CounterItem[]).map((item) => {
            const itemKey = `${item.n}-${item.kana}`;
            const isCopied = copiedKey === itemKey;
            return (
              <div
                key={`${category.id}-${itemKey}`}
                className="counter-card"
                role="button"
                tabIndex={0}
                onClick={() => playAudio(item.kana)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    playAudio(item.kana);
                  }
                }}
              >
                <span className="counter-num">{item.n}</span>
                <button
                  type="button"
                  className="counter-audio-btn"
                  title="Nghe phát âm"
                  aria-label="Nghe phát âm"
                  onClick={(e) => playItem(item.kana, e)}
                >
                  🔊
                </button>
                {item.kanji ? (
                  <button
                    type="button"
                    className="counter-kanji counter-kanji--btn japanese-text"
                    title="Xem nét viết"
                    onClick={(e) => { e.stopPropagation(); setPopupItem(item); }}
                  >
                    {item.kanji}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="counter-kana counter-kana--btn japanese-text"
                    title="Xem nét viết"
                    onClick={(e) => { e.stopPropagation(); setPopupItem(item); }}
                  >
                    {item.kana}
                  </button>
                )}
                {item.kanji && <span className="counter-kana japanese-text">{item.kana}</span>}
                <span className="counter-romaji">{item.romaji}</span>
                <span className="counter-vi">{item.vi}</span>
                <button
                  type="button"
                  className={`counter-copy-btn${isCopied ? ' counter-copy-btn--copied' : ''}`}
                  title={isCopied ? 'Đã copy!' : 'Sao chép'}
                  onClick={(e) => handleCopyItem(e, item)}
                >
                  {isCopied ? '✓' : '📋'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="counters-play-bottom">
          <PlayAllButton
            isPlaying={isPlayingAll}
            onPlay={handlePlayAll}
            onStop={stopPlayAll}
            label="Phát toàn bộ bài học"
          />
        </div>
      </div>
      ) : (
        <div className="drill-view" style={{ maxWidth: 640, margin: '0 auto' }}>
          {!currentQ ? (
            <p>Chưa đủ dữ liệu để luyện câu.</p>
          ) : (
            <>
              <p className="drill-score">{qIndex + 1}/{questions.length} · đúng {score.ok}/{score.n || 0}</p>
              <div className="drill-card">
                <p className="drill-meta">{currentQ.vi}</p>
                <p className="drill-prompt japanese-text">{currentQ.jpPrompt}</p>
                <div className="drill-options">
                  {currentQ.options.map((opt) => {
                    const cls =
                      picked == null
                        ? ''
                        : opt === currentQ.answer
                          ? ' is-correct'
                          : opt === picked
                            ? ' is-wrong'
                            : '';
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={`drill-option japanese-text${cls}`}
                        disabled={picked != null}
                        onClick={() => {
                          setPicked(opt);
                          setScore((s) => ({ ok: s.ok + (opt === currentQ.answer ? 1 : 0), n: s.n + 1 }));
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {picked && (
                  <div className="drill-toolbar" style={{ marginTop: 12 }}>
                    <p className="drill-meta japanese-text" style={{ width: '100%' }}>{currentQ.filledJa}</p>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => playAudio(currentQ.speakJa)}>
                      🔊 Nghe cả câu
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => playAudio(currentQ.answer)}>
                      Nghe số đếm
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-nav"
                onClick={() => {
                  setPicked(null);
                  setQIndex((i) => (i + 1) % Math.max(questions.length, 1));
                }}
              >
                Câu tiếp
              </button>
            </>
          )}
        </div>
      )}

      {popupItem && (
        <CounterPopup item={popupItem} onClose={() => setPopupItem(null)} onStep={stepPopup} />
      )}
    </div>
  );
}
