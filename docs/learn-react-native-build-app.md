# Làm một màn hình React Native (Expo) từ đầu đến cuối: đăng nhập, gọi API, form, danh sách, test

> **Mục tiêu:** Học xong bài này bạn tự làm được một màn hình có dữ liệu thật trên điện thoại — cho app này hay bất kỳ app React Native nào:
> - Thêm route expo-router và thẻ vào màn chính.
> - Gọi API qua lớp axios có sẵn (token, phong bì `{ success, data }`), đọc đúng câu lỗi của server.
> - Xử lý chưa đăng nhập: mời đăng nhập, quay lại thì tự tải.
> - Danh sách có kéo xuống tải lại, lọc, xóa có hộp xác nhận và trả lại khi lỗi; form không bị bàn phím che.
> - Tách logic thành hàm thuần có test; kiểm màn hình trên máy ảo bằng `adb`.
>
> **Cần biết trước:** [learn-react-native.md](./learn-react-native.md) (chạy app, View/Text/FlatList, offline SQLite). API của tính năng: [learn-nestjs-build-api.md](./learn-nestjs-build-api.md). Bản web của cùng tính năng: [learn-react-build-app.md](./learn-react-build-app.md).
>
> **Thời gian:** khoảng 8–10 giờ, chia 4 buổi.

Tính năng làm mẫu: màn **"Sổ từ của tôi"** trong app Expo [apps/nihongo-mobile](../apps/nihongo-mobile) — cùng API `/api/personal-words` với web và app Android, nên từ thêm ở đâu cũng thấy ở các nơi khác.

| Phần | File |
|---|---|
| Màn hình | [app/my-words.tsx](../apps/nihongo-mobile/app/my-words.tsx) |
| Gọi API | [src/data/personalWords.ts](../apps/nihongo-mobile/src/data/personalWords.ts) (dùng `api` của [src/data/api.ts](../apps/nihongo-mobile/src/data/api.ts)) |
| Hàm thuần + test | [src/utils/personalWord.ts](../apps/nihongo-mobile/src/utils/personalWord.ts), [personalWord.test.ts](../apps/nihongo-mobile/src/utils/personalWord.test.ts) |
| Route, thẻ màn chính | [app/_layout.tsx](../apps/nihongo-mobile/app/_layout.tsx), [app/index.tsx](../apps/nihongo-mobile/app/index.tsx) |

Đã chạy thật 13/11/2026 trên máy ảo Android `pixel_api_35` với gateway thật: hết các luồng ở mục 8. Test: 9 file / 45 test Vitest qua, `typecheck` sạch.

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| expo-router | Điều hướng theo file: `app/my-words.tsx` là màn `/my-words`. |
| Dev build | App debug tự build (`expo run:android`), chứa đủ thư viện native app cần. App này không chạy trong Expo Go. |
| Metro | Server gói JS gửi vào app khi dev; sửa file TS là app tự nạp lại. |
| axios interceptor | Hàm chạy trước/sau mọi request của axios: gắn token, mở phong bì. |
| SecureStore | Kho bí mật của hệ điều hành (Keychain/Keystore) — nơi app lưu token. |
| `useFocusEffect` | Chạy lại mỗi lần màn hình được **quay lại** (khác `useEffect` chỉ chạy khi màn được tạo). |
| Optimistic update | Đổi màn hình trước khi server trả lời; lỗi thì trả lại. |
| Edge-to-edge | App vẽ tràn màn hình; Android không tự co màn khi bàn phím hiện. |

## 1. Đọc lớp gọi API có sẵn trước

[src/data/api.ts](../apps/nihongo-mobile/src/data/api.ts) tạo **một** client axios cho cả app:

```ts
client.interceptors.request.use(async (config) => {
  const token = await getAccessToken();          // SecureStore
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use((res) => {
  res.data = unwrapEnvelope(res.data);           // { success, data } → data
  return res;
});
```

Hàm của tính năng không phải lo token hay phong bì — [src/data/personalWords.ts](../apps/nihongo-mobile/src/data/personalWords.ts):

