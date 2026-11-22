import { describe, expect, it } from 'vitest';
import { toFurigana } from './toFurigana';

describe('toFurigana', () => {
  it('tách furigana câu ví dụ 私は学生です。', () => {
    expect(toFurigana('私は学生です。', 'わたしはがくせいです。')).toEqual([
      ['私', 'わたし'],
      ['は', ''],
      ['学生', 'がくせい'],
      ['です。', ''],
    ]);
  });

  it('tách furigana 毎朝、新聞を読みます。', () => {
    expect(toFurigana('毎朝、新聞を読みます。', 'まいあさ、しんぶんをよみます。')).toEqual([
      ['毎朝', 'まいあさ'],
      ['、', ''],
      ['新聞', 'しんぶん'],
      ['を', ''],
      ['読', 'よ'],
      ['みます。', ''],
    ]);
  });

  it('bỏ khoảng trắng trong kana (dữ liệu CSDL)', () => {
    expect(toFurigana('あの方は木村さんです。', 'あの かたは きむらさん です。')).toEqual([
      ['あの', ''],
      ['方', 'かた'],
      ['は', ''],
      ['木村', 'きむら'],
      ['さんです。', ''],
    ]);
  });
});