# Quản lý state: Redux Toolkit, RTK Query, Thunk, Saga, Zustand, Context

> **Mục tiêu:** Học xong bài này bạn làm được:
> - Quyết định một dữ liệu nên nằm ở đâu: `useState`, URL, Context, Zustand, Redux hay React Query.
> - Viết Redux Toolkit: slice, store, hook có kiểu, selector, dùng trong component, test reducer.
> - Tránh hai lỗi Redux kinh điển (selector làm vẽ lại thừa, quên ghi state) — có test bắt lỗi.
> - Đọc và viết ba cách gọi API hay gặp trong code Redux ở công ty: `createAsyncThunk`, RTK Query, redux-saga.
> - Dùng cùng kiến thức này trong React Native.
>
> **Cần biết trước:** [learn-react-build-app.md](./learn-react-build-app.md) (trang Sổ từ, React Query).
>
> **Thời gian:** khoảng 6–8 giờ, chia 3 buổi.

Code thật: trang **ôn tập sổ từ** (`/my-words/quiz`) trong [apps/nihongo-web](../apps/nihongo-web):

| Phần | File |
|---|---|
| Slice, selector, store | [src/store/personalQuizSlice.ts](../apps/nihongo-web/src/store/personalQuizSlice.ts) |
| Hook có kiểu | [src/store/hooks.ts](../apps/nihongo-web/src/store/hooks.ts) |
| Trang | [src/views/PersonalWordsQuizView.tsx](../apps/nihongo-web/src/views/PersonalWordsQuizView.tsx) |
| Test | [personalQuizSlice.test.ts](../apps/nihongo-web/src/store/personalQuizSlice.test.ts), [PersonalWordsQuizView.test.tsx](../apps/nihongo-web/src/views/PersonalWordsQuizView.test.tsx) |

Redux Toolkit 2.14, react-redux 9.3; đã chạy 13/11/2026 (test xanh, trang chạy trên Chrome: làm 2 câu ra "Đúng 1/2" và nút "Ôn lại 1 câu sai").

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| Store | Object chứa state dùng chung. |
| Action | Object mô tả "chuyện đã xảy ra": `{ type: 'personalQuiz/answered', payload: { wordId: 1, correct: true } }`. |
| Reducer | Hàm thuần `(stateCũ, action) => stateMới`: không gọi API, không đọc giờ, không random. |
| Dispatch | Gửi action vào store. |
| Selector | Hàm đọc một phần state: `(s) => s.personalQuiz.status`. |
| Slice | Một mảng của store (state đầu + reducer + action), tạo bằng `createSlice`. |
| Immer | Thư viện trong Redux Toolkit: viết như sửa (`state.index += 1`) nhưng thật ra tạo object mới. |
| Memoize | Nhớ kết quả: đầu vào không đổi thì trả đúng kết quả cũ. |
| Middleware | Lớp giữa `dispatch` và reducer, xử lý việc bất đồng bộ (thunk, saga, RTK Query). |

## 1. State nằm ở đâu? Quyết định trước khi viết code

Sai lầm số một của người mới: cho **mọi thứ** vào Redux. Hỏi lần lượt, dừng ở câu đầu tiên trả lời "có":

| # | Câu hỏi | Chỗ đặt | Ví dụ trong tính năng Sổ từ |
|---|---|---|---|
| 1 | Bản gốc nằm trên server? | React Query | danh sách từ |
| 2 | Người dùng muốn gửi link / F5 vẫn giữ? | URL | bộ lọc `?lesson=6` |
| 3 | Chỉ một component dùng? | `useState` | ô đang gõ (react-hook-form giữ) |
| 4 | Vài component cạnh nhau? | State ở cha, truyền props | — |
| 5 | Cả app dùng, hiếm khi đổi? | Context hoặc Zustand | người đăng nhập (`AuthContext` của web) |
| 6 | Nhiều phần cùng đọc/ghi, đổi theo luật, cần xem lại từng bước khi debug? | Redux Toolkit | lượt ôn tập: câu số mấy, đúng/sai, xong chưa |

