import * as SQLite from 'expo-sqlite';

import { vocabMigrations } from '../utils/furigana';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function initSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS vocabulary (
      id INTEGER PRIMARY KEY NOT NULL,
      lesson_number INTEGER NOT NULL,
      kana TEXT NOT NULL,
      kanji TEXT,
      meaning TEXT NOT NULL,
      romaji TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_vocab_lesson ON vocabulary(lesson_number);

    CREATE TABLE IF NOT EXISTS srs_card (
      id INTEGER PRIMARY KEY NOT NULL,
      vocabulary_id INTEGER NOT NULL,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval INTEGER NOT NULL DEFAULT 0,
      repetitions INTEGER NOT NULL DEFAULT 0,
      next_review_at INTEGER NOT NULL,
      mastered INTEGER NOT NULL DEFAULT 0,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(vocabulary_id) REFERENCES vocabulary(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_srs_next ON srs_card(next_review_at);

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      payload TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
}

/** Nâng cấp schema theo PRAGMA user_version (CREATE TABLE IF NOT EXISTS không thêm cột cho máy cũ). */
async function migrate(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const { statements, toVersion } = vocabMigrations(row?.user_version ?? 0);
  if (statements.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const sql of statements) await db.execAsync(sql);
    await db.execAsync(`PRAGMA user_version = ${toVersion}`);
  });
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('edu_app.db');
      await initSchema(db);
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}
