import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show ScrollCacheExtent;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../utils/tts_service.dart';
import 'dictionary_controller.dart';

/// Duyệt toàn bộ từ vựng theo cấp N5–N1, kéo xuống tải tiếp.
///
/// ConsumerStatefulWidget: đọc provider (danh sách) và tự giữ ScrollController (phải dispose).
class DictionaryScreen extends ConsumerStatefulWidget {
  const DictionaryScreen({super.key});

  @override
  ConsumerState<DictionaryScreen> createState() => _DictionaryScreenState();
}

class _DictionaryScreenState extends ConsumerState<DictionaryScreen> {
  /// Còn cách đáy bao nhiêu pixel thì tải trang sau.
  static const _preloadDistance = 400.0;

  /// ListView.builder chỉ dựng các dòng trong vùng nhìn thấy + vùng đệm `scrollCacheExtent` (mặc định 250 px), nên
  /// `extentAfter` không bao giờ vượt quá khoảng đó. Ngưỡng tải trước mà lớn hơn vùng đệm thì
  /// điều kiện "gần cuối" luôn đúng → tải liên tục tới hết dữ liệu. Luôn để vùng đệm lớn hơn ngưỡng.
  static const _cacheExtent = _preloadDistance * 2;
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_loadIfNearEnd);
    // Không gọi provider trong initState trực tiếp: đợi khung hình đầu dựng xong.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(dictionaryProvider.notifier).loadMore();
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _loadIfNearEnd() {
    if (!_scroll.hasClients) return;
    if (_scroll.position.extentAfter < _preloadDistance) {
      ref.read(dictionaryProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(dictionaryProvider);
    final scheme = Theme.of(context).colorScheme;

    // Mỗi khi có trang mới: danh sách có thể vẫn chưa lấp đầy màn hình, mà chưa đầy thì không cuộn
    // được → listener không bao giờ chạy. Kiểm tra lại sau khi khung hình vẽ xong.
    ref.listen(dictionaryProvider, (previous, next) {
      if (previous?.level != next.level && _scroll.hasClients) _scroll.jumpTo(0);
      if (previous?.items.length != next.items.length) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _loadIfNearEnd();
        });
      }
    });

    final showFooter = state.loading || state.error != null || !state.hasMore;

    return Scaffold(
      appBar: AppBar(title: const Text('Từ điển theo cấp')),
      body: Column(
        children: [
          _LevelBar(
            selected: state.level,
            total: state.total,
            onSelect: ref.read(dictionaryProvider.notifier).selectLevel,
          ),
          Expanded(
            child: ListView.builder(
              controller: _scroll,
              scrollCacheExtent: const ScrollCacheExtent.pixels(_cacheExtent),


              itemCount: state.items.length + (showFooter ? 1 : 0),
              itemBuilder: (context, index) {
                if (index < state.items.length) {
                  final entry = state.items[index];
                  return ListTile(
                    title: Text(entry.headword, style: const TextStyle(fontSize: 20)),
                    subtitle: Text(
                      entry.headword == entry.kana ? entry.meaning : '${entry.kana} · ${entry.meaning}',
                    ),
                    trailing: Icon(Icons.volume_up_rounded, color: scheme.primary),
                    onTap: () => TtsService.instance.speak(entry.kana),
                  );
                }
                return _Footer(state: state, onRetry: ref.read(dictionaryProvider.notifier).retry);
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// UI tĩnh: hiển thị các cấp, báo cha khi chọn.
class _LevelBar extends StatelessWidget {
  const _LevelBar({required this.selected, required this.total, required this.onSelect});

  final String selected;
  final int? total;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      child: Row(
        children: [
          Expanded(
            child: Wrap(
              spacing: 6,
              children: [
                for (final level in jlptLevels)
                  ChoiceChip(
                    label: Text(level),
                    selected: level == selected,
                    onSelected: (_) => onSelect(level),
                  ),
              ],
            ),
          ),
          if (total != null) Text('${NumberFormat.decimalPattern('vi').format(total)} từ'),
        ],
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({required this.state, required this.onRetry});

  final DictionaryState state;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    if (state.error != null) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const Text('Không tải được. Kiểm tra mạng rồi thử lại.'),
            const SizedBox(height: 8),
            FilledButton.tonal(onPressed: onRetry, child: const Text('Thử lại')),
          ],
        ),
      );
    }
    if (state.loading) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    final text = state.items.isEmpty ? 'Không có từ nào.' : 'Đã xem hết ${state.items.length} từ.';
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Center(child: Text(text, style: Theme.of(context).textTheme.bodySmall)),
    );
  }
}
