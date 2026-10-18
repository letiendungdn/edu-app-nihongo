import {
  SPEECH_FORCE_SERVER_LANGS,
  SPEECH_PREFER_LOCAL_VOICE,
  SPEECH_RATE,
  SPEECH_VOICE_PRIORITY,
  type SpeechLangCode,
} from '../config/speech';
import { grammarExampleSpeechText } from './grammarExample';

export {
  SPEECH_FORCE_SERVER_LANGS,
  SPEECH_LANG,
  SPEECH_RATE,
  SPEECH_SERVER_VOICES,
  SPEECH_VOICE_PRIORITY,
} from '../config/speech';
export type { SpeechLangCode } from '../config/speech';

let playSessionId = 0;
let activeHtmlAudio: HTMLAudioElement | null = null;
let cachedVoices: SpeechSynthesisVoice[] | null = null;
let voicesReadyPromise: Promise<SpeechSynthesisVoice[]> | null = null;

/** Đợi danh sách voice (Chrome/Edge load bất đồng bộ qua voiceschanged). */
export function loadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([]);
  }

  if (cachedVoices?.length) return Promise.resolve(cachedVoices);

  if (!voicesReadyPromise) {
    voicesReadyPromise = new Promise((resolve) => {
      const synth = window.speechSynthesis;

      const capture = () => {
        const voices = synth.getVoices();
        if (voices.length) {
          cachedVoices = voices;
          resolve(voices);
          return true;
        }
        return false;
      };

      if (capture()) return;

      const onChanged = () => {
        if (capture()) synth.removeEventListener('voiceschanged', onChanged);
      };
      synth.addEventListener('voiceschanged', onChanged);

      setTimeout(() => {
        synth.removeEventListener('voiceschanged', onChanged);
        cachedVoices = synth.getVoices();
        resolve(cachedVoices);
      }, 800);
    });
  }

  return voicesReadyPromise;
}

function langPrefix(lang: string): string {
  return lang.toLowerCase().split('-')[0];
}

function isVoiceForLang(voice: SpeechSynthesisVoice, lang: string): boolean {
  const target = lang.toLowerCase();
  const prefix = langPrefix(lang);
  const vl = voice.lang.toLowerCase();
  return vl === target || vl.startsWith(`${prefix}-`) || vl === prefix;
}

function voicesForLang(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice[] {
  return voices.filter((v) => isVoiceForLang(v, lang));
}

function matchVoiceByPriority(
  pool: SpeechSynthesisVoice[],
  priorities: readonly string[],
): SpeechSynthesisVoice | undefined {
  for (const hint of priorities) {
    const exact = pool.find((v) => v.name === hint);
    if (exact) return exact;
  }

  const lowerHints = priorities.map((h) => h.toLowerCase());
  for (const hint of lowerHints) {
    const partial = pool.find((v) => v.name.toLowerCase().includes(hint));
    if (partial) return partial;
  }

  return undefined;
}

/** Chọn voice theo config cố định; không bao giờ fallback sang tiếng Anh. */
export function pickVoiceForLang(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | undefined {
  const langCode = lang as SpeechLangCode;
  const matches = voicesForLang(voices, lang);
  if (!matches.length) return undefined;

  const priorities = SPEECH_VOICE_PRIORITY[langCode] ?? [];
  const fromConfig = matchVoiceByPriority(matches, priorities);
  if (fromConfig) return fromConfig;

  if (SPEECH_PREFER_LOCAL_VOICE) {
    const local = matches.filter((v) => v.localService);
    if (local.length) return local[0];
  }

  const remote = matches.filter((v) => !v.localService);
  if (remote.length) return remote[0];

  return matches[0];
}

export function speechRateForLang(lang: string): number {
  const langCode = lang as SpeechLangCode;
  return SPEECH_RATE[langCode] ?? 0.9;
}

function stopHtmlAudio(): void {
  if (!activeHtmlAudio) return;
  activeHtmlAudio.pause();
  activeHtmlAudio.removeAttribute('src');
  activeHtmlAudio.load();
  activeHtmlAudio = null;
}

function shouldUseServerTts(
  lang: string,
  voices: SpeechSynthesisVoice[],
  forceServer = false,
): boolean {
  if (forceServer) return true;
  const langCode = lang as SpeechLangCode;
  if (SPEECH_FORCE_SERVER_LANGS.includes(langCode)) return true;
  return !pickVoiceForLang(voices, lang);
}

const SERVER_TTS_TIMEOUT_MS = 8_000;

async function fetchServerTts(text: string, lang: string, sessionId: number): Promise<Response> {
  const request = () => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), SERVER_TTS_TIMEOUT_MS);
    return fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang }),
      signal: controller.signal,
    }).finally(() => window.clearTimeout(timer));
  };

  try {
    const first = await request();
    // Edge TTS đôi lúc không trả audio khi bị gọi dồn (phát tất cả). Gửi lại một lần.
    if (first.ok || (first.status !== 400 && first.status !== 429 && first.status !== 503)) {
      return first;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    if (sessionId !== playSessionId) return first;
    return request();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Server TTS timed out');
    }
    throw err;
  }
}

