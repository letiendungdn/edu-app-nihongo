import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FuriganaText, JmdictAttribution, VocabExtraMeanings } from '../src/components/VocabReading';
import { getVocabByLesson, syncLesson } from '../src/data/repository';
import type { Vocabulary } from '../src/domain/entities';
import { speakJapanese } from '../src/utils/tts';

export default function VocabScreen() {
  const lessonNumber = 1;
  const [items, setItems] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      await syncLesson(lessonNumber);
      const list = await getVocabByLesson(lessonNumber);
      setItems(list);
      setError(null);
    } catch (e) {
      const list = await getVocabByLesson(lessonNumber);
      setItems(list);
      setError(e instanceof Error ? e.message : 'Lỗi sync');
    } finally {
      setLoading(false);
    }
  }, [lessonNumber]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.muted}>Đang tải / sync...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text>{error ?? 'Chưa có từ vựng. Cần mạng để sync lần đầu.'}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      ListFooterComponent={items.some((v) => v.meaningEnSource === 'jmdict') ? <JmdictAttribution /> : null}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => speakJapanese(item.kana)}>
          {item.furigana?.length ? (
            // Có furigana thì cách đọc đã nằm trên chữ: không cần dòng kana riêng
            <FuriganaText segments={item.furigana} fallback={item.kana} />
          ) : (
            <>
              <Text style={styles.kana}>{item.kana}</Text>
              {item.kanji ? <Text style={styles.kanji}>{item.kanji}</Text> : null}
            </>
          )}
          <Text style={styles.meaning}>{item.meaning}</Text>
          <VocabExtraMeanings hanViet={item.hanViet} meaningEn={item.meaningEn} source={item.meaningEnSource} />
          <Text style={styles.ttsHint}>🔊 Chạm để nghe</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { marginTop: 12, color: '#6b7280' },
  list: { padding: 16, gap: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  kana: { fontSize: 18, fontWeight: '600' },
  kanji: { fontSize: 16, marginTop: 2 },
  meaning: { color: '#6b7280', marginTop: 4 },
  ttsHint: { marginTop: 6, fontSize: 12, color: '#1d4ed8' },
});
