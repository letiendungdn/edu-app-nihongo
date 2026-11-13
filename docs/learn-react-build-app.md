# Làm một trang React từ đầu đến cuối: gọi API, đăng nhập, form, lọc trên URL, test

> **Mục tiêu:** Học xong bài này bạn tự làm được một trang có dữ liệu thật cho project này hay bất kỳ app React/Next.js nào:
> - Thêm hàm gọi API vào lớp `api` có sẵn, khóa cache dạng cây, hook React Query.
> - Chặn trang khi chưa đăng nhập và quay lại đúng trang sau khi đăng nhập.
> - Làm form với react-hook-form + zod, hiện lỗi của server, không mất chữ khi lỗi.
> - Giữ bộ lọc trên URL; xóa "lạc quan" (optimistic) có trả lại khi lỗi.
> - Test như người dùng bấm, giả API bằng `vi.mock`; kiểm trên trình duyệt thật.
>
> **Cần biết trước:** [learn-react.md](./learn-react.md) (component, state, effect, hook, React Query cơ bản). API của tính năng: [learn-nestjs-build-api.md](./learn-nestjs-build-api.md).
>
> **Thời gian:** khoảng 8–12 giờ, chia 4 buổi.

Tính năng làm mẫu: trang **"Sổ từ của tôi"** (`/my-words`) và trang ôn tập (`/my-words/quiz`) trong [apps/nihongo-web](../apps/nihongo-web), gọi API `/api/personal-words` ở bài backend.

| Phần | File |
|---|---|
| Hàm gọi API | cuối [src/api/index.ts](../apps/nihongo-web/src/api/index.ts) (mục "Sổ từ vựng cá nhân") |
| Khóa cache | `personalWords` trong [src/api/query-keys.ts](../apps/nihongo-web/src/api/query-keys.ts) |
| Hook React Query | [src/hooks/usePersonalWords.ts](../apps/nihongo-web/src/hooks/usePersonalWords.ts) |
| Luật form | [src/utils/personalWordSchema.ts](../apps/nihongo-web/src/utils/personalWordSchema.ts) |
| Form | [src/components/PersonalWordForm.tsx](../apps/nihongo-web/src/components/PersonalWordForm.tsx) |
| Trang | [src/views/PersonalWordsView.tsx](../apps/nihongo-web/src/views/PersonalWordsView.tsx), [src/app/(main)/my-words/page.tsx](../apps/nihongo-web/src/app/%28main%29/my-words/page.tsx) |
| Ôn tập (Redux) | [learn-redux-state.md](./learn-redux-state.md) |
| Test | [PersonalWordsView.test.tsx](../apps/nihongo-web/src/views/PersonalWordsView.test.tsx) |

Đã chạy thật 13/11/2026: 7 test của trang qua, toàn bộ web 40 file / 198 test xanh, lint và `tsc` sạch; chạy trên Chrome thật qua nginx (bảng ở mục 9).

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| Server state | Dữ liệu gốc nằm trên server (danh sách từ); trình duyệt giữ bản sao có thể cũ. React Query lo phần này. |
| Query key | Địa chỉ trong cache React Query, dạng mảng: `['personal-words', 'list', 6]`. |
| Invalidate | Đánh dấu cache là cũ để React Query tải lại. |
| Optimistic update | Đổi màn hình trước khi server trả lời; lỗi thì trả lại. |
| Schema (zod) | Mô tả hình dạng và luật của dữ liệu; dùng cho form và sinh kiểu TypeScript. |
| Controlled/uncontrolled input | Ô nhập giữ giá trị trong state React / để DOM giữ. react-hook-form dùng kiểu sau nên form nhiều ô vẫn nhanh. |
| Suspense | Ranh giới React chờ một phần cây tải xong. Next.js bắt bọc component đọc URL (`useSearchParams`). |
| `vi.mock` | Thay một module bằng bản giả trong test (Vitest). |
| Hydration | React "gắn sự kiện" vào HTML server gửi xuống. Trước lúc đó, bấm nút không có tác dụng. |

