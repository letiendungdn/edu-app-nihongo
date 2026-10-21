// SQLite table definitions — offline-first local DB
//
// Mỗi câu một phần tử, chạy lần lượt. Bản cũ gộp tất cả vào MỘT chuỗi rồi gọi executeSql một lần:
// react-native-sqlite-storage chỉ chạy câu ĐẦU TIÊN, nên bảng srs_log và sync_queue chưa bao giờ
// được tạo và hàng đợi offline luôn lỗi (mọi lần ôn lúc mất mạng đều mất).

export const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS vocab (
    id           INTEGER PRIMARY KEY,
    word         TEXT NOT NULL,
    reading      TEXT NOT NULL,
    meaning      TEXT NOT NULL,
    level        TEXT NOT NULL,
    srs_interval INTEGER DEFAULT 0,
    srs_due      TEXT,
    updated_at   TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS srs_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    vocab_id    INTEGER NOT NULL,
    quality     INTEGER NOT NULL,
    reviewed_at TEXT NOT NULL,
    FOREIGN KEY (vocab_id) REFERENCES vocab(id)
  )`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    action      TEXT NOT NULL,
    payload     TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    retries     INTEGER DEFAULT 0
  )`,
  'CREATE INDEX IF NOT EXISTS idx_vocab_level ON vocab(level)',
  'CREATE INDEX IF NOT EXISTS idx_vocab_due ON vocab(srs_due)',
];
