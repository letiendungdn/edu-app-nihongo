import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReviewLogItem } from '../../api/index';

const api = vi.hoisted(() => ({
  syncReviewProgress: vi.fn(),
  fetchReviewProgress: vi.fn(),
}));
vi.mock('../../api/index', () => api);

import {
  addMistakeWord,
  adoptGuestMistakes,
  getAllMistakeWords,
  makeWordKey,
  mergeServerWords,
  pullFromServer,
  recordReviewResult,
  syncToServer,
} from '../mistakeVocab';

/** JWT giả, chỉ cần payload có `sub` (app không kiểm chữ ký ở client). */
function tokenFor(userId: number) {
  const payload = btoa(JSON.stringify({ sub: userId })).replace(/=+$/, '');
  return `h.${payload}.s`;
}

function loginAs(userId: number | null) {
  if (userId == null) localStorage.removeItem('nihongo-auth-token');
  else localStorage.setItem('nihongo-auth-token', tokenFor(userId));
}

const sentKanas = () =>
  api.syncReviewProgress.mock.calls.flatMap(([items]) => (items as ReviewLogItem[]).map((i) => i.kana));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  api.syncReviewProgress.mockResolvedValue({ synced: 1 });
});

describe('kho từ sai theo tài khoản', () => {
  it('hai tài khoản trên cùng trình duyệt không thấy từ của nhau', () => {
    loginAs(1);
    addMistakeWord({ kana: 'ねこ', lessonNumber: 1 });
    loginAs(2);
    expect(getAllMistakeWords()).toEqual([]);
    addMistakeWord({ kana: 'いぬ', lessonNumber: 1 });
    loginAs(1);
    expect(getAllMistakeWords().map((w) => w.kana)).toEqual(['ねこ']);
  });

  it('người B đăng nhập sau KHÔNG đẩy từ của người A lên tài khoản B', async () => {
    loginAs(1);
    addMistakeWord({ kana: 'ねこ', lessonNumber: 1 });
    loginAs(2);
    addMistakeWord({ kana: 'いぬ', lessonNumber: 1 });
    await syncToServer();
    expect(sentKanas()).toEqual(['いぬ']);
  });

  it('từ sai lúc còn là khách được gộp vào tài khoản ở lần đăng nhập, rồi xóa kho khách', () => {
    loginAs(null);
    addMistakeWord({ kana: 'さかな', lessonNumber: 2 });
    loginAs(3);
    adoptGuestMistakes();
    expect(getAllMistakeWords().map((w) => w.kana)).toEqual(['さかな']);
    expect(localStorage.getItem('nihongo-mistake-vocab')).toBeNull();
  });

  it('khách không gửi gì lên server', async () => {
    loginAs(null);
    addMistakeWord({ kana: 'さかな', lessonNumber: 2 });
    await syncToServer();
    expect(api.syncReviewProgress).not.toHaveBeenCalled();
  });
});

describe('syncToServer', () => {
  beforeEach(() => loginAs(1));

  it('gửi cả từ vừa THUỘC (bản cũ lọc bỏ nên server không bao giờ biết)', async () => {
    const key = addMistakeWord({ kana: 'ねこ', lessonNumber: 1 })!;
    await syncToServer();
    api.syncReviewProgress.mockClear();
    for (let i = 0; i < 3; i += 1) recordReviewResult(key, true);

    await syncToServer();

    const [items] = api.syncReviewProgress.mock.calls[0] as [ReviewLogItem[]];
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kana: 'ねこ', mastered: true, reviewStreak: 3 });
  });

  it('chỉ gửi từ đã đổi, không gửi lại cả danh sách', async () => {
    addMistakeWord({ kana: 'ねこ', lessonNumber: 1 });
    const inu = addMistakeWord({ kana: 'いぬ', lessonNumber: 1 })!;
    await syncToServer();
    api.syncReviewProgress.mockClear();

    recordReviewResult(inu, false);
    await syncToServer();
    expect(sentKanas()).toEqual(['いぬ']);

    api.syncReviewProgress.mockClear();
    await syncToServer();
    expect(api.syncReviewProgress).not.toHaveBeenCalled();
  });

  it('lỗi mạng: giữ lại để gửi lần sau', async () => {
    addMistakeWord({ kana: 'ねこ', lessonNumber: 1 });
    api.syncReviewProgress.mockRejectedValueOnce(new Error('offline'));
    await syncToServer();
    await syncToServer();
    expect(sentKanas()).toEqual(['ねこ', 'ねこ']);
  });

  it('ôn lại đúng từ đó trong lúc đang gửi → lần ôn mới vẫn được gửi ở lượt sau', async () => {
    const key = addMistakeWord({ kana: 'ねこ', lessonNumber: 1 })!;
    let release!: () => void;
    api.syncReviewProgress.mockImplementationOnce(
      () => new Promise((resolve) => (release = () => resolve({ synced: 1 }))),
    );
    const first = syncToServer();
    await vi.waitFor(() => expect(api.syncReviewProgress).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 2)); // updatedAt phải khác mốc lúc gửi
    recordReviewResult(key, true);
    release();
    await first;

    await syncToServer();
    const second = api.syncReviewProgress.mock.calls[1][0] as ReviewLogItem[];
    expect(second[0]).toMatchObject({ kana: 'ねこ', reviewStreak: 1 });
  });
});

describe('kéo kho ôn tập từ server', () => {
  const server = (kana: string, lastReviewedAt: string, extra: Partial<ReviewLogItem> = {}): ReviewLogItem => ({
    kana,
    kanji: null,
    meaning: 'm',
    lessonNumber: 1,
    wrongCount: 2,
    reviewStreak: 1,
    mastered: false,
    lastReviewedAt,
    ...extra,
  });

  it('bản nào ôn gần hơn thì thắng', () => {
    const local = mergeServerWords([], [server('ねこ', '2026-10-01T00:00:00Z')]);
    local[0].lastReviewedAt = '2026-10-05T00:00:00Z';
    local[0].reviewStreak = 9;

    const merged = mergeServerWords(local, [
      server('ねこ', '2026-10-03T00:00:00Z'), // cũ hơn bản trên máy → bỏ
      server('いぬ', '2026-10-04T00:00:00Z', { mastered: true }), // chỉ có trên server → thêm
    ]);

    expect(merged.find((w) => w.kana === 'ねこ')?.reviewStreak).toBe(9);
    expect(merged.find((w) => w.key === makeWordKey('いぬ', 1))?.mastered).toBe(true);
  });

  it('đăng nhập trên máy mới → thấy từ đã ôn ở máy khác', async () => {
    loginAs(5);
    api.fetchReviewProgress.mockResolvedValue([server('とり', '2026-10-01T00:00:00Z')]);
    await pullFromServer();
    expect(getAllMistakeWords().map((w) => w.kana)).toEqual(['とり']);
  });

  it('đổi tài khoản trong lúc đang tải → không ghi dữ liệu vào kho người khác', async () => {
    loginAs(5);
    let resolve!: (v: ReviewLogItem[]) => void;
    api.fetchReviewProgress.mockReturnValue(new Promise((r) => (resolve = r)));
    const pull = pullFromServer();
    loginAs(6);
    resolve([server('とり', '2026-10-01T00:00:00Z')]);
    await pull;
    expect(getAllMistakeWords()).toEqual([]);
    loginAs(5);
    expect(getAllMistakeWords()).toEqual([]);
  });
});
