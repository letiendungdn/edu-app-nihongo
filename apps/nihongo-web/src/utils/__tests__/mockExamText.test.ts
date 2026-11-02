import { describe, expect, it } from 'vitest';
import { listeningLines, pictureOption, splitReadingQuestion } from '../mockExam';

describe('splitReadingQuestion', () => {
  it('separates the passage from the question', () => {
    expect(splitReadingQuestion('【文章】\n第一段落。\n第二段落。\n\n質問：筆者の考えはどれか。')).toEqual({
      passage: '第一段落。\n第二段落。',
      prompt: '質問：筆者の考えはどれか。',
    });
  });

  it('keeps other questions whole', () => {
    expect(splitReadingQuestion('（　）に入れるのに最もよいものを選びなさい。\n\n彼は（　）。')).toEqual({
      prompt: '（　）に入れるのに最もよいものを選びなさい。\n\n彼は（　）。',
    });
  });
});

describe('listeningLines', () => {
  it('splits a dialogue and drops the speaker labels', () => {
    expect(listeningLines('会社で二人が話しています。\n男：資料、できました。\n女1：ありがとう。\n部下A：はい。')).toEqual([
      '会社で二人が話しています。',
      '資料、できました。',
      'ありがとう。',
      'はい。',
    ]);
  });

  it('leaves a one-line prompt as is', () => {
    expect(listeningLines('この書類、明日まででいいって言ってなかったっけ？')).toEqual([
      'この書類、明日まででいいって言ってなかったっけ？',
    ]);
  });
});

describe('pictureOption', () => {
  it('hides the caption of a picture-only option', () => {
    expect(pictureOption('［図］パンと たまご')).toEqual({ pictureOnly: true, label: 'パンと たまご' });
  });

  it('keeps normal options as they are', () => {
    expect(pictureOption('いただきます。')).toEqual({ pictureOnly: false, label: 'いただきます。' });
  });
});
