# Phỏng vấn Web: React, Next.js, JavaScript/TypeScript, HTTP, webpack

> **Mục tiêu:** Trả lời được câu hỏi phỏng vấn frontend web thường gặp, mỗi câu dẫn được ví dụ thật trong [apps/nihongo-web](../apps/nihongo-web).
>
> **Cần biết trước:** [learn-js-ts.md](./learn-js-ts.md), [learn-web-http.md](./learn-web-http.md), [learn-react.md](./learn-react.md), [learn-webpack.md](./learn-webpack.md). Lộ trình dài React/Next.js: [roadmap-reactjs.md](./roadmap-reactjs.md).

Cách dùng: đọc câu hỏi, tự trả lời thành tiếng 1–2 phút, rồi mới mở đáp án. Câu trả lời ghi điểm là câu có **ví dụ cụ thể và cái giá phải trả**; phần "Trong project" là ví dụ bạn dùng được.

Mức độ: 🟢 Junior · 🟡 Middle · 🔴 Senior.

---

## A. JavaScript và TypeScript

### 1. 🟢 `==` khác `===`? `null` khác `undefined`? `??` khác `||`?

<details><summary>Đáp án</summary>

`===` so sánh cả kiểu, `==` tự đổi kiểu (`0 == ''` là `true`) nên luôn dùng `===`. `undefined`: chưa có giá trị; `null`: cố ý "không có". `a ?? b` chỉ lấy `b` khi `a` là `null`/`undefined`; `a || b` lấy `b` cả khi `a` là `0`, `''`, `false`.

**Trong project:** `useState(initialLessonNumber ?? 1)` trong `VocabView`. Viết `||` thì vẫn đúng ở đây vì bài học không có số 0, nhưng với số lượng hay chuỗi rỗng, `||` là lỗi kinh điển.

</details>

### 2. 🟢 Event loop: `async/await` có làm JavaScript chạy song song không?

<details><summary>Đáp án</summary>

Không. JavaScript chạy một luồng; `await` chỉ nhường lại luồng cho việc khác trong lúc chờ I/O, rồi tiếp tục khi promise xong (microtask). Muốn chạy nhiều request **cùng lúc** thì khởi động chúng rồi `await Promise.all([...])`, không `await` lần lượt. Việc nặng CPU vẫn chặn luồng (dùng Web Worker).

**Trong project:** React Query chạy song song các query độc lập trong cùng một trang (`useLessons`, `useVocab`); `useQueries` dùng cho danh sách query động.

</details>

### 3. 🟡 TypeScript bảo vệ được gì và không bảo vệ được gì?

<details><summary>Đáp án</summary>

TS kiểm kiểu **lúc viết/biên dịch**, xóa hết kiểu khi chạy. Nó không biết dữ liệu thật từ API, form, JSON là gì; `as Kiểu` chỉ là lời hứa. Vì vậy dữ liệu từ bên ngoài phải được kiểm **lúc chạy** (backend dùng DTO + `class-validator`; client có thể dùng zod).

**Trong project:** [learn-js-ts.md](./learn-js-ts.md) mục 7.3 cho thấy `node sai.ts` chạy bình thường dù thiếu thuộc tính, chỉ `tsc --noEmit` mới báo lỗi. Web chạy `tsc` trong build và CI.

</details>

### 4. 🟡 Generic là gì? Cho một ví dụ có ích.

<details><summary>Đáp án</summary>

Kiểu làm tham số, để một hàm dùng cho nhiều kiểu mà vẫn giữ thông tin kiểu.

**Trong project:** `useDebouncedValue<T>(value: T, delayMs: number): T` — truyền chuỗi thì nhận lại chuỗi, truyền số thì nhận số, không phải ép kiểu. Bên mobile, `RomajiTrie<Vocabulary>` lưu và trả lại đúng kiểu `Vocabulary`.

</details>

---

## B. React

### 5. 🟢 Props khác state? Vì sao không được gán thẳng state?

<details><summary>Đáp án</summary>

Props: dữ liệu từ cha truyền xuống, chỉ đọc. State: dữ liệu component tự giữ, đổi bằng hàm setter. React vẽ lại khi setter được gọi; gán thẳng biến thì React không biết và không vẽ lại. State cũng không được sửa tại chỗ (mutate mảng/object) mà phải tạo bản mới, vì React so sánh bằng tham chiếu.