async function playServerAudio(text: string, lang: string): Promise<void> {
  const sessionId = playSessionId;
  const res = await fetchServerTts(text, lang, sessionId);

  if (!res.ok) {
    throw new Error(`Server TTS failed (${res.status})`);
  }

  if (sessionId !== playSessionId) return;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  await new Promise<void>((resolve, reject) => {
    if (sessionId !== playSessionId) {
      URL.revokeObjectURL(url);
      resolve();
      return;
    }

    const audio = new Audio(url);
    activeHtmlAudio = audio;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      if (activeHtmlAudio === audio) activeHtmlAudio = null;
    };

    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error('Audio playback failed'));
    };

    void audio.play().catch(reject);
  });
}

async function speakWithBrowser(
  text: string,
  lang: string,
  voice: SpeechSynthesisVoice,
  rate: number,
): Promise<void> {
  const sessionId = playSessionId;

  await new Promise<void>((resolve) => {
    if (sessionId !== playSessionId) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    applySpeechVoice(utterance, voice, lang);
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

function applySpeechVoice(
  utterance: SpeechSynthesisUtterance,
  voice: SpeechSynthesisVoice | undefined,
  lang: string,
): void {
  utterance.lang = voice?.lang ?? lang;
  if (voice) utterance.voice = voice;
}

async function speakText(
  text: string,
  lang: string,
  voices: SpeechSynthesisVoice[],
  rate: number,
  forceServer = false,
): Promise<void> {
  const voice = pickVoiceForLang(voices, lang);
  const preferServer = shouldUseServerTts(lang, voices, forceServer);

  if (preferServer || !voice) {
    try {
      await playServerAudio(text, lang);
      return;
    } catch {
      // Edge TTS hay bị 403/timeout — fallback giọng trình duyệt nếu có.
      if (!voice) return;
    }
  }

  if (!voice) return;
  await speakWithBrowser(text, lang, voice, rate);
}

const GRAMMAR_N_SAMPLES = ['わたし', 'がくせい', 'せんせい', 'にほんじん', 'ともだち'];
const GRAMMAR_V_SAMPLES = ['いきます', 'たべます', 'のみます', 'みます', 'よみます'];

/** Chuỗi tiếng Nhật cho TTS (bỏ khoảng trắng thừa). */
export function speechTextFromJapanese(jp: string): string {
  return jp.replace(/\s+/g, '').replace(/…/g, '');
}

/**
 * Chuyển mẫu ngữ pháp (N1, N2, V1…) thành câu Nhật có thể đọc được bằng TTS.
 */
export function speechTextFromGrammarPattern(pattern: string): string {
  if (!pattern) return '';

  let text = pattern
    .replace(/<[^>]*>/g, '')
    .replace(/N(\d+)/gi, (_, n) => {
      const idx = Math.max(0, Number(n) - 1);
      return GRAMMAR_N_SAMPLES[idx % GRAMMAR_N_SAMPLES.length] ?? 'なに';
    })
    .replace(/V(\d+)/gi, (_, n) => {
      const idx = Math.max(0, Number(n) - 1);
      return GRAMMAR_V_SAMPLES[idx % GRAMMAR_V_SAMPLES.length] ?? 'します';
    })
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[／/]/g, '');

  return speechTextFromJapanese(text);
}

/** Các đoạn tiếng Nhật cần đọc cho một mục ngữ pháp (mẫu + ví dụ). */
export function grammarSpeechSegments(pattern: string, examples: { jp: string }[] = []): string[] {
  const segments: string[] = [];
  const patternSpeech = speechTextFromGrammarPattern(pattern);
  if (patternSpeech) segments.push(patternSpeech);

  for (const ex of examples) {
    const line = grammarExampleSpeechText(ex.jp);
    if (line && !segments.includes(line)) segments.push(line);
  }

  return segments;
}

function cleanViForSpeech(text: string): string {
  return text
    .replace(/[–—•·]/g, ', ')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nghĩa ngắn để đọc: bỏ ngoặc, dấu ngã, tách nghĩa bằng dấu phẩy. */
export function meaningForSpeech(meaning: string): string {
  return meaning
    .replace(/[～~]/g, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[/／]/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Đọc cách đọc tiếng Nhật, xong rồi đọc nghĩa tiếng Việt. */
export function speakJapaneseThenMeaning(japanese: string, vietnamese: string): void {
  playAudioParts([
    { text: japanese, lang: 'ja-JP' },
    { text: meaningForSpeech(vietnamese), lang: 'vi-VN' },
  ]);
}

/** Văn bản tiếng Việt: ý nghĩa + giải thích (+ chú ý trong explanation). */
export function grammarExplanationSpeechText(grammar: {
  meaning: string;
  explanation?: string | null;
}): string {
  const parts: string[] = [];

  if (grammar.meaning?.trim()) {
    parts.push(`Ý nghĩa: ${grammar.meaning.trim()}`);
  }
  if (grammar.explanation?.trim()) {
    parts.push(`Giải thích: ${cleanViForSpeech(grammar.explanation)}`);
  }

  return parts.join('. ');
}

const JAPANESE_CHAR = /[\u3040-\u30ff\u3400-\u9fff\u3005\u3006]/;
const OPENING_PUNCT = /[(（「『［【]/;

function letterLang(ch: string): 'ja-JP' | 'vi-VN' | null {
  if (JAPANESE_CHAR.test(ch)) return 'ja-JP';
  if (/\p{L}/u.test(ch)) return 'vi-VN';
  return null;
}

/**
 * Tách câu trộn tiếng Việt và tiếng Nhật để mỗi đoạn đọc đúng giọng.
 * Dấu ngoặc mở đi theo đoạn sau; dấu câu còn lại đi theo đoạn trước.
 */
export function speechPartsFromMixedText(text: string): { text: string; lang: string }[] {
  const source = text.replace(/\s+/g, ' ').trim();
  const parts: { text: string; lang: string }[] = [];
  let current = '';
  let currentLang: string | null = null;
  let pending = '';

  const push = (value: string, lang: string) => {
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (!cleaned) return;
    const last = parts[parts.length - 1];
    if (last && last.lang === lang) {
      last.text = `${last.text} ${cleaned}`.replace(/\s+/g, ' ').trim();
    } else {
      parts.push({ text: cleaned, lang });
    }
  };

  const flush = () => {
    if (currentLang) push(current, currentLang);
    current = '';
    currentLang = null;
  };

  for (const ch of source) {
    const lang = letterLang(ch);
    if (!lang) {
      pending += ch;
      continue;
    }

    if (!currentLang || currentLang === lang) {
      current += pending + ch;
      pending = '';
      currentLang = lang;
      continue;
    }

    const openAt = pending.search(OPENING_PUNCT);
    if (openAt >= 0) {
      current += pending.slice(0, openAt);
      const nextPrefix = pending.slice(openAt);
      flush();
      current = nextPrefix + ch;
      pending = '';
      currentLang = lang;
      continue;
    }

    current += pending;
    pending = '';
    flush();
    current = ch;
    currentLang = lang;
  }

  current += pending;
  flush();
  return parts;
}

/** Ý nghĩa và giải thích, chữ Nhật trong câu được tách riêng để đọc bằng giọng Nhật. */
export function grammarExplanationSpeechParts(grammar: {
  meaning: string;
  explanation?: string | null;
}): { text: string; lang: string }[] {
  return speechPartsFromMixedText(grammarExplanationSpeechText(grammar));
}

export const stopAudio = (): void => {
  playSessionId += 1;
  stopHtmlAudio();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

export interface PlayAudioOptions {
  rate?: number;
  forceServer?: boolean;
}

export const playAudio = (text: string, lang = 'ja-JP', options: PlayAudioOptions = {}): void => {
  if (!text || typeof window === 'undefined') return;

  stopAudio();

  const rate = options.rate ?? speechRateForLang(lang);
  void loadSpeechVoices()
    .then((voices) => speakText(text, lang, voices, rate, options.forceServer))
    .catch((err) => console.warn('[TTS]', err));
};

/** Đọc lần lượt từng đoạn, mỗi đoạn một ngôn ngữ. Đoạn sau bắt đầu khi đoạn trước đọc xong. */
export function playAudioParts(
  parts: { text: string; lang: string }[],
  pauseMs = 400,
): void {
  const items = parts.filter((part) => part.text.trim());
  if (!items.length || typeof window === 'undefined') return;

  const sessionId = ++playSessionId;
  stopHtmlAudio();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  void loadSpeechVoices()
    .then((voices) => {
      const speakAt = (index: number) => {
        if (sessionId !== playSessionId || index >= items.length) return;
        const item = items[index];
        void speakText(item.text, item.lang, voices, speechRateForLang(item.lang))
          .catch((err) => console.warn('[TTS]', err))
          .finally(() => {
            if (sessionId !== playSessionId) return;
            window.setTimeout(() => speakAt(index + 1), pauseMs);
          });
      };
      speakAt(0);
    })
    .catch((err) => console.warn('[TTS]', err));
}

export type SpeechSequenceItem = {
  text: string;
  lang?: string;
  /** Chỉ số mục gốc. Đoạn không có cue không gọi onItem. */
  cue?: number;
};

export interface PlayAudioSequenceOptions {
  lang?: string;
  rate?: number;
  pauseMs?: number;
  forceServer?: boolean;
  onStart?: () => void;
  onItem?: (index: number, text: string) => void;
  onEnd?: () => void;
  onStop?: () => void;
}

export function playAudioSequence(
  texts: Array<string | SpeechSequenceItem>,
  options: PlayAudioSequenceOptions = {},
): Promise<void> {
  const {
    lang = 'ja-JP',
    rate,
    pauseMs = 450,
    forceServer = false,
    onStart,
    onItem,
    onEnd,
    onStop,
  } = options;

  const items = texts.filter((item) => (typeof item === 'string' ? item : item.text).trim());
  if (!items.length || typeof window === 'undefined') {
    return Promise.resolve();
  }

  const sessionId = ++playSessionId;
  let index = 0;

  return loadSpeechVoices().then((voices) => {
    return new Promise<void>((resolve) => {
      const finish = (stopped = false) => {
        if (stopped) onStop?.();
        else onEnd?.();
        resolve();
      };

      const isActive = () => sessionId === playSessionId;

      const speakNext = () => {
        if (!isActive()) {
          finish(true);
          return;
        }

        if (index >= items.length) {
          finish(false);
          return;
        }

        const item = items[index];
        const text = typeof item === 'string' ? item : item.text;
        const itemLang = typeof item === 'string' ? lang : (item.lang ?? lang);
        const speechRate = rate ?? speechRateForLang(itemLang);
        const cue = typeof item === 'string' ? index : item.cue;
        if (cue != null) onItem?.(cue, text);

        void speakText(text, itemLang, voices, speechRate, forceServer)
          .catch((err) => console.warn('[TTS]', err))
          .finally(() => {
            if (!isActive()) {
              finish(true);
              return;
            }
            index += 1;
            setTimeout(speakNext, pauseMs);
          });
      };

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      onStart?.();
      speakNext();
    });
  });
}
