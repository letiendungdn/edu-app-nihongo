import 'dart:async';

import '../entity/srs_card.dart';
import '../repository/vocabulary_repository.dart';

/// Thẻ đến hạn tại thời điểm HIỆN TẠI.
///
/// Bản cũ lấy `DateTime.now()` một lần lúc gọi `call()` rồi dùng mãi cho cả stream (và query DB
/// cũng vậy): để màn SRS mở qua giờ đến hạn thì thẻ không tự hiện, phải thoát ra vào lại.
/// Giờ phát lại danh sách khi DB đổi VÀ mỗi [tick] (mặc định 1 phút).
class GetReviewQueueUseCase {
  const GetReviewQueueUseCase(
    this._repo, {
    DateTime Function()? now,
    this.tick = const Duration(minutes: 1),
  }) : _now = now ?? DateTime.now;

  final VocabularyRepository _repo;
  final DateTime Function() _now;
  final Duration tick;

  Stream<List<ReviewCard>> call() {
    late final StreamController<List<ReviewCard>> controller;
    StreamSubscription<List<ReviewCard>>? sub;
    Timer? timer;
    List<ReviewCard>? latest;

    void emit() {
      final cards = latest;
      if (cards == null || controller.isClosed) return;
      final now = _now();
      controller.add(cards.where((c) => !c.card.nextReviewAt.isAfter(now)).toList());
    }

    controller = StreamController<List<ReviewCard>>(
      onListen: () {
        sub = _repo.watchReviewQueue().listen(
          (cards) {
            latest = cards;
            emit();
          },
          onError: controller.addError,
        );
        timer = Timer.periodic(tick, (_) => emit());
      },
      onCancel: () async {
        timer?.cancel();
        await sub?.cancel();
      },
    );
    return controller.stream;
  }
}