**Trong project:** `VocabView` nhận `initialLessonNumber` (props) rồi giữ `currentLesson` (state); bấm "Sau" gọi `setCurrentIndex`.

</details>

### 6. 🟢 Luật của hook là gì? Vì sao có luật đó?

<details><summary>Đáp án</summary>

Chỉ gọi hook ở cấp ngoài cùng của component/hook khác, không trong `if`, vòng lặp hay sau `return` sớm. React lưu state theo **thứ tự gọi hook**; số hook thay đổi giữa các lần vẽ thì state bị gán nhầm chỗ (lỗi `Rendered more hooks than during the previous render`).

</details>

### 7. 🟡 `useEffect` chạy khi nào? Hàm dọn dẹp để làm gì? Cho ví dụ quên dọn dẹp.

<details><summary>Đáp án</summary>

Chạy **sau** khi vẽ, và chạy lại khi một giá trị trong mảng phụ thuộc đổi. Hàm `return` (cleanup) chạy trước lần chạy tiếp theo và khi component bị gỡ: hủy hẹn giờ, hủy đăng ký sự kiện, đóng socket.

**Trong project:** `useDebouncedValue` hủy hẹn giờ cũ trong cleanup. Bỏ dòng `clearTimeout` thì test báo `expected 'ka' to be ''` — giá trị giữa chừng lọt ra, đúng lỗi "gọi API theo từng chữ" ([learn-react.md](./learn-react.md) mục 7). `usePresence` có biến `cancelled` để socket không được mở sau khi người dùng đã rời trang trong lúc thư viện đang tải.

</details>

### 8. 🟡 Khi nào cần `useMemo`/`useCallback`? Khi nào là thừa?

<details><summary>Đáp án</summary>

Cần khi: phép tính đắt; hoặc giá trị/hàm nằm trong mảng phụ thuộc của effect hay được truyền cho component bọc `memo` — tạo mới mỗi lần vẽ sẽ làm effect chạy lại liên tục. Thừa khi bọc phép tính rẻ: thêm chi phí so sánh mà không lợi gì. Đo bằng React Profiler trước khi thêm.

**Trong project:** màn từ vựng React Native bọc `load` bằng `useCallback` vì `useEffect(() => load(), [load])` — không bọc thì vòng lặp vô tận. Màn tra từ dùng `useMemo` để chỉ tìm lại trong Trie khi `query` đổi.

</details>

### 9. 🟡 Debounce là gì? Cài bằng hook thế nào?

<details><summary>Đáp án</summary>

Chỉ làm việc sau khi đầu vào đứng yên một khoảng. Hook giữ giá trị trễ trong state, mỗi lần giá trị đổi thì đặt hẹn giờ mới và hủy hẹn giờ cũ trong cleanup.

**Trong project:** `useDebouncedValue(searchInput.trim(), 300)` trong `VocabView`: gõ `kandou` chỉ gửi một request `vocabularies?q=kandou&limit=50`. Test dùng đồng hồ giả `vi.useFakeTimers()`.

</details>

### 10. 🟡 Key trong danh sách để làm gì? Vì sao không dùng index?

<details><summary>Đáp án</summary>

Key giúp React biết phần tử nào là phần tử nào giữa hai lần vẽ. Dùng index thì khi chèn/xóa/sắp xếp, state (ô đang gõ, ô đang mở) bị gắn nhầm sang phần tử khác. Dùng id ổn định.

**Trong project:** danh sách ví dụ dùng `key={\`ex-${example.ja}\`}`; danh sách từ vựng dùng id.

</details>

### 11. 🟡 Context dùng khi nào? Có nên thay thư viện state bằng Context không?

<details><summary>Đáp án</summary>

Context để chuyển dữ liệu ít đổi qua nhiều tầng (người dùng đăng nhập, theme). Mọi component đọc context sẽ vẽ lại khi giá trị đổi, nên không hợp cho state đổi liên tục. Dữ liệu từ server nên để thư viện server-state (React Query), không nhét vào Context.

