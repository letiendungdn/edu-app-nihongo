import NetInfo from '@react-native-community/netinfo';

import type { ReviewCard, SrsCard, SyncStatus, Vocabulary } from '../domain/entities';
import { fetchAllVocabForLesson, isLoggedIn, syncReviewBank } from './api';
import { getDatabase } from './database';

type VocabRow = {
  id: number;
  lesson_number: number;
  kana: string;
  kanji: string | null;
  meaning: string;
  romaji: string;
  sort_order: number;
  sync_status: string;
};

type ReviewRow = {
  id: number;
  vocabulary_id: number;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_at: number;
  mastered: number;
  sync_status: string;
  updated_at: number;
  kana: string;
  kanji: string | null;
  meaning: string;
  romaji: string;
};

function toVocabulary(row: VocabRow): Vocabulary {
  return {
    id: row.id,
    lessonNumber: row.lesson_number,
    kana: row.kana,
    kanji: row.kanji,
    meaning: row.meaning,
    romaji: row.romaji,
    sortOrder: row.sort_order,
    syncStatus: row.sync_status as SyncStatus,
  };
}

function toReviewCard(row: ReviewRow): ReviewCard {
  return {
    card: {
      id: row.id,
      vocabularyId: row.vocabulary_id,
      easeFactor: row.ease_factor,
      interval: row.interval,
      repetitions: row.repetitions,
      nextReviewAt: row.next_review_at,
      mastered: row.mastered === 1,
      syncStatus: row.sync_status as SyncStatus,
      updatedAt: row.updated_at,
    },
    kana: row.kana,
    kanji: row.kanji,
    meaning: row.meaning,
    romaji: row.romaji,
  };
}

export async function getVocabByLesson(lessonNumber: number): Promise<Vocabulary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<VocabRow>(
    `SELECT * FROM vocabulary WHERE lesson_number = ? ORDER BY sort_order ASC`,
    [lessonNumber],
  );
  return rows.map(toVocabulary);
}

/** Mọi từ vựng đã có trên máy (các bài đã mở), cho tra từ offline. */
export async function getAllVocab(): Promise<Vocabulary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<VocabRow>(
    `SELECT * FROM vocabulary ORDER BY lesson_number ASC, sort_order ASC`,
  );
  return rows.map(toVocabulary);
}

export async function getReviewQueue(): Promise<ReviewCard[]> {
  const db = await getDatabase();
  const now = Date.now();
  const rows = await db.getAllAsync<ReviewRow>(
    `
    SELECT s.id, s.vocabulary_id, s.ease_factor, s.interval, s.repetitions,
           s.next_review_at, s.mastered, s.sync_status, s.updated_at,
           v.kana, v.kanji, v.meaning, v.romaji
    FROM srs_card s
    INNER JOIN vocabulary v ON v.id = s.vocabulary_id
    WHERE s.next_review_at <= ?
    ORDER BY s.next_review_at ASC
    LIMIT 20
    `,
    [now],
  );
  return rows.map(toReviewCard);
}

async function ensureSrsCard(vocabId: number) {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM srs_card WHERE vocabulary_id = ?`,
    [vocabId],
  );
  if (existing) return;

  const now = Date.now();
  await db.runAsync(
    `INSERT INTO srs_card (id, vocabulary_id, next_review_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    [vocabId, vocabId, now, now],
  );
}

async function flushSyncQueue() {
  const db = await getDatabase();
  const pending = await db.getAllAsync<{
    id: number;
    entity_id: number;
    operation: string;
    payload: string;
  }>(`SELECT id, entity_id, operation, payload FROM sync_queue ORDER BY created_at ASC`);

  const reviewItems: Array<{
    kana: string;
    kanji: string | null;
    meaning: string;
    lessonNumber: number;
    wrongCount: number;
    reviewStreak: number;
    mastered: boolean;
    lastReviewedAt: string;
  }> = [];
  const syncedQueueIds: number[] = [];
  const syncedCardIds: number[] = [];

  for (const item of pending) {
    if (item.operation !== 'UPDATE_SRS') continue;
    try {
      const card = JSON.parse(item.payload) as SrsCard;
      const vocab = await db.getFirstAsync<{
        kana: string;
        kanji: string | null;
        meaning: string;
        lesson_number: number;
      }>(
        `SELECT kana, kanji, meaning, lesson_number FROM vocabulary WHERE id = ?`,
        [card.vocabularyId],
      );
      if (!vocab) {
        syncedQueueIds.push(item.id);
        continue;
      }
      reviewItems.push({
        kana: vocab.kana,
        kanji: vocab.kanji,
        meaning: vocab.meaning,
        lessonNumber: vocab.lesson_number,
        wrongCount: card.repetitions === 0 ? 1 : 0,
        reviewStreak: card.repetitions,
        mastered: card.mastered,
        lastReviewedAt: new Date(card.updatedAt || Date.now()).toISOString(),
      });
      syncedQueueIds.push(item.id);
      syncedCardIds.push(card.id);
    } catch {
      // leave in queue for next flush
    }
  }

  if (reviewItems.length > 0) {
    await syncReviewBank(reviewItems);
  }

  for (const cardId of syncedCardIds) {
    await db.runAsync(`UPDATE srs_card SET sync_status = 'synced' WHERE id = ?`, [cardId]);
  }
  for (const queueId of syncedQueueIds) {
    await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [queueId]);
  }
}

export async function syncLesson(lessonNumber: number): Promise<void> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) throw new Error('Không có mạng');

  const remote = await fetchAllVocabForLesson(lessonNumber);
  const db = await getDatabase();
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < remote.length; i++) {
      const dto = remote[i];
      await db.runAsync(
        `INSERT INTO vocabulary (id, lesson_number, kana, kanji, meaning, romaji, sort_order, sync_status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)
         ON CONFLICT(id) DO UPDATE SET
           lesson_number = excluded.lesson_number,
           kana = excluded.kana,
           kanji = excluded.kanji,
           meaning = excluded.meaning,
           romaji = excluded.romaji,
           sort_order = excluded.sort_order,
           updated_at = excluded.updated_at`,
        [
          dto.id,
          lessonNumber,
          dto.kana ?? '',
          dto.kanji ?? null,
          dto.meaning ?? '',
          dto.romaji ?? '',
          i,
          now,
        ],
      );
      await ensureSrsCard(dto.id);
    }
  });

  if (await isLoggedIn()) {
    await flushSyncQueue();
  }
}

export async function updateSrsCard(card: SrsCard): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  await db.runAsync(
    `UPDATE srs_card SET
       ease_factor = ?, interval = ?, repetitions = ?,
       next_review_at = ?, mastered = ?, sync_status = 'pending', updated_at = ?
     WHERE id = ?`,
    [
      card.easeFactor,
      card.interval,
      card.repetitions,
      card.nextReviewAt,
      card.mastered ? 1 : 0,
      now,
      card.id,
    ],
  );

  await db.runAsync(
    `INSERT INTO sync_queue (operation, entity_id, payload, created_at)
     VALUES ('UPDATE_SRS', ?, ?, ?)`,
    [card.id, JSON.stringify(card), now],
  );

  const net = await NetInfo.fetch();
  if (net.isConnected && (await isLoggedIn())) {
    await flushSyncQueue();
  }
}

export async function isOnline(): Promise<boolean> {
  const net = await NetInfo.fetch();
  return net.isConnected ?? false;
}
