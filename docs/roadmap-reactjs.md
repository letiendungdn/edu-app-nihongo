# Lộ trình ReactJS — `apps/nihongo-web`

> **Lộ trình học** (React 19 + Next.js + TanStack Query), không phải bảng status feature.  
> App thật: `nihongo-web` (Next 15). Chạy dev (`npm run dev:nihongo-web`): cổng **5173**. Chạy bằng Docker: vào qua nginx ở **8080** (container web nghe cổng 8080, không mở ra máy).  
> Build và tối ưu bundle: [learn-webpack.md](./learn-webpack.md).  
> Chạy: [run-local.md](./run-local.md) · Docker: [learn-docker.md](./learn-docker.md) · Mobile RN: [roadmap-react-native.md](./roadmap-react-native.md).

---

## Mục tiêu sau lộ trình

Đọc / sửa được app Next trong monorepo: component + hooks, React Query data layer, auth context (JWT + Google + Keycloak OIDC), Stripe Elements checkout, chat REST poll, test Vitest + Testing Library, Storybook.

| Công cụ trong repo | App | Ghi chú |
|--------------------|-----|---------|
| React **19** + Next.js 15 | nihongo-web | App Router |
| `@tanstack/react-query` v5 | nihongo-web | Data fetching + poll chat 5–8s |
| `@tanstack/react-virtual` | nihongo-web | List dài (vocab) |
| `@react-oauth/google` + `oidc-client-ts` | nihongo-web | Google + Keycloak |
| `@stripe/react-stripe-js` | nihongo-web | Elements checkout |
| `socket.io-client` | nihongo-web | Video call 1-1 (signaling :3002) |
| `recharts`, `fabric`, `hanzi-writer`, `mapbox-gl` | nihongo-web | Chart / whiteboard / stroke order / bản đồ |
| Vitest + Testing Library + Storybook | nihongo-web | `npm run test` / `npm run storybook` |

---

## GIAI ĐOẠN 1 — JavaScript/TypeScript + React core (tuần 1–3)

```tsx
// 1. Function component + props — pattern duy nhất trong repo (không class)
interface VocabCardProps {
  vocab: Vocabulary;
  onReview?: (id: number) => void;
}

export function VocabCard({ vocab, onReview }: VocabCardProps) {
  // 2. useState — state cục bộ
  const [flipped, setFlipped] = useState(false);

  // 3. useEffect — side effect, cleanup
  useEffect(() => {
    const timer = setTimeout(() => setFlipped(false), 5000);
    return () => clearTimeout(timer);
  }, [flipped]);

  // 4. Event + conditional render
  return (
    <div onClick={() => setFlipped((f) => !f)}>
      {flipped ? vocab.meaning : vocab.kana}
    </div>
  );
}

// 5. useMemo / useCallback — chỉ khi đo được re-render tốn kém
const sorted = useMemo(() => [...vocabs].sort(byLesson), [vocabs]);
```

Đọc trong repo: `src/components/VocabCard.tsx`, `src/hooks/useAutoHideHeader.ts`.