**Trong project:** [providers.tsx](../apps/nihongo-web/src/app/providers.tsx) có `AuthProvider`, `ThemeProvider`, `KanjiStructureProvider`; dữ liệu API đi qua `QueryClientProvider`.

</details>

### 12. 🔴 Error boundary bắt được lỗi gì và không bắt được gì?

<details><summary>Đáp án</summary>

Bắt lỗi ném ra **trong lúc vẽ** và trong lifecycle của cây con, để hiện giao diện thay thế thay vì trang trắng. Không bắt lỗi trong event handler, trong code bất đồng bộ (promise, `setTimeout`), và lỗi của chính nó; những lỗi đó phải tự `try/catch` hoặc đưa vào state rồi ném ra khi vẽ.

**Trong project:** [ErrorBoundary.tsx](../apps/nihongo-web/src/components/ErrorBoundary.tsx) là class component bọc toàn app trong `providers.tsx`.

</details>

---

## C. Next.js

### 13. 🟢 `'use client'` nghĩa là gì? Server component khác client component thế nào?

<details><summary>Đáp án</summary>

Trong App Router, component mặc định chạy trên server (không có state, effect, sự kiện; không gửi JS của nó xuống trình duyệt). `'use client'` đánh dấu ranh giới: file đó và những gì nó import chạy được trên trình duyệt. Đặt ranh giới càng thấp càng ít JS gửi xuống.

**Trong project:** [vocab/page.tsx](../apps/nihongo-web/src/app/%28main%29/vocab/page.tsx) có `'use client'` vì đọc `useSearchParams` và có tương tác.

</details>

### 14. 🟡 Vì sao `useSearchParams` cần `<Suspense>`?

<details><summary>Đáp án</summary>

Khi build, Next.js cố render tĩnh trước các trang. Tham số URL chỉ có khi có request thật, nên phần đọc `useSearchParams` phải "treo" lại; không có `<Suspense>` bao quanh thì build báo lỗi hoặc cả trang bị chuyển sang render phía client.

**Trong project:** `VocabPage` bọc `VocabPageInner` trong `<Suspense fallback="Đang tải...">`.

</details>

### 15. 🟡 Biến `NEXT_PUBLIC_*` khác biến thường thế nào? Hệ quả khi chạy Docker?

<details><summary>Đáp án</summary>

`NEXT_PUBLIC_*` được **chép thẳng vào JavaScript gửi cho trình duyệt lúc build**: ai cũng đọc được, và đổi giá trị phải build lại. Biến thường chỉ server đọc, đọc lúc chạy.

**Trong project:** Dockerfile web nhận `NEXT_PUBLIC_KEYCLOAK_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`… bằng `ARG` rồi build; đổi trong `environment:` của compose không có tác dụng. Bí mật (`MORI_PLAYBACK_SECRET`) không bao giờ được đặt tên `NEXT_PUBLIC_`. Xem thêm sự cố `.env` nằm trong image ở [learn-docker.md](./learn-docker.md) mục 8.

</details>

### 16. 🟡 `output: 'standalone'` để làm gì?

<details><summary>Đáp án</summary>

Next.js truy vết những file thật sự cần khi chạy và gom vào `.next/standalone` kèm `server.js`, để image chạy không phải chép cả `node_modules`. Cần chép thêm `.next/static` và `public` vì chúng không nằm trong standalone.

**Trong project:** [next.config](../apps/nihongo-web/next.config.ts) bật `output: 'standalone'` với `outputFileTracingRoot` là gốc monorepo; image web chạy 591 MB. Cảnh báo: standalone chép cả file `.env` của thư mục app — lý do phải có `.dockerignore`.

</details>

---

## D. Dữ liệu và HTTP

### 17. 🟡 React Query giải quyết gì so với `useEffect` + `fetch`?

<details><summary>Đáp án</summary>

Cache theo key, khử trùng request cùng key, thử lại khi lỗi, trạng thái `isLoading`/`isFetching`, làm mới khi dữ liệu cũ, hủy kết quả của request đã lỗi thời (tránh race condition khi gõ nhanh). Tự viết bằng `useEffect` phải lo hết những thứ đó.

