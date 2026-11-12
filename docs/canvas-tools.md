# Canvas Tools & Japan Map — nihongo-web

Tài liệu cho 5 công cụ FabricJS/hanzi-writer và tính năng Bản đồ Nhật Bản trong `apps/nihongo-web`.

---

## Tổng quan

| Tính năng | URL (user) | URL (admin) | Thư viện chính |
|-----------|-----------|-------------|----------------|
| Hub công cụ | `/tools` | — | — |
| Luyện viết Kanji | `/kanji-practice` | — | FabricJS v6, HTML5 Canvas |
| Bảng trắng | `/whiteboard` | — | FabricJS v6, jsPDF |
| Ô luyện viết Kanji (Worksheet) | `/worksheet` | `/admin/worksheet` | hanzi-writer (CDN), html2canvas, jsPDF |
| Flashcard Editor | — | `/admin/flashcard-editor` | FabricJS v6 |
| Certificate Generator | — | `/admin/certificate` | FabricJS v6, jsPDF |
| Bản đồ Nhật Bản | `/japan-map` | — | Mapbox GL JS |

---

## 1. Luyện viết Kanji (`/kanji-practice`)

**View:** `src/views/KanjiPracticeView.tsx`

- Canvas nền (HTML5 2D): vẽ ghost ký tự làm mẫu (màu `rgba(0,0,0,0.1)`)
- FabricJS canvas phủ lên: học viên tự viết bằng `PencilBrush`
- Preset grid kanji bên dưới để chọn nhanh
- Export PNG: merge 2 canvas bằng `drawImage` rồi `toBlob`

**Lưu ý kỹ thuật:**
- `fc.toDataURL()` (không truyền `{ format: 'png' }`) — FabricJS v6 thay đổi signature
- Ghost canvas cần `font: 'bold 280px serif'` + `textBaseline = 'alphabetic'`

---

## 2. Bảng trắng (`/whiteboard`)

**View:** `src/views/WhiteboardView.tsx`

- FabricJS `PencilBrush` cho draw, `Textbox` / `Rect` / `Circle` / `Line` cho shapes
- Undo/redo qua JSON snapshot history (`canvas.toJSON()` / `canvas.loadFromJSON()`)
- Eraser: **không dùng `EraserBrush`** (không có trong FabricJS v6) → dùng `PencilBrush` màu trắng (hoặc màu nền)
- Export PNG + PDF (jsPDF)

**Component dùng chung:**
- `src/components/canvas/FabricCanvas.tsx` — `forwardRef` wrapper, dynamic import
- `src/components/canvas/canvas-toolbar.tsx` — DrawTool type, color picker, stroke width, undo/redo/clear/export

---

## 3. Worksheet Generator (`/worksheet` và `/admin/worksheet`)

**View:** `src/views/admin/WorksheetGeneratorView.tsx`

Trang user (`/worksheet`) dùng cùng view này.

### Cách hoạt động

1. Thêm block (title / instructions / kanji-grid / writing-lines / vocab-match / blank-fill)
2. Preview HTML DOM cập nhật real-time (`ref={previewRef}`)
3. Export: `html2canvas(previewRef, { scale: 2 })` → jsPDF (A4)

### Stroke progression (`StrokeCell`)

Dữ liệu stroke lấy từ hanzi-writer CDN — `HanziWriter.loadCharacterData(char)`:

```typescript
// Coordinate flip: hanzi-writer dùng hệ tọa độ Y đảo ngược
<g transform="translate(0,900) scale(1,-1)">
  {charData.strokes.map((path, j) => (
    <path d={path} fill={
      j < strokeIdx ? '#bbb'              // đã vẽ
      : j === strokeIdx ? '#1a1a1a'       // nét hiện tại (đậm)
      : 'rgba(0,0,0,0.06)'                // chưa vẽ (mờ)
    } />
  ))}
</g>
```

Badge số nét (1-indexed) góc trên phải mỗi ô.

### KanjiPicker

Chọn kanji từ bài Minna no Nihongo — `useKanjiLessonsQuery()` + `useKanjiEntriesQuery(lessonNumber)`:

