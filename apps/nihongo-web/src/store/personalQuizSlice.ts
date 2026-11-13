import { configureStore, createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PersonalWord } from '../api';

/**
 * Lượt ôn sổ từ cá nhân. Client state: chỉ sống trên trình duyệt, nhiều phần giao diện cùng đọc
 * (thẻ câu hỏi, tiến độ, kết quả). Danh sách từ (server state) vẫn lấy bằng React Query.
 * Bài học: docs/learn-redux-state.md
 */
export type QuizState = {
  words: PersonalWord[];
  index: number;
  answers: Record<number, boolean>; // id từ → nhớ đúng không
  status: 'idle' | 'running' | 'finished';
};

const initialState: QuizState = { words: [], index: 0, answers: {}, status: 'idle' };

export const personalQuizSlice = createSlice({
  name: 'personalQuiz',
  initialState,
  reducers: {
    started(state, action: PayloadAction<PersonalWord[]>) {
      state.words = action.payload;
      state.index = 0;
      state.answers = {};
      state.status = action.payload.length > 0 ? 'running' : 'idle';
    },
    answered(state, action: PayloadAction<{ wordId: number; correct: boolean }>) {
      if (state.status !== 'running') return;
      state.answers[action.payload.wordId] = action.payload.correct;
      if (state.index + 1 >= state.words.length) state.status = 'finished';
      else state.index += 1;
    },
    reset() {
      return initialState;
    },
  },
});

export const { started, answered, reset } = personalQuizSlice.actions;

type WithQuiz = { personalQuiz: QuizState };
export const selectCurrentWord = (s: WithQuiz) => s.personalQuiz.words[s.personalQuiz.index];
export const selectScore = (s: WithQuiz) => Object.values(s.personalQuiz.answers).filter(Boolean).length;
/** Trả object mới → phải memoize, nếu không component vẽ lại sau mọi action. */
export const selectProgress = createSelector(
  [(s: WithQuiz) => s.personalQuiz.answers, (s: WithQuiz) => s.personalQuiz.words],
  (answers, words) => ({ done: Object.keys(answers).length, total: words.length }),
);
/** Từ trả lời sai — để ôn lại riêng. */
export const selectMissed = createSelector(
  [(s: WithQuiz) => s.personalQuiz.answers, (s: WithQuiz) => s.personalQuiz.words],
  (answers, words) => words.filter((w) => answers[w.id] === false),
);

/** Hàm tạo store: trang ôn tập tạo một store riêng; mỗi test tạo store mới. */
export function makeQuizStore() {
  return configureStore({ reducer: { personalQuiz: personalQuizSlice.reducer } });
}
export type QuizStore = ReturnType<typeof makeQuizStore>;
export type QuizRootState = ReturnType<QuizStore['getState']>;
export type QuizDispatch = QuizStore['dispatch'];
