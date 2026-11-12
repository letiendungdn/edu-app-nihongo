import * as Speech from 'expo-speech';

import { englishForSpeech } from './englishSpeech';

export async function speakJapanese(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await Speech.stop();
  Speech.speak(trimmed, {
    language: 'ja-JP',
    rate: 0.9,
    pitch: 1.0,
  });
}

/** Đọc nghĩa tiếng Anh (en-US), đã làm sạch bằng englishForSpeech. */
export async function speakEnglish(text: string): Promise<void> {
  const toSay = englishForSpeech(text) || text.trim();
  if (!toSay) return;
  await Speech.stop();
  Speech.speak(toSay, { language: 'en-US', rate: 0.95, pitch: 1.0 });
}

export async function stopSpeaking(): Promise<void> {
  await Speech.stop();
}
