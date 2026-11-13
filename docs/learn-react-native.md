# React Native qua app nihongo-mobile: màn hình, điều hướng, SQLite offline và test

> **Mục tiêu:** Học xong bài này bạn làm được:
> - Chạy app [apps/nihongo-mobile](../apps/nihongo-mobile) trên máy ảo Android và chạy test của nó.
> - Đọc một màn hình React Native và chỉ ra chỗ khác với React trên web.
> - Giải thích dữ liệu từ vựng đi từ API vào SQLite trên máy rồi lên màn hình, và vì sao app vẫn chạy khi mất mạng.
> - Sửa một màn hình hoặc một hàm, viết test, và cố tình làm hỏng để thấy test bắt lỗi.
>
> **Cần biết trước:** [learn-react.md](./learn-react.md) (component, state, effect, hook). [run-mobile.md](./run-mobile.md) cho phần cài Android Studio và máy ảo.
>
> **Thời gian:** khoảng 6–8 giờ, chia 3–4 buổi.

Bài này là đường đi ngắn, bám sát code của app Expo trong project. Học tiếp theo thứ tự:

- **Quản lý state, Redux, gọi API, form, test:** dùng y nguyên kiến thức ở [learn-react-build-app.md](./learn-react-build-app.md) và [learn-redux-state.md](./learn-redux-state.md) — React Query, Redux Toolkit, Zustand, zod chạy giống hệt trên React Native (khác biệt nằm ở [learn-redux-state.md](./learn-redux-state.md) mục 10).
- **Làm một màn hình mới từ đầu đến cuối** trong chính app này (Sổ từ của tôi: đăng nhập, gọi API, form, danh sách, test, chạy máy ảo): [learn-react-native-build-app.md](./learn-react-native-build-app.md).
- **React Native CLI và code native Kotlin/Swift:** [learn-react-native-native-code.md](./learn-react-native-native-code.md) — tạo app CLI, tự viết Turbo Module, chạy thật trên Android và iOS.
- Lộ trình dài theo chiều rộng (animation, release, OTA): [roadmap-react-native.md](./roadmap-react-native.md); câu hỏi phỏng vấn: [interview-react-native-senior.md](./interview-react-native-senior.md).

**Phiên bản đang dùng:** Expo SDK 57, React Native 0.86, React 19.3, expo-router 57, expo-sqlite 57, Vitest 3. Kết quả lệnh trong bài đã được chạy thử ngày 12/11/2026.

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| React Native (RN) | Viết app di động bằng React. Component vẽ ra **view thật** của Android/iOS, không phải HTML. |
| Expo | Bộ công cụ quanh RN: build, thư viện camera/SQLite/giọng nói, cấu hình trong `app.json`. |
| Dev build | Bản app tự build bằng `expo run:android`, chứa đủ code native project cần (camera, ML Kit, Stripe). |
| Metro | Chương trình gói code JavaScript và gửi sang app khi đang phát triển (giống `next dev` của web). |
| expo-router | Điều hướng theo file: `app/vocab.tsx` là màn `/vocab`. |
| `View`, `Text`, `Pressable` | Khối cơ bản thay cho `div`, chữ, `button` trên web. |
| `StyleSheet` | Viết style bằng object JavaScript, không có file CSS. |
| `FlatList` | Danh sách dài chỉ vẽ những dòng đang nhìn thấy. |
| SQLite | Cơ sở dữ liệu nằm trong một file trên điện thoại. |
| Offline-first | Màn hình luôn đọc từ DB trên máy; mạng chỉ dùng để cập nhật DB. |
| Hàng đợi sync | Bảng `sync_queue` giữ các thay đổi chưa gửi lên server, gửi khi có mạng. |

## 1. Vì sao có app React Native trong project

Project có 4 app mobile làm cùng tính năng (Android Kotlin, iOS Swift, Flutter, React Native) để so sánh. Bản React Native cho thấy một điều quan trọng: **nếu đã biết React thì đã biết một nửa**. `useState`, `useEffect`, custom hook, props… y hệt bài [learn-react.md](./learn-react.md). Khác nhau nằm ở ba chỗ:

1. Không có HTML/CSS: dùng `View`, `Text`, `StyleSheet`.
2. Điều hướng giữa màn hình thay cho URL trên thanh địa chỉ.
3. Điện thoại hay mất mạng, nên dữ liệu phải lưu trên máy (SQLite).