Lượt ôn tập là client state đúng nghĩa: không lưu lên server, nhiều phần giao diện cùng đọc (thẻ câu hỏi, tiến độ, màn kết quả, nút "ôn lại câu sai"), đổi theo luật rõ ràng. Một trang như thế này dùng `useReducer` cũng được; Redux đáng dùng khi state đó cần sống qua nhiều trang, nhiều người cùng làm, hoặc cần Redux DevTools để tua lại.

Web của project dùng Redux **chỉ cho trang này**: store tạo riêng trong trang, không bọc cả app — đúng nguyên tắc "chỉ thêm khi cần".

## 2. Luồng dữ liệu một chiều

```text
          ┌──────────────── selector ────────────────┐
          ▼                                          │
   Component vẽ giao diện                          Store
          │ bấm "Nhớ"                                ▲ state mới
          ▼                                          │
   dispatch(answered({ wordId: 1, correct: true })) ──▶ reducer(stateCũ, action)
```

Chỉ một đường đổi state. Khi có lỗi, Redux DevTools (tiện ích trình duyệt) cho thấy chính xác action nào làm state sai.

## 3. Slice

[src/store/personalQuizSlice.ts](../apps/nihongo-web/src/store/personalQuizSlice.ts):

```ts
export type QuizState = {
  words: PersonalWord[];
  index: number;
  answers: Record<number, boolean>; // id từ → nhớ đúng không
  status: 'idle' | 'running' | 'finished';
};

const initialState: QuizState = { words: [], index: 0, answers: {}, status: 'idle' };

export const personalQuizSlice = createSlice({
  name: 'personalQuiz',
  initialState,
  reducers: {
    started(state, action: PayloadAction<PersonalWord[]>) {
      state.words = action.payload;
      state.index = 0;
      state.answers = {};
      state.status = action.payload.length > 0 ? 'running' : 'idle';
    },
    answered(state, action: PayloadAction<{ wordId: number; correct: boolean }>) {
      if (state.status !== 'running') return;
      state.answers[action.payload.wordId] = action.payload.correct;
      if (state.index + 1 >= state.words.length) state.status = 'finished';
      else state.index += 1;
    },
    reset() {
      return initialState;
    },
  },
});

export const { started, answered, reset } = personalQuizSlice.actions;
```

`createSlice` tự sinh action creator (`answered(...)` trả `{ type: 'personalQuiz/answered', payload }`) và reducer.

Ba quy tắc viết reducer:

1. **Sửa `state` hoặc `return` object mới — không cả hai.** `reset()` return; các reducer khác sửa `state`. Immer **chỉ** chạy bên trong `createSlice`; ở chỗ khác, `state.x = 1` là sửa trực tiếp và là lỗi.
2. **Không làm việc phụ**: không `fetch`, `Date.now()`, `Math.random()`, `localStorage`. Cần thời gian thì truyền vào payload.
3. **Đặt tên theo "chuyện đã xảy ra"** (`answered`), không theo "lệnh set" (`setIndex`).

## 4. Store và hook có kiểu

Cuối cùng file slice:

```ts
export function makeQuizStore() {
  return configureStore({ reducer: { personalQuiz: personalQuizSlice.reducer } });
}
export type QuizStore = ReturnType<typeof makeQuizStore>;
export type QuizRootState = ReturnType<QuizStore['getState']>;
export type QuizDispatch = QuizStore['dispatch'];
```

[src/store/hooks.ts](../apps/nihongo-web/src/store/hooks.ts):

```ts
export const useQuizDispatch = useDispatch.withTypes<QuizDispatch>();
export const useQuizSelector = useSelector.withTypes<QuizRootState>();
```

- **Hàm** `makeQuizStore()`, không phải một biến store toàn cục: mỗi lần mở trang một store mới, mỗi test một store mới, không dính state cũ. Next.js render trên server cũng cần store riêng mỗi request vì cùng lý do.
- `configureStore` tự bật Redux DevTools và kiểm "lỡ sửa state ngoài reducer" khi dev.
- Kiểu `QuizRootState` **suy ra** từ reducer, không viết tay.

Gắn vào trang — [PersonalWordsQuizView.tsx](../apps/nihongo-web/src/views/PersonalWordsQuizView.tsx):