**Tài liệu:** [react.dev](https://react.dev/learn) — đọc hết phần Learn · [Hooks API](https://react.dev/reference/react/hooks).

**Checkpoint giai đoạn 1:** giải thích được dependency array + cleanup của `useEffect`; controlled vs uncontrolled input.

---

## Hooks cần học (bắt buộc — đừng bỏ qua)

Giai đoạn 1 ở trên **không đủ** nếu chỉ nhớ 4 hook. Phỏng vấn + đọc `nihongo-web` cần bảng dưới.

### A. Built-in hooks (React)

| Hook | Khi nào dùng | Chỗ xem trong repo |
|------|--------------|-------------------|
| `useState` | State UI cục bộ (flip card, tab, form field) | Hầu hết `views/*` |
| `useEffect` | Subscribe / timer / sync DOM / gọi API *một lần* (ưu tiên React Query cho data) | `useAutoHideHeader`, `useSpeechRecognition`, `usePresence` |
| `useRef` | Giữ mutable value **không** trigger re-render; DOM node (audio, canvas, video) | `useAudioRecorder`, `useVideoCall`, `FabricCanvas`, `ListeningPlayer` |
| `useContext` | Đọc Auth / Theme từ Provider | `useAuth` → `AuthContext`; `useTheme` → `lib/theme.tsx` |
| `useMemo` | Tính toán đắt / giữ reference ổn định cho list lớn | Sort/filter vocab; props xuống memo child |
| `useCallback` | Ổn định hàm truyền xuống child/`useEffect` deps | Handler trong list ảo / player |
| `useReducer` | State máy (nhiều action) — interview hay hỏi; repo ít dùng (mock exam gần pattern này bằng nhiều `useState`) | Học theory + so với `MockExamTakePage` |
| `useLayoutEffect` | Đo layout *trước* paint (hiếm) | Biết khác `useEffect`; đừng dùng mặc định |
| `useId` | id ổn định cho a11y / SSR | Form label nếu hydrate |

**Rules of Hooks (thuộc lòng):**
1. Chỉ gọi hook ở top-level component/custom hook (không trong `if` / loop).
2. Custom hook = hàm tên `useXxx`, được gọi hooks bên trong.
3. Dependency array thiếu/thừa = bug im lặng (stale closure).

**React 19 (biết tên, không bắt buộc sâu trên repo này):** `use`, `useOptimistic`, `useActionState` — hay gặp với Server Actions; `nihongo-web` là thin client nên **ưu tiên hooks bảng trên + React Query**.

### B. Custom hooks trong `nihongo-web` (học bằng cách đọc)

| Hook | File | Học được gì |
|------|------|-------------|
| `useAuth` | `src/hooks/useAuth.ts` | Thin wrapper quanh Context |
| `useVocab` / `useGrammar` / `useLessons` | `src/api/hooks/` | React Query `useQuery` pattern |
| `useVocabReview` | `src/api/hooks/use-vocab-review.ts` | Query + mutation batch |
| `useSupportThreadQuery` / community hooks | `src/hooks/queries.ts` | `refetchInterval` poll 5–8s |
| `useAutoHideHeader` | `src/hooks/useAutoHideHeader.ts` | scroll listener + cleanup |
| `useSpeechRecognition` | `src/hooks/useSpeechRecognition.ts` | Web API + `useEffect` lifecycle |
| `useAudioRecorder` | `src/hooks/useAudioRecorder.ts` | `useRef` MediaRecorder + state |
| `usePlayAll` | `src/hooks/usePlayAll.ts` | queue phát audio tuần tự |
| `useDailyListeningSession` / `usePodcastTimer` / `useMinnaListeningPlayer` | `src/hooks/useDailyListeningSession.ts` | timer + player state phức tạp |
| `useVideoCall` | `src/hooks/useVideoCall.ts` | socket.io + WebRTC + nhiều `useEffect`/`useRef` |
| `usePresence` | `src/hooks/usePresence.ts` | heartbeat / online status |
| `usePageBanner` | `src/hooks/usePageBanner.ts` | UI preference hook |
| `useTheme` | `src/lib/theme.tsx` | Context + localStorage |

### C. Library hooks (coi như “phải biết”)

| Hook | Package | Dùng để |
|------|---------|---------|
| `useQuery` / `useMutation` / `useQueryClient` | `@tanstack/react-query` | Data layer chính — giai đoạn 3 |
| `useVirtualizer` | `@tanstack/react-virtual` | List dài (vocab) |
| `useStripe` / Elements hooks | `@stripe/react-stripe-js` | Checkout |

### D. Bài tập hooks (làm đủ 3)

1. Viết `useToggle(initial)` bằng `useState` + `useCallback`.
2. Viết `useInterval(fn, ms)` với cleanup đúng (xem pattern timer trong `useDailyListeningSession`).
3. Đọc `useVideoCall` hoặc `useAudioRecorder` — vẽ sơ đồ: cái nào `useState`, cái nào `useRef`, effect nào cleanup.

**Checkpoint hooks:** giải thích được *khi nào `useRef` thay `useState`*; *vì sao data fetching không nhét `useEffect` + `fetch` nếu đã có React Query*; kể tên ≥ 5 custom hook trong repo và việc của chúng.

---

## GIAI ĐOẠN 2 — Next.js App Router (tuần 4–6)

```
apps/nihongo-web/
  app/               # routes (App Router) — page.tsx, layout.tsx
  src/
    views/           # màn hình lớn (SrsView, KanjiView, MockExam…)
    components/      # UI tái sử dụng (VocabCard, AppLayout, AdminShell)
    hooks/           # useAuth, useSpeechRecognition, useVideoCall…
    api/             # api client + hooks React Query (use-vocab, use-grammar)
    contexts/        # AuthContext
    lib/             # keycloak, theme, call-session
    utils/           # thuần logic — dễ test nhất
```

| Khái niệm | Chỗ xem |
|-----------|---------|
| `page.tsx` / `layout.tsx` | `app/` |
| Client component (`'use client'`) | hầu hết views — app là thin client |
| Rewrite `/api/*` → gateway :3000 | `next.config` — **không** Route Handler gọi DB |
| PWA | `@ducanh2912/next-pwa` |

**Lưu ý kiến trúc:** frontend là thin client — mọi data qua `api-gateway` ([system-design.md](./system-design.md)). Đừng học Server Actions / RSC data fetching như pattern chính ở đây.

**Checkpoint:** thêm một route mới trong `app/` render một view đơn giản, dùng `AppLayout`.

---

## GIAI ĐOẠN 3 — Data layer: React Query (tuần 7–9)

```tsx
// src/api/hooks/use-vocab.ts — pattern trong repo
export function useVocab(lessonNumber: number) {
  return useQuery({
    queryKey: ['vocab', lessonNumber],
    queryFn: () => apiFetch<Vocabulary[]>(`/vocabularies?lessonNumber=${lessonNumber}`),
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation + invalidate
const queryClient = useQueryClient();
const review = useMutation({
  mutationFn: (body: ReviewBody) => apiFetch('/progress/review', { method: 'POST', body }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['srs'] }),
});

// Chat / notifications — poll thay socket (xem core-flows.md)
useQuery({ queryKey: ['support'], queryFn: fetchThread, refetchInterval: 5000 });
```

Cần nắm: `queryKey` design, `staleTime` vs `refetchInterval`, invalidation sau mutation, `enabled` cho query phụ thuộc auth.

Đọc: `src/api/index.ts`, `src/api/hooks/`, `src/hooks/__tests__/useVocab.test.tsx`.

**Checkpoint:** vẽ được flow một mutation review SRS → invalidate → UI cập nhật, và giải thích vì sao chat dùng poll 5–8s.

---

## GIAI ĐOẠN 4 — Auth + payment (tuần 10–12)

| Flow | Chỗ xem |
|------|---------|
| JWT login + refresh | `src/contexts/AuthContext.tsx`, `src/hooks/useAuth.ts` |
| Google Sign-In | `src/components/GoogleSignInButton.tsx` (`@react-oauth/google`) |
| Keycloak OIDC | `src/lib/keycloak.ts` (`oidc-client-ts`) — [keycloak-setup.md](./keycloak-setup.md) |
| Stripe checkout | `src/components/SubscriptionCheckoutPanel.tsx`, `src/views/CheckoutView.tsx` |
| Webhook phía server | gateway — [system-design.md](./system-design.md) §3.2 |

```tsx
// Context pattern — một provider ở layout, hook để đọc
const { user, login, logout } = useAuth();
```

**Checkpoint:** login 3 cách chạy được local; theo dõi Network thấy Bearer token + refresh; test Stripe với `npm run stripe:listen` ([run-local.md](./run-local.md)).

---

## GIAI ĐOẠN 5 — Feature map + state nâng cao (tuần 13–16)

Học bằng cách đọc feature thật:

| Feature | View / component | Điểm hay |
|---------|------------------|----------|
| SRS review | `views/SrsView.tsx` | Mutation + queue |
| Mock exam | `views/MockExam*` | State machine làm bài |
| Kanji practice | `views/KanjiPracticeView.tsx` + `hanzi-writer` | Canvas stroke |
| Whiteboard | `views/WhiteboardView.tsx` + `fabric` | Canvas library |
| Video call 1-1 | `hooks/useVideoCall.ts` + `components/VideoCallUI/` | WebRTC + socket.io |
| Support chat | `components/SupportChatPanel.tsx` | REST poll |
| Speech | `hooks/useSpeechRecognition.ts`, `useAudioRecorder.ts` | Web APIs |
| Admin | `views/admin/`, `components/AdminShell.tsx` | RBAC UI |
| Analytics | `recharts` views | Chart |

**State:** repo dùng Context + React Query — **không Redux**, không Zustand. Chỉ học Redux Toolkit / Zustand nếu job yêu cầu.

**Bài tập (chọn 2):**

1. Thêm filter lesson vào một list view (reuse pattern `useVocab`).
2. Gom một UI preference (vd. thu gọn sidebar) vào Context riêng thay vì prop drilling.
3. Virtual hóa một list dài bằng `@tanstack/react-virtual` (xem chỗ đã dùng).

---

## GIAI ĐOẠN 6 — Testing + Storybook + build (tuần 17–20)

```powershell
# Test (Vitest + Testing Library, jsdom)
npm run test:run -w @edu/nihongo-web

# Storybook — component isolation
npm run storybook -w @edu/nihongo-web   # :6006

# Build production
npm run build -w @edu/nihongo-web

# Full Docker
npm run docker:up:nihongo   # → http://localhost:8080
```

| Loại test | Ví dụ trong repo |
|-----------|-------------------|
| Hook + React Query | `src/hooks/__tests__/useVocab.test.tsx` |
| Util thuần | `src/utils/__tests__/dailyGoals.test.ts` |
| Story | `VocabCard.stories.tsx`, `ListeningPlayer.stories.tsx` |

**Checkpoint senior nhẹ:** viết một test hook mới có mock `apiFetch`, chạy xanh; giải thích rewrite `/api` hoạt động khác nhau giữa `next dev` và Docker/nginx.

---

## Lịch gợi ý (tóm tắt)

| Giai đoạn | Thời gian | Kết quả |
|-----------|-----------|---------|
| 1 TS + React core + **hooks** | 3–4 tuần | Built-in + đọc custom hooks repo |
| 2 Next App Router | 3 tuần | Thêm route mới |
| 3 React Query | 3 tuần | Query/mutation/invalidate |
| 4 Auth + Stripe | 3 tuần | 3 login flow + checkout |
| 5 Features + state | 4 tuần | Sửa 1–2 feature thật |
| 6 Test + Storybook | 3–4 tuần | Test + story + build Docker |

---

## Thứ tự đọc file trong repo

1. `apps/nihongo-web/package.json` — dependency thật
2. Section **Hooks cần học** ở trên + `src/hooks/useAutoHideHeader.ts` + `useAudioRecorder.ts`
3. `src/api/index.ts` + `src/api/hooks/use-vocab.ts`
4. `src/contexts/AuthContext.tsx` + `src/hooks/useAuth.ts`
5. `src/components/AppLayout.tsx` + một view: `views/SrsView.tsx`
6. `src/hooks/useVideoCall.ts` (hooks nâng cao) hoặc `useDailyListeningSession.ts`
7. `src/hooks/__tests__/useVocab.test.tsx`
8. [system-design.md](./system-design.md) — thin client + gateway

---

## Câu hỏi tự kiểm tra

1. Vì sao đổi `queryKey` là cách "refetch" đúng hơn gọi lại thủ công?
2. `staleTime` khác `cacheTime`/`gcTime` thế nào?
3. Access token lưu đâu, refresh token lưu đâu? Trade-off?
4. Khi nào cần `useCallback`? Khi nào là premature optimization?
5. Vì sao app không có Route Handler đọc DB dù là Next.js?
6. `useRef` vs `useState` — ví dụ từ `useAudioRecorder` hoặc `useVideoCall`?
7. Vì sao không `useEffect(() => fetch(...))` cho vocab list nếu đã có `useQuery`?
8. Rules of Hooks: gọi hook trong `if` được không? Vì sao?

---

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [run-local.md](./run-local.md) | `dev:nihongo-web` :5173 |
| [roadmap-react-native.md](./roadmap-react-native.md) | React Native (Expo mobile) |
| [system-design.md](./system-design.md) | Thin client, gateway, auth |
| [keycloak-setup.md](./keycloak-setup.md) | OIDC client web |
| [learn-edu-app.md](./learn-edu-app.md) | Lộ trình monorepo tổng |
| [React docs](https://react.dev/) · [Next.js docs](https://nextjs.org/docs) · [TanStack Query](https://tanstack.com/query/latest) | Official |

## Luyện phỏng vấn

Câu hỏi phỏng vấn kèm đáp án cho phần web (React, Next.js, JavaScript/TypeScript, HTTP, webpack): [interview-web.md](./interview-web.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **8. Frontend web và desktop** — bài 4/8.

- Bài trước: [learn-redux-state.md](./learn-redux-state.md) — Quản lý state: Redux Toolkit (trang ôn sổ từ), selector, Thunk, RTK Query, Saga, Zustand, Context — chọn cái nào khi nào
- **Bài tiếp: [learn-webpack.md](./learn-webpack.md)** — Webpack qua bản build của web: chia chunk, đo và giảm dung lượng

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
