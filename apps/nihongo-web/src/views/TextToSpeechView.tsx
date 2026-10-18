'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchKanaRomajiLookup, type KanaRomajiLookup } from '../api';
import { SPEECH_LANG, type SpeechLangCode } from '../config/speech';
import { playAudioSequence, stopAudio } from '../utils/speech';
import './TextToSpeechView.css';

const MAX_CHARS = 5000;

const EXAMPLES: Record<SpeechLangCode, readonly string[]> = {
  'ja-JP': [
    'こんにちは、元気ですか。',
    'ありがとうございます。',
    'すみません、もう一度お願いします。',
    '日本語を勉強しています。',
  ],
  'vi-VN': [
    'Xin chào, hôm nay bạn thế nào?',
    'Cảm ơn bạn rất nhiều.',
    'Tôi đang học tiếng Nhật.',
    'Ý nghĩa: N1 là N2.',
  ],
};

export default function TextToSpeechView() {
  const [text, setText] = useState('');
  const [lang, setLang] = useState<SpeechLangCode>(SPEECH_LANG.ja);
  const [rate, setRate] = useState(0.9);
  const [forceServer, setForceServer] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reading, setReading] = useState<KanaRomajiLookup | null>(null);

  const trimmed = text.trim();
  const charCount = text.length;
  const overLimit = charCount > MAX_CHARS;

  useEffect(() => {
    if (lang !== SPEECH_LANG.ja || !trimmed) {
      setReading(null);
      return;
    }

    // Hủy cả request đã gửi, không chỉ hẹn giờ: gõ nhanh thì response của chữ CŨ có thể về sau
    // và hiện sai cách đọc cho chữ mới.
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetchKanaRomajiLookup(trimmed)
        .then((result) => !cancelled && setReading(result))
        .catch(() => !cancelled && setReading(null));
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [lang, trimmed]);

  useEffect(() => {
    setForceServer(lang === SPEECH_LANG.vi);
    setRate(lang === SPEECH_LANG.ja ? 0.9 : 1);
  }, [lang]);

  const canPlay = trimmed.length > 0 && !overLimit;

  const speakLabel = useMemo(() => {
    if (lang === SPEECH_LANG.vi) return 'HoaiMy (server)';
    return forceServer ? 'Nanami (server)' : 'Trình duyệt / server';
  }, [forceServer, lang]);

  const handlePlay = () => {
    if (!canPlay) return;
    setPlaying(true);
    stopAudio();

    const paragraphs = trimmed
      .split(/\n{2,}/)
      .map((part) => part.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    void playAudioSequence(paragraphs.length ? paragraphs : [trimmed], {
      lang,
      rate,
      pauseMs: 600,
      forceServer,
      onEnd: () => setPlaying(false),
      onStop: () => setPlaying(false),
    });
  };

  const handleStop = () => {
    stopAudio();
    setPlaying(false);
  };

  return (
    <section className="container tts-view">
      <header className="tts-header">
        <h2 className="view-title">Đọc văn bản</h2>
        <p className="tts-subtitle">
          Nhập văn bản tiếng Nhật hoặc tiếng Việt — hệ thống đọc to giúp bạn luyện nghe và phát âm.
        </p>
      </header>

      <div className="tts-panel glass-panel">
        <div className="tts-controls">
          <fieldset className="tts-lang-group">
            <legend className="tts-label">Ngôn ngữ</legend>
            <label className="tts-lang-option">
              <input
                type="radio"
                name="tts-lang"
                checked={lang === SPEECH_LANG.ja}
                onChange={() => setLang(SPEECH_LANG.ja)}
              />
              <span>🇯🇵 Tiếng Nhật</span>
            </label>
            <label className="tts-lang-option">
              <input
                type="radio"
                name="tts-lang"
                checked={lang === SPEECH_LANG.vi}
                onChange={() => setLang(SPEECH_LANG.vi)}
              />
              <span>🇻🇳 Tiếng Việt</span>
            </label>
          </fieldset>

          <label className="tts-rate">
            <span className="tts-label">Tốc độ đọc: {rate.toFixed(1)}×</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={rate}
              onChange={(event) => setRate(Number(event.target.value))}
            />
          </label>

          {lang === SPEECH_LANG.ja && (
            <label className="tts-server-toggle">
              <input
                type="checkbox"
                checked={forceServer}
                onChange={(event) => setForceServer(event.target.checked)}
              />
              <span>Dùng giọng server (Nanami)</span>
            </label>
          )}

          <p className="tts-voice-hint">Giọng: {speakLabel}</p>
        </div>

        <label className="tts-label" htmlFor="tts-input">
          Nội dung cần đọc
        </label>
        <textarea
          id="tts-input"
          className={`tts-input${lang === SPEECH_LANG.ja ? ' japanese-text' : ''}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={
            lang === SPEECH_LANG.ja
              ? 'Ví dụ: こんにちは。今日はいい天気ですね。'
              : 'Ví dụ: Xin chào. Hôm nay trời đẹp quá.'
          }
          rows={8}
          spellCheck={false}
        />

        <div className="tts-meta">
          <span className={overLimit ? 'tts-count tts-count--over' : 'tts-count'}>
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
          {lang === SPEECH_LANG.ja && reading && (
            <dl className="tts-reading">
              {reading.kana && (
                <>
                  <dt>Hiragana</dt>
                  <dd className="japanese-text">{reading.kana}</dd>
                </>
              )}
              {reading.romaji && (
                <>
                  <dt>Romaji</dt>
                  <dd>{reading.romaji}</dd>
                </>
              )}
              {reading.meaning && (
                <>
                  <dt>Nghĩa</dt>
                  <dd>{reading.meaning}</dd>
                </>
              )}
            </dl>
          )}
        </div>

        <div className="tts-examples">
          <span className="tts-examples-label">Gợi ý:</span>
          {EXAMPLES[lang].map((example) => (
            <button
              key={example}
              type="button"
              className={`tts-example-btn${lang === SPEECH_LANG.ja ? ' japanese-text' : ''}`}
              onClick={() => setText(example)}
            >
              {example.length > 42 ? `${example.slice(0, 42)}…` : example}
            </button>
          ))}
        </div>

        <div className="tts-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canPlay || playing}
            onClick={handlePlay}
          >
            🔊 Phát giọng nói
          </button>
          <button type="button" className="btn btn-outline" onClick={handleStop}>
            ⏹ Dừng
          </button>
        </div>
      </div>
    </section>
  );
}
