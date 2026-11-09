# Học Webpack — áp vào web EDU APP

Tài liệu học webpack **bằng chính bản build của `apps/nihongo-web`**. Mọi số liệu dưới đây đo từ `next build` thật ngày 09/11/2026.

Bạn sẽ học được:

- Webpack biến hàng trăm file thành vài file JS cho trình duyệt như thế nào.
- Đọc bảng kết quả của `next build`: trang nào nặng, nặng vì đâu.
- Làm trang nhẹ đi bằng chia code (code splitting). Repo vừa làm việc này, trang `/mori` giảm từ 323 kB xuống 145 kB.
- Dùng `npm run bundle:report` để chặn lỗi tái diễn.

Học Docker và nginx trước thì dễ theo hơn: [learn-docker.md](./learn-docker.md), [learn-nginx.md](./learn-nginx.md).

---

## 1. Webpack giải quyết vấn đề gì?

Code web của project có hàng trăm file `.tsx`, `.ts`, `.css`, cộng thêm thư viện trong `node_modules`. Trình duyệt không đọc được TypeScript hay JSX, và tải từng file một thì rất chậm.

Webpack là **bundler** (công cụ đóng gói). Nó làm 4 việc:

| Việc | Nghĩa là |
|---|---|
| **Đi theo `import`** | Bắt đầu từ một file (entry), đọc mọi `import`, rồi lần tiếp sang các file đó. Kết quả là một **đồ thị module** |
| **Biến đổi** | Dịch TypeScript/JSX thành JavaScript thường, xử lý CSS (việc của **loader**) |
| **Gom và chia** | Gom các module thành vài file lớn gọi là **chunk**. Chia sao cho mỗi trang chỉ tải phần mình cần |
| **Tối ưu** | Nén code, bỏ phần không dùng (**tree shaking**), gắn mã hash vào tên file để trình duyệt cache lâu |

Ví von: code nguồn là **hàng nghìn món đồ trong kho**, webpack là **người đóng thùng**. Đóng một thùng duy nhất thì khách mua một món cũng phải khiêng cả kho. Đóng theo đơn hàng thì mỗi khách chỉ nhận đúng thứ cần.

---

## 2. Webpack trong project

Repo không có file `webpack.config.js` nào viết tay. Webpack nằm **bên trong** các công cụ:

| Phần | Công cụ build | Có dùng webpack? |
|---|---|---|
| `apps/nihongo-web` (Next.js 15.5) | `next build`, `next dev` | **Có.** Next đóng gói sẵn webpack 5 bên trong. Turbopack (công cụ mới của Next) chỉ bật khi thêm `--turbopack` |
| Plugin PWA trong `next.config.ts` (`@ducanh2912/next-pwa`) | | **Có.** Đây là một plugin webpack, sinh service worker lúc build |
| `services/*` (NestJS) | `nest build` | **Không.** `nest-cli.json` đặt `"webpack": false`, dùng `tsc` |
| `apps/translator-extension` | Vite | Không. Vite dùng Rollup và esbuild; đáng đọc để so sánh |

Vậy học webpack trong repo này nghĩa là **học cách Next.js dùng webpack**, và cách viết code để webpack chia chunk tốt.

---

## 3. Đọc kết quả `next build`

```bash
npm run build -w @edu/nihongo-web
```

Cuối lệnh, Next in một bảng cho từng trang (rút gọn):

```text
Route (app)                               Size  First Load JS
├ ƒ /mori                               220 kB         323 kB
├ ƒ /analytics                          121 kB         236 kB
├ ƒ /vocab                             5.16 kB         196 kB
└ ƒ /_not-found                          144 B         103 kB
+ First Load JS shared by all            103 kB
```

| Cột | Nghĩa là |
|---|---|
| **Size** | JS **riêng** của trang này |
| **First Load JS** | Tổng JS trình duyệt phải tải khi mở trang này lần đầu: phần chung + layout + phần riêng |
| **shared by all** | Phần mọi trang đều tải (React, runtime của Next) |

Các con số đều là **sau khi nén gzip**, tức gần với dung lượng thật đi qua mạng.

**Cách đọc nhanh:**

- **Size lớn**: trang tự import thứ gì nặng. Ví dụ `/mori` có Size 220 kB.
- **Size nhỏ mà First Load JS lớn**: phần nặng nằm ở **phần chung**. Ví dụ `/vocab` chỉ 5 kB riêng nhưng tổng 196 kB. Sửa phần chung thì mọi trang cùng nhẹ đi.

### Layout gốc là gì?

`src/app/layout.tsx` bọc **mọi trang**. Những gì nó import (trực tiếp, hoặc gián tiếp qua `providers.tsx`, `AuthContext`, …) sẽ nằm trong chunk mà trang nào cũng phải tải.

