import { useCallback, useEffect, useRef, useState } from 'react';
import type { BgResponse, TranslationResult } from '../types';
import { speakText, stopSpeech } from '../utils/speak';

interface Props {
  text: string;
  anchorX: number;
  anchorY: number;
  onClose: () => void;
}

type SpeakingLang = 'vi' | 'en' | 'ja' | null;

const LANG = {
  vi: { flag: '🇻🇳', label: 'Tiếng Việt', accent: '#ff6b6b' },
  en: { flag: '🇬🇧', label: 'English',    accent: '#4ecdc4' },
  ja: { flag: '🇯🇵', label: '日本語',      accent: '#ffb347' },
} as const;

export default function FloatingCard({ text, anchorX, anchorY, onClose }: Props) {
  const [result, setResult]       = useState<TranslationResult | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [showEx, setShowEx]       = useState(false);
  const [speaking, setSpeaking]   = useState<SpeakingLang>(null);
  const [pos, setPos]             = useState({ x: anchorX, y: anchorY });
  const cardRef                   = useRef<HTMLDivElement>(null);

  // Fetch translation
  useEffect(() => {
    chrome.runtime.sendMessage<{ type: string; text: string }, BgResponse>(
      { type: 'TRANSLATE', text },
      (res) => {
        if (chrome.runtime.lastError) {
          setError(chrome.runtime.lastError.message ?? 'Extension error');
          return;
        }
        if (res.success) setResult(res.result);
        else setError(res.error);
      },
    );
  }, [text]);

  // Adjust position after result renders (avoid going off-screen)
  useEffect(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = pos;

    if (x + rect.width + 16 > vw) x = Math.max(8, vw - rect.width - 16);
    if (y + rect.height + 16 > vh + window.scrollY) y = anchorY - rect.height - 18;
    if (x !== pos.x || y !== pos.y) setPos({ x, y });
  }, [result, error]);

  const speak = useCallback((word: string, lang: 'vi' | 'en' | 'ja') => {
    stopSpeech();
    setSpeaking(lang);
    void speakText(word, lang).finally(() => setSpeaking(null));
  }, []);

  return (
    <div
      ref={cardRef}
      style={{ left: pos.x, top: pos.y }}
      className="tn-card"
    >
      {/* Header */}
      <div className="tn-header">
        <span className="tn-orig">"{text.length > 40 ? text.slice(0, 40) + '…' : text}"</span>
        <button className="tn-btn-close" onClick={onClose} title="Đóng">×</button>
      </div>

      {/* Loading skeleton */}
      {!result && !error && (
        <div className="tn-loading">
          <span className="tn-spinner" />
          <span>Đang dịch…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="tn-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Translation rows */}
      {result && (
        <>
          <div className="tn-langs">
            {(['vi', 'en', 'ja'] as const).map((lang) => {
              const cfg   = LANG[lang];
              const mainText   = result[lang].text;
              const subText    = lang === 'ja'
                ? `${result.ja.kana}　${result.ja.romaji}`
                : result[lang].pronunciation;
              const isSource = result.detected === lang;

              return (
                <div key={lang} className={`tn-row${isSource ? ' tn-row--source' : ''}`}>
                  <span className="tn-flag">{cfg.flag}</span>

                  <div className="tn-row-body">
                    <span className="tn-main" style={{ color: cfg.accent }}>{mainText}</span>
                    {subText && <span className="tn-sub">{subText}</span>}
                    {isSource && <span className="tn-badge">nguồn</span>}
                  </div>

                  <button
                    className={`tn-btn-speak${speaking === lang ? ' tn-btn-speak--active' : ''}`}
                    onClick={() => speak(mainText, lang)}
                    title="Phát âm"
                  >
                    <SpeakIcon active={speaking === lang} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Examples toggle */}
          <button className="tn-ex-toggle" onClick={() => setShowEx(!showEx)}>
            <span>{showEx ? '▲' : '▼'}</span>
            <span>Ví dụ trong câu</span>
            <span className="tn-ex-count">{result.examples.length}</span>
          </button>

          {showEx && (
            <div className="tn-examples">
              {result.examples.map((ex, i) => (
                <div key={i} className="tn-example">
                  {(['vi', 'en', 'ja'] as const).map((lang) => (
                    <div key={lang} className="tn-ex-line">
                      <span className="tn-ex-flag">{LANG[lang].flag}</span>
                      <span className="tn-ex-text">{ex[lang]}</span>
                      <button
                        className="tn-btn-speak tn-btn-speak--sm"
                        onClick={() => speak(ex[lang], lang)}
                        title="Phát âm"
                      >
                        <SpeakIcon active={false} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SpeakIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {active ? (
        <>
          <line x1="15" y1="9" x2="21" y2="15" />
          <line x1="21" y1="9" x2="15" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      )}
    </svg>
  );
}
