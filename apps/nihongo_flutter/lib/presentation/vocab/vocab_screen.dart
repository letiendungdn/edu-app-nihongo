import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repository/result.dart';
import '../../providers.dart';
import '../../utils/tts_service.dart';
import '../widgets/vocab_reading.dart';

class VocabScreen extends ConsumerStatefulWidget {
  const VocabScreen({super.key});

  @override
  ConsumerState<VocabScreen> createState() => _VocabScreenState();
}

class _VocabScreenState extends ConsumerState<VocabScreen> {
  bool _syncing = false;
  int? _speakingId;
  // Tracks which lessons we've already attempted auto-sync for this session.
  final Set<int> _autoSyncedLessons = {};

  Future<void> _syncLesson({bool silent = false}) async {
    if (_syncing) return;
    setState(() => _syncing = true);
    final lesson = ref.read(selectedLessonProvider);
    final result = await ref.read(vocabRepositoryProvider).syncLesson(lesson);
    if (!mounted) return;
    setState(() => _syncing = false);

    if (silent) return; // auto-sync: no snackbar on success
    final message = switch (result) {
      Success() => 'Đã tải bài $lesson',
      Failure(:final error) => 'Lỗi: $error',
    };
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _speak(int id, String text) async {
    setState(() => _speakingId = id);
    await TtsService.instance.speak(text);
    if (mounted) setState(() => _speakingId = null);
  }

  @override
  Widget build(BuildContext context) {
    final lesson = ref.watch(selectedLessonProvider);
    final vocabAsync = ref.watch(vocabByLessonProvider(lesson));
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Từ vựng'),
        actions: [
          IconButton(
            onPressed: _syncing ? null : _syncLesson,
            icon: _syncing
                ? SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: scheme.primary),
                  )
                : const Icon(Icons.cloud_download_outlined),
            tooltip: 'Tải từ server',
          ),
        ],
      ),
      body: Column(
        children: [
          // Lesson picker
          Container(
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: scheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: scheme.outlineVariant),
            ),
            child: Row(
              children: [
                Text('Bài học',
                    style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: scheme.onSurfaceVariant)),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<int>(
                      value: lesson,
                      isExpanded: true,
                      items: List.generate(
                        50,
                        (i) => DropdownMenuItem(
                          value: i + 1,
                          child: Text('Bài ${i + 1}'),
                        ),
                      ),
                      onChanged: (v) {
                        if (v != null) {
                          ref.read(selectedLessonProvider.notifier).state = v;
                        }
                      },
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: scheme.primaryContainer,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${vocabAsync.valueOrNull?.length ?? 0} từ',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: scheme.onPrimaryContainer,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          Expanded(
            child: vocabAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Lỗi: $e')),
              data: (vocabList) {
                if (vocabList.isEmpty) {
                  // Auto-sync once per lesson per session when DB is empty.
                  if (!_autoSyncedLessons.contains(lesson) && !_syncing) {
                    _autoSyncedLessons.add(lesson);
                    WidgetsBinding.instance.addPostFrameCallback(
                      (_) => _syncLesson(silent: true),
                    );
                  }

                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_syncing)
                            const CircularProgressIndicator()
                          else
                            Icon(Icons.cloud_download_outlined,
                                size: 48,
                                color: scheme.onSurfaceVariant
                                    .withValues(alpha: 0.4)),
                          const SizedBox(height: 16),
                          Text(
                            _syncing
                                ? 'Đang tải bài $lesson…'
                                : 'Chưa có dữ liệu bài $lesson',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(color: scheme.onSurfaceVariant),
                            textAlign: TextAlign.center,
                          ),
                          if (!_syncing) ...[
                            const SizedBox(height: 16),
                            FilledButton.tonalIcon(
                              onPressed: () => _syncLesson(),
                              icon: const Icon(Icons.cloud_download_outlined,
                                  size: 18),
                              label: const Text('Tải từ server'),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }

                // Bài tải từ bản cũ (chưa có nghĩa EN / Hán Việt / furigana): tải lại một lần, chạy nền,
                // danh sách hiện tại vẫn hiển thị trong lúc chờ
                final fromOldVersion = vocabList.every(
                  (v) => v.meaningEn == null && v.hanViet == null && v.furigana.isEmpty,
                );
                if (fromOldVersion && !_autoSyncedLessons.contains(lesson) && !_syncing) {
                  _autoSyncedLessons.add(lesson);
                  WidgetsBinding.instance.addPostFrameCallback(
                    (_) => _syncLesson(silent: true),
                  );
                }
                final hasJmdict = vocabList.any((v) => v.meaningEnSource == 'jmdict');
                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: vocabList.length + (hasJmdict ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == vocabList.length) return const JmdictAttribution();
                    final v = vocabList[index];
                    final isPlaying = _speakingId == v.id;
                    final jpText = (v.kanji != null && v.kanji!.isNotEmpty)
                        ? v.kanji!
                        : v.kana;
                    final subText = (v.kanji != null && v.kanji!.isNotEmpty)
                        ? v.kana
                        : v.romaji;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        contentPadding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
                        leading: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: scheme.primaryContainer,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Center(
                            child: Text(
                              '${index + 1}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: scheme.onPrimaryContainer,
                              ),
                            ),
                          ),
                        ),
                        title: Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            FuriganaText(segments: v.furigana, fallback: jpText),
                            // Có furigana thì cách đọc đã nằm trên chữ: không lặp lại kana
                            if (v.furigana.isEmpty && v.kanji != null && v.kanji!.isNotEmpty) ...[
                              const SizedBox(width: 8),
                              Text(
                                subText,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: scheme.primary,
                                ),
                              ),
                            ],
                          ],
                        ),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                v.meaning,
                                style: TextStyle(color: scheme.onSurfaceVariant),
                              ),
                              VocabExtraMeanings(
                                hanViet: v.hanViet,
                                meaningEn: v.meaningEn,
                                source: v.meaningEnSource,
                              ),
                            ],
                          ),
                        ),
                        trailing: IconButton(
                          icon: isPlaying
                              ? SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: scheme.primary,
                                  ),
                                )
                              : Icon(Icons.volume_up_rounded,
                                  color: scheme.primary),
                          onPressed: isPlaying
                              ? null
                              : () => _speak(v.id, v.kana),
                          tooltip: 'Nghe phát âm',
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
