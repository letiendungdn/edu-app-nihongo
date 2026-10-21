import { open } from '@op-engineering/op-sqlite';
import { SCHEMA } from './schema';

export type SqlValue = string | number | null;
export type Row = Record<string, unknown>;

/**
 * Phần API của op-sqlite mà app dùng. Tách thành interface để test chạy SQL thật trên node:sqlite
 * (xem src/testing/nodeSqlDb.ts) thay vì mock từng câu lệnh.
 */
export interface SqlDb {
  execute(sql: string, params?: SqlValue[]): Promise<{ rows: Row[] }>;
  transaction(
    fn: (tx: { execute: SqlDb['execute'] }) => Promise<void>,
  ): Promise<void>;
  close(): void;
}

let dbPromise: Promise<SqlDb> | null = null;

/** Tạo bảng nếu chưa có. Chạy từng câu (xem schema.ts). */
export async function migrate(db: SqlDb): Promise<void> {
  for (const statement of SCHEMA) {
    await db.execute(statement);
  }
}

/**
 * Mở DB một lần cho cả app. Giữ Promise (không giữ DB): nhiều màn hình gọi cùng lúc lúc khởi động
 * thì dùng chung một lần mở, không mở rồi migrate hai lần.
 */
export function getDB(): Promise<SqlDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db: SqlDb = open({ name: 'nihongo.db' });
      await migrate(db);
      return db;
    })().catch(e => {
      dbPromise = null; // lần sau thử mở lại
      throw e;
    });
  }
  return dbPromise;
}

/** Test thay DB của app bằng DB trong RAM. */
export function setDBForTesting(db: SqlDb | null): void {
  dbPromise = db ? Promise.resolve(db) : null;
}

export async function closeDB(): Promise<void> {
  const pending = dbPromise;
  dbPromise = null;
  if (pending) {
    (await pending).close();
  }
}
