# Học Electron — áp vào app desktop Nihongo

Tài liệu học Electron **bằng app thật** trong repo: [`apps/nihongo-desktop`](../apps/nihongo-desktop).  
Giao diện học tiếng Nhật vẫn là Next.js (`apps/nihongo-web`). Electron chỉ là cửa sổ desktop bọc trang đó.

---

## 1. Vì sao code ngắn?

Electron **không viết lại React**. Nó là một chương trình desktop gồm hai phần có sẵn:

| Phần | Trong máy này | Việc nó làm |
|------|----------------|-------------|
| **Chromium** | cửa sổ vẽ HTML | hiện đúng web app Nihongo |
| **Node.js** | process chính | mở cửa sổ, đọc file, gọi hệ điều hành |

UI (trang chủ, từ vựng, đăng nhập) đã nằm ở `nihongo-web`, phục vụ qua nginx tại `http://localhost:8080`. App desktop chỉ cần:

1. Mở một cửa sổ.
2. Trỏ cửa sổ vào URL đó.
3. Khi server tắt, hiện trang offline và nút **Thử lại**.

Ba file là đủ cho việc đó:

```text
apps/nihongo-desktop/
  package.json          # "main" trỏ tới process chính
  start.sh              # chạy binary Electron, không cần npm trên PATH
  src/main.cjs          # process chính: cửa sổ, điều hướng, vòng đời app
  src/preload.cjs       # cầu nối an toàn sang trang HTML
  src/offline.html      # trang hiện khi localhost:8080 không lên
```

React sống trong renderer (trang web). Electron sống trong `main.cjs` và `preload.cjs`. Hai thứ ghép với nhau, không thay nhau.

---

## 2. Hai process bắt buộc nhớ

```text
main (Node)                         renderer (Chromium)
src/main.cjs                        http://localhost:8080  hoặc  offline.html
  │                                   │
  │  BrowserWindow                    │  HTML + React (Next.js)
  │  ipcMain.handle                   │  window.nihongoDesktop.retry()
  │                                   │
  └──── preload.cjs ──────────────────┘
        contextBridge chỉ lộ hàm đã chọn
```

| Khái niệm | File trong project | Được phép |
|-----------|--------------------|-----------|
| **Main** | `src/main.cjs` | `require("electron")`, mở cửa sổ, `shell.openExternal`, đọc đường dẫn |
| **Preload** | `src/preload.cjs` | `contextBridge`, `ipcRenderer`. Chạy trước script của trang |
| **Renderer** | trang Next hoặc `offline.html` | DOM, React. Không `require("fs")`, không `require("electron")` |

`sandbox: true` và `nodeIntegration: false` trong `webPreferences` giữ renderer như một tab trình duyệt. Bí mật và file máy nằm ở main, không nằm trong trang web.

---

## 3. Chạy app

Stack web phải đang chạy (nginx `:8080`). Rồi:

```bash
apps/nihongo-desktop/start.sh
```

`package.json` của repo có script `dev:desktop` gọi đúng file đó.

Đổi URL (ví dụ web dev trực tiếp cổng 5173):

```bash
NIHONGO_URL=http://localhost:5173 apps/nihongo-desktop/start.sh
```

App này **không** nằm trong npm workspaces của monorepo (`!apps/nihongo-desktop` ở `package.json` gốc). Electron kéo binary đúng hệ điều hành (macOS arm64). Nhét nó vào `node_modules` chung của Nest/Next sẽ kéo nhầm bản Linux/Windows khi cài trên máy khác.

Cài lại dependency khi clone máy mới (cần Node 22):

```bash
cd apps/nihongo-desktop
npm install
```

---

## 4. Đọc `main.cjs` theo thứ tự chạy

### 4.1. URL vào app

```javascript
const START_URL = process.env.NIHONGO_URL || "http://localhost:8080";
```

Mặc định là cổng nginx trong [docker.md](./docker.md). Biến môi trường để trỏ sang bản dev mà không sửa code.

### 4.2. Một cửa sổ

`createWindow()` tạo `BrowserWindow` 1280×840, tối thiểu 960×640. `backgroundColor: "#0f1419"` là màu nền trước khi trang kịp vẽ, tránh nháy trắng.

`webPreferences` là chỗ quyết định bảo mật:

| Option | Giá trị | Ý nghĩa |
|--------|---------|---------|
| `preload` | `preload.cjs` | script cầu nối, chạy trong thế giới riêng |
| `contextIsolation` | `true` | trang web không sửa được object của preload |
| `nodeIntegration` | `false` | trang web không có `require` của Node |
| `sandbox` | `true` | preload cũng bị giới hạn, không đụng filesystem tùy ý |

### 4.3. Link ra ngoài trình duyệt máy

Hai chỗ cùng một luật `isAppUrl`:

- `setWindowOpenHandler` — `target=_blank`, `window.open`
- `will-navigate` — user bấm link làm cả trang đổi URL

URL được ở lại trong cửa sổ: `file:` (trang offline), `localhost` / `127.0.0.1` / `auth.localhost` trên cổng `8080` hoặc `3000`.  
`auth.localhost:8080` là Keycloak. `localhost:3000` là Swagger của api-gateway.

URL khác (Google, tài liệu ngoài) bị chặn trong cửa sổ và mở bằng `shell.openExternal` — trình duyệt mặc định của máy.

### 4.4. Server tắt