```tsx
export default function PersonalWordsQuizView({ store }: { store?: QuizStore }) {
  const [quizStore] = useState(() => store ?? makeQuizStore());
  return (
    <Provider store={quizStore}>
      <Quiz />
    </Provider>
  );
}
```

`useState(() => …)` để tạo store **một lần**; viết `makeQuizStore()` thẳng trong thân component là mỗi lần vẽ lại một store mới, mất hết tiến độ. Nhận `store` từ ngoài để test truyền store riêng và kiểm nó.

## 5. Dùng trong component

```tsx
function Quiz() {
  const dispatch = useQuizDispatch();
  const status = useQuizSelector((s) => s.personalQuiz.status);
  const word = useQuizSelector(selectCurrentWord);
  const score = useQuizSelector(selectScore);
  const missed = useQuizSelector(selectMissed);
  const { done, total } = useQuizSelector(selectProgress);
  const { data } = usePersonalWords(undefined, isAuthenticated); // server state vẫn từ React Query
  const words = data?.data ?? [];

  if (status === 'idle') return <button onClick={() => dispatch(started(words))}>Bắt đầu ({words.length} từ)</button>;
  if (status === 'finished')
    return (
      <>
        <h1>Đúng {score}/{total}</h1>
        {missed.length > 0 && <button onClick={() => dispatch(started(missed))}>Ôn lại {missed.length} câu sai</button>}
      </>
    );
  return (
    <>
      <p>Câu {done + 1}/{total}</p>
      <h1>{word.kana}</h1>
      <button onClick={() => dispatch(answered({ wordId: word.id, correct: true }))}>Nhớ</button>
      <button onClick={() => dispatch(answered({ wordId: word.id, correct: false }))}>Quên</button>
    </>
  );
}
```

Hai loại state sống chung: danh sách từ lấy bằng React Query, rồi **chép một lần** vào Redux khi bắt đầu lượt (`started(words)`). Từ đó lượt ôn là của riêng trình duyệt. "Ôn lại câu sai" dispatch `started(missed)` — cùng action, dữ liệu khác.

`useQuizSelector` chạy lại selector sau **mọi** action và so kết quả bằng `===`; khác thì vẽ lại. Điều này dẫn tới lỗi ở mục 6.

## 6. Selector và lỗi vẽ lại thừa

```ts
export const selectScore = (s: WithQuiz) => Object.values(s.personalQuiz.answers).filter(Boolean).length; // trả số: OK

export const selectProgress = createSelector(
  [(s: WithQuiz) => s.personalQuiz.answers, (s: WithQuiz) => s.personalQuiz.words],
  (answers, words) => ({ done: Object.keys(answers).length, total: words.length }),
);

export const selectMissed = createSelector(
  [(s: WithQuiz) => s.personalQuiz.answers, (s: WithQuiz) => s.personalQuiz.words],
  (answers, words) => words.filter((w) => answers[w.id] === false),
);
```

Viết `selectProgress` thành hàm thường `(s) => ({ done, total })` thì **mỗi lần gọi ra object mới**, `===` luôn sai, component vẽ lại sau mọi action. react-redux in cảnh báo trên console (gặp thật khi làm bản thử):

```
Selector selectProgress returned a different result when called with the same parameters.
This can lead to unnecessary rerenders.
```

Quy tắc: selector trả giá trị có sẵn trong state hoặc số/chuỗi → hàm thường. Trả **object/mảng mới** (`{…}`, `map`, `filter`) → `createSelector`.

Test bắt lỗi này ([personalQuizSlice.test.ts](../apps/nihongo-web/src/store/personalQuizSlice.test.ts)):

```ts
it('selectProgress: cùng state trả đúng object cũ (không làm component vẽ lại)', () => {
  const store = makeQuizStore();
  store.dispatch(started(words));
  expect(selectProgress(store.getState())).toBe(selectProgress(store.getState()));
});
```

**Làm hỏng:** đổi `selectProgress` về hàm thường, chạy `npx vitest run src/store`:

