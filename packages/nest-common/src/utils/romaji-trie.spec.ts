import { RomajiTrie, looksLikeRomaji, normalizeRomaji } from './romaji-trie';

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
  });

  it('khóa ngắn trước, cùng độ dài theo bảng chữ cái; không trùng', () => {
    expect(trieOf(['kaban', 'ka', 'kasa', 'kagi']).search('ka')).toEqual(['ka', 'kagi', 'kasa', 'kaban']);
    expect(trieOf(['tōrimasu']).search('to')).toEqual(['tōrimasu']);
  });

  it('giới hạn kết quả; tiền tố lạ hoặc rỗng không ra gì', () => {
    const t = trieOf(['a', 'ai', 'aisu', 'ame', 'ane']);
    expect(t.search('a', 3)).toHaveLength(3);
    expect(t.search('zzz')).toEqual([]);
    expect(t.search('   ')).toEqual([]);
  });

  it('looksLikeRomaji: chỉ chữ Latin mới tra theo romaji', () => {
    expect(looksLikeRomaji('kandou')).toBe(true);
    expect(looksLikeRomaji('かんどう')).toBe(false);
    expect(looksLikeRomaji('感動')).toBe(false);
    expect(looksLikeRomaji('123')).toBe(false);
  });
});
