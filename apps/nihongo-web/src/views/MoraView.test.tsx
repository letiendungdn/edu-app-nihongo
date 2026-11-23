import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({
  useLessons: vi.fn(() => ({ data: [] })),
  useVocab: vi.fn(() => ({
    data: [{ id: 1, kana: 'わたし', kanji: '私', meaning: 'tôi', jlptLevel: 'N5' }],
    isLoading: false,
    isError: false,
  })),
  useMoraTrapPairsQuery: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
}));
vi.mock('../hooks/queries', () => hooks);

const speech = vi.hoisted(() => ({ playAudio: vi.fn() }));
vi.mock('../utils/speech', () => speech);
vi.mock('../components/LessonSelector', () => ({ default: () => null }));

import MoraView from './MoraView';

beforeEach(() => vi.clearAllMocks());

describe('MoraView word cards', () => {
  it('plays the Japanese reading when a vocabulary card is clicked', () => {
    render(<MoraView />);

    fireEvent.click(screen.getByRole('button', { name: /わたし 私 tôi/ }));

    expect(speech.playAudio).toHaveBeenCalledWith('わたし', 'ja-JP');
    expect(screen.getByLabelText('Kana cần phân tích')).toHaveValue('わたし');
  });

  it('plays the correct, incorrect, and result words in the mora trap', () => {
    render(<MoraView />);

    fireEvent.click(screen.getByRole('button', { name: 'Nghe cách đọc đúng: きって' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe cách đọc sai: きて' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe từ sai nhịp: きて' }));

    expect(speech.playAudio).toHaveBeenNthCalledWith(1, 'きって', 'ja-JP');
    expect(speech.playAudio).toHaveBeenNthCalledWith(2, 'きて', 'ja-JP');
    expect(speech.playAudio).toHaveBeenNthCalledWith(3, 'きて', 'ja-JP');
  });
});
