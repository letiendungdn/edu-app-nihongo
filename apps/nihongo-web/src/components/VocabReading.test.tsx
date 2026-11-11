import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FuriganaWord, VocabExtraMeanings, parseFurigana } from './VocabReading';

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