```
FAIL  src/store/personalQuizSlice.test.ts > personalQuizSlice > selectProgress: cùng state trả đúng object cũ …
AssertionError: expected { done: +0, total: 2 } to be { done: +0, total: 2 } // Object.is equality
```

Hai object in ra giống hệt nhưng **không phải cùng một object** — đúng bản chất lỗi.

## 7. Test reducer: không cần React

```ts
it('chuyển câu và kết thúc ở câu cuối', () => {
  let state = personalQuizSlice.reducer(undefined, started(words));
  state = personalQuizSlice.reducer(state, answered({ wordId: 1, correct: true }));
  expect(state.index).toBe(1);
  state = personalQuizSlice.reducer(state, answered({ wordId: 2, correct: false }));
  expect(state.status).toBe('finished');
  expect(selectScore({ personalQuiz: state })).toBe(1);
  expect(selectMissed({ personalQuiz: state }).map((w) => w.kana)).toEqual(['たべます']);
});
```

**Làm hỏng:** trong `answered`, thay dòng ghi câu trả lời bằng `state.answers = { ...state.answers };`:

```
FAIL  src/store/personalQuizSlice.test.ts > personalQuizSlice > chuyển câu và kết thúc ở câu cuối
AssertionError: expected +0 to be 1 // Object.is equality
```

Test cả trang ([PersonalWordsQuizView.test.tsx](../apps/nihongo-web/src/views/PersonalWordsQuizView.test.tsx)) truyền store riêng, bấm Bắt đầu → Nhớ → Quên → Nhớ, kiểm "Đúng 2/3", bấm "Ôn lại 1 câu sai" và kiểm store chỉ còn đúng từ sai.

## 8. Gọi API trong Redux: ba cách bạn sẽ gặp

Web của project gọi API bằng React Query, nên **không** dùng ba cách dưới. Nhưng code Redux ở nhiều công ty dùng chúng, và phỏng vấn hay hỏi. Mỗi cách đã được **chạy thử trong một project Vite riêng** ngày 13/11/2026, kèm test với API giả `/words` trả mảng thẳng. Các đoạn dưới viết lại cho API sổ từ của project (thêm bước mở phong bì `{ success, data }`); phần viết lại này **chưa chạy thử** — khi dùng, chạy test của bạn trước.

### 8.1. `createAsyncThunk`: tự quản lý loading/error

```ts
export const fetchWords = createAsyncThunk('words/fetch', async (lesson: number | undefined) => {
  return fetchPersonalWords(lesson); // ném lỗi → action "rejected"
});

const wordsSlice = createSlice({
  name: 'words',
  initialState: { items: [] as PersonalWord[], status: 'idle' as 'idle' | 'loading' | 'succeeded' | 'failed', error: undefined as string | undefined },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWords.pending, (state) => { state.status = 'loading'; state.error = undefined; })
      .addCase(fetchWords.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload.data; })
      .addCase(fetchWords.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; });
  },
});
```

Thunk tự dispatch `pending` → `fulfilled`/`rejected`. Phần còn lại bạn tự làm: cache, khi nào tải lại, chống gọi trùng. Hợp cho luồng nghiệp vụ nhiều bước ghi vào nhiều slice (đăng nhập → tải hồ sơ → tải giỏ hàng).

### 8.2. RTK Query: React Query phiên bản Redux

