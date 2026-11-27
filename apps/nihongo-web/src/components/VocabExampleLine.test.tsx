import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import VocabExampleLine from './VocabExampleLine';

vi.mock('./KanjiStructureButton', () => ({ default: () => null }));
vi.mock('./VocabPicture', () => ({ default: () => null }));
vi.mock('./StrokeOrder', () => ({
  default: ({ text }: { text: string }) => <div data-testid="stroke-order">{text}</div>,
}));
vi.mock('../api/hooks/use-vocab', () => ({
  useVocabAnalysisMeta: () => ({
    data: [
      {
        surface: '誰',
        kind: 'common',
        reading: 'だれ',
        romaji: 'dare',
        gloss: 'Ai? Người nào?',
        pos: 'Đại từ nghi vấn',
        detail: 'Ai? Người nào?',
      },
      {
        surface: 'おはようございます',
        kind: 'greeting',
        reading: 'おはようございます',
        romaji: 'ohayou gozaimasu',
        gloss: 'Lời chào buổi sáng lịch sự.',
        pos: 'Câu chào',
        detail: 'Good morning.',
      },
      {
        surface: 'へ',
        kind: 'particle',
        reading: 'へ',
        romaji: 'e',
        gloss: 'Trợ từ chỉ hướng đi.',
        pos: 'Trợ từ hướng',
        detail: 'Direction marker (e).',
      },
    ],
  }),
}));
vi.mock('../api/hooks/use-grammar', () => ({
  useGrammarSearch: () => ({
    data: [
      {
        id: 7647,
        pattern: 'N（địa điểm）へ 行きます／来ます／帰ります',
        meaning: 'đi / đến / về N',
        lessonId: 5,
      },
    ],
  }),
}));

describe('VocabExampleLine pronunciation cards', () => {
  it('links a へ grammar match to its actual lesson and grammar card', () => {
    const onSpeakJa = vi.fn();
    render(
      <VocabExampleLine
        example={{
          ja: '大学へ行きます。',
          kana: 'だいがくへいきます。',
          vi: 'Tôi đi đến trường đại học.',
          en: '',
          speak: 'だいがくへいきます。',
        }}
        lessonNumber={1}
        grammarLessonNumberById={{ 5: 5 }}
        onSpeakJa={onSpeakJa}
        onSpeakVi={vi.fn()}
        onSpeakBoth={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: 'Ngữ pháp →' })).toHaveAttribute(
      'href',
      '/grammar?lesson=5&g=7647',
    );
    expect(screen.getByText('N（địa điểm）へ 行きます／来ます／帰ります')).toBeInTheDocument();

    const heCard = [...document.querySelectorAll('.vocab-example-analysis__card-item')].find(
      (item) => item.querySelector('.vocab-example-analysis__card-ja')?.textContent === 'へ',
    );
    expect(heCard?.querySelector('.vocab-example-analysis__card-reading')).toHaveTextContent(
      'he; khi là trợ từ đọc là e',
    );
    expect(heCard?.querySelector('a.vocab-example-analysis__card-action')).toHaveAttribute(
      'href',
      '/grammar?lesson=5&g=7647',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nghe phát âm trợ từ へ: e' }));
    expect(onSpeakJa).toHaveBeenCalledWith(expect.anything(), 'え');
  });

  it('renders the Vietnamese gloss for greetings, not the English detail', () => {
    render(
      <VocabExampleLine
        example={{
          ja: 'おはようございます。',
          kana: 'おはようございます。',
          vi: 'Chào buổi sáng.',
          en: '',
          speak: 'おはようございます。',
        }}
        onSpeakJa={vi.fn()}
        onSpeakVi={vi.fn()}
        onSpeakBoth={vi.fn()}
      />,
    );

    expect(screen.getByText('Lời chào buổi sáng lịch sự.')).toBeInTheDocument();
    expect(screen.queryByText('Good morning.')).not.toBeInTheDocument();
  });

  it('shows Vietnamese card meanings instead of English metadata details', () => {
    const { container } = render(
      <VocabExampleLine
        example={{
          ja: '人は誰ですか。',
          kana: 'ひとはだれですか。',
          vi: 'Người đó là ai?',
          en: '',
          speak: '人は誰ですか。',
        }}
        focusKanji="人"
        focusMeaning="người"
        onSpeakJa={vi.fn()}
        onSpeakVi={vi.fn()}
        onSpeakBoth={vi.fn()}
      />,
    );

    expect(screen.getByText('người')).toBeInTheDocument();
    expect(screen.getByText('Ai? Người nào?')).toBeInTheDocument();
    const whoCard = [...container.querySelectorAll('.vocab-example-analysis__card-item')].find(
      (item) => item.querySelector('.vocab-example-analysis__card-ja')?.textContent === '誰',
    );
    expect(
      whoCard?.querySelector('.vocab-example-analysis__card-reading'),
    ).toHaveTextContent('だれ');
    expect(screen.queryByText('Person / people')).not.toBeInTheDocument();
  });

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