## 2. Chạy test và typecheck trước

Ở thư mục gốc repo:

```bash
cd apps/nihongo-mobile
npm install
npm run typecheck    # tsc --noEmit: không in gì nghĩa là không có lỗi kiểu
npm run test:run     # vitest run
```

Kết quả đúng:

```
 Test Files  8 passed (8)
      Tests  40 passed (40)
```

Test ở đây là test **logic thuần** (tính lịch ôn SRS, tách furigana, Trie tra romaji…) chạy bằng Vitest trên Node, không cần máy ảo. Đó là lựa chọn có chủ ý: phần khó sai nhất được tách khỏi giao diện để test nhanh.

## 3. Chạy app trên máy ảo Android

Cần backend đang chạy (`docker compose up -d` ở thư mục gốc, xem [run-local.md](./run-local.md)) và một máy ảo Android đang bật (xem [run-mobile.md](./run-mobile.md)).

```bash
npx expo run:android --port 8082
```

- Lần đầu mất vài phút để build phần native. Những lần sau chỉ Metro gói lại JavaScript.
- `--port 8082`: trên máy dev, cổng mặc định 8081 thường đã bị container khác chiếm. Báo lỗi `Port 8081 is being used` thì đây là cách sửa.
- Không dùng **Expo Go**: app có camera + ML Kit + Stripe, Expo Go không chứa các thư viện native đó.
- Báo lỗi cài đặt vì trùng `com.edu.nihongo`: app Android Kotlin dùng cùng package id. Gỡ app kia khỏi máy ảo rồi chạy lại.

App gọi backend ở đâu? Xem [app.json](../apps/nihongo-mobile/app.json) phần `extra`:

```json
"apiBaseUrl": "http://10.0.2.2:3000/api",
```

`10.0.2.2` là địa chỉ đặc biệt: từ trong máy ảo Android, nó trỏ về máy tính của bạn. Dùng `localhost` thì máy ảo sẽ gọi chính nó và không thấy backend. Chạy trên điện thoại thật thì đổi thành IP LAN của máy tính.

## 4. Điều hướng: mỗi file là một màn hình

Thư mục [app/](../apps/nihongo-mobile/app) chính là bản đồ màn hình:

```
app/_layout.tsx      ← khung chung: thanh tiêu đề, danh sách màn
app/index.tsx        ← màn chính (danh sách thẻ tính năng)
app/vocab.tsx        ← /vocab
app/vocab-search.tsx ← /vocab-search
app/live/viewer.tsx  ← /live/viewer
```

Mở [app/_layout.tsx](../apps/nihongo-mobile/app/_layout.tsx):

```tsx
<Stack screenOptions={{ headerTintColor: '#1d4ed8' }}>
  <Stack.Screen name="index" options={{ title: 'Nihongo — EDU APP' }} />
  <Stack.Screen name="vocab" options={{ title: 'Từ vựng' }} />
  <Stack.Screen name="srs" options={{ title: 'Ôn tập SRS' }} />
  ...
</Stack>
```

`Stack` là kiểu điều hướng **chồng thẻ**: mở màn mới thì đặt lên trên, bấm nút Back thì lấy ra. `name` khớp với tên file, `title` là chữ trên thanh tiêu đề.

Cùng file có:

```tsx
useEffect(() => {
  void setupPushNotifications(() => router.push('/srs'));
}, []);
```

Mảng phụ thuộc rỗng `[]`: chỉ chạy một lần khi app mở. Khi người dùng bấm thông báo "đến giờ ôn", `router.push('/srs')` mở màn ôn tập — đi bằng code thay vì bấm link.

## 5. Một màn hình RN: danh sách từ vựng

Mở [app/vocab.tsx](../apps/nihongo-mobile/app/vocab.tsx). Phần state và effect giống hệt web:

```tsx
const [items, setItems] = useState<Vocabulary[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const load = useCallback(async () => {
  try {
    setLoading(true);
    await syncLesson(lessonNumber);              // 1. thử tải từ server vào SQLite
    const list = await getVocabByLesson(lessonNumber);
    setItems(list);
    setError(null);
  } catch (e) {
    const list = await getVocabByLesson(lessonNumber);  // 2. lỗi mạng: vẫn đọc dữ liệu cũ trên máy
    setItems(list);
    setError(e instanceof Error ? e.message : 'Lỗi sync');
  } finally {
    setLoading(false);
  }
}, [lessonNumber]);

useEffect(() => {
  load();
}, [load]);
```