```ts
export const wordsApi = createApi({
  reducerPath: 'wordsApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${window.location.origin}/api` }),
  tagTypes: ['Word'],
  endpoints: (build) => ({
    getWords: build.query<PersonalWord[], number | void>({
      query: (lesson) => (lesson ? `/personal-words?lesson=${lesson}` : '/personal-words'),
      transformResponse: (res: { data: { data: PersonalWord[] } }) => res.data.data, // mở phong bì của gateway
      providesTags: ['Word'],
    }),
    addWord: build.mutation<PersonalWord, NewPersonalWord>({
      query: (body) => ({ url: '/personal-words', method: 'POST', body }),
      invalidatesTags: ['Word'],
    }),
  }),
});
```

Đăng ký **cả reducer lẫn middleware** (thiếu middleware thì tag không tự tải lại):

```ts
configureStore({
  reducer: { [wordsApi.reducerPath]: wordsApi.reducer },
  middleware: (gDM) => gDM().concat(wordsApi.middleware),
});
```

> **Lỗi gặp thật khi chạy thử:** `baseUrl: '/api'` chạy được trên trình duyệt nhưng trong test (Node) báo `TypeError: Failed to parse URL from /api/words` — `fetchBaseQuery` tạo `new Request('/api/…')` mà Node không có địa chỉ gốc. Dùng URL đầy đủ.

React Query hay RTK Query? Project đã dùng Redux nhiều → RTK Query (một công cụ, một DevTools). Không cần Redux → React Query, như web này. Không dùng cả hai cho cùng dữ liệu.

### 8.3. redux-saga: khi cần hủy, chờ, chạy song song

```ts
export const searchRequested = createAction<string>('search/requested');
export const searchSucceeded = createAction<PersonalWord[]>('search/succeeded');

function* handleSearch(action: ReturnType<typeof searchRequested>) {
  const page: PersonalWordPage = yield call(fetchPersonalWords);
  yield put(searchSucceeded(page.data.filter((w) => w.kana.includes(action.payload))));
}

export function* rootSaga() {
  yield takeLatest(searchRequested.type, handleSearch); // action mới tới → hủy lần cũ
}
```

`function*` là generator; `call` gọi hàm, `put` dispatch — saga **mô tả** việc cần làm nên test được bằng cách so từng bước. Lần chạy thử xác nhận: dispatch tìm `わ` rồi `が` liền nhau → chỉ **một** kết quả (`がくせい`). Cài: `createSagaMiddleware()` → thêm vào `middleware` → `saga.run(rootSaga)` (quên `run` là saga không chạy).

### 8.4. So sánh để trả lời phỏng vấn

| | Thunk | Saga | RTK Query / React Query |
|---|---|---|---|
| Viết bằng | `async` function | generator `function*` | khai báo endpoint |
| Cache, tải lại, chống gọi trùng | tự làm | tự làm | **có sẵn** |
| Hủy lần cũ, debounce, race, chạy nền liên tục | khó | **có sẵn** | một phần |
| Độ khó | thấp | cao | thấp |
| Dùng khi | luồng nghiệp vụ nhiều bước | websocket, polling, hủy/thử lại có điều kiện | CRUD thông thường (phần lớn app) |

## 9. Zustand và Context

**Context** — web dùng cho người đăng nhập ([contexts/auth-context.ts](../apps/nihongo-web/src/contexts/auth-context.ts), đọc bằng `useAuth()`): giá trị **ít đổi**, cần ở mọi nơi. Bẫy: value đổi thì **mọi** component dùng Context đó vẽ lại, không chọn được một phần như selector; truyền `value={{ user, logout }}` mà không `useMemo` là mỗi lần cha vẽ lại tạo object mới.

**Zustand** — store nhỏ không cần Provider, chọn một phần bằng selector:

```ts
export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      showMeaning: true,
      toggleMeaning: () => set((s) => ({ showMeaning: !s.showMeaning })),
    }),
    { name: 'settings' }, // lưu localStorage
  ),
);
const showMeaning = useSettings((s) => s.showMeaning); // luôn truyền hàm chọn
```

Đủ cho phần lớn client state; chọn Redux khi cần DevTools tua lại, middleware, hoặc đội đã quen.

## 10. Redux trong React Native

Slice, store, selector, thunk, saga, RTK Query **giống hệt** trên React Native — không đụng DOM. Khác biệt thường gặp:

- Không có `localStorage`: Zustand `persist` dùng `createJSONStorage(() => AsyncStorage)`; Redux dùng `redux-persist` với AsyncStorage/MMKV.
- Không có `window.location.origin`: `baseUrl` ghi địa chỉ đầy đủ (`http://10.0.2.2:3000/api` cho máy ảo Android, xem [learn-react-native.md](./learn-react-native.md) mục 3).

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Console: `Selector … returned a different result when called with the same parameters` | Selector tạo object/mảng mới mỗi lần | `createSelector` |
| `A non-serializable value was detected in an action/state` | `Date`, `Map`, class, hàm trong action/state | Lưu chuỗi ISO / object thường |
| `[Immer] An immer producer returned a new value *and* modified its draft` | Vừa sửa `state` vừa `return` | Chọn một |
| Component không vẽ lại dù đã dispatch | Sửa state ngoài reducer | Mọi thay đổi qua action |
| `could not find react-redux context value` | Dùng hook Redux ngoài `<Provider>` | Bọc Provider; test truyền store |
| Tiến độ ôn mất sau mỗi lần vẽ lại | Tạo store trong thân component | `useState(() => makeQuizStore())` |
| Test sau thấy state của test trước | Store toàn cục | `makeQuizStore()` mỗi test |
| RTK Query thêm xong không tự tải lại | Thiếu middleware hoặc tag không khớp | Thêm `api.middleware`; tag cùng tên |
| Saga không chạy | Quên `saga.run(rootSaga)` | Gọi sau `configureStore` |

