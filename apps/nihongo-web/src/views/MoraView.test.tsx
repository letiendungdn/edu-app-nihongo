import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

describe('MoraView word cards', () => {
  it('plays the Japanese reading when a vocabulary card is clicked', () => {
    render(<MoraView />);

    fireEvent.click(screen.getByRole('button', { name: /わたし 私 tôi/ }));

    expect(speech.playAudio).toHaveBeenCalledWith('わたし', 'ja-JP');
    expect(screen.getByLabelText('Kana cần phân tích')).toHaveValue('わたし');
  });
});
