# React qua web Nihongo: component, state, effect, hook và gọi API

> **Mục tiêu:** Học xong bài này bạn làm được:
> - Đọc một component trong [apps/nihongo-web](../apps/nihongo-web) và chỉ ra props, state, effect của nó.
> - Giải thích vì sao gõ vào ô tra từ thì API chỉ bị gọi một lần, không gọi theo từng chữ.
> - Viết một custom hook nhỏ kèm test, rồi cố tình làm hỏng để thấy test bắt lỗi.
> - Biết dữ liệu từ API đi vào màn hình qua React Query như thế nào.
>
> **Cần biết trước:** [learn-js-ts.md](./learn-js-ts.md) (hàm, mảng, object, async/await), [learn-web-http.md](./learn-web-http.md) (request/response). Đã chạy được project theo [run-local.md](./run-local.md).
>
> **Thời gian:** khoảng 6–8 giờ, chia 3–4 buổi.

Bài này là đường đi ngắn, bám sát code. Muốn học React và Next.js theo chiều rộng (20 tuần, auth, thanh toán, Storybook) thì đọc tiếp [roadmap-reactjs.md](./roadmap-reactjs.md) sau khi xong bài này.

**Phiên bản đang dùng:** React 19.3, Next.js 15.5, TanStack React Query 5, Vitest 3, Testing Library 16. Kết quả lệnh trong bài đã được chạy thử ngày 12/11/2026.

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| Component | Hàm trả về giao diện (JSX). Tên viết hoa: `VocabPage`, `SpeakEnglishButton`. |
| JSX | Cú pháp giống HTML viết trong file `.tsx`: `<button onClick={…}>Nghe</button>`. |
| Props | Tham số truyền vào component từ bên ngoài, chỉ đọc. |
| State | Dữ liệu component tự giữ và được phép đổi (`useState`). Đổi state thì React vẽ lại. |
| Render | React gọi lại hàm component để tính giao diện mới. |
| Effect | Việc làm *sau* khi vẽ xong: hẹn giờ, gọi API, đăng ký sự kiện (`useEffect`). |
| Hook | Hàm tên bắt đầu bằng `use…`, chỉ gọi được ở đầu component hoặc trong hook khác. |
| Custom hook | Hook do mình viết, gom state + effect để dùng lại (`useDebouncedValue`). |
| Debounce | Đợi người dùng ngừng gõ một lúc rồi mới làm, bỏ qua các lần gõ giữa chừng. |
| React Query | Thư viện lấy dữ liệu từ API, tự cache, tự thử lại, báo trạng thái đang tải. |
| Query key | Tên của một mục trong cache React Query, ví dụ `['vocab-search', 'kan']`. |
| Client component | Component chạy trên trình duyệt, đánh dấu bằng dòng `'use client'` ở đầu file. |

## 1. Vì sao cần React trong project này

