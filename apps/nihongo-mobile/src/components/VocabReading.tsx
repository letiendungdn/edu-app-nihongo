import { StyleSheet, Text, View } from 'react-native';

import type { FuriganaSegment } from '../utils/furigana';

/**
 * Kanji có furigana nhỏ phía trên. React Native không có <ruby> nên tự vẽ: cách đọc đặt tuyệt đối phía trên chữ,
 * được tràn sang hai bên mà KHÔNG làm chữ rộng ra (わたし rộng hơn 私 sẽ đẩy thành "私 たち" có khoảng trống).
 */
export function FuriganaText({
  segments,
  fallback,
  fontSize = 18,
}: {
  segments: FuriganaSegment[];
  fallback: string;
  fontSize?: number;
}) {
  if (segments.length === 0) {
    return <Text style={[styles.word, { fontSize }]}>{fallback}</Text>;
  }
  const rubySize = Math.max(fontSize * 0.5, 9);
  const rubyLine = rubySize + 2;
  return (
    <View
      style={[styles.row, { paddingTop: rubyLine }]}
      testID="furigana"
      accessible
      accessibilityLabel={segments.map(([t]) => t).join('')}
    >
      {segments.map(([text, ruby], i) => (
        <View key={i}>
          {ruby ? (
            <Text
              numberOfLines={1}
              style={[styles.ruby, { fontSize: rubySize, lineHeight: rubyLine, top: -rubyLine }]}
            >
              {ruby}
            </Text>
          ) : null}
          <Text style={[styles.word, { fontSize }]}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

/** Âm Hán Việt + nghĩa tiếng Anh; nguồn "ai" thì có nhãn "dịch máy". Không có gì thì không vẽ. */
export function VocabExtraMeanings({
  hanViet,
  meaningEn,
  source,
}: {
  hanViet?: string | null;
  meaningEn?: string | null;
  source?: string | null;
}) {
  if (!hanViet && !meaningEn) return null;
  return (
    <View style={styles.extra}>
      {hanViet ? <Text style={styles.hanViet}>{hanViet}</Text> : null}
      {meaningEn ? (
        <View style={styles.enRow}>
          <Text style={styles.enTag}>EN</Text>
          <Text style={styles.en}>{meaningEn}</Text>
          {source === 'ai' ? <Text style={styles.ai}>dịch máy</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

/** Giấy phép CC BY-SA 4.0 của JMdict yêu cầu ghi nguồn nơi hiển thị dữ liệu. */
export function JmdictAttribution() {
  return <Text style={styles.attribution}>Nghĩa tiếng Anh: JMdict © EDRDG, CC BY-SA 4.0 (edrdg.org)</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  // Tuyệt đối + tràn trái/phải: không tính vào bề rộng của chữ
  ruby: { position: 'absolute', left: -100, right: -100, textAlign: 'center', color: '#6b7280' },
  word: { fontWeight: '600' },
  extra: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 2, marginTop: 2 },
  hanViet: { fontSize: 12, fontWeight: '600' },
  enRow: { flexDirection: 'row', alignItems: 'center', columnGap: 4, flexShrink: 1 },
  enTag: { fontSize: 10, fontWeight: '700', color: '#2563eb' },
  en: { fontSize: 12, flexShrink: 1 },
  ai: {
    fontSize: 10,
    color: '#b45309',
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderRadius: 999,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  attribution: { fontSize: 11, color: '#6b7280', textAlign: 'center', paddingVertical: 8 },
});
