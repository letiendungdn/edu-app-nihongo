import { getDB, type Row } from './database';
import type { Vocab } from '../types';

const SRS_SUBMIT = 'SRS_SUBMIT';

// Upsert vocab list từ server vào SQLite.
//
// Bản cũ dùng INSERT OR REPLACE: mỗi lần sync về là ghi đè srs_interval/srs_due bằng dữ liệu server,
// kể cả thẻ vừa ôn lúc offline mà server chưa nhận (hàng đợi gửi lỗi) → lịch ôn local bị lùi về.
// Giờ: nội dung từ luôn lấy theo server; lịch SRS chỉ lấy theo server khi thẻ không còn lần ôn nào
// đang chờ gửi.
export async function upsertVocab(items: Vocab[]): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  await db.transaction(async tx => {
    for (const v of items) {
      await tx.execute(
        `INSERT INTO vocab
           (id, word, reading, meaning, level, srs_interval, srs_due, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           word = excluded.word,
           reading = excluded.reading,
           meaning = excluded.meaning,
           level = excluded.level,
           updated_at = excluded.updated_at,
           srs_interval = CASE WHEN EXISTS (
               SELECT 1 FROM sync_queue
               WHERE action = '${SRS_SUBMIT}' AND json_extract(payload, '$.vocabId') = vocab.id
             ) THEN vocab.srs_interval ELSE excluded.srs_interval END,
           srs_due = CASE WHEN EXISTS (
               SELECT 1 FROM sync_queue
               WHERE action = '${SRS_SUBMIT}' AND json_extract(payload, '$.vocabId') = vocab.id
             ) THEN vocab.srs_due ELSE excluded.srs_due END`,
        [
          v.id,
          v.word,
          v.reading,
          v.meaning,
          v.level,
          v.srsInterval,
          v.srsDue,
          now,
        ],
      );
    }
  });
}

// Đọc vocab từ local (offline)
export async function getLocalVocab(level?: string): Promise<Vocab[]> {
  const db = await getDB();
  const { rows } = level
    ? await db.execute('SELECT * FROM vocab WHERE level = ? ORDER BY id', [
        level,
      ])
    : await db.execute('SELECT * FROM vocab ORDER BY id');
  return rows.map(toVocab);
}

// Lấy thẻ SRS đến hạn hôm nay (srs_due dạng YYYY-MM-DD)
export async function getDueCards(
  today = new Date().toISOString().slice(0, 10),
): Promise<Vocab[]> {
  const db = await getDB();
  const { rows } = await db.execute(
    `SELECT * FROM vocab
     WHERE srs_due IS NULL OR srs_due <= ?
     ORDER BY srs_due ASC
     LIMIT 50`,
    [today],
  );
  return rows.map(toVocab);
}

// Cập nhật SRS sau khi review. Bản cũ ghi newInterval vào cột quality của srs_log.
// Cập nhật thẻ và ghi log trong một transaction: không có chuyện thẻ đổi mà log thiếu.
export async function updateSrs(
  vocabId: number,
  quality: number,
  newInterval: number,
  nextDue: string,
): Promise<void> {
  const db = await getDB();
  await db.transaction(async tx => {
    await tx.execute(
      'UPDATE vocab SET srs_interval = ?, srs_due = ? WHERE id = ?',
      [newInterval, nextDue, vocabId],
    );
    await tx.execute(
      'INSERT INTO srs_log (vocab_id, quality, reviewed_at) VALUES (?, ?, ?)',
      [vocabId, quality, new Date().toISOString()],
    );
  });
}

// Đưa SRS result vào queue khi offline
export async function enqueueSrsSync(
  vocabId: number,
  quality: number,
): Promise<void> {
  const db = await getDB();
  await db.execute(
    'INSERT INTO sync_queue (action, payload, created_at) VALUES (?, ?, ?)',
    [
      SRS_SUBMIT,
      JSON.stringify({ vocabId, quality }),
      new Date().toISOString(),
    ],
  );
}

// Flush sync queue khi có mạng: gửi xong mới xóa; lỗi thì tăng retries (bỏ qua sau 3 lần)
export async function flushSyncQueue(
  submitFn: (vocabId: number, quality: number) => Promise<void>,
): Promise<void> {
  const db = await getDB();
  const { rows } = await db.execute(
    'SELECT * FROM sync_queue WHERE action = ? AND retries < 3 ORDER BY id',
    [SRS_SUBMIT],
  );
  for (const row of rows) {
    const id = Number(row.id);
    let payload: { vocabId: number; quality: number };
    try {
      payload = JSON.parse(String(row.payload));
    } catch {
      await db.execute('DELETE FROM sync_queue WHERE id = ?', [id]); // payload hỏng: bỏ
      continue;
    }
    try {
      await submitFn(payload.vocabId, payload.quality);
      await db.execute('DELETE FROM sync_queue WHERE id = ?', [id]);
    } catch {
      await db.execute(
        'UPDATE sync_queue SET retries = retries + 1 WHERE id = ?',
        [id],
      );
    }
  }
}

function toVocab(r: Row): Vocab {
  return {
    id: Number(r.id),
    word: String(r.word),
    reading: String(r.reading),
    meaning: String(r.meaning),
    level: String(r.level),
    srsInterval: Number(r.srs_interval ?? 0),
    srsDue: r.srs_due == null ? null : String(r.srs_due),
  };
}
