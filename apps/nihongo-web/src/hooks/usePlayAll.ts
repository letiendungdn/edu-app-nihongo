import { useState, useEffect, useCallback, useRef } from 'react';
import { playAudioSequence, stopAudio, type SpeechSequenceItem } from '../utils/speech';

interface PlayAllOptions {
  onItemIndex?: (index: number) => void;
  lang?: string;
  rate?: number;
  pauseMs?: number;
}

export function usePlayAll(): {
  isPlayingAll: boolean;
  startPlayAll: (texts: Array<string | SpeechSequenceItem>, options?: PlayAllOptions) => Promise<void>;
  stopPlayAll: () => void;
} {
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const playingRef = useRef(false);

  useEffect(() => () => stopAudio(), []);

  const stopPlayAll = useCallback(() => {
    stopAudio();
    playingRef.current = false;
    setIsPlayingAll(false);
  }, []);

  const startPlayAll = useCallback(
    async (texts: Array<string | SpeechSequenceItem>, { onItemIndex, lang, rate, pauseMs }: PlayAllOptions = {}) => {
      const items = texts?.filter(Boolean) ?? [];
      if (!items.length || playingRef.current) return;

      playingRef.current = true;
      setIsPlayingAll(true);

      await playAudioSequence(items, {
        lang,
        rate,
        pauseMs,
        onItem: (index) => onItemIndex?.(index),
        onEnd: () => {
          playingRef.current = false;
          setIsPlayingAll(false);
        },
        onStop: () => {
          playingRef.current = false;
          setIsPlayingAll(false);
        },
      });
    },
    [],
  );

  return { isPlayingAll, startPlayAll, stopPlayAll };
}
