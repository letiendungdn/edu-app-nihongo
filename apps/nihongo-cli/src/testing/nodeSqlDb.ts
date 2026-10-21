import type { SqlDb, SqlValue } from '../db/database';

/**
 * SqlDb chạy trên node:sqlite (có sẵn trong Node 22): test chạy đúng câu SQL của app trên SQLite
 * thật, trong RAM, không cần thiết bị.
 */
export function nodeSqlDb(): SqlDb {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  const execute = async (sql: string, params: SqlValue[] = []) => {
    const stmt = db.prepare(sql);
    if (/^\s*(select|with)\b/i.test(sql)) {
      return { rows: stmt.all(...params) };
    }
    stmt.run(...params);
    return { rows: [] };
  };
  return {
    execute,
    async transaction(fn) {
      db.exec('BEGIN');
      try {
        await fn({ execute });
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    close: () => db.close(),
  };
}
