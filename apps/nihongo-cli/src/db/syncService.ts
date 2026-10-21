import { gqlClient, GET_VOCAB_LIST, SUBMIT_SRS } from '../api/graphqlClient';
import { upsertVocab, flushSyncQueue } from './vocabRepo';
import type { Vocab } from '../types';

// Sync vocab từ GraphQL server → SQLite local
export async function syncVocabFromServer(): Promise<void> {
  try {
    // Apollo v4: data không còn kiểu any; khai báo kiểu kết quả của query
    const { data } = await gqlClient.query<{ vocabList: { items: Vocab[] } }>({
      query: GET_VOCAB_LIST,
      variables: { limit: 500 },
      fetchPolicy: 'network-only',
    });
    const items: Vocab[] = data?.vocabList.items ?? [];
    await upsertVocab(items);
  } catch (e) {
    // Offline — bỏ qua, dùng data local
    console.log('Sync skipped (offline):', e);
  }
}

// Flush pending SRS reviews lên server
export async function syncPendingSrs(): Promise<void> {
  await flushSyncQueue(async (vocabId, quality) => {
    await gqlClient.mutate({
      mutation: SUBMIT_SRS,
      variables: { vocabId, quality },
    });
  });
}