## 1. Bản đồ: dữ liệu đi qua những đâu

```text
PersonalWordsView ──usePersonalWords(lesson)──▶ React Query cache ['personal-words','list',6]
       │                                              │ cache cũ / chưa có
       │                                              ▼
       │                                   fetchPersonalWords(6) ──apiRequest──▶ GET /api/personal-words?lesson=6&limit=200
       │                                                                         (gắn token, mở lớp {success,data}, 401 → làm mới token)
       └── PersonalWordForm ──onSubmit──▶ useCreatePersonalWord ──▶ POST … ──▶ invalidate ['personal-words'] → mọi danh sách tải lại
```

Quy tắc giữ code gọn khi app có hàng trăm màn: **component không gọi `fetch`**. Gọi API nằm ở `src/api`, cache ở hook, component chỉ dùng hook.

## 2. Lớp gọi API: dùng lại `apiRequest`

Web đã có một hàm cho mọi lời gọi — [`apiRequest`](../apps/nihongo-web/src/lib/api-client.ts). Đọc nó một lần để biết bạn được gì miễn phí:

- Gắn `Authorization: Bearer <token>` từ token đã lưu.
- `fetch` không ném lỗi với 4xx/5xx — `apiRequest` kiểm `res.ok` và ném `ApiError` mang `status` và câu `error.message` của server.
- Mở lớp phong bì `{ success: true, data }` của gateway — hàm của bạn nhận thẳng `data`.
- Gặp 401 → tự gọi làm mới token **một lần** rồi gửi lại ([interview-web.md](./interview-web.md) có câu về chuyện này).
- GET tự thử lại khi lỗi mạng; POST/DELETE **không** tự gửi lại (gửi lại có thể tạo trùng).

Vì vậy hàm của tính năng chỉ còn vài dòng — cuối [src/api/index.ts](../apps/nihongo-web/src/api/index.ts):

```ts
export interface PersonalWord {
  id: number;
  kana: string;
  meaning: string;
  lesson: number;
}

export interface PersonalWordPage {
  data: PersonalWord[];
  total: number;
  page: number;
  limit: number;
}

export function fetchPersonalWords(lesson?: number) {
  const qs = lesson ? `?lesson=${lesson}&limit=200` : '?limit=200';
  return apiRequest<PersonalWordPage>(`/personal-words${qs}`);
}

export function createPersonalWord(data: NewPersonalWord) {
  return apiRequest<PersonalWord>('/personal-words', { method: 'POST', body: JSON.stringify(data) });
}

export function deletePersonalWord(id: number) {
  return apiRequest<{ ok: true }>(`/personal-words/${id}`, { method: 'DELETE' });
}
```

Kiểu `PersonalWordPage` khớp đúng thứ backend trả (`{ data, total, page, limit }`) — mở Swagger hoặc gọi thử bằng curl trước khi viết kiểu, đừng đoán.

## 3. Khóa cache dạng cây

Mọi khóa của web nằm **một chỗ** — [src/api/query-keys.ts](../apps/nihongo-web/src/api/query-keys.ts). Đầu file ghi lại lỗi thật từng xảy ra khi hai nơi tự đặt khóa khác nhau. Thêm:

```ts
personalWords: {
  all: ['personal-words'] as const,
  list: (lesson?: number) => ['personal-words', 'list', lesson ?? 'all'] as const,
},
```

Dạng cây cho phép một lệnh `invalidateQueries({ queryKey: ['personal-words'] })` làm mới **mọi** danh sách (mọi bài) — thêm từ bài 6 thì danh sách "mọi bài" cũng phải đổi.

## 4. Hook React Query

[src/hooks/usePersonalWords.ts](../apps/nihongo-web/src/hooks/usePersonalWords.ts):