```ts
export async function fetchPersonalWords(lesson?: number): Promise<PersonalWordPage> {
  const res = await api.get<PersonalWordPage>('/personal-words', { params: { lesson, limit: 200 } });
  return res.data;
}

export async function createPersonalWord(word: Omit<PersonalWord, 'id'>): Promise<PersonalWord> {
  const res = await api.post<PersonalWord>('/personal-words', word);
  return res.data;
}

export async function deletePersonalWord(id: number): Promise<void> {
  await api.delete(`/personal-words/${id}`);
}
```

`params: { lesson: undefined }` — axios **bỏ** tham số `undefined`, không gửi `?lesson=undefined`.

Địa chỉ API: `apiBaseUrl` trong [app.json](../apps/nihongo-mobile/app.json) là `http://10.0.2.2:3000/api` — từ máy ảo Android, `10.0.2.2` là máy tính của bạn ([learn-react-native.md](./learn-react-native.md) mục 3).

## 2. Hàm thuần: kiểm dữ liệu và đọc câu lỗi

Tách logic khỏi màn hình để test bằng Vitest trên Node — cách app này test mọi thứ ([learn-react-native.md](./learn-react-native.md) mục 8). [src/utils/personalWord.ts](../apps/nihongo-mobile/src/utils/personalWord.ts):

```ts
export function validatePersonalWord(kana: string, meaning: string, lesson: string): PersonalWordErrors {
  const errors: PersonalWordErrors = {};
  const k = kana.trim();
  if (!k) errors.kana = 'Nhập cách đọc';
  else if (!/^[぀-ヿ]+$/.test(k)) errors.kana = 'Chỉ dùng hiragana hoặc katakana';
  if (!meaning.trim()) errors.meaning = 'Nhập nghĩa';
  else if (meaning.trim().length > 100) errors.meaning = 'Nghĩa tối đa 100 ký tự';
  const n = Number(lesson);
  if (!Number.isInteger(n) || n < 1 || n > 50) errors.lesson = 'Bài từ 1 tới 50';
  return errors;
}

export function personalWordErrorMessage(e: unknown): string {
  const err = e as { response?: { status?: number; data?: { error?: { message?: string } } } };
  if (err?.response) {
    return err.response.data?.error?.message ?? `Lỗi máy chủ (HTTP ${err.response.status})`;
  }
  return 'Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ API.';
}
```

- Cùng luật với DTO của gateway và schema của web: app kiểm để người dùng sửa nhanh, server vẫn kiểm lại.
- axios ném lỗi có `response` khi server trả 4xx/5xx; câu lỗi của gateway nằm ở `response.data.error.message` (`"Từ này đã có trong sổ"`). **Không** có `response` nghĩa là không tới được server. Interceptor mở phong bì chỉ chạy với response **thành công**, nên lỗi phải đọc phong bì bằng tay.

[personalWord.test.ts](../apps/nihongo-mobile/src/utils/personalWord.test.ts) có 5 test: hợp lệ, sai mọi trường, bài không phải số nguyên, đọc phong bì lỗi 409, lỗi mạng.

## 3. Màn hình: chưa đăng nhập, quay lại sau đăng nhập

[app/my-words.tsx](../apps/nihongo-mobile/app/my-words.tsx):

```tsx
const [loggedIn, setLoggedIn] = useState<boolean | null>(null); // null = đang đọc token

useFocusEffect(
  useCallback(() => {
    void isLoggedIn().then(setLoggedIn);
  }, []),
);

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
```

- **Ba trạng thái** (`null`/`false`/`true`): đọc token là bất đồng bộ; không có `null` thì người đã đăng nhập thấy nháy lời mời.
- **`useFocusEffect`**, không phải `useEffect`: màn đăng nhập của app làm `router.back()` khi xong — màn Sổ từ **không** được tạo lại, chỉ được quay lại. `useEffect(…, [])` không chạy lần nữa và màn kẹt ở "mời đăng nhập". `useFocusEffect` chạy mỗi lần quay lại.
- Dùng lại màn đăng nhập có sẵn (`/login`: Keycloak hoặc email/mật khẩu).

## 4. Tải danh sách: bộ lọc đổi nhanh không ghi đè

```tsx
const requestId = useRef(0);

const load = useCallback(async (pullToRefresh = false) => {
  const id = ++requestId.current; // chỉ nhận kết quả của lần gọi mới nhất
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
```

