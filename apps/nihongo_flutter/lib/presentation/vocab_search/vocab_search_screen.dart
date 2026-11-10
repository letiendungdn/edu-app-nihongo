import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entity/vocabulary.dart';
import 'vocab_search_controller.dart';

/// Tra từ theo romaji, chạy offline trên từ vựng đã có trong drift.
class VocabSearchScreen extends ConsumerWidget {
  const VocabSearchScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(vocabSearchProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Tra từ (romaji)')),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: TextField(
                key: const Key('search_input'),
                autofocus: true,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search_rounded),
                  labelText: 'Gõ romaji, ví dụ: tabe, kandou',
                  border: OutlineInputBorder(),
                ),
                onChanged: (text) => ref.read(vocabSearchQueryProvider.notifier).state = text,
              ),
            ),
            Expanded(
              child: state.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text('Không đọc được từ vựng trên máy: $e')),
                data: (s) => _Results(state: s),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Results extends StatelessWidget {
  const _Results({required this.state});
  final VocabSearchState state;

  @override
  Widget build(BuildContext context) {
    if (state.indexedCount == 0) {
      return const _Message('Chưa có từ vựng trên máy. Mở một bài học khi có mạng để tải từ vựng về.');
    }
    if (state.query.trim().isEmpty) {
      return _Message('Tìm trong ${state.indexedCount} từ đã có trên máy, không cần mạng.');
    }
    if (state.results.isEmpty) {
      return _Message('Không có từ nào bắt đầu bằng "${state.query}".');
    }
    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: state.results.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) => _ResultCard(vocab: state.results[i]),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.vocab});
  final Vocabulary vocab;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final kanji = vocab.kanji;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              kanji == null || kanji.isEmpty ? vocab.kana : '${vocab.kana}  ·  $kanji',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            Text(vocab.romaji, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.primary)),
            Text(vocab.meaning),
            Text('Bài ${vocab.lessonNumber}', style: theme.textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(padding: const EdgeInsets.all(24), child: Text(text, textAlign: TextAlign.center)),
      );
}