**Trong project:** `useVocabSearchQuery` với `enabled` (ô trống không gọi), `staleTime` 5 phút, `placeholderData: keepPreviousData` (không nháy "Đang tìm…"). Mọi key nằm trong [query-keys.ts](../apps/nihongo-web/src/api/query-keys.ts); comment đầu file kể lỗi thật khi hai nơi đặt key khác nhau làm lệnh xóa cache không khớp.

</details>

### 18. 🟡 Access token và refresh token: lưu ở đâu, đánh đổi gì?

<details><summary>Đáp án</summary>

Access token sống ngắn (15 phút), gửi kèm mọi request qua header `Authorization: Bearer`. Refresh token sống lâu (7 ngày), nằm trong cookie `HttpOnly; Secure; SameSite=Lax; Path=/api/auth` nên JavaScript không đọc được và chỉ gửi tới đường dẫn đăng nhập.

Đánh đổi: web lưu access token ở `localStorage` → bị lấy nếu trang dính XSS. Giảm rủi ro bằng Content-Security-Policy và thời hạn ngắn. Lưu trong bộ nhớ thì an toàn hơn nhưng mất khi tải lại trang.

**Trong project:** [learn-web-http.md](./learn-web-http.md) mục 5; key `nihongo-auth-token` trong [api-client.ts](../apps/nihongo-web/src/lib/api-client.ts).

</details>

### 19. 🔴 Mười request cùng nhận 401 vì token hết hạn. Client xử lý thế nào?

<details><summary>Đáp án</summary>

Chỉ gửi **một** request refresh; các request khác đợi chung kết quả đó rồi gửi lại với token mới (single-flight). Mỗi request chỉ thử lại một lần để không lặp vô hạn. Chỉ đăng xuất khi server **từ chối** refresh token (400/401/403), không đăng xuất khi chỉ là lỗi mạng.

**Trong project:** `refreshInFlight: Promise<string | null> | null` trong `api-client.ts`: có promise đang chạy thì trả lại chính nó. Android làm tương tự bằng `TokenAuthenticator` ([interview-android.md](./interview-android.md) câu 10).

</details>

### 20. 🟢 CORS là gì? Lỗi CORS sửa ở đâu?

<details><summary>Đáp án</summary>

Trình duyệt chặn JavaScript đọc phản hồi từ origin khác (khác scheme/host/cổng) trừ khi server trả header cho phép (`Access-Control-Allow-Origin`…). Đây là cơ chế của **trình duyệt**; `curl` không bị. Sửa ở server (danh sách origin được phép), không sửa ở client.

**Trong project:** gateway đọc `ALLOWED_ORIGINS` (mặc định có `http://localhost:8080`, `http://nihongo.localhost:8080`, `http://localhost:5173`). Mở web ở URL khác mà quên thêm vào là lỗi CORS khi đăng nhập. Đi qua nginx cùng origin (`/api/*`) thì không cần CORS.

</details>

### 21. 🟢 Các status code hay gặp và ý nghĩa?

<details><summary>Đáp án</summary>

200 OK, 201 Created (đăng nhập ở project trả 201 vì là POST), 204 No Content, 400 dữ liệu sai, 401 chưa đăng nhập/token sai, 403 đã đăng nhập nhưng không đủ quyền, 404 không có, 409 xung đột, 429 quá nhiều request (rate limit), 500 lỗi server, 502 proxy không gọi được server phía sau (nginx khi gateway chưa lên), 503 tạm không phục vụ.

</details>

---

## E. Hiệu năng và đóng gói

### 22. 🟡 Code splitting là gì? Khi nào dùng `import()` động?

<details><summary>Đáp án</summary>

Chia bundle thành nhiều chunk để trang chỉ tải phần mình cần. Thư viện lớn chỉ dùng ở một chỗ, hoặc chỉ dùng sau một thao tác, thì nạp bằng `import()` / `next/dynamic` lúc cần.

**Trong project (09/11/2026):** đo bằng `npm run bundle:report` thấy `oidc-client-ts` và `socket.io-client` nằm trong layout gốc (trang nào cũng tải), `hls.js` 570 KB và `recharts` 400 KB import tĩnh. Sau khi chuyển sang nạp động: `/mori` 323 → 145 kB (−55%), `/analytics` 236 → 120 kB, hầu hết trang khác giảm khoảng 13 kB ([learn-webpack.md](./learn-webpack.md) mục 5).