Để ý nhánh `catch`: mất mạng thì `syncLesson` ném lỗi, nhưng màn hình **vẫn đọc từ SQLite** và hiện những gì đã tải lần trước. Đó là offline-first ở mức màn hình.

`useCallback` giữ cho hàm `load` không bị tạo mới mỗi lần vẽ. Không có nó, `load` đổi mỗi lần vẽ → effect `[load]` chạy lại → `setItems` → vẽ lại → lặp vô tận.

Phần giao diện là chỗ khác web:

```tsx
<FlatList
  data={items}
  keyExtractor={(item) => String(item.id)}
  renderItem={({ item }) => (
    <Pressable style={styles.card} onPress={() => speakJapanese(item.kana)}>
      <Text style={styles.meaning}>{item.meaning}</Text>
      ...
    </Pressable>
  )}
/>
```

| Web (React DOM) | React Native | Ghi chú |
|---|---|---|
| `<div>` | `<View>` | Khung chứa |
| `<span>`, `<p>` | `<Text>` | **Mọi chữ phải nằm trong `<Text>`**, đặt chữ trần trong `View` là lỗi |
| `<button onClick>` | `<Pressable onPress>` | Chạm thay cho click |
| `items.map(...)` | `<FlatList data renderItem>` | Bài có 50 từ: chỉ vẽ dòng đang thấy, cuộn mượt |
| `className` + CSS | `style={styles.card}` | Style là object; mặc định `flexDirection: 'column'` |

Style ở cuối file:

```tsx
const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  meaning: { color: '#6b7280', marginTop: 4 },
});
```

Không có đơn vị `px`: số là "điểm" độc lập mật độ điểm ảnh, máy nào cũng trông gần bằng nhau.

## 6. Dữ liệu offline: API → SQLite → màn hình

Luồng đầy đủ khi mở màn từ vựng:

```
app/vocab.tsx  ──syncLesson──▶  src/data/repository.ts  ──fetchAllVocabForLesson──▶  API /api/vocabularies
      │                                  │
      │                                  └── INSERT … ON CONFLICT DO UPDATE ──▶ SQLite (edu_app.db)
      └──getVocabByLesson──▶ SELECT * FROM vocabulary WHERE lesson_number = ? ◀───────┘
```

**Mở DB và tạo bảng** — [src/data/database.ts](../apps/nihongo-mobile/src/data/database.ts):

```ts
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('edu_app.db');
      await initSchema(db);   // CREATE TABLE IF NOT EXISTS vocabulary, srs_card, sync_queue
      await migrate(db);      // thêm cột mới cho máy đã cài bản cũ
      return db;
    })();
  }
  return dbPromise;
}
```

`dbPromise` được giữ lại để mọi nơi dùng chung **một** kết nối, dù nhiều màn hình gọi `getDatabase()` cùng lúc.

`CREATE TABLE IF NOT EXISTS` không thêm cột vào bảng đã có trên máy cũ. Vì thế có `migrate()`: đọc `PRAGMA user_version` (con số phiên bản lưu trong file DB), chạy các câu `ALTER TABLE` còn thiếu trong một transaction, rồi tăng `user_version`. Danh sách câu nằm trong `vocabMigrations` ở [src/utils/furigana.ts](../apps/nihongo-mobile/src/utils/furigana.ts), có test riêng.

