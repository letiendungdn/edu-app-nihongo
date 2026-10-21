import { migrate, setDBForTesting, type SqlDb } from '../database';
import {
  enqueueSrsSync,
  flushSyncQueue,
  getDueCards,
  getLocalVocab,
  updateSrs,
  upsertVocab,
} from '../vocabRepo';
import type { Vocab } from '../../types';
import { nodeSqlDb } from '../../testing/nodeSqlDb';

let db: SqlDb;

const vocab = (id: number, over: Partial<Vocab> = {}): Vocab => ({
  id,
  word: `語${id}`,
  reading: `ご${id}`,
  meaning: `nghĩa ${id}`,
  level: 'N5',
  srsInterval: 0,
  srsDue: null,
  ...over,
});

beforeEach(async () => {
  db = nodeSqlDb();
  await migrate(db);
  setDBForTesting(db);
});

afterEach(() => {
  setDBForTesting(null);
  db.close();
});

test('migrate tạo ĐỦ bảng (bản cũ chỉ chạy câu đầu: thiếu srs_log, sync_queue)', async () => {
  const { rows } = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  expect(rows.map(r => r.name)).toEqual(['srs_log', 'sync_queue', 'vocab']);
  await migrate(db); // chạy lại không lỗi (IF NOT EXISTS)
});

test('ôn offline → vào hàng đợi; có mạng → gửi rồi xóa', async () => {
  await upsertVocab([vocab(1)]);
  await enqueueSrsSync(1, 4);

  const sent: [number, number][] = [];
  await flushSyncQueue(async (id, q) => {
    sent.push([id, q]);
  });

  expect(sent).toEqual([[1, 4]]);
  expect((await db.execute('SELECT * FROM sync_queue')).rows).toHaveLength(0);
});

test('gửi lỗi → giữ trong hàng đợi, tăng retries; quá 3 lần thì thôi gửi', async () => {
  await enqueueSrsSync(1, 4);
  const failing = jest.fn(async () => {
    throw new Error('offline');
  });
  for (let i = 0; i < 4; i++) {
    await flushSyncQueue(failing);
  }
  expect(failing).toHaveBeenCalledTimes(3);
  const { rows } = await db.execute('SELECT retries FROM sync_queue');
  expect(rows).toEqual([{ retries: 3 }]);
});

test('updateSrs ghi ĐÚNG quality vào log (bản cũ ghi interval)', async () => {
  await upsertVocab([vocab(1)]);
  await updateSrs(1, 5, 3, '2026-10-23');

  const [card] = await getLocalVocab();
  expect(card).toMatchObject({ srsInterval: 3, srsDue: '2026-10-23' });
  const { rows } = await db.execute('SELECT vocab_id, quality FROM srs_log');
  expect(rows).toEqual([{ vocab_id: 1, quality: 5 }]);
});

test('sync về KHÔNG ghi đè lịch ôn của thẻ còn lần ôn chờ gửi; nội dung từ vẫn cập nhật', async () => {
  await upsertVocab([vocab(1), vocab(2)]);
  await updateSrs(1, 4, 3, '2026-10-23');
  await updateSrs(2, 4, 3, '2026-10-23');
  await enqueueSrsSync(1, 4); // thẻ 1: server chưa nhận lần ôn này

  await upsertVocab([
    vocab(1, { meaning: 'nghĩa mới', srsInterval: 0, srsDue: null }),
    vocab(2, { srsInterval: 7, srsDue: '2026-10-27' }),
  ]);

  const [one, two] = await getLocalVocab();
  expect(one).toMatchObject({
    meaning: 'nghĩa mới',
    srsInterval: 3,
    srsDue: '2026-10-23',
  });
  expect(two).toMatchObject({ srsInterval: 7, srsDue: '2026-10-27' }); // không có gì chờ: theo server
});

test('getDueCards: chưa học hoặc đến hạn hôm nay; chưa tới hạn thì không', async () => {
  await upsertVocab([
    vocab(1),
    vocab(2, { srsDue: '2026-10-20' }),
    vocab(3, { srsDue: '2026-10-21' }),
  ]);
  const due = await getDueCards('2026-10-20');
  expect(due.map(v => v.id).sort()).toEqual([1, 2]);
});

test('lỗi giữa transaction → không ghi nửa chừng', async () => {
  await upsertVocab([vocab(1)]);
  await expect(
    upsertVocab([vocab(2), { ...vocab(3), word: null as unknown as string }]), // NOT NULL
  ).rejects.toThrow();
  expect((await getLocalVocab()).map(v => v.id)).toEqual([1]);
});
