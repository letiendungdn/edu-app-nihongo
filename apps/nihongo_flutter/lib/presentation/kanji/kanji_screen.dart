import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entity/kanji_entry.dart';
import '../../providers.dart';
import '../widgets/vocab_reading.dart';

/// Nguồn dữ liệu, tách provider để test thay bằng API giả.
final kanjiLessonsProvider = FutureProvider.autoDispose<List<KanjiLessonOption>>(
  (ref) => ref.watch(kanjiApiProvider).fetchLessons(),
);

final kanjiByLessonProvider = FutureProvider.autoDispose.family<List<KanjiEntry>, int>(
  (ref, lesson) => ref.watch(kanjiApiProvider).fetchByLesson(lesson),
);

final selectedKanjiLessonProvider = StateProvider<int?>((ref) => null);

/// Kanji theo bài: Hán Việt, nghĩa tiếng Việt, nghĩa tiếng Anh (KANJIDIC2), âm On/Kun.
class KanjiScreen extends ConsumerWidget {
  const KanjiScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lessonsAsync = ref.watch(kanjiLessonsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Kanji theo bài')),
      body: lessonsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _Retry(
          message: 'Không tải được danh sách bài. Cần mạng.',
          onRetry: () => ref.invalidate(kanjiLessonsProvider),
        ),
        data: (lessons) {
          if (lessons.isEmpty) return const Center(child: Text('Chưa có bài kanji.'));
          final selected = ref.watch(selectedKanjiLessonProvider) ?? lessons.first.lessonNumber;
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: DropdownButtonFormField<int>(
                  key: const Key('kanji-lesson-picker'),
                  isExpanded: true,
                  initialValue: selected,
                  decoration: const InputDecoration(labelText: 'Bài', border: OutlineInputBorder()),
                  items: [
                    for (final l in lessons)
                      DropdownMenuItem(value: l.lessonNumber, child: Text('${l.label} (${l.count} chữ)')),
                  ],
                  onChanged: (v) => ref.read(selectedKanjiLessonProvider.notifier).state = v,
                ),
              ),
              Expanded(child: _KanjiList(lesson: selected)),
            ],
          );
        },
      ),
    );
  }
}

class _KanjiList extends ConsumerWidget {
  const _KanjiList({required this.lesson});
  final int lesson;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(kanjiByLessonProvider(lesson));
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => _Retry(
        message: 'Không tải được kanji bài $lesson.',
        onRetry: () => ref.invalidate(kanjiByLessonProvider(lesson)),
      ),
      data: (items) {
        if (items.isEmpty) return const Center(child: Text('Bài này chưa có kanji.'));
        final hasEnglish = items.any((k) => k.meaningEn != null);
        return ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          itemCount: items.length + (hasEnglish ? 1 : 0),
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, i) =>
              i == items.length ? const KanjidicAttribution() : KanjiCard(entry: items[i]),
        );
      },
    );
  }
}

class KanjiCard extends StatelessWidget {
  const KanjiCard({super.key, required this.entry});
  final KanjiEntry entry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final small = TextStyle(fontSize: 12, color: scheme.onSurfaceVariant);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Text(entry.character, style: TextStyle(fontSize: 44, color: scheme.primary)),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (entry.hanViet != null)
                    Text(entry.hanViet!, style: const TextStyle(fontWeight: FontWeight.w700)),
                  if (entry.meaningVi != null) Text(entry.meaningVi!),
                  if (entry.meaningEn != null)
                    Row(
                      children: [
                        Text('EN  ', style: small),
                        Flexible(child: SpeakEnglishText(entry.meaningEn!, style: small)),
                      ],
                    ),
                  if (entry.onyomi != null) Text('On: ${entry.onyomi}', style: const TextStyle(fontSize: 12)),
                  if (entry.kunyomi != null) Text('Kun: ${entry.kunyomi}', style: const TextStyle(fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Retry extends StatelessWidget {
  const _Retry({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message),
            const SizedBox(height: 8),
            FilledButton(onPressed: onRetry, child: const Text('Thử lại')),
          ],
        ),
      );
}