</details>

### 23. 🟡 Tree shaking là gì? Khi nào nó không cứu được?

<details><summary>Đáp án</summary>

Bundler bỏ code export không được dùng, dựa trên `import`/`export` tĩnh của ES module. Không cứu được khi import cả thư viện vào layout chung, khi thư viện là CommonJS hoặc có side effect, hoặc khi bạn thật sự dùng thư viện đó ở trang khởi đầu. Khi đó phải tách bằng import động.

</details>

### 24. 🔴 Đo hiệu năng frontend bằng gì? Cho ví dụ quyết định dựa trên số đo.

<details><summary>Đáp án</summary>

Core Web Vitals (LCP, INP, CLS) đo trên người dùng thật; First Load JS từ `next build`; bundle analyzer; React Profiler cho vẽ lại thừa. Nguyên tắc: đo trước, sửa chỗ lớn nhất, đo lại.

**Trong project:** [web-vitals.tsx](../apps/nihongo-web/src/app/web-vitals.tsx) gửi số đo thật; quyết định tách `hls.js` dựa trên báo cáo bundle, và chấp nhận ba trang tăng khoảng 1 kB (mã nạp chunk) để đổi lấy giảm 13 kB ở mọi trang khác.

</details>

---

## F. Kiểm thử

### 25. 🟡 Test component và hook thế nào? Thế nào là test tốt?

<details><summary>Đáp án</summary>

Testing Library vẽ component và tương tác như người dùng (tìm theo role, `aria-label`, chữ hiển thị — không theo class CSS); `renderHook` cho hook; giả lập phần ra ngoài (API, phát âm) bằng `vi.mock`; đồng hồ giả cho hẹn giờ. Test tốt là test **đỏ khi có lỗi thật**: thử làm hỏng code xem test có bắt không.

**Trong project:** `VocabReading.test.tsx` bấm nút "Nghe tiếng Anh", kiểm `playAudio` được gọi với `en-US` và cú bấm không lan ra ngoài. Web có 37 file, 187 test (Vitest).

</details>

## Câu hỏi mở để tự luyện

1. `VocabView` có nhiều `useState` liên quan nhau. Khi nào nên gom bằng `useReducer`? Viết lại thử một nhóm state.
2. Đề xuất cách chuyển access token khỏi `localStorage` mà không bắt người dùng đăng nhập lại mỗi lần tải trang.
3. Dùng `npm run bundle:report` tìm thư viện lớn nhất còn nằm trong layout gốc, đề xuất cách tách và ước lượng số kB giảm được.

<!-- nav:start -->

---

## Đi tiếp

Tài liệu tham khảo thuộc **13. Phỏng vấn**. Cùng nhóm:

- [interview-questions.md](./interview-questions.md) — Bộ câu hỏi Senior chung
- [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md) — Backend NestJS, MQTT, DB
- [interview-devops.md](./interview-devops.md) — DevOps: Kubernetes (probe, rolling update, HPA, securityContext), pipeline CI/CD và deploy thật, monitoring — 19 câu
- [interview-docker.md](./interview-docker.md) — Docker: 25 câu từ Junior tới Senior, đáp án bằng compose/Dockerfile của project (có sự cố `.env` trong image)
- [interview-infra-cloud.md](./interview-infra-cloud.md) — Hạ tầng và cloud: nginx, Terraform, AWS/LocalStack/serverless, GCP, k6, xử lý sự cố
- [interview-backend-security.md](./interview-backend-security.md) — Bảo mật API (OWASP), thanh toán chống trùng, outbox, timeout, retry, circuit breaker
- [interview-backend-android-rn-swift.md](./interview-backend-android-rn-swift.md) — Backend, Android, React Native, Swift
- [interview-mobile.md](./interview-mobile.md) — Senior Mobile
- [interview-android.md](./interview-android.md) — Android: câu hỏi theo code nihongo-android, gồm cả Framework, Binder, Automotive
- [interview-java-dsa.md](./interview-java-dsa.md) — Java, OOP và 10 bài thuật toán gắn với app (lời giải Java đã chạy), kế hoạch luyện bài test lập trình
- [interview-react-native-senior.md](./interview-react-native-senior.md) — Senior React Native

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