Bấm "Bài 1" rồi nhanh tay bấm "Bài 6": nếu mạng trả "Bài 1" sau, không có `requestId` thì danh sách bài 1 **ghi đè** lên bộ lọc bài 6. Đánh số mỗi lần gọi và bỏ kết quả của lần cũ — cùng vấn đề mà React Query (web) giải bằng khóa cache và ViewModel Android giải bằng `loadJob?.cancel()`. App này chưa dùng React Query nên làm bằng tay.

`load` bọc `useCallback` theo `[lesson]`: không có thì `load` đổi mỗi lần vẽ → effect `[load]` chạy lại → `setWords` → vẽ lại → lặp vô tận.

## 5. Danh sách, kéo tải lại, xóa có trả lại

```tsx
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
```

```tsx
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
```

- `refreshing` + `onRefresh` là đủ cho **kéo xuống tải lại**.
- **Giữ lâu để xóa**, luôn **hỏi lại** — trên điện thoại rất dễ chạm nhầm. Android viết hoa chữ trên nút hộp thoại ("HỦY", "XÓA").
- Bốn trạng thái: đang tải (`words === null`), lỗi có "Thử lại", rỗng (`ListEmptyComponent`), có dữ liệu.

## 6. Form không bị bàn phím che

```tsx
<KeyboardAvoidingView style={styles.screen} behavior="padding">
  <View style={styles.form}>
    <TextInput accessibilityLabel="Cách đọc" value={kana} onChangeText={setKana} autoCapitalize="none" … />
    {formErrors.kana ? <Text style={styles.error}>{formErrors.kana}</Text> : null}
    <TextInput accessibilityLabel="Bài" value={lessonInput} onChangeText={setLessonInput} keyboardType="number-pad" … />
    {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
    <Pressable accessibilityLabel="Thêm vào sổ" onPress={onAdd} disabled={saving}>…</Pressable>
  </View>
  …
</KeyboardAvoidingView>
```

```tsx
const onAdd = async () => {
  const errors = validatePersonalWord(kana, meaning, lessonInput);
  setFormErrors(errors);
  setServerError(null);
  if (Object.keys(errors).length > 0 || saving) return; // chống bấm hai lần
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
```

- **`behavior="padding"` cho cả Android và iOS.** Đoạn quen thuộc `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` để nút bị bàn phím **che** trên Android khi app vẽ tràn màn hình — đã thấy trên máy ảo khi thử một app Expo SDK 58 mới (mục 10). Dùng `padding` cho cả hai thì đúng ở mọi bản; đo trên máy ảo với màn này: nút "Thêm vào sổ" ở y 724–838, nằm trên bàn phím.
- `accessibilityLabel` trên ô và nút: trình đọc màn hình đọc được, `adb` và test tìm được.
- Form ba ô dùng `useState` là đủ; form dài nhiều luật thì dùng react-hook-form với `Controller` (`TextInput` không có `name` như `<input>`, nên không dùng được `register`).

## 7. Route và thẻ trên màn chính

- [app/_layout.tsx](../apps/nihongo-mobile/app/_layout.tsx): thêm `<Stack.Screen name="my-words" options={{ title: 'Sổ từ của tôi' }} />` — `name` khớp tên file.
- [app/index.tsx](../apps/nihongo-mobile/app/index.tsx): thêm `NavCard` với `onPress={() => router.push('/my-words')}`.

## 8. Chạy và kiểm trên máy ảo

```bash
cd apps/nihongo-mobile
npm run typecheck && npx vitest run      # 9 file / 45 test
npx expo run:android --port 8082         # cổng 8081 thường bị container khác chiếm
```

> **Hai chuyện trên máy ảo của project:**
> - App Expo và app Kotlin **cùng tên gói** `com.edu.nihongo`: cài cái này phải gỡ cái kia (`adb uninstall com.edu.nihongo`) — dữ liệu cục bộ của app bị gỡ (trên máy ảo) mất theo.
> - Lần mở đầu, app hỏi quyền **thông báo** (phần nhắc ôn SRS). Hộp thoại che màn hình; script tự động phải bấm "Don’t allow"/"Allow" trước.

