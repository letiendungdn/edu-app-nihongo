import { toFurigana } from './furigana';

describe('toFurigana', () => {
  it('tách okurigana', () => {
    expect(toFurigana('食べます', 'たべます')).toEqual([
      ['食', 'た'],
      ['べます', ''],
    ]);
  });

  it('cụm kanji liền nhau đọc chung', () => {
    expect(toFurigana('事務所', 'じむしょ')).toEqual([['事務所', 'じむしょ']]);
  });

  it('nhiều cụm kanji xen kana', () => {
    expect(toFurigana('掛け算', 'かけざん')).toEqual([
      ['掛', 'か'],
      ['け', ''],
      ['算', 'ざん'],
    ]);
    expect(toFurigana('心当たり', 'こころあたり')).toEqual([
      ['心当', 'こころあ'],
      ['たり', ''],
    ]);
  });

  it('giữ ký tự đặc biệt khớp nguyên văn', () => {
    expect(toFurigana('［お］湯', '［お］ゆ')).toEqual([
      ['［お］', ''],
      ['湯', 'ゆ'],
    ]);
  });

  it('katakana trong kanji khớp hiragana trong cách đọc', () => {
    expect(toFurigana('コピー機', 'こぴーき')).toEqual([
      ['コピー', ''],
      ['機', 'き'],
    ]);
  });

  it('có 々 vẫn là một cụm kanji', () => {
    expect(toFurigana('時々', 'ときどき')).toEqual([['時々', 'ときどき']]);
  });

  it('chữ số đọc chung với kanji bên cạnh', () => {
    expect(toFurigana('２４日', 'にじゅうよっか')).toEqual([['２４日', 'にじゅうよっか']]);
    expect(toFurigana('４分の１', 'よんぶんのいち')).toEqual([
      ['４分', 'よんぶん'],
      ['の', ''],
      ['１', 'いち'],
    ]);
  });

  it('nhiều cách viết cùng một cách đọc: mỗi cách viết đều có furigana', () => {
    expect(toFurigana('暑い、熱い', 'あつい')).toEqual([
      ['暑', 'あつ'],
      ['い', ''],
      ['、', ''],
      ['熱', 'あつ'],
      ['い', ''],
    ]);
  });

  it('trả null khi không có kanji hoặc không khớp', () => {
    expect(toFurigana(null, 'あなた')).toBeNull();
    expect(toFurigana('あなた', 'あなた')).toBeNull();
    expect(toFurigana('食べます', 'のみます')).toBeNull();
    expect(toFurigana('１０４', '１０４')).toBeNull(); // chỉ có số, không có kanji
    expect(toFurigana('月・水・金', 'げっすいきん')).toBeNull();
  });
});
