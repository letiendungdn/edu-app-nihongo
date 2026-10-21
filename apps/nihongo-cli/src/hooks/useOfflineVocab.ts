import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getDueCards, updateSrs, enqueueSrsSync } from '../db/vocabRepo';
import { syncVocabFromServer, syncPendingSrs } from '../db/syncService';
import type { Vocab } from '../types';

// SRS queue từ SQLite local — hoạt động offline
export function useLocalSrsQueue() {
  const [cards, setCards] = useState<Vocab[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const due = await getDueCards();
    setCards(due);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { cards, loading, reload: load };
}

// Khi app start: sync vocab từ server + flush pending queue
export function useStartupSync() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async state => {
      if (state.isConnected) {
        await syncPendingSrs(); // flush pending reviews
        await syncVocabFromServer(); // pull vocab mới nhất
      }
    });
    return () => unsubscribe();
  }, []);
}

// Submit SRS: update local ngay, queue lên server nếu offline
export async function submitSrsLocal(
  vocabId: number,
  quality: 0 | 1 | 2 | 3 | 4 | 5,
): Promise<void> {
  // SM-2 simplified: tính nextInterval
  const nextInterval = quality >= 3 ? Math.max(1, quality - 1) : 1;
  const nextDue = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Cập nhật SQLite ngay (instant, không cần mạng)
  await updateSrs(vocabId, quality, nextInterval, nextDue);

  // Gửi lên server hoặc queue nếu offline
  const net = await NetInfo.fetch();
  if (net.isConnected) {
    try {
      const { gqlClient, SUBMIT_SRS } = require('../api/graphqlClient');
      await gqlClient.mutate({
        mutation: SUBMIT_SRS,
        variables: { vocabId, quality },
      });
    } catch {
      await enqueueSrsSync(vocabId, quality);
    }
  } else {
    await enqueueSrsSync(vocabId, quality);
  }
}