Kết quả khi kiểm bằng `adb` (cách điều khiển ở mục 9):

| Thao tác | Thấy |
|---|---|
| Màn chính → "Sổ từ của tôi" khi chưa đăng nhập | "Đăng nhập để lưu từ vựng của riêng bạn." + nút Đăng nhập |
| Đăng nhập (email/mật khẩu) | Tự quay lại, hiện `たべます` và `わたし` — hai từ đã thêm **trên web** |
| Form: `abc`, nghĩa trống, bài 99 | `Chỉ dùng hiragana hoặc katakana`, `Nhập nghĩa`, `Bài từ 1 tới 50`; nút vẫn nằm trên bàn phím |
| Chọn "Bài 6" | Chỉ còn `たべます` |
| Thêm `ねこ` qua API rồi kéo xuống | `ねこ` xuất hiện |
| Giữ lâu `ねこ` → XÓA | Hộp "Xóa từ" (HỦY/XÓA); dòng mất; server không còn `ねこ` |

## 9. Điều khiển máy ảo bằng `adb`

```bash
adb shell uiautomator dump /sdcard/ui.xml && adb shell cat /sdcard/ui.xml | grep -o 'text="[^"]*"'   # chữ trên màn
adb shell input tap 540 1250              # chạm tọa độ (từ bounds="[x1,y1][x2,y2]")
adb shell input text "an@example.com"     # gõ (chỉ ASCII — không gõ được tiếng Nhật/có dấu)
adb shell input swipe 540 1500 540 2200 500   # kéo xuống
adb exec-out screencap -p > man-hinh.png
```

Bẫy khi viết script:

- `adb shell input keyevent 4` là **Back**: dùng để đóng bàn phím thì lần thừa sẽ thoát app.
- Một chữ có thể xuất hiện ở nhiều chỗ ("Đăng nhập" ở tiêu đề và trên nút): tìm nút theo `content-desc` (do `accessibilityLabel` sinh ra).
- Shell mặc định của macOS là zsh, **không** tách biến thành nhiều tham số: `set -- $b` hay `curl $J` chạy đúng trên bash nhưng sai trên zsh. Chạy script bằng `bash`.
- Từ tiếng Nhật không gõ được bằng `adb input text`: thêm bằng API (curl) rồi kiểm app hiển thị.

## 10. Khi bạn tự tạo app Expo mới

App này ở Expo SDK 57, dùng axios, chưa dùng React Query hay thư viện form. Mình đã thử dựng một app Expo **SDK 58** trống với React Query, react-hook-form, zod, SecureStore và `Stack.Protected` (13/11/2026, chạy trên máy ảo với API thật). Những điều khác hướng dẫn cũ:

| Gặp | Làm gì |
|---|---|
| Template SDK 58 đặt màn hình ở `src/app/`, kèm `AGENTS.md`, `.claude/`, tự `git init` | Cả `app/` lẫn `src/app/` đều được; dọn file thừa |
| `npx expo install jest-expo -- --save-dev` đưa jest vào `dependencies` | Công cụ test cài bằng `npm install -D` |
| `tsc`: `Cannot find name 'it'` trong file test | `"types": ["jest"]` trong `tsconfig.json` |
| @testing-library/react-native 14: `overlapping act() calls`, test sau không tìm thấy phần tử | `render` **và** `fireEvent` đều async: `await` hết |
| `onPress={handleSubmit(…)}` báo lỗi kiểu `BaseSyntheticEvent` | `onPress={() => onSubmit()}` |
| Chặn màn theo đăng nhập | `<Stack.Protected guard={signedIn}>` (expo-router mới); đổi state là tự chuyển màn |
| Sửa JS mà app không đổi, log có `reloads are disabled` | Đừng chạy với `CI=1` |
| Thư viện native báo `doesn't seem to be linked` trong Jest | `jest.mock('<gói>', () => require('<gói>/jest'))` trong file setup |

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Đăng nhập xong quay lại vẫn thấy "mời đăng nhập" | Kiểm đăng nhập trong `useEffect(…, [])` | `useFocusEffect` |
| Đổi bộ lọc nhanh thấy dữ liệu bộ lọc cũ | Không bỏ kết quả của lần gọi cũ | Đánh số lần gọi (`requestId`) hoặc dùng React Query |
| Lỗi 409 hiện "Request failed with status code 409" | Đọc `e.message` của axios | Đọc `e.response.data.error.message` |
| Mọi lời gọi lỗi mạng trên máy ảo | `localhost` trong máy ảo là chính nó | `10.0.2.2` |
| Bàn phím che nút trên Android | `behavior` để `undefined` cho Android | `behavior="padding"` |
| Bấm "Thêm" khi bàn phím mở phải bấm hai lần | Danh sách nuốt lần chạm đầu | `keyboardShouldPersistTaps="handled"` |
| Cài app báo xung đột chữ ký/gói | App Kotlin cùng tên gói đang cài | `adb uninstall com.edu.nihongo` |
| Effect chạy liên tục, máy nóng | Hàm trong mảng phụ thuộc tạo mới mỗi lần vẽ | `useCallback` |