`did-fail-load` chỉ xử lý khi `isMainFrame` là true. Ảnh hoặc font lỗi không được phép thay cả cửa sổ bằng trang offline.

`showOffline()` gọi `loadFile(.../offline.html)`. Nút **Thử lại** không tự `location = "http://localhost:8080"` (trang `file://` bị luật điều hướng để ý). Nó gọi hàm đã lộ qua preload; main mới `loadURL`.

### 4.5. Một instance

`requestSingleInstanceLock()`: lần mở thứ hai không tạo process mới. `second-instance` focus cửa sổ đang có, restore nếu đang thu nhỏ.

### 4.6. Vòng đời macOS

Trong `whenReady`:

1. Đăng ký `ipcMain.handle("nihongo:retry", ...)`.
2. `createWindow()`.
3. `activate` — bấm icon Dock khi không còn cửa sổ thì tạo lại. Hành vi chuẩn của app Mac.

`window-all-closed`: Windows/Linux thoát app. macOS giữ process để lần sau `activate` mở lại cửa sổ. Đây là lý do đóng cửa sổ đỏ trên Mac mà Electron vẫn còn trong Dock.

---

## 5. IPC — nút Thử lại

IPC là tin nhắn giữa renderer và main. Renderer không được gọi `loadURL` trực tiếp.

```text
offline.html                         preload.cjs                         main.cjs
click #retry
  window.nihongoDesktop.retry()
    → ipcRenderer.invoke("nihongo:retry")
                                         → ipcMain.handle("nihongo:retry")
                                              openApp() → loadURL(START_URL)
```

`preload.cjs` chỉ lộ một hàm:

```javascript
contextBridge.exposeInMainWorld("nihongoDesktop", {
  retry: () => ipcRenderer.invoke("nihongo:retry"),
});
```

`exposeInMainWorld` tạo `window.nihongoDesktop` trong trang. Trang không thấy `ipcRenderer`, không tự bịa tên kênh. Tên kênh `"nihongo:retry"` nằm ở preload (nơi mình kiểm soát), không nằm trong HTML.

`invoke` / `handle` là cặp có trả lời (Promise). Bản này không dùng giá trị trả về; main chỉ tải lại URL.

---

## 6. `package.json` và `start.sh`

Electron tìm file main bằng field `"main": "src/main.cjs"`. Đuôi `.cjs` vì Electron 37 đang bật kiểu module CommonJS cho file này; `require` không chạy trong file `.mjs` nếu không cấu hình thêm.

`start.sh` không gọi `npm`. Nó chạy thẳng binary đã cài:

```text
node_modules/electron/dist/Electron.app/Contents/MacOS/Electron .
```

Dấu `.` là thư mục app. Electron đọc `package.json` ở đó rồi nạp `src/main.cjs`.

---

## 7. Việc không làm trong app này

| Việc | Vì sao chưa có |
|------|----------------|
| Viết UI bằng React trong Electron | UI đã là `nihongo-web`. Nhét thêm một cây React thứ hai là hai nguồn giao diện |
| `nodeIntegration: true` | Trang web (kể cả XSS) sẽ gọi được Node: đọc file, chạy lệnh |
| Đóng gói `.dmg` / `.exe` | Cần `electron-builder` và chứng chỉ ký app. Bước học sau, khi cửa sổ đã đúng |
| Nhét Postgres vào Electron | DB là container `edu-postgres-nihongo`. Desktop chỉ là client |

---

## 8. Bài tập trên đúng file này

Làm lần lượt trong `src/main.cjs`. Sau mỗi bài, tắt app rồi chạy lại `start.sh`.

**Bài 1 — tiêu đề cửa sổ nói server đang sống.**  
Trong `did-finish-load` của main frame, `mainWindow.setTitle("Nihongo")`. Trong nhánh offline, `setTitle("Nihongo — ngoại tuyến")`.

**Bài 2 — menu.**  
`Menu.setApplicationMenu` với mục **Tải lại** gọi `mainWindow.webContents.reload()`, và mục **Trang chủ** gọi `openApp()`.

**Bài 3 — DevTools chỉ khi học.**  
Nếu `process.env.ELECTRON_DEV === "1"` thì `mainWindow.webContents.openDevTools()`. Chạy: `ELECTRON_DEV=1 apps/nihongo-desktop/start.sh`.

**Bài 4 — thêm một kênh IPC.**  
Lộ `window.nihongoDesktop.version()` trả `app.getVersion()` từ `package.json`. Gọi thử trong console của trang offline. Không `exposeInMainWorld` cả `ipcRenderer`.

**Câu hỏi tự kiểm.**

1. Bấm link `https://github.com` trong cửa sổ Nihongo thì chuyện gì xảy ra, và hàm nào quyết định?
2. Vì sao nút Thử lại không gọi `loadURL` trong `offline.html`?
3. Đóng cửa sổ trên macOS, process còn không? Sự kiện nào mở lại cửa sổ khi bấm icon Dock?
4. `did-fail-load` bỏ qua lỗi ảnh nhờ cờ nào?

Đáp án nằm ở mục 4 và 5 của file này.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **8. Frontend web và desktop** — bài 5/5.

- Bài trước: [learn-ollama-local.md](./learn-ollama-local.md) — Chạy AI local bằng Ollama
- Xong nhóm này. **Nhóm tiếp: 9. Mobile** — bắt đầu bằng [mobile-tech-stacks.md](./mobile-tech-stacks.md) (Tech stack từng app mobile)

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