```
📚 Chọn từ bài Minna...  →  panel mở:  Bài 1 (23)  Bài 2 (18)  ...
                              Grid kanji → click để toggle, tooltip nghĩa
                              "Thêm tất cả bài X" / "Xoá hết"
```

---

## 4. Flashcard Editor (`/admin/flashcard-editor`)

**View:** `src/views/admin/FlashcardEditorView.tsx`

- Mặt trước/mặt sau riêng — mỗi mặt là 1 FabricJS canvas
- `Textbox`, `Rect`, `Line` dynamic import
- Lưu/tải named template in-memory
- Export @2x PNG

---

## 5. Certificate Generator (`/admin/certificate`)

**View:** `src/views/admin/CertificateGeneratorView.tsx`

- 3 theme: Classic / Modern / Minimal
- Live preview FabricJS: `Rect`, `Textbox`, `Line`, `Circle`
- Bulk export: paste N tên → N-page PDF (jsPDF)

---

## 6. Bản đồ Nhật Bản (`/japan-map`)

**View:** `src/views/JapanMapView.tsx`  
**Data:** `src/data/japan-prefectures.ts`

### Yêu cầu

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...   # apps/nihongo-web/.env
```

Lấy token miễn phí tại [account.mapbox.com](https://account.mapbox.com). Nếu bỏ trống → trang hiện hướng dẫn thiết lập, không crash.

### Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| Bản đồ tương tác | Marker 47 tỉnh, click → flyTo + sidebar vocab |
| Vocab panel | Từ vựng theo category (food/place/culture/nature) với màu riêng |
| Region filter | Filter theo 8 vùng Nhật Bản |
| Progress tracker | Đánh dấu tỉnh đã "ghé thăm" |
| Quiz mode | flyTo ngẫu nhiên → 4 lựa chọn → điểm số |

### Dữ liệu tỉnh (`japan-prefectures.ts`)

```typescript
interface VocabItem {
  ja: string; kana: string; romaji: string; vi: string;
  type: 'food' | 'place' | 'culture' | 'nature';
}
interface Prefecture {
  code: string; nameJa: string; nameKana: string; nameRomaji: string;
  capital: string; region: string; lat: number; lng: number;
  famous: string; vocab: VocabItem[];
}
```

47 tỉnh đầy đủ; lookup nhanh qua `PREFECTURE_BY_CODE`.

### Lưu ý kỹ thuật

- Dynamic import `mapbox-gl` trong `useEffect` (tránh SSR crash)
- CSS: `@import 'mapbox-gl/dist/mapbox-gl.css'` trong `globals.css`
- `next.config.ts`: `transpilePackages: ['mapbox-gl']`
- Marker tạo bằng DOM API (không `innerHTML`) tránh XSS
- Type: `import type { Map as MapboxMap } from 'mapbox-gl'`; accessToken: `(mapboxgl as typeof mapboxgl & { accessToken: string }).accessToken = token`

---

## Admin Shell

**Component:** `src/components/AdminShell.tsx`

Sidebar layout cho tất cả trang `/admin/(protected)/*`:

```
Tổng quan   → /admin
Quản lý     → /admin/payments, /admin/messages, /admin/import
Email       → /admin/email-templates, /admin/email-broadcasts
Canvas Tools→ /admin/flashcard-editor, /admin/worksheet, /admin/certificate
```

Layout: `src/app/admin/(protected)/layout.tsx` wrap `AdminGuard` + `AdminShell`.

---

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [run-local.md](./run-local.md) | Setup `NEXT_PUBLIC_MAPBOX_TOKEN` |
| [accounts.md](./accounts.md) | Token Mapbox trong bảng dịch vụ ngoài |
| [system-design.md](./system-design.md) | Kiến trúc tổng thể, nihongo-web clients |
| [roadmap-reactjs.md](./roadmap-reactjs.md) | `fabric`, `hanzi-writer`, `mapbox-gl` trong tech stack table |

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **8. Frontend web và desktop** — bài 4/6.

- Bài trước: [learn-webpack.md](./learn-webpack.md) — Webpack qua bản build của web: chia chunk, đo và giảm dung lượng
- **Bài tiếp: [learn-ollama-local.md](./learn-ollama-local.md)** — Chạy AI local bằng Ollama

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