```text
app/layout.tsx
  └─ providers.tsx
       └─ AuthContext.tsx                ← bọc toàn app
            ├─ hooks/queries.ts
            │    └─ hooks/usePresence.ts
            │         └─ socket.io-client     (trước đây: MỌI trang tải)
            └─ lib/keycloak.ts
                 └─ oidc-client-ts            (trước đây: MỌI trang tải)
```

Đây là cách webpack nghĩ: nó **không biết** bạn chỉ gọi `signoutKeycloak()` lúc đăng xuất. Nó chỉ thấy dòng `import` ở đầu file, nên đưa cả thư viện vào cùng chunk.

---

## 4. Ba cách import và webpack xử lý từng cách

| Cách viết | Webpack làm gì | Dùng khi |
|---|---|---|
| `import { io } from 'socket.io-client'` (tĩnh) | Đưa thư viện vào **cùng chunk** với file đang import | Thư viện nhỏ, hoặc dùng ngay khi trang mở |
| `await import('socket.io-client')` (động) | Tách thành **chunk riêng**, chỉ tải khi dòng này chạy | Chỉ cần khi người dùng làm một việc: đăng xuất, xuất PDF, phát video |
| `dynamic(() => import('./Chart'), { ssr: false })` (`next/dynamic`) | Như `import()`, nhưng cho **component React**, kèm giao diện chờ | Một phần giao diện nặng: biểu đồ, bản đồ, trình soạn thảo |

`import type { Socket } from 'socket.io-client'` **không** kéo thư viện vào bundle: TypeScript xóa dòng này lúc dịch. Vì vậy vẫn dùng được kiểu dữ liệu mà không tốn byte nào.

### Tree shaking không cứu được trường hợp này

Tree shaking chỉ bỏ những export **không ai dùng**. `signoutKeycloak` **có** được dùng (lúc đăng xuất), `usePresence` **có** được dùng (trang Cộng đồng). Cả hai đều có mặt trong đồ thị module của layout gốc, nên webpack phải giữ lại. Chỉ chia chunk bằng `import()` mới tách chúng ra được.

---

## 5. Repo đã sửa gì (09/11/2026)

### 5.1. Đo trước khi sửa

```bash
npm run build -w @edu/nihongo-web
npm run bundle:report -w @edu/nihongo-web
```

Kết quả ban đầu:

- `socket.io-client` (43 KB chưa nén) và `oidc-client-ts` (66 KB chưa nén) nằm trong layout gốc, tức trang nào cũng tải.
- `hls.js` (570 KB chưa nén) import tĩnh ở trang `/mori`.
- `recharts` (400 KB chưa nén) import tĩnh ở trang `/analytics`.

### 5.2. Bốn chỗ sửa

**1. Đăng xuất Keycloak:** [AuthContext.tsx](../apps/nihongo-web/src/contexts/AuthContext.tsx)

```ts
// Trước: import { signoutKeycloak } from '../lib/keycloak';   ← đầu file
// Sau: tải lúc đăng xuất
const { signoutKeycloak } = await import('../lib/keycloak');
const redirected = await signoutKeycloak();
```

**2. Trạng thái online:** [usePresence.ts](../apps/nihongo-web/src/hooks/usePresence.ts)

```ts
import type { Socket } from 'socket.io-client';   // chỉ lấy kiểu, không tốn byte

useEffect(() => {
  let cancelled = false;
  let socket: Socket | null = null;

  void import('socket.io-client').then(({ io }) => {
    if (cancelled) return;          // component đã bị gỡ trong lúc đang tải
    socket = io(`${SIGNAL_URL}/signal`, { auth: { token }, transports: ['websocket'] });
    // ...
  });

  return () => {
    cancelled = true;
    socket?.disconnect();
  };
}, [token, enabled]);
```

**Hay nhầm:** quên biến `cancelled`. Người dùng rời trang trong lúc thư viện đang tải thì socket vẫn được mở sau đó, và không bao giờ bị đóng.

**3. Phát video:** [MoriCourseView.tsx](../apps/nihongo-web/src/views/MoriCourseView.tsx). Safari phát HLS sẵn nên không tải `hls.js`; trình duyệt khác thì tải bằng `import('hls.js')` khi có video.

**4. Biểu đồ:** tách biểu đồ ra [AnalyticsCharts.tsx](../apps/nihongo-web/src/components/AnalyticsCharts.tsx), rồi trang [analytics/page.tsx](../apps/nihongo-web/src/app/%28main%29/analytics/page.tsx) dùng `next/dynamic`:

```tsx
const AnalyticsCharts = dynamic(() => import('@/components/AnalyticsCharts'), {
  ssr: false,                                   // biểu đồ đo kích thước bằng DOM
  loading: () => <div className="card">Đang tải biểu đồ…</div>,
});
```