## Tự kiểm tra

1. Vì sao màn hình dùng `useFocusEffect` để kiểm đăng nhập?
<details><summary>Đáp án</summary>Màn đăng nhập quay về bằng `router.back()`: màn Sổ từ không được tạo lại nên `useEffect(…, [])` không chạy nữa. `useFocusEffect` chạy mỗi lần màn được quay lại.</details>

2. `requestId` giải quyết vấn đề gì?
<details><summary>Đáp án</summary>Kết quả của lần gọi cũ (bộ lọc cũ) về sau không được ghi đè lên kết quả của lần gọi mới.</details>

3. Vì sao lỗi phải đọc phong bì bằng tay mà danh sách thì không?
<details><summary>Đáp án</summary>Interceptor mở phong bì chỉ chạy với response thành công. Lỗi 4xx/5xx thành ngoại lệ axios, dữ liệu lỗi nằm ở `e.response.data.error`.</details>

4. Xóa bị lỗi mạng thì người dùng thấy gì?
<details><summary>Đáp án</summary>Dòng biến mất ngay (lạc quan), rồi hiện lại khi lỗi, kèm hộp "Không xóa được" có lý do.</details>

5. Vì sao từ thêm trên web hiện ngay trên app?
<details><summary>Đáp án</summary>Cùng một API và cùng tài khoản; dữ liệu nằm trên server, app chỉ tải về.</details>

## Bài tập

1. **Test màn hình:** cài `jest-expo` + `@testing-library/react-native` (mục 10), viết test cho màn Sổ từ, giả `src/data/personalWords` và `isLoggedIn`. Kiểm: chưa đăng nhập thấy nút; có dữ liệu thấy hai dòng; form sai không gọi API.
2. **Lưu từ đang xem:** trên màn từ vựng (`app/vocab.tsx`), giữ lâu một từ để "Lưu vào sổ". Tự kiểm: mở Sổ từ thấy từ đó; lưu lại lần hai thấy "Từ này đã có trong sổ".
3. **Offline đọc:** lưu danh sách vào SQLite (bảng mới, có migration như [learn-react-native.md](./learn-react-native.md) mục 6); mất mạng thì đọc từ SQLite và hiện "Đang offline". Tự kiểm: bật chế độ máy bay trên máy ảo, mở lại vẫn thấy danh sách.
4. **React Query:** chuyển màn này sang React Query (thêm `QueryClientProvider` ở `_layout.tsx`). Tự kiểm: bỏ được `requestId` mà đổi lọc nhanh vẫn đúng.
5. **Màn của bạn:** "Ghi chú theo bài" cho API ở bài tập 5 của bài backend.

## Luyện phỏng vấn

Câu hỏi React Native (Expo hay CLI, điều hướng, offline, refresh token): [interview-react-native-senior.md](./interview-react-native-senior.md). Bảo mật mobile: [security-owasp-mobile.md](./security-owasp-mobile.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **9. Mobile** — bài 12/16.

- Bài trước: [learn-react-native.md](./learn-react-native.md) — React Native qua nihongo-mobile: màn hình, điều hướng, SQLite offline, test
- **Bài tiếp: [learn-react-native-native-code.md](./learn-react-native-native-code.md)** — React Native CLI + code native: tự viết Turbo Module bằng Kotlin và Swift, chạy thật trên Android/iOS

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
