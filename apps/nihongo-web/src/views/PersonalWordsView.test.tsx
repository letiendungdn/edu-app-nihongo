import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PersonalWordsView from './PersonalWordsView';

// Giả lớp API (cách các test khác của web đang làm) — không gọi mạng thật.
const api = vi.hoisted(() => ({
  fetchPersonalWords: vi.fn(),
  createPersonalWord: vi.fn(),
  deletePersonalWord: vi.fn(),
}));
vi.mock('../api', () => api);

const auth = vi.hoisted(() => ({ isAuthenticated: true, authReady: true }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }));

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => nav.params,
  usePathname: () => '/my-words',
  useRouter: () => ({ replace: nav.replace }),
}));

const page = (words: { id: number; kana: string; meaning: string; lesson: number }[]) => ({
  data: words,
  total: words.length,
  page: 1,
  limit: 200,
});

function renderView() {
  // retry: false — test lỗi không phải đợi React Query thử lại
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PersonalWordsView />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.isAuthenticated = true;
  nav.params = new URLSearchParams();
});

describe('Sổ từ của tôi', () => {
  it('chưa đăng nhập: mời đăng nhập, không gọi API', () => {
    auth.isAuthenticated = false;
    renderView();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login?redirect=/my-words');
    expect(api.fetchPersonalWords).not.toHaveBeenCalled();
  });

  it('hiện danh sách và tổng số; bộ lọc đọc từ URL', async () => {
    nav.params = new URLSearchParams('lesson=6');
    api.fetchPersonalWords.mockResolvedValue(page([{ id: 1, kana: 'たべます', meaning: 'ăn', lesson: 6 }]));
    renderView();
    expect(await screen.findByText('たべます')).toBeInTheDocument();
    expect(screen.getByText('1 từ')).toBeInTheDocument();
    expect(api.fetchPersonalWords).toHaveBeenCalledWith(6);
  });

  it('đổi bộ lọc thì ghi lên URL', async () => {
    api.fetchPersonalWords.mockResolvedValue(page([]));
    renderView();
    await userEvent.selectOptions(await screen.findByLabelText('Lọc theo bài'), '3');
    expect(nav.replace).toHaveBeenCalledWith('/my-words?lesson=3');
  });

  it('rỗng và lỗi đều có giao diện riêng', async () => {
    api.fetchPersonalWords.mockRejectedValueOnce(new Error('Không kết nối được máy chủ'));
    renderView();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ');
    api.fetchPersonalWords.mockResolvedValue(page([]));
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Chưa có từ nào.')).toBeInTheDocument();
  });

  it('thêm từ sai luật: báo lỗi, không gọi API', async () => {
    api.fetchPersonalWords.mockResolvedValue(page([]));
    renderView();
    await userEvent.type(await screen.findByLabelText('Cách đọc'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào sổ' }));
    expect(await screen.findByText('Chỉ dùng hiragana hoặc katakana')).toBeInTheDocument();
    expect(screen.getByText('Nhập nghĩa')).toBeInTheDocument();
    expect(api.createPersonalWord).not.toHaveBeenCalled();
  });

  it('server báo trùng: hiện lỗi của server, giữ chữ đã nhập', async () => {
    api.fetchPersonalWords.mockResolvedValue(page([]));
    api.createPersonalWord.mockRejectedValue(new Error('Từ này đã có trong sổ'));
    renderView();
    await userEvent.type(await screen.findByLabelText('Cách đọc'), 'わたし');
    await userEvent.type(screen.getByLabelText('Nghĩa'), 'tôi');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào sổ' }));
    expect(await screen.findByText('Từ này đã có trong sổ')).toBeInTheDocument();
    expect(screen.getByLabelText('Cách đọc')).toHaveValue('わたし');
  });

  it('xóa: hỏi lại, dòng biến mất ngay (optimistic)', async () => {
    api.fetchPersonalWords.mockResolvedValueOnce(page([{ id: 1, kana: 'わたし', meaning: 'tôi', lesson: 1 }]));
    api.fetchPersonalWords.mockResolvedValue(page([]));
    let resolveDelete: () => void = () => {};
    api.deletePersonalWord.mockReturnValue(new Promise<void>((r) => (resolveDelete = r)));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: 'Xóa わたし' }));
    // server chưa trả lời mà dòng đã biến mất
    await waitFor(() => expect(screen.queryByText('わたし')).not.toBeInTheDocument());
    resolveDelete();
  });
});
