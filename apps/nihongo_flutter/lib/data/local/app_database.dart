import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'app_database.g.dart';

class VocabularyTable extends Table {
  @override
  String get tableName => 'vocabulary';

  IntColumn get id => integer()();
  IntColumn get lessonNumber => integer().named('lesson_number')();
  TextColumn get kana => text()();
  TextColumn get kanji => text().nullable()();
  TextColumn get meaning => text()();
  TextColumn get romaji => text().withDefault(const Constant(''))();
  IntColumn get sortOrder => integer().named('sort_order')();
  TextColumn get syncStatus =>
      text().named('sync_status').withDefault(const Constant('synced'))();
  IntColumn get updatedAt => integer().named('updated_at')();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class SrsCardTable extends Table {
  @override
  String get tableName => 'srs_card';

  IntColumn get id => integer()();
  IntColumn get vocabularyId =>
      integer().named('vocabulary_id').references(VocabularyTable, #id)();
  RealColumn get easeFactor =>
      real().named('ease_factor').withDefault(const Constant(2.5))();
  IntColumn get interval => integer().withDefault(const Constant(0))();
  IntColumn get repetitions => integer().withDefault(const Constant(0))();
  IntColumn get nextReviewAt => integer().named('next_review_at')();
  BoolColumn get mastered => boolean().withDefault(const Constant(false))();
  TextColumn get syncStatus =>
      text().named('sync_status').withDefault(const Constant('synced'))();
  IntColumn get updatedAt => integer().named('updated_at')();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class SyncQueueTable extends Table {
  @override
  String get tableName => 'sync_queue';

  IntColumn get id => integer().autoIncrement()();
  TextColumn get operation => text()();
  IntColumn get entityId => integer().named('entity_id')();
  TextColumn get payload => text()();
  IntColumn get retryCount =>
      integer().named('retry_count').withDefault(const Constant(0))();
  IntColumn get createdAt => integer().named('created_at')();
}

@DriftDatabase(tables: [VocabularyTable, SrsCardTable, SyncQueueTable])
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? executor]) : super(executor ?? _openConnection());

  @override
  int get schemaVersion => 1;

  Stream<List<VocabularyTableData>> watchVocabByLesson(int lessonNumber) {
    return (select(vocabularyTable)
          ..where((t) => t.lessonNumber.equals(lessonNumber))
          ..orderBy([(t) => OrderingTerm.asc(t.sortOrder)]))
        .watch();
  }

  Future<void> upsertVocabulary(VocabularyTableCompanion row) {
    return into(vocabularyTable).insertOnConflictUpdate(row);
  }

  Future<void> upsertVocabularies(List<VocabularyTableCompanion> rows) async {
    await batch((b) {
      b.insertAllOnConflictUpdate(vocabularyTable, rows);
    });
  }

  Stream<List<({SrsCardTableData card, VocabularyTableData vocab})>>
      watchDueReviewCards({int limit = 30}) {
    // KHÔNG lọc theo giờ ở đây: `now` chốt một lần lúc tạo stream, thẻ đến hạn sau đó không bao
    // giờ hiện. Sắp xếp theo giờ đến hạn (thẻ đến hạn luôn ở đầu); GetReviewQueueUseCase lọc lại
    // theo giờ hiện tại mỗi phút.
    final query = select(srsCardTable).join([
      innerJoin(
        vocabularyTable,
        vocabularyTable.id.equalsExp(srsCardTable.vocabularyId),
      ),
    ])
      ..orderBy([OrderingTerm.asc(srsCardTable.nextReviewAt)])
      ..limit(limit);

    return query.watch().map(
          (rows) => rows
              .map(
                (row) => (
                  card: row.readTable(srsCardTable),
                  vocab: row.readTable(vocabularyTable),
                ),
              )
              .toList(),
        );
  }

  Future<SrsCardTableData?> getSrsByVocabId(int vocabularyId) {
    return (select(srsCardTable)
          ..where((t) => t.vocabularyId.equals(vocabularyId)))
        .getSingleOrNull();
  }

  Future<void> upsertSrsCard(SrsCardTableCompanion card) {
    return into(srsCardTable).insertOnConflictUpdate(card);
  }

  Future<void> updateSrsAfterReview({
    required int id,
    required double easeFactor,
    required int interval,
    required int repetitions,
    required int nextReviewAt,
    required bool mastered,
  }) {
    return (update(srsCardTable)..where((t) => t.id.equals(id))).write(
      SrsCardTableCompanion(
        easeFactor: Value(easeFactor),
        interval: Value(interval),
        repetitions: Value(repetitions),
        nextReviewAt: Value(nextReviewAt),
        mastered: Value(mastered),
        syncStatus: const Value('pending'),
        updatedAt: Value(DateTime.now().millisecondsSinceEpoch),
      ),
    );
  }

  Future<void> markSrsSynced(List<int> ids) {
    return (update(srsCardTable)..where((t) => t.id.isIn(ids))).write(
      const SrsCardTableCompanion(syncStatus: Value('synced')),
    );
  }

  Future<void> enqueueSync({
    required String operation,
    required int entityId,
    required String payload,
  }) {
    return into(syncQueueTable).insert(
      SyncQueueTableCompanion.insert(
        operation: operation,
        entityId: entityId,
        payload: payload,
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ),
    );
  }

  Future<List<SyncQueueTableData>> getPendingSyncItems() {
    return (select(syncQueueTable)
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
        .get();
  }

  Future<void> deleteSyncItem(int id) {
    return (delete(syncQueueTable)..where((t) => t.id.equals(id))).go();
  }

  Future<void> deleteSyncByEntity(String operation, int entityId) async {
    await (delete(syncQueueTable)
          ..where(
            (t) => t.operation.equals(operation) & t.entityId.equals(entityId),
          ))
        .go();
  }

  Future<void> incrementSyncRetry(int id, int currentRetry) {
    return (update(syncQueueTable)..where((t) => t.id.equals(id))).write(
      SyncQueueTableCompanion(retryCount: Value(currentRetry + 1)),
    );
  }
}

QueryExecutor _openConnection() {
  return driftDatabase(
    name: 'edu_app_db',
    web: DriftWebOptions(
      sqlite3Wasm: Uri.parse('sqlite3.wasm'),
      driftWorker: Uri.parse('drift_worker.js'),
    ),
  );
}
