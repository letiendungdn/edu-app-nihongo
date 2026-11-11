import { describe, expect, it } from 'vitest';
import { parseFurigana, vocabMigrations } from './furigana';

describe('parseFurigana', () => {
  it('đọc JSON do backend tính', () => {
    expect(parseFurigana('[["食","た"],["べます",""]]')).toEqual([
      ['食', 'た'],
      ['べます', ''],
    ]);
  });

  it('trống hoặc sai định dạng thì rỗng', () => {
    expect(parseFurigana(null)).toEqual([]);
    expect(parseFurigana('not json')).toEqual([]);
    expect(parseFurigana('[["食"]]')).toEqual([]);
  });
});

describe('vocabMigrations', () => {
  it('máy cũ (v0/v1) thêm 4 cột rồi lên v2', () => {
    expect(vocabMigrations(0).statements).toHaveLength(4);
    expect(vocabMigrations(1).toVersion).toBe(2);
  });

  it('đã ở v2 thì không chạy gì (mở app lần sau không ALTER lại)', () => {
    expect(vocabMigrations(2)).toEqual({ statements: [], toVersion: 2 });
  });
});
