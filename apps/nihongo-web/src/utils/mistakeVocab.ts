import type { Exercise } from '../types/api';
import type { ReviewLogItem } from '../api/index';
import { getStoredToken, userIdFromToken } from '../lib/api-client';
import type { MockExamReviewItem } from './mockExam';

/** Kho của khách (chưa đăng nhập). Người đã đăng nhập có kho riêng: `${GUEST_KEY}:u<id>`. */
const GUEST_KEY = 'nihongo-mistake-vocab';

/**
 * Người đang dùng, đọc thẳng từ token đã lưu mỗi lần truy cập kho. Không giữ trong biến module:
 * component con đọc kho TRƯỚC khi AuthProvider kịp báo người dùng là ai (effect con chạy trước).
 */
function currentUserId(): number | null {
  if (typeof localStorage === 'undefined') return null;
  return userIdFromToken(getStoredToken());
}

function storageKey(): string {
  const id = currentUserId();
  return id == null ? GUEST_KEY : `${GUEST_KEY}:u${id}`;
}

/**
 * Trước đây mọi tài khoản dùng chung một kho, nên người đăng nhập sau đẩy cả từ sai của người
 * trước lên tài khoản mình. Giờ mỗi tài khoản một kho; AuthProvider gọi hàm này ngay sau khi
 * đăng nhập để gộp từ sai làm lúc còn là khách vào kho tài khoản, rồi xóa kho khách.
 */
export function adoptGuestMistakes(): void {
  if (currentUserId() == null) return;
  const guest = readStore(GUEST_KEY);
  if (!guest.words.length) return;
  const store = loadStore();
  for (const w of guest.words) {
    if (!store.words.some((x) => x.key === w.key)) {
      store.words.push(w);
      markDirty(store, w.key);
    }
  }
  saveStore(store);
  localStorage.removeItem(GUEST_KEY);
}

export const DAILY_REVIEW_LIMIT = 20;
const MASTER_STREAK = 3;

export interface MistakeWord {
  key: string;
  kana: string;
  kanji: string | null;
  romaji: string;
  meaning: string;
  lessonNumber: number;
  wrongCount: number;
  reviewStreak: number;
  mastered: boolean;
  addedAt: string;
  updatedAt: string;
  lastReviewedAt: string | null;
}

interface MistakeStore {
  words: MistakeWord[];
  lastReviewDate: string | null;
  reviewedToday: number;
  /** Khóa các từ đổi từ lần sync trước (gồm cả từ vừa thuộc). */
  dirty?: string[];
}

export interface MistakeStats {
  total: number;
  mastered: number;
  reviewedToday: number;
  dailyGoal: number;
  dueToday: number;
}

export interface MistakeWordInput {
  kana: string;
  kanji?: string | null;
  romaji?: string;
  meaning?: string;
  lessonNumber?: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStore(key: string): MistakeStore {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { words: [], lastReviewDate: null, reviewedToday: 0 };
    return JSON.parse(raw) as MistakeStore;
  } catch {
    return { words: [], lastReviewDate: null, reviewedToday: 0 };
  }
}

function loadStore(): MistakeStore {
  return readStore(storageKey());
}

function saveStore(store: MistakeStore): void {
  localStorage.setItem(storageKey(), JSON.stringify(store));
}

function markDirty(store: MistakeStore, key: string): void {
  const dirty = new Set(store.dirty ?? []);
  dirty.add(key);
  store.dirty = [...dirty];
}

export function makeWordKey(kana: string, lessonNumber?: number): string {
  return `${lessonNumber ?? 0}:${kana}`;
}

export function extractVocabFromExercise(
  exercise: Pick<Exercise, 'question' | 'answer'> | null | undefined,
  lessonNumber: number,
): Omit<MistakeWordInput, 'romaji'> & { lessonNumber: number } | null {
  const question = exercise?.question ?? '';
  const bracketMatch = question.match(/「([^」]+)」\s*\(([^)]+)\)/);
  if (bracketMatch) {
    const left = bracketMatch[1].trim();
    const kana = bracketMatch[2].trim();
    const hasKanji = /[\u4e00-\u9faf]/.test(left);
    return {
      kanji: hasKanji ? left : null,
      kana,
      meaning: exercise?.answer ?? '',
      lessonNumber,
    };
  }

  const fillMatch = question.match(/Điền hiragana cho:\s*"(.+?)"/i);
  if (fillMatch) {
    return {
      kanji: null,
      kana: exercise?.answer ?? '',
      meaning: fillMatch[1],
      lessonNumber,
    };
  }

  return null;
}

