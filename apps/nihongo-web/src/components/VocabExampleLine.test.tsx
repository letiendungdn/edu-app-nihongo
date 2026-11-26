import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import VocabExampleLine from './VocabExampleLine';

vi.mock('./KanjiStructureButton', () => ({ default: () => null }));
vi.mock('./VocabPicture', () => ({ default: () => null }));
vi.mock('./StrokeOrder', () => ({
  default: ({ text }: { text: string }) => <div data-testid="stroke-order">{text}</div>,
}));
vi.mock('../api/hooks/use-vocab', () => ({
  useVocabAnalysisMeta: () => ({ data: [] }),
}));

describe('VocabExampleLine pronunciation cards', () => {
  it('speaks the reading from the analysis card speaker button', () => {
    const onSpeakJa = vi.fn();
    render(
      <VocabExampleLine
        example={{
          ja: '私は学生です。',
          kana: 'わたしはがくせいです。',
          vi: 'Tôi là học sinh.',
          en: '',
          speak: '私は学生です。',
        }}
        onSpeakJa={onSpeakJa}
        onSpeakVi={vi.fn()}
        onSpeakBoth={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nghe phát âm: わたし' }));

    expect(onSpeakJa).toHaveBeenCalledWith(expect.anything(), 'わたし');
  });

  it('opens and closes stroke order from the writing button', () => {
    render(
      <VocabExampleLine
        example={{
          ja: '私は学生です。',
          kana: 'わたしはがくせいです。',
          vi: 'Tôi là học sinh.',
          en: '',
          speak: '私は学生です。',
        }}
        onSpeakJa={vi.fn()}
        onSpeakVi={vi.fn()}
        onSpeakBoth={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xem cách viết 私' }));
    expect(screen.getByTestId('stroke-order').textContent).toBe('私');

    fireEvent.click(screen.getByRole('button', { name: 'Ẩn cách viết' }));
    expect(screen.queryByTestId('stroke-order')).toBeNull();
  });

  it('speaks the full Japanese example from the speaker button', () => {
    const onSpeakJa = vi.fn();
    render(
      <VocabExampleLine
        example={{
          ja: '私は学生です。',
          kana: 'わたしはがくせいです。',
          vi: 'Tôi là học sinh.',
          en: '',
          speak: 'わたしはがくせいです。',
        }}
        onSpeakJa={onSpeakJa}
        onSpeakVi={vi.fn()}
        onSpeakBoth={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Nghe câu ví dụ tiếng Nhật: 私は学生です。' }),
    );

    expect(onSpeakJa).toHaveBeenCalledWith(expect.anything(), 'わたしはがくせいです。');
  });
});
