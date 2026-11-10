import { describe, expect, it } from 'vitest';
import { RomajiTrie, normalizeRomaji } from './romajiTrie';

function trieOf(romaji: string[]): RomajiTrie<string> {
  const t = new RomajiTrie<string>();
  romaji.forEach((r) => t.insert(r, r));
  return t;
}

describe('RomajiTrie', () => {
  it('chuẩn hóa: chữ thường, bỏ dấu, khoảng trắng, dấu câu', () => {
    expect(normalizeRomaji('Kandō shimasu')).toBe('kandoshimasu');
    expect(normalizeRomaji('ja, mata [ashita].')).toBe('jamataashita');
  });

  it('trường âm: gõ có hay không nhân đôi nguyên âm đều tìm ra', () => {
    const t = trieOf(['kandō shimasu', 'kanji']);
    expect(t.search('kando')).toEqual(['kandō shimasu']);
    expect(t.search('kandou')).toEqual(['kandō shimasu']);
    expect(t.search('Kandō Shi')).toEqual(['kandō shimasu']);
  });

  it('khóa ngắn trước, cùng độ dài theo bảng chữ cái', () => {
    expect(trieOf(['kaban', 'ka', 'kasa', 'kagi']).search('ka')).toEqual(['ka', 'kagi', 'kasa', 'kaban']);
  });

  it('một mục ở hai khóa chỉ trả một lần', () => {
    const t = trieOf(['tōrimasu']);
    expect(t.search('to')).toEqual(['tōrimasu']);
    expect(t.itemCount).toBe(1);
  });

  it('giới hạn kết quả; tiền tố lạ hoặc rỗng không ra gì', () => {
    const t = trieOf(['a', 'ai', 'aisu', 'ame', 'ane']);
    expect(t.search('a', 3)).toHaveLength(3);
    expect(t.search('zzz')).toEqual([]);
    expect(t.search('   ')).toEqual([]);
  });

  it('mẫu romaji lấy từ DB nội dung thật', () => {
    const t = trieOf(['nyūgaku shimasu', 'nyūgakushiki', 'yūshū desu', 'nandesuka.', 'tōrimasu']);
    expect(t.search('nyuugakushi')).toEqual(['nyūgakushiki', 'nyūgaku shimasu']);
    expect(t.search('yushu')).toEqual(['yūshū desu']);
    expect(t.search('nandesuka')).toEqual(['nandesuka.']);
  });
});
