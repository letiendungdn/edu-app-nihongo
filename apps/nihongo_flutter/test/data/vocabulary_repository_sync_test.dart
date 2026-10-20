import 'dart:async';

import 'package:drift/drift.dart' hide isNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/data/local/app_database.dart';
import 'package:nihongo_app/data/remote/vocabulary_api.dart';
import 'package:nihongo_app/data/repository/vocabulary_repository_impl.dart';
import 'package:nihongo_app/domain/entity/srs_card.dart';
import 'package:nihongo_app/domain/entity/sync_status.dart';
import 'package:nihongo_app/domain/repository/result.dart';
import 'package:nihongo_app/utils/network_monitor.dart';

class FakeNetwork implements NetworkMonitor {
  bool online = true;
  @override
  Future<bool> isOnline() async => online;
  @override
  Stream<bool> get onlineStream => Stream.value(online);
}

/// API giả: ghi lại mỗi lần gửi; có thể cho lỗi hoặc giữ request treo để mô phỏng mạng chậm.
class FakeApi implements VocabularyApi {
  final sent = <List<Map<String, dynamic>>>[];
  Object? failWith;
  Completer<void>? hold;

  @override
  Future<void> syncReviewBank(List<Map<String, dynamic>> items) async {
    sent.add(items);
    if (hold != null) await hold!.future;
    if (failWith != null) throw failWith!;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  late AppDatabase db;
  late FakeApi api;
  late FakeNetwork network;
  late VocabularyRepositoryImpl repo;

  SrsCard card(int id, {int reps = 1}) => SrsCard(
        id: id,
        vocabularyId: id,
        easeFactor: 2.5,
        interval: 1,
        repetitions: reps,
        nextReviewAt: DateTime(2026, 10, 21),
        mastered: false,
        syncStatus: SyncStatus.pending,
        updatedAt: DateTime(2026, 10, 20, 9),
      );

  Future<void> seed(int id) async {
    await db.upsertVocabularies([
      VocabularyTableCompanion.insert(
        id: Value(id), lessonNumber: 1, kana: 'かな$id', meaning: 'nghĩa $id',
        sortOrder: id, updatedAt: 0,
      ),
    ]);
    await db.upsertSrsCard(SrsCardTableCompanion.insert(
      id: Value(id), vocabularyId: id, nextReviewAt: 0, updatedAt: 0,
    ));
  }

  Future<int> queued() async => (await db.getPendingSyncItems()).length;

  /// Chờ các lượt sync chạy nền (updateSrsCard không còn await sync)
  Future<void> settle() => pumpEventQueue(times: 50);

  setUp(() async {
    db = AppDatabase(NativeDatabase.memory());
    api = FakeApi();
    network = FakeNetwork();
    repo = VocabularyRepositoryImpl(
      db: db, api: api, networkMonitor: network, isAuthenticated: () async => true,
    );
    await seed(1);
    await seed(2);
  });

  tearDown(() => db.close());

  test('API lỗi → hàng đợi CÒN NGUYÊN (bản cũ xóa trước khi gửi → mất dữ liệu)', () async {
    network.online = false;
    await repo.updateSrsCard(card(1));
    await repo.updateSrsCard(card(2));
    network.online = true;
    api.failWith = Exception('500');

    final result = await repo.syncAllPending();

    expect(result, isA<Failure<void>>());
    expect(await queued(), 2);
    final row = await db.getSrsByVocabId(1);
    expect(row!.syncStatus, isNot('synced'));
  });

  test('gửi thành công → xóa hàng đợi, đánh dấu synced', () async {
    network.online = false;
    await repo.updateSrsCard(card(1));
    network.online = true;

    await repo.syncAllPending();

    expect(await queued(), 0);
    expect((await db.getSrsByVocabId(1))!.syncStatus, 'synced');
    expect(api.sent.single.single['kana'], 'かな1');
    expect(api.sent.single.single['mastered'], false);
  });

  test('chấm một thẻ 3 lần lúc offline → chỉ 1 item trong hàng đợi', () async {
    network.online = false;
    for (var r = 1; r <= 3; r++) {
      await repo.updateSrsCard(card(1, reps: r));
    }
    expect(await queued(), 1);
    network.online = true;
    await repo.syncAllPending();
    expect(api.sent.single.single['reviewStreak'], 3);
  });

  test('gọi sync chồng nhau → chỉ một lượt gửi, lượt sau chờ chung', () async {
    network.online = false;
    await repo.updateSrsCard(card(1));
    network.online = true;
    api.hold = Completer();

    final a = repo.syncAllPending();
    final b = repo.syncAllPending();
    await pumpEventQueue();
    api.hold!.complete();
    await Future.wait([a, b]);

    expect(api.sent.length, 1);
  });

  test('chấm lại thẻ trong lúc đang gửi → lần chấm mới vẫn được gửi, thẻ chưa bị đánh dấu synced oan', () async {
    network.online = false;
    await repo.updateSrsCard(card(1, reps: 1));
    network.online = true;
    api.hold = Completer();

    final first = repo.syncAllPending();
    await pumpEventQueue();
    await repo.updateSrsCard(card(1, reps: 2)); // trong lúc lượt 1 đang chờ mạng
    api.hold!.complete();
    api.hold = null;
    await first;
    await settle();

    expect(api.sent.map((items) => items.single['reviewStreak']).toList(), [1, 2]);
    expect(await queued(), 0);
    expect((await db.getSrsByVocabId(1))!.syncStatus, 'synced');
  });

  test('payload hỏng bị bỏ, không chặn item khác', () async {
    await db.enqueueSync(operation: 'UPDATE_SRS', entityId: 9, payload: '{không phải json');
    network.online = false;
    await repo.updateSrsCard(card(2));
    network.online = true;

    await repo.syncAllPending();

    expect(await queued(), 0);
    expect(api.sent.single.single['kana'], 'かな2');
  });
}
