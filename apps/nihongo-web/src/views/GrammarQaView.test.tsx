import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { withCitations } from './GrammarQaView';

describe('withCitations', () => {
  it('biến [1] thành nhãn bấm được trỏ tới nguồn, bỏ qua số nguồn không có', () => {
    const { container } = render(<p>{withCitations('Dùng mẫu này [1][2]. Sai [9].', [{ index: 1 }, { index: 2 }])}</p>);
    const links = container.querySelectorAll('a.gqa-cite');
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('#gqa-source-1');
    expect(container.textContent).toContain('[9]');
  });

  it('hiện **chữ đậm** mà không chèn HTML thô', () => {
    const { container } = render(<p>{withCitations('Mẫu **Vたことがあります** <b>x</b>', [])}</p>);
    expect(container.querySelector('strong')?.textContent).toBe('Vたことがあります');
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<b>x</b>');
  });
});
