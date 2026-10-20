import 'dart:async';
import 'dart:convert';

import 'package:drift/drift.dart';

import '../../domain/entity/srs_card.dart';
import '../../domain/entity/sync_status.dart';
import '../../domain/entity/vocabulary.dart';
import '../../domain/repository/result.dart';
import '../../domain/repository/vocabulary_repository.dart';
import '../local/app_database.dart';
import '../remote/vocabulary_api.dart';
import '../../utils/network_monitor.dart';

const _srsOp = 'UPDATE_SRS';

class VocabularyRepositoryImpl implements VocabularyRepository {
  VocabularyRepositoryImpl({
    required AppDatabase db,
    required VocabularyApi api,
    required NetworkMonitor networkMonitor,
    required Future<bool> Function() isAuthenticated,
  })  : _db = db,
        _api = api,
        _network = networkMonitor,
        _isAuthenticated = isAuthenticated;

  final AppDatabase _db;
  final VocabularyApi _api;
  final NetworkMonitor _network;
  final Future<bool> Function() _isAuthenticated;

  @override
  Stream<List<Vocabulary>> watchVocabByLesson(int lessonNumber) {
    return _db.watchVocabByLesson(lessonNumber).map(
          (rows) => rows.map(_toVocabDomain).toList(),
        );
  }

  @override
  Stream<List<ReviewCard>> watchReviewQueue() {
    return _db.watchDueReviewCards().map(
          (rows) => rows
              .map(
                (row) => ReviewCard(
                  card: _toSrsDomain(row.card),
                  kana: row.vocab.kana,
                  kanji: row.vocab.kanji,
                  meaning: row.vocab.meaning,
                  romaji: row.vocab.romaji,
                ),
              )
              .toList(),
        );
  }

  @override
  Future<Result<void>> updateSrsCard(SrsCard card) async {
    try {
      await _db.updateSrsAfterReview(
        id: card.id,
        easeFactor: card.easeFactor,
        interval: card.interval,
        repetitions: card.repetitions,
        nextReviewAt: card.nextReviewAt.millisecondsSinceEpoch,
        mastered: card.mastered,
      );

      // Mỗi thẻ chỉ giữ lần chấm MỚI NHẤT: chấm 3 lần lúc offline thì gửi 1 item
      await _db.deleteSyncByEntity(_srsOp, card.id);
      await _db.enqueueSync(
        operation: _srsOp,
        entityId: card.id,
        payload: jsonEncode(card.toJson()),
      );

      // Gửi ở nền: ghi local xong là UI chuyển thẻ ngay, không chờ mạng (bản cũ await ở đây)
      unawaited(syncAllPending());

      return const Success(null);
    } catch (e, st) {
      return Failure(e, stackTrace: st);
    }
  }

  @override
  Future<Result<void>> syncLesson(int lessonNumber) async {
    if (!await _network.isOnline()) {
      return const Failure('Không có mạng');
    }

    try {
      final remote = await _api.fetchAllVocabForLesson(lessonNumber);
      final companions = <VocabularyTableCompanion>[];

      for (var i = 0; i < remote.length; i++) {
        final json = remote[i];
        final id = json['id'] as int? ?? 0;
        final kana = json['kana'] as String? ?? '';
        final meaning = json['meaning'] as String? ?? '';
        if (id == 0 || kana.isEmpty || meaning.isEmpty) continue;

        companions.add(
          VocabularyTableCompanion.insert(
            id: Value(id),
            lessonNumber: lessonNumber,
            kana: kana,
            kanji: Value(json['kanji'] as String?),
            meaning: meaning,
            romaji: Value(json['romaji'] as String? ?? ''),
            sortOrder: i,
            syncStatus: const Value('synced'),
            updatedAt: DateTime.now().millisecondsSinceEpoch,
          ),
        );

        await _ensureSrsCard(id);
      }

      if (companions.isNotEmpty) {
        await _db.upsertVocabularies(companions);
      }

      if (await _isAuthenticated()) {
        await syncAllPending();
      }

      return const Success(null);
    } catch (e, st) {
      return Failure(e, stackTrace: st);
    }
  }

  /// Lượt sync đang chạy. Chấm thẻ liên tục gọi sync nhiều lần cùng lúc: chỉ một lượt chạy,
  /// lượt gọi sau chờ chung rồi chạy thêm một vòng (gửi nốt item thêm vào trong lúc chờ mạng).
  Future<Result<void>>? _syncing;
  bool _syncAgain = false;

  @override
  Future<Result<void>> syncAllPending() {
    final running = _syncing;
    if (running != null) {
      _syncAgain = true;
      return running;
    }
    final run = _syncLoop();
    _syncing = run;
    return run.whenComplete(() => _syncing = null);
  }