**Ghi dữ liệu tải về** — `syncLesson` ở [src/data/repository.ts](../apps/nihongo-mobile/src/data/repository.ts#L197):

```ts
const net = await NetInfo.fetch();
if (!net.isConnected) throw new Error('Không có mạng');
const remote = await fetchAllVocabForLesson(lessonNumber);
await db.withTransactionAsync(async () => {
  for (...) {
    await db.runAsync(`INSERT INTO vocabulary (...) VALUES (...)
                       ON CONFLICT(id) DO UPDATE SET meaning = excluded.meaning, ...`, [...]);
    await ensureSrsCard(dto.id);
  }
});
if (await isLoggedIn()) {
  await flushSyncQueue();
}
```

- `ON CONFLICT(id) DO UPDATE`: từ đã có thì cập nhật, chưa có thì thêm (upsert). Mở bài lần hai không bị nhân đôi.
- `withTransactionAsync`: 50 câu ghi chạy như một khối, lỗi giữa chừng thì không ghi gì — DB không bị lưng chừng.
- Cuối cùng, nếu đã đăng nhập, `flushSyncQueue()` gửi các kết quả ôn tập làm lúc offline lên server.

**Ghi khi offline** — chấm điểm một thẻ SRS gọi `updateSrsCard`: cập nhật `srs_card` với `sync_status = 'pending'` và thêm một dòng vào `sync_queue`. Không cần mạng. Lần sau có mạng, `flushSyncQueue` đọc hàng đợi, gửi một lần, rồi xóa các dòng đã gửi.

Muốn biết máy đang có mạng không ngay trong giao diện, dùng hook [src/hooks/useOnline.ts](../apps/nihongo-mobile/src/hooks/useOnline.ts): đăng ký `NetInfo.addEventListener` trong `useEffect` và **hủy đăng ký** trong hàm dọn dẹp — đúng mẫu bạn đã gặp ở `useDebouncedValue`.

## 7. Tra từ offline: tránh setState khi màn đã đóng

[app/vocab-search.tsx](../apps/nihongo-mobile/app/vocab-search.tsx) đọc mọi từ trong SQLite một lần, dựng cây Trie theo romaji, mỗi lần gõ chỉ tìm trong bộ nhớ:

```tsx
useEffect(() => {
  let cancelled = false;
  getAllVocab()
    .then((all) => {
      const next = new RomajiTrie<Vocabulary>();
      all.forEach((v) => next.insert(v.romaji, v));
      if (!cancelled) setTrie(next);
    });
  return () => {
    cancelled = true; // rời màn trước khi đọc xong: không setState trên màn đã đóng
  };
}, []);

const results = useMemo(() => trie?.search(query, RESULT_LIMIT) ?? [], [trie, query]);
```

- Biến `cancelled` + hàm dọn dẹp: người dùng bấm Back khi DB chưa đọc xong thì kết quả bị bỏ qua, không cập nhật một màn đã biến mất.
- `useMemo`: chỉ tìm lại khi `trie` hoặc `query` đổi, không tìm lại ở mỗi lần vẽ.
- Không gọi API khi gõ, nên không cần debounce như bản web — dữ liệu đã nằm trên máy.

## 8. Test logic và cố tình làm hỏng

Thuật toán lịch ôn SM-2 nằm trong [src/utils/srs.ts](../apps/nihongo-mobile/src/utils/srs.ts), tách khỏi màn hình nên test được bằng Vitest:

```ts
if (q < 3) {        // nhớ sai: học lại từ đầu
  reps = 0;
  interval = 1;
} else { ... }
```

Chạy test:

```bash
npx vitest run src/utils/srs.test.ts
```

```
 ✓ src/utils/srs.test.ts (8 tests)
      Tests  8 passed (8)
```

**Làm hỏng:** đổi `if (q < 3) {` thành `if (q < 2) {` rồi chạy lại:

```
 FAIL  src/utils/srs.test.ts > calculateNextReview (SM-2) > resets on quality < 3
AssertionError: expected 5 to be +0 // Object.is equality
      Tests  1 failed | 7 passed (8)
```

Chấm điểm 2 ("nhớ mang máng") lẽ ra phải học lại, nhưng code mới cho tiếp tục tăng số lần nhớ lên 5. Test bắt được trước khi người dùng thấy thẻ biến mất khỏi hàng ôn. Trả lại code:

```bash
git checkout -- src/utils/srs.ts
```

Bài học: **đẩy logic ra hàm thuần** (nhận vào, trả ra, không đụng DB hay giao diện) thì test vừa nhanh vừa chắc. Các file `*.test.ts` khác trong `src/` theo cùng cách.

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `Text strings must be rendered within a <Text> component` | Đặt chữ trần trong `<View>` | Bọc chữ bằng `<Text>` |
| App mở nhưng mọi màn báo lỗi mạng | Dùng `localhost` trong máy ảo, hoặc backend chưa chạy | Dùng `10.0.2.2` (máy ảo) hoặc IP LAN (máy thật); kiểm `curl http://localhost:3000/health` trên máy tính |
| `Port 8081 is being used by another process` | Container khác chiếm cổng Metro mặc định | `npx expo run:android --port 8082` |
| Cài app báo xung đột chữ ký/package | Đã cài app Kotlin cùng `com.edu.nihongo` | Gỡ app cũ khỏi máy ảo |
| Camera/dịch camera không chạy trong Expo Go | Expo Go không có ML Kit, Stripe | Dùng dev build `expo run:android` |
| Thêm cột vào bảng mà máy đã cài bản cũ báo `no such column` | `CREATE TABLE IF NOT EXISTS` không đổi bảng có sẵn | Thêm câu `ALTER TABLE` vào `vocabMigrations` và tăng phiên bản |
| Effect chạy liên tục, máy nóng | Hàm trong mảng phụ thuộc bị tạo mới mỗi lần vẽ | Bọc hàm bằng `useCallback` như `load` trong `vocab.tsx` |

## Tự kiểm tra

1. Ba điểm nào khác nhau giữa React trên web và React Native?
<details><summary>Đáp án</summary>Không có HTML/CSS (dùng `View`/`Text`/`StyleSheet`); điều hướng bằng stack màn hình thay cho URL; cần lưu dữ liệu trên máy vì hay mất mạng.</details>

2. Vì sao `apiBaseUrl` trong máy ảo là `10.0.2.2` chứ không phải `localhost`?
<details><summary>Đáp án</summary>Trong máy ảo Android, `localhost` là chính máy ảo. `10.0.2.2` là địa chỉ máy ảo dùng để gọi về máy tính chạy nó.</details>

3. Mất mạng khi mở màn từ vựng, người dùng thấy gì?
<details><summary>Đáp án</summary>Những từ đã tải lần trước (đọc từ SQLite trong nhánh `catch`), kèm thông báo lỗi. Chưa từng tải thì thấy "Chưa có từ vựng. Cần mạng để sync lần đầu."</details>

4. `ON CONFLICT(id) DO UPDATE` giải quyết vấn đề gì?
<details><summary>Đáp án</summary>Mở lại một bài thì cập nhật từ đã có thay vì báo trùng khóa hoặc thêm bản sao.</details>

5. Ôn tập lúc offline thì kết quả đi đâu, khi nào lên server?
<details><summary>Đáp án</summary>Vào `srs_card` (trạng thái `pending`) và bảng `sync_queue`. Lần sau `syncLesson` chạy khi có mạng và đã đăng nhập, `flushSyncQueue` gửi lên rồi xóa khỏi hàng đợi.</details>

6. Biến `cancelled` trong `vocab-search.tsx` để làm gì?
<details><summary>Đáp án</summary>Rời màn trước khi đọc DB xong thì không gọi `setTrie` trên màn đã đóng.</details>

## Bài tập

1. **Đổi bài học:** `app/vocab.tsx` đang cố định `lessonNumber = 1`. Thêm hai nút "Bài trước"/"Bài sau" bằng `Pressable` và `useState`. Tự kiểm: bấm "Bài sau" thì danh sách đổi; tắt mạng máy ảo, quay lại bài 1 vẫn thấy từ.
2. **Hiện trạng thái mạng:** dùng `useOnline()` để hiện dòng "Đang offline" phía trên danh sách. Tự kiểm: bật chế độ máy bay trên máy ảo thì dòng chữ hiện, tắt thì mất.
3. **Hàm thuần + test:** viết `formatLessonTitle(n: number): string` trong `src/utils/` trả về `"Bài 1"`, kèm file `.test.ts`. Tự kiểm: `npm run test:run` báo 9 file test qua.
4. **Làm hỏng có chủ đích:** trong `useOnline.ts`, xóa dòng `return () => unsub();`. Giải thích chuyện gì xảy ra khi mở/đóng màn đó nhiều lần (gợi ý: số listener). Trả lại bằng `git checkout -- src/hooks/useOnline.ts`.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **9. Mobile** — bài 11/16.

- Bài trước: [learn-flutter.md](./learn-flutter.md) — Lộ trình 8 tuần học Flutter từ code thật của nihongo_flutter
- **Bài tiếp: [learn-react-native-build-app.md](./learn-react-native-build-app.md)** — Làm một màn hình Expo trọn vẹn (Sổ từ của tôi): gọi API qua axios, đăng nhập, danh sách, form, test, chạy trên máy ảo

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
