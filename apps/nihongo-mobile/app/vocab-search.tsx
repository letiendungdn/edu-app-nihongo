import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getAllVocab } from '../src/data/repository';
import type { Vocabulary } from '../src/domain/entities';
import { RomajiTrie } from '../src/utils/romajiTrie';
import { speakJapanese } from '../src/utils/tts';

const RESULT_LIMIT = 30;

/** Tra từ theo romaji, offline: đọc mọi từ trong SQLite một lần khi mở màn, dựng Trie, mỗi lần gõ chỉ search. */
export default function VocabSearchScreen() {
  const [trie, setTrie] = useState<RomajiTrie<Vocabulary> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    getAllVocab()
      .then((all) => {
        const next = new RomajiTrie<Vocabulary>();
        all.forEach((v) => next.insert(v.romaji, v));
        if (!cancelled) setTrie(next);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Không đọc được từ vựng trên máy');
      });
    return () => {
      cancelled = true; // rời màn trước khi đọc xong: không setState trên màn đã đóng
    };
  }, []);

  const results = useMemo(() => trie?.search(query, RESULT_LIMIT) ?? [], [trie, query]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Gõ romaji, ví dụ: tabe, kandou"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
      />
      {error ? (
        <Text style={styles.message}>{error}</Text>
      ) : !trie ? (
        <ActivityIndicator style={styles.message} color="#1d4ed8" />
      ) : trie.itemCount === 0 ? (
        <Text style={styles.message}>Chưa có từ vựng trên máy. Mở một bài học khi có mạng để tải từ vựng về.</Text>
      ) : query.trim() === '' ? (
        <Text style={styles.message}>Tìm trong {trie.itemCount} từ đã có trên máy, không cần mạng.</Text>
      ) : results.length === 0 ? (
        <Text style={styles.message}>Không có từ nào bắt đầu bằng "{query}".</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(v) => String(v.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => speakJapanese(item.kana)}>
              <Text style={styles.kana}>{item.kanji ? `${item.kana}  ·  ${item.kanji}` : item.kana}</Text>
              <Text style={styles.romaji}>{item.romaji}</Text>
              <Text>{item.meaning}</Text>
              <Text style={styles.lesson}>Bài {item.lessonNumber}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  message: { marginTop: 32, textAlign: 'center', color: '#64748b' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginTop: 8 },
  kana: { fontSize: 18, fontWeight: '700' },
  romaji: { color: '#1d4ed8', fontSize: 12 },
  lesson: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
});