Thẻ số liệu và lịch học hiện ngay; biểu đồ hiện sau một nhịp.

### 5.3. Kết quả

| Trang | Trước | Sau | Giảm |
|---|---|---|---|
| `/mori` | 323 kB | **145 kB** | −178 kB (−55%) |
| `/analytics` | 236 kB | **120 kB** | −116 kB (−49%) |
| `/` (Home) | 149 kB | 136 kB | −13 kB |
| `/vocab` | 196 kB | 184 kB | −13 kB |
| Trung vị của 89 trang | 142 kB | **129,5 kB** | −12,5 kB |

(First Load JS, sau gzip.)

- **Hầu hết các trang giảm khoảng 13 kB** nhờ hai chỗ sửa ở layout gốc. Mỗi chỗ nhỏ, nhưng nhân với mọi trang và mọi lượt truy cập.
- **Ba trang tăng khoảng 1 kB** (`/strokes`, `/session/[id]/call`, `/jlpt/du-doan`). Đó là phần mã nạp chunk động; không đáng kể.
- Trang gọi video `/session/[id]/call` vẫn tải `socket.io` ngay, vì nó cần socket từ đầu. Đó là đúng.

---

## 6. Công cụ: `npm run bundle:report`

Script [bundle-report.mjs](../apps/nihongo-web/scripts/bundle-report.mjs) đọc kết quả build trong `.next/` và in:

```text
Layout gốc (trang nào cũng tải): 16 chunk, 530.8 kB chưa nén

Thư viện               Chưa nén       Gzip   Tải ở     Ví dụ
mapbox-gl             1840.7 kB   506.2 kB   khi cần   (import động: chỉ tải khi code gọi tới)
hls.js                 569.4 kB   175.1 kB   khi cần   (import động: chỉ tải khi code gọi tới)
html2canvas            516.2 kB   147.3 kB   khi cần   (import động: chỉ tải khi code gọi tới)
recharts               399.9 kB   115.0 kB   khi cần   (import động: chỉ tải khi code gọi tới)
jspdf                  354.8 kB   114.2 kB   4 trang   /(main)/whiteboard/page
oidc-client-ts          80.2 kB    22.4 kB   2 trang   /(main)/auth/callback/page
socket.io-client        41.3 kB    12.7 kB   1 trang   /(call)/session/[id]/call/page

OK: không thư viện nặng nào nằm trong layout gốc.
```

| Cột "Tải ở" | Nghĩa là |
|---|---|
| `MỌI TRANG` | Nằm trong layout gốc. **Script thoát mã 1** nếu đó là thư viện trong danh sách cấm |
| `N trang` | Chỉ những trang này tải ngay khi mở |
| `khi cần` | Chunk tải động: chỉ tải khi code gọi `import()` |

**CI đã chạy script này** sau bước build (job `nihongo-web` trong [ci.yml](../.github/workflows/ci.yml)). Ai lỡ import tĩnh một thư viện nặng vào code dùng chung thì CI đỏ.

**Script hoạt động thế nào:**

1. Đọc `.next/app-build-manifest.json`: danh sách chunk của từng trang, và của `/layout` (layout gốc).
2. Quét mọi file trong `.next/static/chunks`, kể cả chunk động: manifest không gắn chunk động vào trang nào.
3. Tìm thư viện bằng một **chuỗi đặc trưng** trong mã đã nén. Ví dụ `socket.io`: tên biến bị đổi khi nén, nhưng chuỗi thì giữ nguyên.

**Giới hạn:** dò bằng chuỗi nên có thể nhận nhầm. Dòng `jspdf` "4 trang" ở trên là ví dụ: mã của các trang có chứa chữ `jsPDF` (tên lấy ra từ `await import('jspdf')`), chứ thư viện vẫn được tải động. Muốn chính xác tuyệt đối thì dùng công cụ phân tích bundle thật (mục 8).

---

## 7. Chỉnh webpack trong Next.js

Next cho phép sửa cấu hình webpack qua hàm `webpack` trong `next.config.ts`. Repo **chưa cần** dùng; đây là mẫu để biết chỗ:

```ts
const nextConfig: NextConfig = {
  webpack: (config, { isServer, dev }) => {
    // config là cấu hình webpack đầy đủ mà Next đã dựng sẵn
    // isServer: true khi build phần chạy trên server, false khi build cho trình duyệt
    // dev: true khi chạy next dev
    return config;
  },
};
```

Những việc hay làm ở đây:

- Thêm plugin, ví dụ công cụ phân tích bundle (mục 8).
- `config.resolve.alias`: trỏ một tên import sang file khác.
- `config.resolve.fallback`: tắt module chỉ có ở Node (`fs`, `path`) khi build cho trình duyệt.

