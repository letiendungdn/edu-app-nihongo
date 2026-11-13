import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeQuizStore } from '../store/personalQuizSlice';
import PersonalWordsQuizView from './PersonalWordsQuizView';

vi.mock('../api', () => ({
  fetchPersonalWords: vi.fn().mockResolvedValue({
    data: [
      { id: 1, kana: 'わたし', meaning: 'tôi', lesson: 1 },
      { id: 2, kana: 'たべます', meaning: 'ăn', lesson: 6 },
      { id: 3, kana: 'のみます', meaning: 'uống', lesson: 6 },
    ],
    total: 3,
    page: 1,
    limit: 200,
  }),
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, authReady: true }) }));

describe('Ôn sổ từ', () => {
  it('làm hết các câu, hiện điểm, ôn lại câu sai', async () => {
    const store = makeQuizStore();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PersonalWordsQuizView store={store} />
      </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Bắt đầu (3 từ)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nhớ' }));
    await userEvent.click(screen.getByRole('button', { name: 'Quên' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nhớ' }));
    expect(screen.getByRole('heading', { name: 'Đúng 2/3' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ôn lại 1 câu sai' }));
    expect(screen.getByText('Câu 1/1')).toBeInTheDocument();
    expect(store.getState().personalQuiz.words.map((w) => w.kana)).toEqual(['たべます']);
  });
});