```ts
export function usePersonalWords(lesson: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.personalWords.list(lesson),
    queryFn: () => fetchPersonalWords(lesson),
    enabled,
  });
}

export function useCreatePersonalWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NewPersonalWord) => createPersonalWord(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.personalWords.all }),
  });
}
```

`enabled` nhận trạng thái đăng nhập: chưa đăng nhập thì **không** gọi API để nhận 401 (và không kích hoạt luồng làm mới token vô ích).

**Xóa lạc quan** — dòng biến mất ngay, server lỗi thì trả lại:

```ts
export function useDeletePersonalWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePersonalWord(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.personalWords.all });
      const previous = qc.getQueriesData<PersonalWordPage>({ queryKey: queryKeys.personalWords.all });
      qc.setQueriesData<PersonalWordPage>({ queryKey: queryKeys.personalWords.all }, (old) =>
        old ? { ...old, data: old.data.filter((w) => w.id !== id), total: old.total - 1 } : old,
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.personalWords.all }),
  });
}
```

- `cancelQueries` trước: một lần tải đang chạy dở trả về **sau** khi đã xóa khỏi cache sẽ ghi đè, dòng vừa xóa hiện lại.
- `getQueriesData`/`setQueriesData` (số nhiều): từ có thể nằm trong nhiều danh sách cùng lúc (mọi bài, bài 6) — sửa hết, chụp lại hết để trả lại.
- Chỉ dùng optimistic cho thao tác gần như luôn thành công và dễ hoàn tác. Thanh toán, nộp bài thi thì đợi server.

## 5. Trang: chặn khi chưa đăng nhập, bộ lọc trên URL

[src/views/PersonalWordsView.tsx](../apps/nihongo-web/src/views/PersonalWordsView.tsx) (rút gọn):

```tsx
export default function PersonalWordsView() {
  const { isAuthenticated, authReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const lessonParam = Number(params.get('lesson'));
  const lesson = Number.isInteger(lessonParam) && lessonParam > 0 ? lessonParam : undefined;

  const { data, isPending, isError, error, refetch } = usePersonalWords(lesson, isAuthenticated);
  const create = useCreatePersonalWord();
  const remove = useDeletePersonalWord();

  const setLesson = (value: string) => router.replace(value ? `${pathname}?lesson=${value}` : pathname);

  if (!authReady) return null; // đang đọc token đã lưu
  if (!isAuthenticated) {
    return <p><Link href="/login?redirect=/my-words">Đăng nhập</Link> để lưu từ vựng của riêng bạn.</p>;
  }

  return (
    <section className="pw-page">
      <PersonalWordForm serverError={create.error?.message} onSubmit={(d) => create.mutateAsync(d)} />
      <select aria-label="Lọc theo bài" value={lesson ?? ''} onChange={(e) => setLesson(e.target.value)}>…</select>
      {isPending ? (
        <p>Đang tải…</p>
      ) : isError ? (
        <div role="alert">{error.message} <button onClick={() => refetch()}>Thử lại</button></div>
      ) : data.data.length === 0 ? (
        <p>Chưa có từ nào{lesson ? ` trong bài ${lesson}` : ''}.</p>
      ) : (
        <ul>{data.data.map((w) => <li key={w.id}>…</li>)}</ul>
      )}
    </section>
  );
}
```

- **`authReady`**: lúc mới mở trang, token đang được đọc từ localStorage. Không đợi cờ này, trang sẽ nháy "mời đăng nhập" với người đã đăng nhập.
- **`?redirect=/my-words`**: trang login của project đọc tham số tên `redirect` ([LoginPage.tsx](../apps/nihongo-web/src/views/auth/LoginPage.tsx)). Bản đầu viết `?next=` theo thói quen — đăng nhập xong không quay lại đúng trang. Luôn đọc code nơi nhận tham số.
- **Bộ lọc trên URL**: F5, gửi link, nút Back đều giữ đúng bài. `router.replace` (không phải `push`) để mỗi lần đổi bộ lọc không thêm một mục vào lịch sử Back.
- **Đủ 4 trạng thái**: đang tải, lỗi có nút thử lại, rỗng (kèm bài đang lọc), có dữ liệu.
- **`key={w.id}`**, không dùng index: xóa dòng đầu thì index lệch hết.
- Xóa có `window.confirm` — thao tác không hoàn tác phải hỏi lại.