**Thận trọng:** sửa sai ở đây làm hỏng build rất khó hiểu. Thử một cách thì xóa `.next/` rồi build lại cho chắc. Plugin PWA trong repo cũng là một hàm bọc quanh config này (`withPWA(nextConfig)`).

---

## 8. Hay nhầm

| Nhầm | Thực tế |
|---|---|
| "Chia càng nhỏ càng tốt" | Mỗi chunk là một request. Thư viện vài KB thì import tĩnh. Chỉ tách thứ nặng hoặc ít khi dùng |
| "Tree shaking tự lo hết" | Tree shaking chỉ bỏ export không ai dùng. Thứ có dùng, dù hiếm, vẫn ở lại cùng chunk |
| `next/dynamic` với `ssr: false` trong Server Component | Chỉ dùng được trong file có `'use client'` |
| Quên dọn khi tải động trong `useEffect` | Phải có cờ `cancelled`: component bị gỡ trước khi thư viện tải xong |
| Đo bằng `next dev` | Bản dev không nén, không tối ưu. Luôn đo bằng `next build` |
| "`import type` với `import` thường như nhau" | Với `tsconfig` hiện tại, trình biên dịch tự xóa import chỉ dùng làm kiểu, nên hai cách cho cùng kết quả. Nhưng nếu bật `verbatimModuleSyntax`, `import { Socket }` sẽ kéo cả thư viện vào. Viết `import type` để chắc chắn và để người đọc thấy ngay |

**Muốn xem trực quan:** cài `@next/bundle-analyzer` để xem bản đồ ô vuông của từng chunk:

```bash
npm i -D @next/bundle-analyzer -w @edu/nihongo-web
```

```ts
import bundleAnalyzer from '@next/bundle-analyzer';
const withAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
export default withAnalyzer(withPWA(nextConfig));
```

Rồi chạy `ANALYZE=true npm run build -w @edu/nihongo-web`. Repo chưa cài gói này; đoạn trên chưa chạy thử.

---

## 9. Bài tập

1. **Đọc bảng build.** Chạy `npm run build -w @edu/nihongo-web`. Tìm 3 trang có First Load JS lớn nhất. Với mỗi trang, phần nặng là Size riêng hay phần chung?
2. **Làm hỏng rồi xem CI bắt.** Trong `AuthContext.tsx`, đưa `import { signoutKeycloak } from '../lib/keycloak'` lên lại đầu file. Build rồi chạy `npm run bundle:report`: script phải báo `oidc-client-ts` nằm trong layout gốc và thoát mã 1. Trả lại code.
3. **`import type`.** Trong `usePresence.ts`, đổi `import type { Socket }` thành `import { Socket }`, build lại và chạy `bundle:report`. Với `tsconfig` hiện tại, `socket.io-client` **không** quay lại layout gốc, vì `Socket` chỉ dùng làm kiểu nên bị xóa lúc dịch. Thêm `"verbatimModuleSyntax": true` vào `tsconfig.json` rồi build lại xem điều gì xảy ra. Nhớ trả lại cả hai.
4. **Tìm thêm chỗ sửa.** `@react-oauth/google` được import trong `providers.tsx`, tức layout gốc. Đo xem nó nặng bao nhiêu, rồi quyết định có nên tách không. Gợi ý: nó chỉ cần ở trang đăng nhập.
5. **Turbopack.** Chạy thử `next build --turbopack` trong `apps/nihongo-web` (Next 15.5 mới thử nghiệm). So thời gian build và bảng kích thước với webpack.
6. **Thêm thư viện vào script.** Thêm `@stripe/stripe-js` vào `LIBRARIES` của `bundle-report.mjs`. Tìm một chuỗi đặc trưng của nó trong `.next/static/chunks`.

---

## 10. Cheat sheet

```bash
npm run build -w @edu/nihongo-web           # build bằng webpack, in bảng kích thước
npm run bundle:report -w @edu/nihongo-web   # thư viện nặng nằm ở đâu
ls apps/nihongo-web/.next/static/chunks      # các chunk đã sinh
```

```text
import { x } from 'lib'             → cùng chunk, tải ngay
await import('lib')                 → chunk riêng, tải khi chạy tới
dynamic(() => import('./Comp'))     → component tải sau, có giao diện chờ
import type { T } from 'lib'        → 0 byte
Layout gốc import gì                → MỌI trang tải thứ đó
```

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **8. Frontend web và desktop** — bài 2/5.

- Bài trước: [roadmap-reactjs.md](./roadmap-reactjs.md) — React + Next.js qua apps/nihongo-web
- **Bài tiếp: [canvas-tools.md](./canvas-tools.md)** — Luyện viết kanji, bảng trắng, worksheet, flashcard editor trên web

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