export function addMistakeWord(word: MistakeWordInput): string | null {
  if (!word?.kana?.trim()) return null;

  const store = loadStore();
  const key = makeWordKey(word.kana, word.lessonNumber);
  const existing = store.words.find((w) => w.key === key);

  if (existing) {
    existing.wrongCount = (existing.wrongCount ?? 0) + 1;
    existing.meaning = word.meaning ?? existing.meaning;
    existing.kanji = word.kanji ?? existing.kanji;
    existing.romaji = word.romaji ?? existing.romaji;
    existing.mastered = false;
    existing.reviewStreak = 0;
    existing.updatedAt = new Date().toISOString();
  } else {
    store.words.push({
      key,
      kana: word.kana,
      kanji: word.kanji ?? null,
      romaji: word.romaji ?? '',
      meaning: word.meaning ?? '',
      lessonNumber: word.lessonNumber ?? 0,
      wrongCount: 1,
      reviewStreak: 0,
      mastered: false,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastReviewedAt: null,
    });
  }

  markDirty(store, key);
  saveStore(store);
  return key;
}

export function removeMistakeWord(key: string): void {
  const store = loadStore();
  store.words = store.words.filter((w) => w.key !== key);
  saveStore(store);
}

export function clearMasteredWords(): void {
  const store = loadStore();
  store.words = store.words.filter((w) => !w.mastered);
  saveStore(store);
}

export function getMistakeStats(): MistakeStats {
  const store = loadStore();
  const active = store.words.filter((w) => !w.mastered);
  const today = todayKey();
  const reviewedToday =
    store.lastReviewDate === today ? store.reviewedToday ?? 0 : 0;

  return {
    total: active.length,
    mastered: store.words.filter((w) => w.mastered).length,
    reviewedToday,
    dailyGoal: DAILY_REVIEW_LIMIT,
    dueToday: Math.min(DAILY_REVIEW_LIMIT, active.length),
  };
}

export function getAllMistakeWords(includeMastered = false): MistakeWord[] {
  const store = loadStore();
  return store.words
    .filter((w) => includeMastered || !w.mastered)
    .sort((a, b) => (b.wrongCount ?? 0) - (a.wrongCount ?? 0));
}

export function getTodayReviewBatch(limit = DAILY_REVIEW_LIMIT): MistakeWord[] {
  const store = loadStore();
  const pool = store.words
    .filter((w) => !w.mastered)
    .sort((a, b) => {
      const aTime = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
      const bTime = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
      if (aTime !== bTime) return aTime - bTime;
      return (b.wrongCount ?? 0) - (a.wrongCount ?? 0);
    });

  return pool.slice(0, limit);
}

export function recordReviewResult(key: string, remembered: boolean): void {
  const store = loadStore();
  const word = store.words.find((w) => w.key === key);
  if (!word) return;

  const today = todayKey();
  if (store.lastReviewDate !== today) {
    store.lastReviewDate = today;
    store.reviewedToday = 0;
  }

  word.lastReviewedAt = new Date().toISOString();
  store.reviewedToday = (store.reviewedToday ?? 0) + 1;

  if (remembered) {
    word.reviewStreak = (word.reviewStreak ?? 0) + 1;
    if (word.reviewStreak >= MASTER_STREAK) {
      word.mastered = true;
    }
  } else {
    word.reviewStreak = 0;
    word.wrongCount = (word.wrongCount ?? 0) + 1;
    word.mastered = false;
  }

  word.updatedAt = new Date().toISOString();
  markDirty(store, key);
  saveStore(store);
}

