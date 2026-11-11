import 'package:drift/drift.dart' hide isNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nihongo_app/data/local/app_database.dart';
import 'package:nihongo_app/domain/vocab/furigana.dart';

void main() {
  group('parseFurigana', () {
    test('đọc JSON do backend tính', () {
      expect(parseFurigana('[["食","た"],["べます",""]]'), const [
        FuriganaSegment('食', 'た'),
        FuriganaSegment('べます', ''),
      ]);
    });

    test('trống hoặc sai định dạng thì rỗng', () {
      expect(parseFurigana(null), isEmpty);
      expect(parseFurigana('not json'), isEmpty);
      expect(parseFurigana('[["食"]]'), isEmpty);
      expect(parseFurigana('{"a":1}'), isEmpty);
    });
  });

  test('DB bản 1 nâng lên bản 2: giữ dữ liệu, có thêm 4 cột mới', () async {
    // Dựng đúng bảng vocabulary của schemaVersion 1 rồi để drift chạy onUpgrade
    final db = AppDatabase(NativeDatabase.memory(setup: (raw) {
      raw.execute('''
        CREATE TABLE vocabulary (
          id INTEGER NOT NULL PRIMARY KEY, lesson_number INTEGER NOT NULL, kana TEXT NOT NULL,
          kanji TEXT NULL, meaning TEXT NOT NULL, romaji TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL, sync_status TEXT NOT NULL DEFAULT 'synced', updated_at INTEGER NOT NULL)''');
      raw.execute('''
        CREATE TABLE srs_card (
          id INTEGER NOT NULL PRIMARY KEY, vocabulary_id INTEGER NOT NULL REFERENCES vocabulary (id),
          ease_factor REAL NOT NULL DEFAULT 2.5, interval INTEGER NOT NULL DEFAULT 0,
          repetitions INTEGER NOT NULL DEFAULT 0, next_review_at INTEGER NOT NULL,
          mastered INTEGER NOT NULL DEFAULT 0 CHECK (mastered IN (0, 1)),
          sync_status TEXT NOT NULL DEFAULT 'synced', updated_at INTEGER NOT NULL)''');
      raw.execute('''
        CREATE TABLE sync_queue (
          id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, operation TEXT NOT NULL, entity_id INTEGER NOT NULL,
          payload TEXT NOT NULL, retry_count INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)''');
      raw.execute("INSERT INTO vocabulary VALUES (1, 1, 'ねこ', '猫', 'con mèo', 'neko', 0, 'synced', 0)");
      raw.execute('PRAGMA user_version = 1');
    }));
    addTearDown(db.close);

    final row = await (db.select(db.vocabularyTable)..where((t) => t.id.equals(1))).getSingle();
    expect(row.kana, 'ねこ');
    expect(row.meaningEn, isNull);
    expect(row.furigana, isNull);

    await db.upsertVocabularies([
      VocabularyTableCompanion.insert(
        id: const Value(1), lessonNumber: 1, kana: 'ねこ', kanji: const Value('猫'), meaning: 'con mèo',
        sortOrder: 0, updatedAt: 1, meaningEn: const Value('cat'), meaningEnSource: const Value('jmdict'),
        hanViet: const Value('MIÊU'), furigana: const Value('[["猫","ねこ"]]'),
      ),
    ]);
    final updated = await (db.select(db.vocabularyTable)..where((t) => t.id.equals(1))).getSingle();
    expect(updated.meaningEn, 'cat');
    expect(parseFurigana(updated.furigana), const [FuriganaSegment('猫', 'ねこ')]);
  });
}
