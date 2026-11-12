import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { KanjidicAttribution, SpeakEnglishText } from '../src/components/VocabReading';
import { fetchKanjiByLesson, fetchKanjiLessons } from '../src/data/api';
import type { KanjiEntry, KanjiLessonOption } from '../src/data/kanji';

/** Kanji theo bài: Hán Việt, nghĩa tiếng Việt, nghĩa tiếng Anh (KANJIDIC2), âm On/Kun. Cần mạng. */
export default function KanjiScreen() {
  const [lessons, setLessons] = useState<KanjiLessonOption[]>([]);
  const [index, setIndex] = useState(0);
  const [items, setItems] = useState<KanjiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tăng lên để tải lại kanji của bài hiện tại (nút "Thử lại")
  const [reloadKey, setReloadKey] = useState(0);

  const loadLessons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLessons(await fetchKanjiLessons());
    } catch {
      setError('Không tải được danh sách bài. Cần mạng.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  const lesson = lessons[index];
  useEffect(() => {
    if (!lesson) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetchKanjiByLesson(lesson.lessonNumber)
      .then((data) => alive && setItems(data))
      .catch(() => alive && setError(`Không tải được kanji ${lesson.label}.`))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [lesson, reloadKey]);

  return (
    <View style={styles.screen}>
      <View style={styles.picker}>
        <Pressable
          accessibilityLabel="Bài trước"
          disabled={index === 0}
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
          style={[styles.navBtn, index === 0 && styles.disabled]}
        >
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.lessonLabel} numberOfLines={1}>
          {lesson ? `${lesson.label} (${lesson.count} chữ)` : '—'}
        </Text>
        <Pressable
          accessibilityLabel="Bài sau"
          disabled={index >= lessons.length - 1}
          onPress={() => setIndex((i) => Math.min(lessons.length - 1, i + 1))}
          style={[styles.navBtn, index >= lessons.length - 1 && styles.disabled]}
        >
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.message}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => (lessons.length ? setReloadKey((k) => k + 1) : loadLessons())}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator style={styles.center} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(k) => String(k.id)}
          contentContainerStyle={styles.list}
          ListFooterComponent={items.some((k) => k.meaningEn) ? <KanjidicAttribution /> : null}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.char}>{item.character}</Text>
              <View style={styles.info}>
                {item.hanViet ? <Text style={styles.hanViet}>{item.hanViet}</Text> : null}
                {item.meaningVi ? <Text>{item.meaningVi}</Text> : null}
                {item.meaningEn ? (
                  <View style={styles.enRow}>
                    <Text style={styles.en}>EN  </Text>
                    <SpeakEnglishText text={item.meaningEn} style={styles.en} />
                  </View>
                ) : null}
                {item.onyomi ? <Text style={styles.reading}>On: {item.onyomi}</Text> : null}
                {item.kunyomi ? <Text style={styles.reading}>Kun: {item.kunyomi}</Text> : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  picker: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 24, color: '#2563eb' },
  disabled: { opacity: 0.35 },
  lessonLabel: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  list: { padding: 16, paddingTop: 4, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 16 },
  char: { fontSize: 44, color: '#dc2626' },
  info: { flex: 1, gap: 2 },
  hanViet: { fontWeight: '700' },
  en: { fontSize: 12, color: '#6b7280' },
  enRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  reading: { fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { textAlign: 'center', color: '#6b7280', marginBottom: 12 },
  retry: { backgroundColor: '#2563eb', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
});
