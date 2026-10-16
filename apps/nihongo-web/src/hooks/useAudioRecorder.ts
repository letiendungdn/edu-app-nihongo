import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  hasRecording: boolean;
  error: string;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  playRecording: () => void;
  clearRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedUrlRef = useRef<string | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  const revokeUrl = useCallback(() => {
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
      recordedUrlRef.current = null;
    }
    setHasRecording(false);
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearRecording = useCallback(() => {
    playbackRef.current?.pause();
    playbackRef.current = null;
    revokeUrl();
    chunksRef.current = [];
  }, [revokeUrl]);

  const startRecording = useCallback(async () => {
    setError('');
    clearRecording();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Trình duyệt không hỗ trợ ghi âm.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = getSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || recorder.mimeType || 'audio/webm',
        });
        recordedUrlRef.current = URL.createObjectURL(blob);
        setHasRecording(true);
        stopStream();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setError('Không truy cập được micro. Hãy cho phép quyền ghi âm.');
      stopStream();
    }
  }, [clearRecording, stopStream]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const playRecording = useCallback(() => {
    if (!recordedUrlRef.current) return;
    playbackRef.current?.pause();
    const audio = new Audio(recordedUrlRef.current);
    playbackRef.current = audio;
    void audio.play();
  }, []);

  useEffect(
    () => () => {
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
      stopStream();
      revokeUrl();
    },
    [revokeUrl, stopStream],
  );

  return useMemo(
    () => ({
      isRecording,
      hasRecording,
      error,
      startRecording,
      stopRecording,
      playRecording,
      clearRecording,
    }),
    [
      isRecording,
      hasRecording,
      error,
      startRecording,
      stopRecording,
      playRecording,
      clearRecording,
    ],
  );
}
