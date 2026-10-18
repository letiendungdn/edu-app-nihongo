import axios, { type AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL } from '../config/api';
import { parseVocabList, unwrapEnvelope } from './envelope';

export { parseVocabList, unwrapEnvelope };

export interface SentenceFeedback {
  corrected: string;
  reading: string;
  meaning: string;
  explanation: string;
  examples: string[];
}

/**
 * Sửa và giải thích một câu qua gateway (`POST /api/ai/sentence-feedback`).
 * Bản cũ gọi thẳng Gemini bằng `extra.geminiApiKey` nằm trong bundle app: ai cũng lấy được key.
 */
export async function analyzeSentence(sentence: string): Promise<SentenceFeedback> {
  const res = await api.post<Partial<SentenceFeedback>>('/ai/sentence-feedback', { sentence: sentence.trim() });
  const fb = res.data ?? {};
  return {
    corrected: fb.corrected ?? '',
    reading: fb.reading ?? '',
    meaning: fb.meaning ?? '',
    explanation: fb.explanation ?? '',
    examples: fb.examples ?? [],
  };
}

const TOKEN_KEY = 'access_token';

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getAccessToken();
  return Boolean(token);
}

function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use((res) => {
    res.data = unwrapEnvelope(res.data);
    return res;
  });

  return client;
}

export const api = createClient();

export interface VocabDto {
  id: number;
  kana?: string;
  kanji?: string | null;
  meaning?: string;
  romaji?: string;
}


export async function fetchAllVocabForLesson(lessonNumber: number): Promise<VocabDto[]> {
  const all: VocabDto[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const res = await api.get('/vocabularies', {
      params: { lessonNumber, page, limit },
    });
    const batch = parseVocabList<VocabDto>(res.data);
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < limit) break;
    page += 1;
  }

  return all;
}

function extractAccessToken(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const map = payload as Record<string, unknown>;
  const nested = map.data;
  if (nested && typeof nested === 'object') {
    const token = (nested as Record<string, unknown>).access_token;
    if (typeof token === 'string' && token) return token;
  }
  const direct = map.access_token;
  return typeof direct === 'string' && direct ? direct : null;
}

export async function login(email: string, password: string): Promise<void> {
  const res = await api.post('/auth/login', { email, password });
  const token = extractAccessToken(res.data);
  if (!token) throw new Error('Không nhận được access token');
  await saveAccessToken(token);
}

export async function loginWithOidc(
  accessToken: string,
  idToken?: string,
): Promise<void> {
  const res = await api.post('/auth/oidc', {
    accessToken,
    ...(idToken ? { idToken } : {}),
  });
  const token = extractAccessToken(res.data);
  if (!token) throw new Error('Không nhận được access token từ OIDC');
  await saveAccessToken(token);
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    await clearAccessToken();
  }
}

const translateCache = new Map<string, string>();

export async function translateJapanese(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const cached = translateCache.get(trimmed);
  if (cached) return cached;

  const res = await api.post<{ translation?: string }>('/translate', {
    text: trimmed,
    sourceLang: 'ja',
    targetLang: 'vi',
  });

  const translated = res.data.translation?.trim() || trimmed;
  translateCache.set(trimmed, translated);
  return translated;
}

export async function syncReviewBank(
  items: Array<{
    kana: string;
    kanji?: string | null;
    meaning: string;
    lessonNumber: number;
    wrongCount: number;
    reviewStreak: number;
    mastered: boolean;
    lastReviewedAt: string;
  }>,
): Promise<void> {
  if (items.length === 0) return;
  await api.post('/progress/review', { items });
}

export async function askAiTutor(params: {
  question: string;
  history: Array<{ role: string; content: string }>;
  context?: string;
}): Promise<string> {
  const res = await api.post<{ answer?: string }>('/ai/chat', {
    question: params.question,
    history: params.history,
    ...(params.context ? { context: params.context } : {}),
  });
  return res.data.answer?.trim() || '';
}

export async function registerPushToken(
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  await api.post('/push/register', { token, platform });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await api.delete('/push/unregister', { data: { token } });
}