## Tự kiểm tra

1. Danh sách từ lấy từ API có nên cho vào Redux không?
<details><summary>Đáp án</summary>Không: server state → React Query (hoặc RTK Query nếu project đã dùng Redux). Lượt ôn tập (client state) mới vào Redux.</details>

2. Vì sao `makeQuizStore()` là hàm?
<details><summary>Đáp án</summary>Mỗi trang/test/request có store riêng, không dính state cũ.</details>

3. `(s) => s.items.filter((i) => i.selected)` có vấn đề gì?
<details><summary>Đáp án</summary>`filter` trả mảng mới mỗi lần → vẽ lại sau mọi action. Bọc `createSelector`.</details>

4. Reducer có được gọi `Date.now()` không?
<details><summary>Đáp án</summary>Không. Reducer phải thuần để test và tua lại được. Truyền thời gian trong payload.</details>

5. `takeLatest` khác `takeEvery`?
<details><summary>Đáp án</summary>`takeEvery` chạy mọi lần, song song; `takeLatest` hủy lần đang chạy khi action mới tới.</details>

6. Khi nào Context không hợp?
<details><summary>Đáp án</summary>Giá trị đổi thường xuyên: mọi component dùng nó vẽ lại.</details>

## Bài tập

1. **Hẹn giờ mỗi câu:** thêm `startedAt` (truyền trong payload, không gọi `Date.now()` trong reducer) và selector `selectAverageSeconds` bằng `createSelector`. Tự kiểm: test reducer + test selector trả cùng object.
2. **Trộn thứ tự:** `started` nhận danh sách đã trộn từ component (hàm trộn thuần có test), reducer không random. Tự kiểm: test truyền danh sách cố định cho kết quả xác định.
3. **Lưu lượt dở:** F5 không mất lượt ôn: `store.subscribe` ghi `sessionStorage`, đọc lại làm `preloadedState` trong `makeQuizStore`. Tự kiểm: đang ở câu 2, F5 vẫn câu 2.
4. **Chuyển sang RTK Query:** viết lại trang Sổ từ bằng `wordsApi` ở mục 8.2 trong một nhánh git riêng; so số dòng và hành vi với bản React Query. Tự kiểm: 7 test của trang vẫn xanh sau khi sửa phần giả API.
5. **Zustand:** chuyển cài đặt "hiện nghĩa trên thẻ ôn" sang Zustand có `persist`. Tự kiểm: tắt bật, F5 vẫn giữ.

## Luyện phỏng vấn

Câu hỏi về Redux, Context, React Query: [interview-web.md](./interview-web.md) và [interview-react-native-senior.md](./interview-react-native-senior.md) mục 3 (TanStack Query và Redux Thunk/Saga).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **8. Frontend web và desktop** — bài 3/8.

- Bài trước: [learn-react-build-app.md](./learn-react-build-app.md) — Làm một trang web trọn vẹn (Sổ từ của tôi): React Query, form zod, lọc trên URL, xóa lạc quan, test, chạy trên Chrome
- **Bài tiếp: [roadmap-reactjs.md](./roadmap-reactjs.md)** — Lộ trình dài React + Next.js qua apps/nihongo-web

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