[src/app/(main)/my-words/page.tsx](../apps/nihongo-web/src/app/%28main%29/my-words/page.tsx) bọc view trong `<Suspense>` — thiếu là Next.js báo `useSearchParams() should be wrapped in a suspense boundary` khi build.

Mục menu: một dòng trong [src/config/nav.ts](../apps/nihongo-web/src/config/nav.ts) — `{ href: '/my-words', icon: '帳', label: 'Sổ từ của tôi' }`. Menu và thẻ trang chủ đọc cùng danh sách này.

## 6. Form: react-hook-form + zod

Luật viết **một lần** — [src/utils/personalWordSchema.ts](../apps/nihongo-web/src/utils/personalWordSchema.ts), cùng luật với DTO ở gateway:

```ts
export const personalWordSchema = z.object({
  kana: z
    .string()
    .trim()
    .min(1, 'Nhập cách đọc')
    .regex(/^[぀-ヿ]+$/, 'Chỉ dùng hiragana hoặc katakana'),
  meaning: z.string().trim().min(1, 'Nhập nghĩa').max(100, 'Nghĩa tối đa 100 ký tự'),
  lesson: z.coerce.number({ error: 'Bài phải là số' }).int('Bài phải là số nguyên').min(1, 'Bài từ 1 tới 50').max(50, 'Bài từ 1 tới 50'),
});
```

[src/components/PersonalWordForm.tsx](../apps/nihongo-web/src/components/PersonalWordForm.tsx):

```tsx
const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
  useForm<PersonalWordInput, unknown, PersonalWordValues>({
    resolver: zodResolver(personalWordSchema),
    defaultValues: { kana: '', meaning: '', lesson: 1 },
  });

<form noValidate onSubmit={handleSubmit(async (data) => {
  try {
    await onSubmit(data);
    reset(); // chỉ xóa form khi lưu thành công
  } catch {
    // lỗi server hiện qua serverError; giữ nguyên chữ đã nhập để sửa
  }
})}>
  <label>
    Cách đọc
    <input {...register('kana')} aria-invalid={!!errors.kana} />
  </label>
  {errors.kana && <p role="alert">{errors.kana.message}</p>}
  …
  <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang lưu…' : 'Thêm vào sổ'}</button>
</form>
```

- `z.coerce.number()`: `<input type="number">` luôn trả chuỗi `"6"`.
- `useForm<Input, unknown, Output>`: kiểu trước kiểm (lesson có thể là chuỗi) và sau kiểm (chắc là số) — `data` trong `handleSubmit` đã đúng kiểu `NewPersonalWord`.
- **`try/catch` quanh `onSubmit`**: trang truyền `create.mutateAsync`, hàm này **ném lỗi** khi server trả 409. Không bắt thì thành lỗi không ai xử lý ("unhandled rejection") và `reset()` vẫn chạy — người dùng mất chữ vừa gõ. Thông báo của server ("Từ này đã có trong sổ") đi qua `create.error.message`.
- `isSubmitting` khóa nút: bấm hai lần không tạo hai bản ghi.
- `<label>` bọc `<input>`: bấm chữ là focus ô, trình đọc màn hình đọc đúng tên, test tìm ô bằng `getByLabelText('Cách đọc')`.

Cần cài: `npm install -w @edu/nihongo-web react-hook-form zod @hookform/resolvers`.

## 7. Test

[src/views/PersonalWordsView.test.tsx](../apps/nihongo-web/src/views/PersonalWordsView.test.tsx). Web giả API bằng `vi.mock` — không gọi mạng:

