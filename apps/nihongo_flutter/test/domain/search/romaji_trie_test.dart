import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/domain/search/romaji_trie.dart';

RomajiTrie<String> trieOf(List<String> romaji) {
  final t = RomajiTrie<String>();
  for (final r in romaji) {
    t.insert(r, r);
  }
  return t;
}

void main() {
  test('chuẩn hóa: chữ thường, bỏ dấu, khoảng trắng, dấu câu', () {
    expect(normalizeRomaji('Kandō shimasu'), 'kandoshimasu');
    expect(normalizeRomaji('ja, mata [ashita].'), 'jamataashita');
  });

  test('trường âm: gõ có hay không nhân đôi nguyên âm đều tìm ra', () {
    final t = trieOf(['kandō shimasu', 'kanji']);
    expect(t.search('kando'), ['kandō shimasu']);
    expect(t.search('kandou'), ['kandō shimasu']);
    expect(t.search('Kandō Shi'), ['kandō shimasu']);
  });

  test('khóa ngắn trước, cùng độ dài theo bảng chữ cái', () {
    expect(trieOf(['kaban', 'ka', 'kasa', 'kagi']).search('ka'), ['ka', 'kagi', 'kasa', 'kaban']);
  });

  test('một mục ở hai khóa chỉ trả một lần', () {
    final t = trieOf(['tōrimasu']);
    expect(t.search('to'), ['tōrimasu']);
    expect(t.itemCount, 1);
  });

  test('giới hạn kết quả; tiền tố lạ hoặc rỗng không ra gì', () {
    final t = trieOf(['a', 'ai', 'aisu', 'ame', 'ane']);
    expect(t.search('a', limit: 3).length, 3);
    expect(t.search('zzz'), isEmpty);
    expect(t.search('   '), isEmpty);
  });

  test('mẫu romaji lấy từ DB nội dung thật', () {
    final t = trieOf(['nyūgaku shimasu', 'nyūgakushiki', 'yūshū desu', 'nandesuka.', 'tōrimasu']);
    expect(t.search('nyuugakushi'), ['nyūgakushiki', 'nyūgaku shimasu']);
    expect(t.search('yushu'), ['yūshū desu']);
    expect(t.search('nandesuka'), ['nandesuka.']);
  });
}
