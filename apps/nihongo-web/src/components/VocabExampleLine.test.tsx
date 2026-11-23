import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import VocabExampleLine from './VocabExampleLine';

vi.mock('./KanjiStructureButton', () => ({ default: () => null }));
vi.mock('./VocabPicture', () => ({ default: () => null }));

describe('VocabExampleLine pronunciation cards', () => {
  it('speaks the reading when a clean-analysis card is clicked', () => {
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
});
