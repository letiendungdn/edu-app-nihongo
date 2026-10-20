import 'dart:async';

import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/domain/entity/srs_card.dart';
import 'package:nihongo_app/domain/entity/sync_status.dart';
import 'package:nihongo_app/domain/repository/vocabulary_repository.dart';
import 'package:nihongo_app/domain/usecase/get_review_queue_usecase.dart';

class FakeRepo implements VocabularyRepository {
  final queue = StreamController<List<ReviewCard>>.broadcast();
  @override
  Stream<List<ReviewCard>> watchReviewQueue() => queue.stream;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

ReviewCard due(int id, DateTime at) => ReviewCard(
      card: SrsCard(
        id: id, vocabularyId: id, easeFactor: 2.5, interval: 1, repetitions: 1,
        nextReviewAt: at, mastered: false, syncStatus: SyncStatus.synced, updatedAt: at,
      ),
      kana: 'k$id', kanji: null, meaning: 'm$id', romaji: 'r$id',
    );

void main() {
  test('thẻ đến hạn SAU khi mở màn hình tự hiện ở lần tick kế tiếp (bản cũ: không bao giờ)', () {
    fakeAsync((async) {
      var clock = DateTime(2026, 10, 20, 9, 0);
      final repo = FakeRepo();
      final emitted = <List<int>>[];
      final sub = GetReviewQueueUseCase(repo, now: () => clock)()
          .listen((cards) => emitted.add(cards.map((c) => c.card.id).toList()));

      repo.queue.add([due(1, DateTime(2026, 10, 20, 8)), due(2, DateTime(2026, 10, 20, 9, 1, 30))]);
      async.flushMicrotasks();
      expect(emitted.last, [1]); // thẻ 2 chưa tới hạn

      clock = DateTime(2026, 10, 20, 9, 2); // 2 phút sau, DB không đổi gì
      async.elapse(const Duration(minutes: 1));
      expect(emitted.last, [1, 2]);

      sub.cancel();
    });
  });

  test('hủy lắng nghe → dừng timer (không rò rỉ)', () {
    fakeAsync((async) {
      final repo = FakeRepo();
      final sub = GetReviewQueueUseCase(repo)().listen((_) {});
      expect(async.periodicTimerCount, 1);
      sub.cancel();
      async.flushMicrotasks();
      expect(async.periodicTimerCount, 0);
    });
  });
}
