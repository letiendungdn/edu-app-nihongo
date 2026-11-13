import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { isLoggedIn } from '../src/data/api';
import { createPersonalWord, deletePersonalWord, fetchPersonalWords, type PersonalWord } from '../src/data/personalWords';
import { personalWordErrorMessage, validatePersonalWord, type PersonalWordErrors } from '../src/utils/personalWord';

const LESSONS = [undefined, 1, 2, 3, 6] as const;

/** Sổ từ vựng cá nhân. Bài học: docs/learn-react-native-build-app.md */
export default function MyWordsScreen() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null); // null = đang đọc token
  const [lesson, setLesson] = useState<number | undefined>(undefined);
  const [words, setWords] = useState<PersonalWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [kana, setKana] = useState('');
  const [meaning, setMeaning] = useState('');
  const [lessonInput, setLessonInput] = useState('1');
  const [formErrors, setFormErrors] = useState<PersonalWordErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);

  // Quay lại màn này (vd sau khi đăng nhập) → kiểm lại trạng thái đăng nhập
  useFocusEffect(
    useCallback(() => {
      void isLoggedIn().then(setLoggedIn);
    }, []),
  );

  const load = useCallback(async (pullToRefresh = false) => {
    const id = ++requestId.current; // đổi bộ lọc nhanh: chỉ nhận kết quả của lần gọi mới nhất
    if (pullToRefresh) setRefreshing(true);
    try {
      const page = await fetchPersonalWords(lesson);
      if (id === requestId.current) {
        setWords(page.data);
        setError(null);
      }
    } catch (e) {
      if (id === requestId.current) setError(personalWordErrorMessage(e));
    } finally {
      if (id === requestId.current) setRefreshing(false);
    }
  }, [lesson]);

  useEffect(() => {
    if (loggedIn) void load();
  }, [loggedIn, load]);

  const onAdd = async () => {
    const errors = validatePersonalWord(kana, meaning, lessonInput);
    setFormErrors(errors);
    setServerError(null);
    if (Object.keys(errors).length > 0 || saving) return;
    setSaving(true);
    try {
      await createPersonalWord({ kana: kana.trim(), meaning: meaning.trim(), lesson: Number(lessonInput) });
      setKana('');
      setMeaning('');
      await load();
    } catch (e) {
      setServerError(personalWordErrorMessage(e)); // giữ nguyên chữ đã nhập để sửa
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (w: PersonalWord) =>
    Alert.alert('Xóa từ', `Xóa "${w.kana}" khỏi sổ?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          const before = words;
          setWords((ws) => ws?.filter((x) => x.id !== w.id) ?? ws); // lạc quan: biến mất ngay
          try {
            await deletePersonalWord(w.id);
          } catch (e) {
            setWords(before); // lỗi: trả lại
            Alert.alert('Không xóa được', personalWordErrorMessage(e));
          }
        },
      },
    ]);

  if (loggedIn === null) return <ActivityIndicator style={styles.center} />;
  if (!loggedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Đăng nhập để lưu từ vựng của riêng bạn.</Text>
        <Pressable style={styles.button} onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Đăng nhập</Text>
        </Pressable>
      </View>
    );
  }

  return (
    // Expo SDK 57+ vẽ tràn màn hình trên Android: "padding" cho CẢ HAI nền tảng, không thì bàn phím che form
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={styles.form}>
        <TextInput accessibilityLabel="Cách đọc" placeholder="Cách đọc (たべます)" value={kana} onChangeText={setKana}
          style={[styles.input, formErrors.kana && styles.inputError]} autoCapitalize="none" />
        {formErrors.kana ? <Text style={styles.error}>{formErrors.kana}</Text> : null}
        <TextInput accessibilityLabel="Nghĩa" placeholder="Nghĩa (ăn)" value={meaning} onChangeText={setMeaning}
          style={[styles.input, formErrors.meaning && styles.inputError]} />
        {formErrors.meaning ? <Text style={styles.error}>{formErrors.meaning}</Text> : null}
        <TextInput accessibilityLabel="Bài" placeholder="Bài" value={lessonInput} onChangeText={setLessonInput}
          keyboardType="number-pad" style={[styles.input, formErrors.lesson && styles.inputError]} />
        {formErrors.lesson ? <Text style={styles.error}>{formErrors.lesson}</Text> : null}
        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
        <Pressable accessibilityLabel="Thêm vào sổ" style={[styles.button, saving && styles.disabled]} onPress={onAdd} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Đang lưu…' : 'Thêm vào sổ'}</Text>
        </Pressable>
      </View>

      <View style={styles.chips}>
        {LESSONS.map((l) => (
          <Pressable key={l ?? 'all'} onPress={() => setLesson(l)} style={[styles.chip, lesson === l && styles.chipOn]}>
            <Text style={lesson === l ? styles.chipTextOn : undefined}>{l ? `Bài ${l}` : 'Tất cả'}</Text>
          </Pressable>
        ))}
      </View>

      {words === null && !error ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void load()}><Text style={styles.link}>Thử lại</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={words}
          keyExtractor={(w) => String(w.id)}
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.muted}>Chưa có từ nào{lesson ? ` trong bài ${lesson}` : ''}.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onLongPress={() => confirmDelete(item)}>
              <Text style={styles.kana}>{item.kana}</Text>
              <Text style={styles.muted}>{item.meaning} · Bài {item.lesson}</Text>
            </Pressable>
          )}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  form: { padding: 16, gap: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fff' },
  inputError: { borderColor: '#dc2626' },
  error: { color: '#dc2626' },
  button: { backgroundColor: '#1d4ed8', padding: 12, borderRadius: 8, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
  chipOn: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  chipTextOn: { color: '#fff' },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb' },
  kana: { fontSize: 20 },
  muted: { color: '#6b7280', textAlign: 'center' },
  link: { color: '#1d4ed8' },
});
