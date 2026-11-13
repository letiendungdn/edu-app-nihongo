import { describe, expect, it } from 'vitest';
import type { PersonalWord } from '../api';
import { answered, makeQuizStore, personalQuizSlice, selectMissed, selectProgress, selectScore, started } from './personalQuizSlice';

const words: PersonalWord[] = [
  { id: 1, kana: 'わたし', meaning: 'tôi', lesson: 1 },
  { id: 2, kana: 'たべます', meaning: 'ăn', lesson: 6 },
];

describe('personalQuizSlice', () => {
  // Reducer là hàm thuần: (state cũ, action) → state mới. Test không cần React.
  it('chuyển câu và kết thúc ở câu cuối', () => {
    let state = personalQuizSlice.reducer(undefined, started(words));
    state = personalQuizSlice.reducer(state, answered({ wordId: 1, correct: true }));
    expect(state.index).toBe(1);
    state = personalQuizSlice.reducer(state, answered({ wordId: 2, correct: false }));
    expect(state.status).toBe('finished');
    expect(selectScore({ personalQuiz: state })).toBe(1);
    expect(selectMissed({ personalQuiz: state }).map((w) => w.kana)).toEqual(['たべます']);
  });

  it('chưa bắt đầu thì không nhận câu trả lời', () => {
    const state = personalQuizSlice.reducer(undefined, answered({ wordId: 1, correct: true }));
    expect(state.answers).toEqual({});
  });

  it('selectProgress: cùng state trả đúng object cũ (không làm component vẽ lại)', () => {
    const store = makeQuizStore();
    store.dispatch(started(words));
    expect(selectProgress(store.getState())).toBe(selectProgress(store.getState()));
  });
});