```tsx
const api = vi.hoisted(() => ({
  fetchPersonalWords: vi.fn(),
  createPersonalWord: vi.fn(),
  deletePersonalWord: vi.fn(),
}));
vi.mock('../api', () => api);

const auth = vi.hoisted(() => ({ isAuthenticated: true, authReady: true }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }));

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => nav.params,
  usePathname: () => '/my-words',
  useRouter: () => ({ replace: nav.replace }),
}));

function renderView() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><PersonalWordsView /></QueryClientProvider>);
}
```

- **`vi.hoisted`**: `vi.mock` được Vitest đưa lên đầu file, chạy trước mọi dòng khác. Biến dùng trong nó phải tạo bằng `vi.hoisted` — viết `const api = {…}` thường sẽ gặp lỗi dạng `Cannot access '…' before initialization`.
- Giả cả `next/navigation`: test không có router của Next.
- `retry: false`: test lỗi không phải đợi React Query thử lại.

Bảy test, mỗi test một hành vi người dùng thấy:

| Test | Kiểm |
|---|---|
| chưa đăng nhập | link `href="/login?redirect=/my-words"`, **không** gọi API |
| danh sách + bộ lọc từ URL | `?lesson=6` → gọi `fetchPersonalWords(6)`, hiện "1 từ" |
| đổi bộ lọc | `router.replace('/my-words?lesson=3')` |
| rỗng và lỗi | lỗi có nút "Thử lại", bấm xong hiện "Chưa có từ nào." |
| form sai luật | 2 dòng lỗi, không gọi API |
| server báo trùng | hiện "Từ này đã có trong sổ", ô vẫn còn `わたし` |
| xóa lạc quan | server **chưa trả lời** mà dòng đã biến mất |

Test xóa lạc quan giữ lời gọi xóa bằng một Promise chưa xong để chứng minh "biến mất trước khi server trả lời":

```tsx
let resolveDelete: () => void = () => {};
api.deletePersonalWord.mockReturnValue(new Promise<void>((r) => (resolveDelete = r)));
vi.spyOn(window, 'confirm').mockReturnValue(true);
renderView();
await userEvent.click(await screen.findByRole('button', { name: 'Xóa わたし' }));
await waitFor(() => expect(screen.queryByText('わたし')).not.toBeInTheDocument());
resolveDelete();
```

```bash
cd apps/nihongo-web
npx vitest run src/views/PersonalWordsView.test.tsx
npm run test:run && npm run lint && npx tsc --noEmit
```

```
 Test Files  40 passed (40)
      Tests  198 passed (198)
```

## 8. Build lại container

Trang qua nginx cổng 8080 là bản build trong container `edu-nihongo-web`:

```bash
docker compose build nihongo-web && docker compose up -d nihongo-web
curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/my-words     # 200
```

Khi học, `npm run dev` (cổng 5173) cho nhanh; trước khi báo "xong" thì kiểm bản build — lỗi Suspense ở mục 5 chỉ lộ ra lúc build.

## 9. Kiểm trên trình duyệt thật

Test với `vi.mock` chứng minh component đúng; trình duyệt thật chứng minh **cả hệ thống** đúng (API, token, nginx, login). Kết quả khi chạy bằng Chrome không giao diện (puppeteer-core):

| Thao tác | Thấy |
|---|---|
| Mở `/my-words` khi chưa đăng nhập | "Đăng nhập để lưu từ vựng của riêng bạn." |
| Bấm "Đăng nhập" | Sang `/login?redirect=/my-words` |
| Đăng nhập (Dev login) | Tự quay về `/my-words`, form + bộ lọc hiện ra |
| Thêm `abc`, nghĩa trống, bài 99 | `Chỉ dùng hiragana hoặc katakana`, `Nhập nghĩa`, `Bài từ 1 tới 50` |
| Thêm 3 từ | "3 từ", đủ ba dòng |
| Thêm lại `わたし` | `Từ này đã có trong sổ` |
| Lọc Bài 6 | URL `/my-words?lesson=6`, "1 từ" |
| F5 | Vẫn `?lesson=6`, ô chọn vẫn là 6 |
| Xóa `ねこ` | Hộp hỏi `Xóa "ねこ" khỏi sổ?`; còn "2 từ" |
| Lỗi JavaScript trên trang | Không có |

