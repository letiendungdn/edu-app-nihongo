import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entity/vocabulary.dart';
import '../../domain/search/romaji_trie.dart';
import '../../providers.dart';

const vocabSearchLimit = 30;

/// Trie dựng lại mỗi khi bảng vocabulary trong drift đổi (vừa sync thêm bài).
final vocabTrieProvider = StreamProvider.autoDispose<RomajiTrie<Vocabulary>>((ref) {
  return ref.watch(vocabRepositoryProvider).watchAllVocab().map((list) {
    final trie = RomajiTrie<Vocabulary>();
    for (final v in list) {
      trie.insert(v.romaji, v);
    }
    return trie;
  });
});

final vocabSearchQueryProvider = StateProvider.autoDispose<String>((ref) => '');

class VocabSearchState {
  const VocabSearchState({required this.query, required this.results, required this.indexedCount});
  final String query;
  final List<Vocabulary> results;

  /// Số từ đã có trên máy. 0 = chưa mở bài nào, chưa có gì để tìm.
  final int indexedCount;
}

/// Mỗi lần gõ chỉ là một lần search trên Trie đã dựng sẵn.
final vocabSearchProvider = Provider.autoDispose<AsyncValue<VocabSearchState>>((ref) {
  final query = ref.watch(vocabSearchQueryProvider);
  return ref.watch(vocabTrieProvider).whenData(
        (trie) => VocabSearchState(
          query: query,
          results: trie.search(query, limit: vocabSearchLimit),
          indexedCount: trie.itemCount,
        ),
      );
});
