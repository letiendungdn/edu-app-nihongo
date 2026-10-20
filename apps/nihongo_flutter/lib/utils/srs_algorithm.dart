import '../../domain/entity/srs_card.dart';
import '../../domain/entity/sync_status.dart';

/// SM-2 simplified — quality 0..5 (0 = again, 5 = easy).
class SrsAlgorithm {
  /// [now] truyền vào được để test (bản cũ tự gọi DateTime.now() bên trong).
  static SrsCard calculateNextReview(SrsCard card, int quality, {DateTime? now}) {
    final at = now ?? DateTime.now();
    final q = quality.clamp(0, 5);
    var ease = card.easeFactor;
    var interval = card.interval;
    var reps = card.repetitions;

    if (q < 3) {
      reps = 0;
      interval = 1;
    } else {
      if (reps == 0) {
        interval = 1;
      } else if (reps == 1) {
        interval = 6;
      } else {
        interval = (interval * ease).round().clamp(1, 3650);
      }
      reps += 1;
    }

    ease += 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
    if (ease < 1.3) ease = 1.3;

    // Cộng NGÀY LỊCH, không cộng Duration(days:) (= đúng 24 giờ): ngày đổi giờ mùa hè dài 23 hoặc
    // 25 giờ, cộng giờ sẽ lệch một tiếng so với giờ người dùng ôn.
    final next = DateTime(at.year, at.month, at.day + interval, at.hour, at.minute, at.second);
    final mastered = reps >= 5 && interval >= 21;

    return card.copyWith(
      easeFactor: ease,
      interval: interval,
      repetitions: reps,
      nextReviewAt: next,
      mastered: mastered,
      syncStatus: SyncStatus.pending,
      updatedAt: at,
    );
  }
}
