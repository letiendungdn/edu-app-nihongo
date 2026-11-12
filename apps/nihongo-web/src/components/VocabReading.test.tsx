import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const speech = vi.hoisted(() => ({ playAudio: vi.fn() }));
vi.mock('@/utils/speech', () => speech);

import {
  FuriganaWord,
  SpeakEnglishButton,
  VocabExtraMeanings,
  englishForSpeech,
  parseFurigana,
} from './VocabReading';

describe('parseFurigana', () => {
  it('đọc JSON hợp lệ, bỏ qua dữ liệu hỏng', () => {
    expect(parseFurigana('[["食","た"],["べます",""]]')).toEqual([
      ['食', 'た'],
      ['べます', ''],
    ]);
    expect(parseFurigana('not json')).toBeNull();
    expect(parseFurigana('[["食"]]')).toBeNull();
    expect(parseFurigana(null)).toBeNull();
  });
});

describe('FuriganaWord', () => {
  it('vẽ ruby cho phần kanji', () => {
    const { container } = render(
      <FuriganaWord vocab={{ kanji: '食べます', kana: 'たべます', furigana: '[["食","た"],["べます",""]]' }} />,
    );
    expect(container.querySelector('ruby')?.textContent).toBe('食た');
    expect(container.querySelector('rt')?.textContent).toBe('た');
  });

  it('không có furigana thì hiện kanji trơn', () => {
    const { container } = render(<FuriganaWord vocab={{ kanji: '４つ', kana: 'よっつ', furigana: null }} />);
    expect(container.textContent).toBe('４つ');
    expect(container.querySelector('ruby')).toBeNull();
  });
});

describe('VocabExtraMeanings', () => {
  it('hiện Hán Việt, nghĩa EN và nhãn dịch máy', () => {
    render(<VocabExtraMeanings vocab={{ hanViet: 'CẢM ĐỘNG', meaningEn: 'to be moved', meaningEnSource: 'ai' }} />);
    expect(screen.getByText('CẢM ĐỘNG')).toBeTruthy();
    expect(screen.getByText('to be moved')).toBeTruthy();
    expect(screen.getByText('dịch máy')).toBeTruthy();
  });

  it('nguồn JMdict thì không có nhãn dịch máy; trống hết thì không vẽ', () => {
    const { rerender, container } = render(
      <VocabExtraMeanings vocab={{ hanViet: null, meaningEn: 'student', meaningEnSource: 'jmdict' }} />,
    );
    expect(screen.queryByText('dịch máy')).toBeNull();
    rerender(<VocabExtraMeanings vocab={{ hanViet: null, meaningEn: null, meaningEnSource: null }} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('nghĩa tiếng Anh bấm để nghe', () => {
  it('englishForSpeech bỏ ghi chú trong ngoặc, dấu ~, đổi ; thành ,', () => {
    expect(englishForSpeech('fictional company (in textbook)')).toBe('fictional company');
    expect(englishForSpeech('to turn on; to switch on')).toBe('to turn on, to switch on');
    expect(englishForSpeech('this ~ (near the speaker)')).toBe('this');
  });

  it('bấm nút thì đọc bằng giọng en-US, không lan click ra ngoài', () => {
    const outer = vi.fn();
    render(
      <div onClick={outer}>
        <SpeakEnglishButton text="to eat; to have a meal" />
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Nghe tiếng Anh/ }));
    expect(speech.playAudio).toHaveBeenCalledWith('to eat, to have a meal', 'en-US');
    expect(outer).not.toHaveBeenCalled();
  });

  it('VocabExtraMeanings hiện nghĩa tiếng Anh dạng nút', () => {
    render(<VocabExtraMeanings vocab={{ hanViet: null, meaningEn: 'student', meaningEnSource: 'jmdict' }} />);
    expect(screen.getByRole('button', { name: 'Nghe tiếng Anh: student' })).toBeTruthy();
  });
});