  Future<Result<void>> _syncLoop() async {
    Result<void> result;
    var rounds = 0;
    do {
      _syncAgain = false;
      result = await _syncOnce();
      rounds++;
    } while (_syncAgain && result is Success && rounds < 5);
    return result;
  }

  /// Bản cũ đánh dấu "đã sync" và XÓA từng dòng khỏi hàng đợi TRƯỚC khi gọi API: API lỗi (mất mạng
  /// giữa chừng, server 500) là mất sạch các lần ôn chưa gửi. Giờ: gửi trước, thành công mới xóa,
  /// và chỉ xóa đúng các dòng đã gửi.
  Future<Result<void>> _syncOnce() async {
    if (!await _network.isOnline() || !await _isAuthenticated()) {
      return const Success(null);
    }

    try {
      final pending = await _db.getPendingSyncItems();
      final reviewItems = <Map<String, dynamic>>[];
      final sentRowIds = <int>[];
      final sentCards = <int, int>{}; // card id → id dòng hàng đợi đã gửi

      for (final item in pending) {
        if (item.operation != _srsOp) continue;
        final SrsCard card;
        try {
          card = SrsCard.fromJson(jsonDecode(item.payload) as Map<String, dynamic>);
        } catch (_) {
          // Payload hỏng: bỏ, đừng để nó chặn cả hàng đợi mãi mãi
          await _db.deleteSyncItem(item.id);
          continue;
        }
        final vocab = await (_db.select(_db.vocabularyTable)
              ..where((t) => t.id.equals(card.vocabularyId)))
            .getSingleOrNull();
        if (vocab == null) {
          await _db.deleteSyncItem(item.id); // từ đã bị xóa: không còn gì để gửi
          continue;
        }
        reviewItems.add(reviewItemFor(card, vocab));
        sentRowIds.add(item.id);
        sentCards[card.id] = item.id;
      }

      if (reviewItems.isEmpty) return const Success(null);

      await _api.syncReviewBank(reviewItems); // lỗi → ném ra, hàng đợi còn nguyên

      for (final id in sentRowIds) {
        await _db.deleteSyncItem(id);
      }
      // Chỉ đánh dấu synced thẻ không còn lần chấm mới hơn chờ trong hàng đợi
      final stillQueued = (await _db.getPendingSyncItems())
          .where((i) => i.operation == _srsOp)
          .map((i) => i.entityId)
          .toSet();
      final synced = sentCards.keys.where((id) => !stillQueued.contains(id)).toList();
      if (synced.isNotEmpty) await _db.markSrsSynced(synced);

      return const Success(null);
    } catch (e, st) {
      return Failure(e, stackTrace: st);
    }
  }

  /// Một item cho `POST /api/progress/review` (khớp ReviewItemDto của backend). Hàm thuần để test.
  static Map<String, dynamic> reviewItemFor(SrsCard card, VocabularyTableData vocab) => {
        'kana': vocab.kana,
        'kanji': vocab.kanji,
        'meaning': vocab.meaning,
        'lessonNumber': vocab.lessonNumber,
        'wrongCount': card.repetitions == 0 ? 1 : 0,
        'reviewStreak': card.repetitions,
        'mastered': card.mastered,
        'lastReviewedAt': card.updatedAt.toIso8601String(),
      };

  Future<void> _ensureSrsCard(int vocabularyId) async {
    final existing = await _db.getSrsByVocabId(vocabularyId);
    if (existing != null) return;

    final now = DateTime.now().millisecondsSinceEpoch;
    await _db.upsertSrsCard(
      SrsCardTableCompanion.insert(
        id: Value(vocabularyId),
        vocabularyId: vocabularyId,
        nextReviewAt: now,
        updatedAt: now,
      ),
    );
  }

  Vocabulary _toVocabDomain(VocabularyTableData row) => Vocabulary(
        id: row.id,
        lessonNumber: row.lessonNumber,
        kana: row.kana,
        kanji: row.kanji,
        meaning: row.meaning,
        romaji: row.romaji,
        sortOrder: row.sortOrder,
        syncStatus: SyncStatusX.fromStorage(row.syncStatus),
      );

  SrsCard _toSrsDomain(SrsCardTableData row) => SrsCard(
        id: row.id,
        vocabularyId: row.vocabularyId,
        easeFactor: row.easeFactor,
        interval: row.interval,
        repetitions: row.repetitions,
        nextReviewAt: DateTime.fromMillisecondsSinceEpoch(row.nextReviewAt),
        mastered: row.mastered,
        syncStatus: SyncStatusX.fromStorage(row.syncStatus),
        updatedAt: DateTime.fromMillisecondsSinceEpoch(row.updatedAt),
      );
}
