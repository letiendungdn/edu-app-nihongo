import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entity/vocab_entry.dart';
import '../../providers.dart';

const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
const dictionaryPageSize = 30;

typedef FetchVocabPage = Future<VocabPage> Function({
  required String jlptLevel,
  required int page,
  int limit,
});

/// Nguồn dữ liệu của từ điển. Tách thành provider riêng để test thay bằng API giả.
final dictionaryFetchProvider = Provider<FetchVocabPage>(
  (ref) => ref.watch(vocabularyApiProvider).fetchVocabByLevel,
);

class DictionaryState {
  const DictionaryState({
    required this.level,
    this.items = const [],
    this.total,
    this.nextPage = 1,
    this.loading = false,
    this.hasMore = true,
    this.error,
  });

  final String level;
  final List<VocabEntry> items;

  /// Tổng số từ của cấp này; null khi chưa tải trang nào.
  final int? total;
  final int nextPage;
  final bool loading;
  final bool hasMore;
  final Object? error;

  DictionaryState copyWith({
    List<VocabEntry>? items,
    int? total,
    int? nextPage,
    bool? loading,
    bool? hasMore,
    Object? error,
    bool clearError = false,
  }) {
    return DictionaryState(
      level: level,
      items: items ?? this.items,
      total: total ?? this.total,
      nextPage: nextPage ?? this.nextPage,
      loading: loading ?? this.loading,
      hasMore: hasMore ?? this.hasMore,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// Cuộn vô hạn cho danh sách từ vựng theo cấp.
///
/// - Đang tải thì bỏ qua lời gọi mới (không tải chồng một trang hai lần).
/// - Đủ `total` hoặc trang trả rỗng thì dừng.
/// - Lỗi thì dừng hẳn, chờ người dùng bấm "Thử lại" (không gọi API liên tục).
/// - Đổi cấp giữa lúc đang tải: kết quả của cấp cũ về sau bị bỏ (đếm `_generation`).
/// - Lọc trùng theo id: dữ liệu đổi giữa hai lần gọi có thể đẩy một từ sang trang sau.
class DictionaryNotifier extends AutoDisposeNotifier<DictionaryState> {
  int _generation = 0;
  bool _disposed = false;

  @override
  DictionaryState build() {
    ref.onDispose(() => _disposed = true);
    return const DictionaryState(level: 'N5');
  }

  Future<void> loadMore() async {
    final current = state;
    if (current.loading || !current.hasMore || current.error != null) return;

    final generation = _generation;
    state = current.copyWith(loading: true);
    try {
      final page = await ref.read(dictionaryFetchProvider)(
        jlptLevel: current.level,
        page: current.nextPage,
        limit: dictionaryPageSize,
      );
      if (_disposed || generation != _generation) return;

      final seen = {for (final e in state.items) e.id};
      final items = [...state.items, ...page.items.where((e) => seen.add(e.id))];
      state = state.copyWith(
        items: items,
        total: page.total,
        nextPage: current.nextPage + 1,
        loading: false,
        hasMore: page.items.isNotEmpty && items.length < page.total,
      );
    } catch (e) {
      if (_disposed || generation != _generation) return;
      state = state.copyWith(loading: false, error: e);
    }
  }

  void selectLevel(String level) {
    if (level == state.level) return;
    _generation++;
    state = DictionaryState(level: level);
    loadMore();
  }

  void retry() {
    state = state.copyWith(clearError: true);
    loadMore();
  }
}

final dictionaryProvider =
    NotifierProvider.autoDispose<DictionaryNotifier, DictionaryState>(DictionaryNotifier.new);