Trang [http://localhost:8080/vocab?lesson=1](http://localhost:8080/vocab?lesson=1) có thẻ từ vựng, nút nghe, ô tra từ gõ tới đâu tìm tới đó, nút "Sau" để đổi thẻ. Mỗi thao tác đổi một phần nhỏ của màn hình.

Không có React, bạn phải tự tìm từng thẻ HTML rồi sửa chữ trong đó (`document.querySelector(...).textContent = …`), và rất dễ quên chỗ này chỗ kia. Với React, bạn chỉ khai báo: *"khi `currentIndex` là 3 thì hiện từ thứ 3"*. Đổi `currentIndex`, React tự vẽ lại phần cần đổi.

Ý tưởng cần nhớ suốt bài: **giao diện = hàm(state)**. Muốn màn hình đổi, bạn đổi state, không sửa HTML.

## 2. Chạy web và test trước khi đọc code

Mở terminal ở thư mục gốc repo:

```bash
cd apps/nihongo-web
npm install          # lần đầu, hoặc khi package.json đổi
npm run test:run     # chạy toàn bộ test một lần
```

Kết quả đúng (số lượng có thể nhích lên khi có test mới):

```
 Test Files  37 passed (37)
      Tests  187 passed (187)
```

Muốn sửa code và xem ngay trên trình duyệt (không qua Docker):

```bash
npm run dev          # mở http://localhost:5173
```

Trang đầy đủ qua nginx ở cổng 8080 là bản đã build trong container `edu-nihongo-web`. Sửa code xong muốn thấy ở cổng 8080 thì phải build lại container (xem [docker.md](./docker.md)); khi học, dùng cổng 5173 cho nhanh.

## 3. Component đầu tiên: một trang Next.js

Mở [src/app/(main)/vocab/page.tsx](../apps/nihongo-web/src/app/%28main%29/vocab/page.tsx). Next.js biến đường dẫn thư mục thành URL: `app/(main)/vocab/page.tsx` → `/vocab` (phần `(main)` trong ngoặc là nhóm, không xuất hiện trong URL).

```tsx
'use client';

function VocabPageInner() {
  const searchParams = useSearchParams();
  const lesson = positiveInt(searchParams.get('lesson'));
  const word = positiveInt(searchParams.get('word'));

  // Chưa chọn bài → trang lưới bài học. Có ?lesson= hoặc ?word= → flashcard.
  if (lesson == null && word == null) {
    return <VocabLessonPickerView />;
  }

  return <VocabView initialLessonNumber={lesson} initialVocabId={word} />;
}
```

Đọc từng dòng:

- `'use client'`: file này chạy trên trình duyệt (cần đọc URL, bấm nút). Không có dòng này, Next.js coi là component chạy trên server.
- `VocabPageInner` là **một hàm**. Nó trả về JSX — mô tả giao diện.
- `useSearchParams()` là một **hook** của Next.js, đọc phần `?lesson=1` trên URL.
- Hàm trả về **một trong hai** component tùy URL. Đây là cách viết `if` trong React: trả về JSX khác nhau.
- `<VocabView initialLessonNumber={lesson} … />` truyền **props**. Bên trong `VocabView`, `initialLessonNumber` là tham số chỉ đọc.

**Thử:** mở `http://localhost:5173/vocab` rồi `http://localhost:5173/vocab?lesson=2`. Trang đầu là lưới chọn bài, trang sau là thẻ từ của bài 2 — cùng một file, khác nhánh `if`.

## 4. Props và sự kiện: nút nghe tiếng Anh

Mở [src/components/VocabReading.tsx](../apps/nihongo-web/src/components/VocabReading.tsx#L24):

```tsx
export function SpeakEnglishButton({ text, className }: { text: string; className?: string }) {
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    playAudio(englishForSpeech(text) || text, 'en-US');
  };
  return (
    <button type="button" lang="en" aria-label={`Nghe tiếng Anh: ${text}`} onClick={onClick}>
      <span className="speak-en__text">{text}</span>
      <SpeakerIcon className="speak-en__icon" size={13} />
    </button>
  );
}
```

- `{ text, className }` là props. `className?` có dấu `?` nghĩa là không bắt buộc.
- `onClick={onClick}` gắn hàm xử lý khi bấm. Trong JSX, giá trị JavaScript nằm trong `{ }`.
- `e.stopPropagation()`: nút này nằm *trong* thẻ từ vựng, mà bấm vào thẻ thì phát tiếng Nhật. Không chặn lại thì một cú bấm phát cả tiếng Anh lẫn tiếng Nhật.
- `aria-label` giúp trình đọc màn hình (và test) tìm được nút.

Cùng file có `ExampleEnglish` dùng lại `SpeakEnglishButton` cho dòng EN của câu ví dụ. Đây là cách React tái sử dụng: **ghép component nhỏ thành component lớn**, không copy code.

Test của component này nằm ở [VocabReading.test.tsx](../apps/nihongo-web/src/components/VocabReading.test.tsx): nó vẽ nút, bấm thử, rồi kiểm `playAudio` được gọi với giọng `en-US` và cú bấm không lan ra thẻ bên ngoài.

## 5. State: `useState`

Trong [src/views/VocabView.tsx](../apps/nihongo-web/src/views/VocabView.tsx#L56):

```tsx
const [currentLesson, setCurrentLesson] = useState(initialLessonNumber ?? 1);
const [currentIndex, setCurrentIndex] = useState(0);
const [searchInput, setSearchInput] = useState('');
```

`useState(giáTrịĐầu)` trả về một cặp: giá trị hiện tại và hàm để đổi nó.

- Bấm "Sau" thì code gọi `setCurrentIndex(currentIndex + 1)`. React gọi lại `VocabView`, lần này `currentIndex` là giá trị mới, thẻ mới hiện ra.
- **Không bao giờ** gán thẳng `currentIndex = 5`: React không biết và không vẽ lại.
- Gõ vào ô tìm kiếm thì `onChange` gọi `setSearchInput(e.target.value)`. Ô input hiển thị đúng `searchInput` — gọi là *controlled input*.

## 6. Effect và custom hook: tìm kiếm không gọi API theo từng chữ

Vấn đề thật: gõ `kandou` vào ô tra từ. Nếu mỗi chữ gọi API một lần thì có 6 request (`k`, `ka`, `kan`…), server mệt và kết quả nhảy loạn. Project giải quyết bằng hook [src/hooks/useDebouncedValue.ts](../apps/nihongo-web/src/hooks/useDebouncedValue.ts):

```ts
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer); // gõ tiếp trước khi hết giờ: hủy lần cũ, đếm lại
  }, [value, delayMs]);
  return debounced;
}
```

Đọc theo thứ tự thời gian:

1. Bạn gõ `k`. `value` đổi → effect chạy → hẹn giờ 300 ms để đặt `debounced = 'k'`.
2. 100 ms sau bạn gõ `ka`. `value` đổi lần nữa. **Trước khi** chạy effect mới, React gọi hàm dọn dẹp (`return () => clearTimeout(timer)`) của lần trước → hẹn giờ cho `k` bị hủy.
3. Bạn ngừng gõ ở `kan`. Không ai hủy nữa, 300 ms sau `debounced` thành `'kan'`.

Ba điều về `useEffect`:

- **Mảng phụ thuộc** `[value, delayMs]`: effect chỉ chạy lại khi một trong hai đổi.
- **Hàm dọn dẹp** (giá trị `return` của effect) chạy trước lần chạy tiếp theo và khi component biến mất. Hẹn giờ, đăng ký sự kiện, kết nối… đều phải dọn ở đây.
- Effect chạy *sau* khi vẽ xong, nên không làm chậm lần vẽ.

`VocabView` dùng hook này như sau:

```tsx
const debouncedSearchInput = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
useEffect(() => {
  setSearchQuery(debouncedSearchInput);
}, [debouncedSearchInput]);
```

Đây là ích lợi của custom hook: logic hẹn giờ phức tạp nằm một chỗ, có test riêng, component chỉ gọi một dòng.

## 7. Test một hook và cố tình làm hỏng nó

Test nằm ở [src/hooks/__tests__/useDebouncedValue.test.ts](../apps/nihongo-web/src/hooks/__tests__/useDebouncedValue.test.ts). Nó dùng **đồng hồ giả** (`vi.useFakeTimers()`) để không phải đợi thật:

```ts
rerender({ v: 'k' });
act(() => vi.advanceTimersByTime(100));
rerender({ v: 'ka' });
act(() => vi.advanceTimersByTime(100));
rerender({ v: 'kan' });
act(() => vi.advanceTimersByTime(299));
expect(result.current).toBe(''); // vẫn đang gõ: chưa đổi

act(() => vi.advanceTimersByTime(1));
expect(result.current).toBe('kan'); // chỉ giá trị cuối, bỏ qua k, ka
```

Chạy riêng test này:

```bash
npx vitest run src/hooks/__tests__/useDebouncedValue.test.ts
```

```
 Test Files  1 passed (1)
      Tests  1 passed (1)
```

**Làm hỏng:** trong `useDebouncedValue.ts`, đổi dòng dọn dẹp thành không làm gì:

```ts
    return () => {}; // quên hủy hẹn giờ cũ
```

Chạy lại lệnh trên. Kết quả:

```
AssertionError: expected 'ka' to be '' // Object.is equality
      Tests  1 failed (1)
```

Hẹn giờ của `k` và `ka` không bị hủy nên giá trị cũ lọt ra — đúng lỗi "gọi API theo từng chữ". Trả lại code:

```bash
git checkout -- src/hooks/useDebouncedValue.ts
```

## 8. Lấy dữ liệu từ API bằng React Query

Gọi API bằng `useEffect` + `fetch` thì phải tự lo: đang tải, lỗi, thử lại, cache, hủy request cũ. Project giao việc đó cho React Query. Ở [src/hooks/queries.ts](../apps/nihongo-web/src/hooks/queries.ts):

```ts
export function useVocabSearchQuery(query: string) {
  return useQuery({
    queryKey: queryKeys.vocabSearch(query),
    queryFn: () => searchVocabularies(query),
    enabled: query.trim().length > 0,
    staleTime: STALE_5M,
    placeholderData: keepPreviousData,
  });
}
```

- `queryKey`: tên mục cache, ví dụ `['vocab-search', 'kan']`. Cùng key thì dùng lại kết quả, không gọi API lần hai. Mọi key nằm duy nhất ở [src/api/query-keys.ts](../apps/nihongo-web/src/api/query-keys.ts) — đầu file ghi lại lỗi thật khi hai nơi tự đặt key khác nhau.
- `queryFn`: hàm gọi API thật.
- `enabled`: ô trống thì không gọi.
- `staleTime`: 5 phút trong đó kết quả coi là còn mới.
- `keepPreviousData`: đang chờ kết quả mới thì vẫn hiện kết quả cũ, màn hình không nháy "Đang tìm…".

Component dùng nó như dùng một biến:

```tsx
const { data: search, isFetching: searching } = useVocabSearchQuery(searchAllLessonsOn ? searchQuery : '');
```

Cấu hình chung (thử lại 2 lần, không tải lại khi quay về tab) nằm ở [src/app/providers.tsx](../apps/nihongo-web/src/app/providers.tsx): `QueryClientProvider` bọc toàn bộ app, nên mọi component bên trong đều dùng được `useQuery`.

**Thử:** mở DevTools (F12) → tab Network, gõ `kandou` vào ô tra từ ở `/vocab?lesson=1`. Bạn sẽ thấy đúng một request `vocabularies?q=kandou&limit=50` khi ngừng gõ, không phải sáu. (Ô tra trên mọi bài chỉ hiện khi feature flag `vocab-search-all-lessons` đang bật; tắt thì chỉ lọc trong bài hiện tại, không gọi API.)

## 9. Luật của hook

React nhớ state theo **thứ tự gọi hook**. Vì vậy:

- Chỉ gọi hook ở cấp ngoài cùng của component, **không** trong `if`, vòng lặp hay sau một `return` sớm.
- Chỉ gọi hook trong component hoặc trong hook khác (hàm tên `use…`).

Sai:

```tsx
if (!lesson) return null;
const [index, setIndex] = useState(0);   // lúc có, lúc không → React lẫn state
```

Đúng: khai báo mọi hook trước, rồi mới `return` sớm. Đó là lý do trong `VocabView` hàng loạt `useState`/`useQuery` nằm trên cùng.

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `Rendered more hooks than during the previous render` | Gọi hook trong `if` hoặc sau `return` sớm | Đưa mọi hook lên đầu component |
| Màn hình không đổi dù đã gán biến | Gán thẳng `x = …` thay vì gọi `setX(…)` | Luôn đổi state bằng hàm setter |
| Effect chạy vô tận, tab đơ | Effect gọi `setState` làm đổi chính giá trị trong mảng phụ thuộc | Xem lại mảng phụ thuộc; chỉ set khi giá trị thực sự khác |
| `useSearchParams() should be wrapped in a suspense boundary` | Next.js cần `<Suspense>` quanh component đọc URL | Bọc như `VocabPage` trong page.tsx |
| `Error: No QueryClient set` trong test | Vẽ component dùng `useQuery` mà không có `QueryClientProvider` | Bọc component bằng provider trong test, hoặc mock hook |
| Sửa code mà cổng 8080 không đổi | Cổng 8080 là bản build trong Docker | Dùng `npm run dev` (cổng 5173) khi học |

## Tự kiểm tra

1. Vì sao không được viết `currentIndex = currentIndex + 1` trong component?
<details><summary>Đáp án</summary>React không biết biến đã đổi nên không vẽ lại. Phải gọi `setCurrentIndex(...)`.</details>

2. Hàm `return` bên trong `useEffect` chạy khi nào?
<details><summary>Đáp án</summary>Trước lần chạy tiếp theo của chính effect đó (khi phụ thuộc đổi) và khi component biến mất khỏi màn hình.</details>

3. Gõ `tabe` thật nhanh vào ô tra từ, `useDebouncedValue(…, 300)` trả về những giá trị nào?
<details><summary>Đáp án</summary>Giá trị ban đầu, rồi chỉ `tabe` sau khi ngừng gõ 300 ms. `t`, `ta`, `tab` bị bỏ qua.</details>

4. Hai component cùng gọi `useVocabSearchQuery('kan')`. API bị gọi mấy lần?
<details><summary>Đáp án</summary>Một lần. Cùng `queryKey` nên dùng chung kết quả trong cache.</details>

5. `e.stopPropagation()` trong `SpeakEnglishButton` để làm gì?
<details><summary>Đáp án</summary>Chặn cú bấm lan ra thẻ từ vựng bao ngoài (thẻ đó phát tiếng Nhật khi bấm).</details>

6. Dòng `'use client'` ở đầu file nghĩa là gì?
<details><summary>Đáp án</summary>File chạy trên trình duyệt, được dùng state, effect, sự kiện bấm. Không có thì Next.js coi là server component.</details>

## Bài tập

1. **Đọc:** mở [src/views/VocabLessonListView.tsx](../apps/nihongo-web/src/views/VocabLessonListView.tsx), liệt kê mọi `useState` và ghi mỗi cái đổi khi nào. Tự kiểm: đổi được từng state bằng một thao tác trên trang `/vocab/list`.
2. **Viết hook:** tạo `src/hooks/useToggle.ts` trả về `[on, toggle]` (bấm một lần bật, lần nữa tắt). Viết test bằng `renderHook` như `useDebouncedValue.test.ts`. Tự kiểm: `npx vitest run src/hooks` xanh.
3. **Làm hỏng có chủ đích:** trong `useVocabSearchQuery`, xóa dòng `enabled: …`. Mở trang vocab, xóa trống ô tìm kiếm và xem tab Network. Giải thích request vừa xuất hiện, rồi `git checkout -- src/hooks/queries.ts`.
4. **Thêm component:** viết component `WordCount` nhận props `count: number` và hiện "50 từ"; dùng nó trong `VocabLessonListView`. Viết một test kiểm chữ hiện đúng. Tự kiểm: test xanh và trang hiện đúng số từ.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **8. Frontend web và desktop** — bài 1/6.

- **Bài tiếp: [roadmap-reactjs.md](./roadmap-reactjs.md)** — Lộ trình dài React + Next.js qua apps/nihongo-web

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