> **Ba bẫy khi tự động hóa trình duyệt** (gặp thật, đều là lỗi của **script kiểm thử**, không phải của app):
> - Trang login có Keycloak thì form email bị ẩn sau nút "Dev login". Bấm nút đó **ngay khi trang vừa tải** thì không có tác dụng: HTML có sẵn từ server nhưng React chưa hydrate. Bấm lại cho tới khi ô email hiện ra.
> - Xóa ô bằng "bấm ba lần để bôi đen" không ổn định: khi dòng báo lỗi chen vào, bố cục dịch xuống và lần bấm chỉ xóa một ký tự (`abc` thành `ab` + chữ mới). Đưa con trỏ về cuối rồi xóa đúng số ký tự.
> - Selector XPath `xpath///…` không khớp ở bản puppeteer mới; tìm nút bằng `page.evaluate` theo chữ trên nút.

## 10. Danh sách kiểm cho trang tiếp theo

1. Gọi thử API bằng curl/Swagger, viết kiểu TypeScript theo đúng response.
2. Hàm API dùng `apiRequest`; khóa cache dạng cây trong `query-keys.ts`.
3. Hook: `enabled` theo đăng nhập; mutation invalidate gốc; optimistic chỉ khi dễ hoàn tác.
4. Trang: đợi `authReady`; link login có `redirect`; 4 trạng thái; bộ lọc trên URL bằng `router.replace`; `key` theo id.
5. Form: schema zod dùng chung luật với backend; `try/catch` quanh `mutateAsync`; khóa nút khi gửi.
6. `page.tsx` bọc Suspense nếu đọc URL; thêm vào `nav.ts`.
7. Test: `vi.hoisted` + `vi.mock` cho API, auth, router; mỗi trạng thái một test; làm hỏng thử.
8. `test:run`, `lint`, `tsc`; build container; đi hết các luồng trên trình duyệt thật.

## 11. Khi bạn tự tạo app React mới (Vite)

Mình đã thử dựng một app Vite + React 19 trống (13/11/2026) với React Router 8, MSW 3, zod 4. Những điều khác hướng dẫn cũ:

| Gặp | Làm gì |
|---|---|
| `This syntax is not allowed when 'erasableSyntaxOnly' is enabled` (`constructor(public x)`, `enum`) | Khai báo field thường; thay `enum` bằng object `as const` |
| MSW 3: `'onUnhandledRequest' does not exist` | Đổi tên thành `onUnhandledFrame` |
| `[MSW] Failed to register the Service Worker` | `npx msw init public --save` |
| Request đầu đi ra mạng thật khi dev | `await worker.start()` rồi mới render |
| SPA trên nginx: mở thẳng `/words/7` ra 404 | `try_files $uri /index.html;` |
| Biến `VITE_*` chứa bí mật | Không: nó nằm trong file JS gửi xuống trình duyệt (giống `NEXT_PUBLIC_*`) |

Project này dùng Next.js (App Router) nên có sẵn router, build, chia code theo trang; app Vite thì tự thêm React Router.

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Đăng nhập xong không quay lại trang cũ | Tham số sai tên (`next` thay vì `redirect`) | Đọc trang nhận tham số; project dùng `?redirect=` |
| Trang nháy "mời đăng nhập" với người đã đăng nhập | Không đợi `authReady` | `if (!authReady) return null` |
| Build: `useSearchParams() should be wrapped in a suspense boundary` | Thiếu Suspense ở `page.tsx` | Bọc view trong `<Suspense>` |
| Thêm xong danh sách "mọi bài" không đổi | Chỉ invalidate khóa của bài đang xem | Invalidate gốc `['personal-words']` |
| Xóa xong dòng nháy hiện lại | Không `cancelQueries` trước optimistic | Thêm bước hủy |
| Form mất chữ khi server báo 409; console có `Uncaught (in promise)` | `mutateAsync` ném lỗi không ai bắt | `try/catch`, chỉ `reset()` khi thành công |
| Test: `Cannot access '…' before initialization` | Biến dùng trong `vi.mock` tạo thường | `vi.hoisted(() => …)` |
| Test: `No QueryClient set` | Thiếu Provider | Bọc `QueryClientProvider` trong hàm render của test |
| Thông báo lỗi tiếng Anh từ API | DTO thiếu `message` | Sửa ở backend ([learn-nestjs-build-api.md](./learn-nestjs-build-api.md) mục 4) |
| Sửa code mà cổng 8080 không đổi | Bản build cũ trong container | `docker compose build nihongo-web` |