export function importWrongItemsFromReview(reviewItems: MockExamReviewItem[]): number {
  let added = 0;
  for (const item of reviewItems) {
    if (item.isCorrect) continue;
    if (item.sectionId !== 'vocab' && item.sectionId !== 'listening') continue;

    const kana =
      item.sectionId === 'listening' && item.audioText
        ? item.audioText
        : extractVocabFromExercise(
            { question: item.question, answer: item.correctAnswer },
            item.lessonNumber ?? 0,
          )?.kana;

    if (!kana) continue;

    const parsed =
      item.sectionId === 'vocab'
        ? extractVocabFromExercise(
            { question: item.question, answer: item.correctAnswer },
            item.lessonNumber ?? 0,
          )
        : null;

    addMistakeWord({
      kana,
      kanji: parsed?.kanji ?? null,
      meaning: item.correctAnswer,
      lessonNumber: item.lessonNumber ?? 0,
    });
    added += 1;
  }
  return added;
}

function toReviewItem(w: MistakeWord): ReviewLogItem {
  return {
    kana: w.kana,
    kanji: w.kanji,
    meaning: w.meaning,
    lessonNumber: w.lessonNumber,
    wrongCount: w.wrongCount ?? 0,
    reviewStreak: w.reviewStreak ?? 0,
    mastered: w.mastered ?? false,
    lastReviewedAt: w.lastReviewedAt ?? undefined,
  };
}

/**
 * Gửi các từ đã đổi (kể cả từ vừa THUỘC). Bản cũ lọc bỏ từ đã thuộc nên server không bao giờ
 * biết một từ đã thuộc, và mỗi lần ôn lại gửi cả danh sách.
 */
export async function syncToServer(): Promise<void> {
  if (currentUserId() == null) return;
  const { syncReviewProgress } = await import('../api/index');
  const key = storageKey();
  const store = loadStore();
  const dirty = new Set(store.dirty ?? []);
  const words = store.words.filter((w) => dirty.has(w.key));
  if (!words.length) {
    if (store.dirty?.length) {
      store.dirty = []; // khóa của từ đã bị xóa khỏi kho
      saveStore(store);
    }
    return;
  }
  const sentAt = new Map(words.map((w) => [w.key, w.updatedAt]));

  try {
    await syncReviewProgress(words.map(toReviewItem));
  } catch {
    return; // giữ dirty, lần sau gửi lại
  }
  if (storageKey() !== key) return; // đã đổi tài khoản trong lúc chờ
  // Bỏ cờ chỉ với từ KHÔNG đổi thêm trong lúc chờ mạng; từ vừa ôn lại vẫn chờ lượt sau
  const latest = loadStore();
  const changed = new Set(
    latest.words.filter((w) => sentAt.has(w.key) && sentAt.get(w.key) !== w.updatedAt).map((w) => w.key),
  );
  latest.dirty = (latest.dirty ?? []).filter((k) => !sentAt.has(k) || changed.has(k));
  saveStore(latest);
}

/** Gộp bản trên server vào máy: giữ bản có lần ôn mới hơn. Hàm thuần để test. */
export function mergeServerWords(local: MistakeWord[], server: ReviewLogItem[], now = new Date()): MistakeWord[] {
  const byKey = new Map(local.map((w) => [w.key, w]));
  const time = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);
  for (const item of server) {
    const key = makeWordKey(item.kana, item.lessonNumber);
    const mine = byKey.get(key);
    if (mine && time(mine.lastReviewedAt) >= time(item.lastReviewedAt)) continue;
    byKey.set(key, {
      key,
      kana: item.kana,
      kanji: item.kanji ?? null,
      romaji: mine?.romaji ?? '',
      meaning: item.meaning,
      lessonNumber: item.lessonNumber,
      wrongCount: item.wrongCount,
      reviewStreak: item.reviewStreak,
      mastered: item.mastered,
      addedAt: mine?.addedAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
      lastReviewedAt: item.lastReviewedAt ?? null,
    });
  }
  return [...byKey.values()];
}

/** Sau khi đăng nhập: kéo kho ôn tập từ server (máy khác đã ôn) rồi gửi phần máy này còn nợ. */
export async function pullFromServer(): Promise<void> {
  const userAtStart = currentUserId();
  if (userAtStart == null) return;
  const { fetchReviewProgress } = await import('../api/index');
  let server: ReviewLogItem[];
  try {
    server = await fetchReviewProgress();
  } catch {
    return;
  }
  if (currentUserId() !== userAtStart) return; // đã đổi tài khoản trong lúc chờ
  const store = loadStore();
  store.words = mergeServerWords(store.words, server ?? []);
  saveStore(store);
  await syncToServer();
}
