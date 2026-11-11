import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Vocabulary } from '../types/api';

const api = vi.hoisted(() => ({
  createVocabulary: vi.fn().mockResolvedValue({}),
  updateVocabulary: vi.fn().mockResolvedValue({}),
  deleteVocabulary: vi.fn().mockResolvedValue({}),
  reorderVocabularies: vi.fn().mockResolvedValue({}),
}));
vi.mock('../api', () => api);
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ isAdmin: true, token: 'tok' }) }));
// Nút "cấu tạo kanji" cần provider riêng, không liên quan tới form
vi.mock('./KanjiStructureButton', () => ({ default: () => null }));

import VocabWordList from './VocabWordList';

const word: Vocabulary = {
  id: 7,
  kanji: '違います。',
  kana: 'ちがいます。',
  romaji: 'chigaimasu.',
  meaning: 'không phải',
  lessonId: 1,
  meaningEn: 'no, that is wrong',
  meaningEnSource: 'ai',
};

function renderList() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <VocabWordList
        lessonNumber={2}
        lessonId={1}
        vocabularies={[word]}
        currentIndex={0}
        expectedCount={null}
        onSelectWord={() => {}}
        startInEditMode
      />
    </QueryClientProvider>,
  );
}

describe('VocabWordList (admin) — nghĩa tiếng Anh', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sửa ô nghĩa tiếng Anh thì gửi meaningEn khi lưu', async () => {
    renderList();
    fireEvent.click(screen.getByTitle('Sửa'));
    const en = screen.getByLabelText('Nghĩa tiếng Anh') as HTMLInputElement;
    expect(en.value).toBe('no, that is wrong');

    fireEvent.change(en, { target: { value: "  no, that's not right " } });
    fireEvent.click(screen.getByText('Lưu'));

    await waitFor(() => expect(api.updateVocabulary).toHaveBeenCalled());
    const [id, body] = api.updateVocabulary.mock.calls[0];
    expect(id).toBe(7);
    expect(body.meaningEn).toBe("no, that's not right");
  });

  it('xóa trắng ô tiếng Anh thì gửi null (xóa nghĩa)', async () => {
    renderList();
    fireEvent.click(screen.getByTitle('Sửa'));
    fireEvent.change(screen.getByLabelText('Nghĩa tiếng Anh'), { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Lưu'));

    await waitFor(() => expect(api.updateVocabulary).toHaveBeenCalled());
    expect(api.updateVocabulary.mock.calls[0][1].meaningEn).toBeNull();
  });
});
