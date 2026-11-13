'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { usePersonalWords } from '../hooks/usePersonalWords';
import { useQuizDispatch, useQuizSelector } from '../store/hooks';
import {
  answered,
  makeQuizStore,
  reset,
  selectCurrentWord,
  selectMissed,
  selectProgress,
  selectScore,
  started,
  type QuizStore,
} from '../store/personalQuizSlice';
import './PersonalWordsView.css';

function Quiz() {
  const { isAuthenticated } = useAuth();
  const dispatch = useQuizDispatch();
  const status = useQuizSelector((s) => s.personalQuiz.status);
  const word = useQuizSelector(selectCurrentWord);
  const score = useQuizSelector(selectScore);
  const missed = useQuizSelector(selectMissed);
  const { done, total } = useQuizSelector(selectProgress);
  const { data } = usePersonalWords(undefined, isAuthenticated);
  const words = data?.data ?? [];

  if (status === 'idle') {
    return (
      <div className="pw-quiz">
        <h1>Ôn sổ từ</h1>
        {words.length === 0 ? (
          <p>
            Sổ đang trống. <Link href="/my-words">Thêm từ</Link> trước đã.
          </p>
        ) : (
          <button onClick={() => dispatch(started(words))}>Bắt đầu ({words.length} từ)</button>
        )}
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="pw-quiz">
        <h1>
          Đúng {score}/{total}
        </h1>
        <div className="pw-quiz-actions">
          {missed.length > 0 && <button onClick={() => dispatch(started(missed))}>Ôn lại {missed.length} câu sai</button>}
          <button onClick={() => dispatch(reset())}>Làm lại</button>
          <Link href="/my-words">Về sổ từ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pw-quiz">
      <p>
        Câu {done + 1}/{total}
      </p>
      <h1 className="pw-kana" lang="ja">
        {word.kana}
      </h1>
      <details>
        <summary>Xem nghĩa</summary>
        {word.meaning}
      </details>
      <div className="pw-quiz-actions">
        <button onClick={() => dispatch(answered({ wordId: word.id, correct: true }))}>Nhớ</button>
        <button onClick={() => dispatch(answered({ wordId: word.id, correct: false }))}>Quên</button>
      </div>
    </div>
  );
}

/** Store Redux chỉ cho trang này: tạo một lần (useState), không dùng chung cho cả app. */
export default function PersonalWordsQuizView({ store }: { store?: QuizStore }) {
  const [quizStore] = useState(() => store ?? makeQuizStore());
  return (
    <Provider store={quizStore}>
      <Quiz />
    </Provider>
  );
}
