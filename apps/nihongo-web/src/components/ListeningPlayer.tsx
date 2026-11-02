'use client';

import { useEffect, useRef, useState } from 'react';
import { listeningLines } from '../utils/mockExam';
import { playAudio, playAudioSequence, stopAudio } from '../utils/speech';

const MAX_REPLAYS = 2;

interface Props {
  audioText?: string;
  audioUrl?: string;
  autoPlay?: boolean;
  showText?: boolean;
  unlimited?: boolean;
}

export default function ListeningPlayer({
  audioText,
  audioUrl,
  autoPlay = true,
  showText = false,
  unlimited = false,
}: Props) {
  const [replaysLeft, setReplaysLeft] = useState(MAX_REPLAYS);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = () => {
    if (audioUrl) {
      stopAudio();
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
      } else if (audioRef.current.src !== audioUrl) {
        audioRef.current.src = audioUrl;
      }
      void audioRef.current.play().catch(() => undefined);
      return;
    }
    if (audioText) {
      // Hội thoại nhiều dòng: đọc nối tiếp từng câu (tránh Chrome cắt câu đọc quá dài)
      const lines = listeningLines(audioText);
      if (lines.length > 1) void playAudioSequence(lines, { pauseMs: 550 });
      else playAudio(lines[0] ?? audioText);
    }
  };

  useEffect(() => {
    if (!unlimited) {
      setReplaysLeft(MAX_REPLAYS);
    }
    if (autoPlay && (audioUrl || audioText)) {
      play();
    }
    return () => {
      stopAudio();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- replay when source changes
  }, [audioText, audioUrl, autoPlay, unlimited]);

  const handlePlay = () => {
    if (!audioUrl && !audioText) return;
    if (!unlimited && replaysLeft <= 0) return;
    play();
    if (!unlimited) {
      setReplaysLeft((n) => n - 1);
    }
  };

  const canPlay = !!(audioUrl || audioText) && (unlimited || replaysLeft > 0);

  return (
    <div className="listening-player">
      <button
        type="button"
        className="btn btn-primary listening-play-btn"
        onClick={handlePlay}
        disabled={!canPlay}
      >
        🔊{' '}
        {unlimited
          ? 'Nghe'
          : `Nghe lại ${replaysLeft > 0 ? `(${replaysLeft} lần)` : '(hết lượt)'}`}
      </button>
      <p className="listening-hint">
        {unlimited
          ? 'Nghe không giới hạn để ôn lại.'
          : `Audio tự phát khi vào câu. Nghe lại tối đa ${MAX_REPLAYS} lần.`}
      </p>
      {showText && audioText && (
        <p className="listening-reveal japanese-text">{audioText}</p>
      )}
    </div>
  );
}