## Tự kiểm tra

1. Vì sao không chép danh sách từ vào Redux hay `useState` mà dùng React Query?
<details><summary>Đáp án</summary>Đó là server state: React Query lo cache, tải lại, trạng thái tải/lỗi, hủy lần tải cũ. Tự chép là phải làm lại hết và dễ lệch với server.</details>

2. Vì sao `usePersonalWords` có tham số `enabled`?
<details><summary>Đáp án</summary>Chưa đăng nhập thì không gọi API — tránh 401 vô ích và luồng làm mới token.</details>

3. `router.replace` khác `router.push` ở đâu khi đổi bộ lọc?
<details><summary>Đáp án</summary>`replace` thay mục lịch sử hiện tại; `push` thêm mục mới — đổi lọc 5 lần thì phải bấm Back 5 lần mới rời trang.</details>

4. Vì sao optimistic delete dùng `setQueriesData` (số nhiều)?
<details><summary>Đáp án</summary>Một từ có thể nằm trong nhiều danh sách đang cache (mọi bài, bài 6). Phải sửa và chụp lại tất cả để trả lại khi lỗi.</details>

5. Test "chưa đăng nhập" kiểm thêm điều gì ngoài link?
<details><summary>Đáp án</summary>Không gọi `fetchPersonalWords` — chứng minh `enabled` hoạt động.</details>

## Bài tập

1. **Sửa từ:** thêm `updatePersonalWord` (PATCH), nút "Sửa" mở form với giá trị sẵn (`reset(word)`). Tự kiểm: test sửa thành công; trình duyệt thấy nghĩa mới.
2. **Tìm kiếm có debounce:** ô tìm trong trang, chữ tìm lưu trên URL `?q=`, dùng `useDebouncedValue` ([learn-react.md](./learn-react.md) mục 6). Cần backend có `?q=` ([learn-nestjs-build-api.md](./learn-nestjs-build-api.md) bài tập 1).
3. **Xóa thất bại:** test `deletePersonalWord` bị từ chối → dòng hiện lại. Tự kiểm: bỏ `onError` trong hook thì test đỏ.
4. **Lưu từ giáo trình:** trên trang từ vựng (`/vocab`), thêm nút "Lưu vào sổ" gọi `createPersonalWord` với kana/nghĩa/bài của thẻ đang xem. Tự kiểm: lưu xong mở `/my-words` thấy từ đó; lưu lại lần hai thấy thông báo trùng.
5. **Trang của bạn:** trang "Ghi chú theo bài" cho API ở bài tập 5 của bài backend. Đi đủ 8 bước ở mục 10.

## Luyện phỏng vấn

Câu hỏi React, Next.js, React Query, form: [interview-web.md](./interview-web.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **8. Frontend web và desktop** — bài 2/8.

- Bài trước: [learn-react.md](./learn-react.md) — React qua web Nihongo: component, state, effect, custom hook, React Query, test
- **Bài tiếp: [learn-redux-state.md](./learn-redux-state.md)** — Quản lý state: Redux Toolkit (trang ôn sổ từ), selector, Thunk, RTK Query, Saga, Zustand, Context — chọn cái nào khi nào

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
