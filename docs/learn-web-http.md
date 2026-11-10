# Web và HTTP: app nói chuyện với server thế nào

> **Mục tiêu:** Học xong bài này bạn:
> - giải thích được điều gì xảy ra khi web/app gọi `GET /api/lessons`;
> - đọc được một URL, một request và một response HTTP (method, status, header, body);
> - gọi được API của project bằng `curl` và bằng tab **Network** của trình duyệt;
> - hiểu đăng nhập hoạt động thế nào: token, header `Authorization`, cookie;
> - đoán được lỗi nằm ở đâu chỉ từ mã trạng thái (400, 401, 404, 500, 502).
>
> **Cần biết trước:** [learn-terminal.md](./learn-terminal.md), [learn-js-ts.md](./learn-js-ts.md) (đặc biệt mục JSON và `async`/`await`)
> **Thời gian:** khoảng 3 giờ.

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| Client | Bên gửi yêu cầu: trình duyệt, app mobile, `curl` |
| Server | Bên nhận yêu cầu và trả lời. Ở đây là nginx và API gateway |
| HTTP | "Ngôn ngữ" client và server dùng để nói chuyện |
| Request / Response | Yêu cầu client gửi đi / câu trả lời server gửi lại |
| URL | Địa chỉ của thứ bạn muốn: `http://localhost:8080/api/lessons/1` |
| Port (cổng) | Số phân biệt các chương trình trên cùng một máy: 8080, 3000, 5433… |
| API | Danh sách URL mà server cho phép gọi, và dữ liệu mỗi URL nhận/trả |
| Status code | Số 3 chữ số trong response cho biết kết quả: 200, 404… |
| Header | Thông tin kèm theo request/response, dạng `Tên: giá trị` |
| Body | Phần dữ liệu chính, ở project này là JSON |
| Token | Chuỗi chứng minh bạn đã đăng nhập, gửi kèm mỗi request |

---

## 1. Bức tranh chung

Khi bạn mở danh sách bài học trên web:

```
Trình duyệt ──── GET http://localhost:8080/api/lessons ───▶ nginx (cổng 8080)
                                                              │  /api/... chuyển cho gateway
                                                              ▼
                                                        API gateway (cổng 3000, NestJS)
                                                              │  hỏi content-service (gRPC)
                                                              ▼
                                                        content-service ──▶ PostgreSQL
Trình duyệt ◀──── 200 OK, body JSON danh sách bài ─────────────┘
```

- **nginx** là cửa vào duy nhất (cổng 8080). URL bắt đầu bằng `/api/` thì nó chuyển cho gateway, còn lại chuyển cho web Next.js.
- **API gateway** kiểm đăng nhập, kiểm dữ liệu, rồi hỏi các service phía sau.
- Trình duyệt, app Android, app iOS đều gọi **cùng một API**. Đó là lý do API quan trọng: viết một lần, mọi client dùng chung.

Chi tiết từng thành phần ở nhóm 2 ([system-design.md](./system-design.md)). Bài này tập trung vào phần **giữa client và server**.

---

## 2. Đọc một URL

```
http://localhost:8080/api/lessons?jlptLevel=N5&q=chao
└─┬─┘ └───┬───┘ └─┬┘└────┬─────┘ └──────────┬─────────┘
scheme   host   port    path          query string
```

| Phần | Ý nghĩa |
|---|---|
| `http` | Giao thức. `https` là bản mã hóa, dùng trên mạng thật |
| `localhost` | Tên máy. `localhost` (hay `127.0.0.1`) là **chính máy bạn** |
| `8080` | Cổng. Thiếu cổng thì `http` mặc định 80, `https` mặc định 443 |
| `/api/lessons` | Đường dẫn: "tài nguyên" bạn muốn |
| `?jlptLevel=N5&q=chao` | Tham số lọc, dạng `tên=giá trị`, nối bằng `&` |

Mỗi chương trình nghe trên một cổng riêng. Cổng hay gặp trong project:

| Cổng | Chương trình |
|---|---|
| 8080 | nginx: cửa vào web + API khi chạy bằng Docker |
| 3000 | API gateway (NestJS) |
| 5173 | Web Next.js khi chạy dev ([run-local.md](./run-local.md)) |
| 5433 | PostgreSQL của project |

Hai chương trình không thể cùng nghe một cổng. Lỗi `EADDRINUSE` nghĩa là cổng đó đã có chương trình khác chiếm.

---

## 3. Request và response trông thế nào

Bên trong, HTTP chỉ là **chữ**. Một request:

```http
GET /api/lessons/1 HTTP/1.1
Host: localhost:8080
Accept: application/json
```

Response:

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"success":true,"data":{"id":1,"lessonNumber":1,"title":"Bài 1","jlptLevel":"N5","textbook":"MINNA", …},"timestamp":"…"}
```

| Phần | Request | Response |
|---|---|---|
| Dòng đầu | **Method** + path: `GET /api/lessons/1` | **Status**: `200 OK` |
| Header | `Host`, `Accept`, `Authorization`, `Content-Type`… | `Content-Type`, `Set-Cookie`… |
| Dòng trống | | |
| Body | Dữ liệu gửi lên (POST/PUT/PATCH) | Dữ liệu trả về |

### Method: bạn muốn làm gì

| Method | Nghĩa | Ví dụ trong project |
|---|---|---|
| `GET` | Đọc | `GET /api/lessons` |
| `POST` | Tạo mới / gửi hành động | `POST /api/auth/login`, `POST /api/lessons` (admin) |
| `PATCH` | Sửa một phần | `PATCH /api/lessons/:id` (admin) |
| `PUT` | Thay toàn bộ | Ít dùng trong project |
| `DELETE` | Xóa | `DELETE /api/lessons/:id` (admin) |

`:id` trong tài liệu API là **chỗ thay bằng giá trị**: `/api/lessons/1`.

`GET` không được làm thay đổi dữ liệu. Trình duyệt, proxy và cache coi `GET` là an toàn để gọi lại nhiều lần.

### Status code: chuyện gì đã xảy ra

| Nhóm | Nghĩa | Hay gặp |
|---|---|---|
| 2xx | Thành công | `200 OK`, `201 Created` (tạo mới), `204 No Content` |
| 3xx | Chuyển hướng | `301`, `302`: đi tới URL khác |
| 4xx | **Lỗi phía client**: request sai | `400` dữ liệu sai, `401` chưa đăng nhập, `403` không đủ quyền, `404` không có, `409` trùng, `413` body quá lớn, `429` gọi quá nhiều |
| 5xx | **Lỗi phía server** | `500` bug, `502` server phía sau không trả lời đúng, `503` tạm ngưng, `504` quá thời gian chờ |

Đây là công cụ gỡ lỗi mạnh nhất: **4xx thì xem lại request, 5xx thì xem log server.**

---

## 4. Gọi API bằng `curl`

`curl` là chương trình gửi HTTP request từ terminal. Nó có sẵn trên macOS và Windows 10/11.

**Windows PowerShell:** gõ `curl.exe` thay vì `curl`. Trong Windows PowerShell 5.1, `curl` là tên tắt của một lệnh khác (`Invoke-WebRequest`) với cú pháp khác hẳn.

Các ví dụ dưới đây cần stack đang chạy ở cổng 8080 ([docker.md](./docker.md)). Output là output thật, đã rút gọn chỗ có `…`.

### 4.1 GET đơn giản

```bash
curl http://localhost:8080/api/lessons/1
```

```json
{"success":true,"data":{"id":1,"lessonNumber":1,"title":"Bài 1","description":null,"jlptLevel":"N5","textbook":"MINNA","thumbnailUrl":null,"sortOrder":0,"createdAt":"2026-06-24T06:08:33.594Z","updatedAt":"2026-09-02T08:51:28.182Z"},"timestamp":"2026-11-10T07:50:38.168Z"}
```

Mọi response thành công của API đều có cùng dạng `{ success: true, data: …, timestamp }`. Lý do có dạng chung này nằm ở [learn-nestjs.md](./learn-nestjs.md) mục 8.1.

### 4.2 Có tham số lọc

```bash
curl "http://localhost:8080/api/lessons?jlptLevel=N5"
```

Bọc URL trong ngoặc kép, vì `?` và `&` có nghĩa đặc biệt với shell.

### 4.3 Xem cả status và header: `-i`

```bash
curl -i http://localhost:8080/api/auth/me
```

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8
…
{"success":false,"error":{"code":"UNAUTHORIZED","message":"Unauthorized"},"timestamp":"…","path":"/api/auth/me"}
```

`/api/auth/me` trả thông tin người đang đăng nhập. Bạn chưa gửi token nên nhận `401`. Response lỗi cũng có dạng chung: `{ success: false, error: { code, message } }`.

### 4.4 POST có body JSON

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"khong-phai-email","password":"123"}'
```

```json
{"success":false,"error":{"code":"BAD_REQUEST","message":"email must be an email, password must be longer than or equal to 6 characters"},…}
```

| Cờ | Nghĩa |
|---|---|
| `-X POST` | Dùng method POST (mặc định là GET) |
| `-H "Tên: giá trị"` | Thêm header. `Content-Type: application/json` báo body là JSON |
| `-d '…'` | Body gửi lên |

Server trả **400** kèm lý do cụ thể: dữ liệu sai định dạng, server từ chối trước khi tra database.

Đổi sang email đúng dạng nhưng mật khẩu sai:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@example.com","password":"sai-mat-khau-123"}'
```

```json
{"success":false,"error":{"code":"UNAUTHORIZED","message":"Email hoặc mật khẩu không đúng"},…}
```

Server **không** nói email có tồn tại hay không, chỉ nói "email hoặc mật khẩu không đúng". Nếu báo riêng "email không tồn tại", kẻ xấu dò được ai đã có tài khoản.

**Trên PowerShell**, dấu nháy trong `-d` dễ bị hiểu sai. Dùng `Invoke-RestMethod` cho gọn:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"nobody@example.com","password":"sai-mat-khau-123"}'
```

---

## 5. Đăng nhập hoạt động thế nào

HTTP **không nhớ** gì giữa hai request: mỗi request độc lập. Để server biết "đây vẫn là bạn", mỗi request phải mang theo bằng chứng. Project dùng **access token** (JWT).

### 5.1 Đăng nhập, nhận token

Dùng tài khoản dev trong [accounts.md](./accounts.md) (chỉ có trên máy local):

```bash
curl -i -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nihongo.local","password":"admin123"}'
```

```
HTTP/1.1 201 Created
Set-Cookie: refresh_token=<…>; Max-Age=604800; Path=/api/auth; HttpOnly; Secure; SameSite=Lax
Content-Type: application/json; charset=utf-8

{"success":true,"data":{"access_token":"eyJhbGciOiJIUzI1NiIs…","user":{"id":1,"email":"admin@nihongo.local","role":"ADMIN",…}},…}
```

Server trả hai thứ:

| | `access_token` (trong body) | `refresh_token` (trong cookie) |
|---|---|---|
| Dùng để | Gửi kèm **mọi** request cần đăng nhập | Xin access token mới khi cái cũ hết hạn |
| Sống | 15 phút | 7 ngày (`Max-Age=604800` giây) |
| Client lưu ở | Web: `localStorage`, key `nihongo-auth-token` ([api-client.ts](../apps/nihongo-web/src/lib/api-client.ts)). Mobile: tùy app (iOS dùng Keychain, Flutter dùng `flutter_secure_storage`), xem nhóm 9 | Trình duyệt tự giữ; JavaScript **không đọc được** (`HttpOnly`) |

Vì sao tách đôi: access token đi kèm mọi request nên dễ lộ hơn. Cho nó sống ngắn, lộ thì cũng chỉ dùng được 15 phút. Refresh token chỉ gửi tới `/api/auth` (`Path=/api/auth`) và JavaScript không đọc được, nên khó bị đánh cắp hơn.

Đánh đổi cần biết: `localStorage` thì JavaScript nào trên trang cũng đọc được. Nếu trang bị chèn mã độc (XSS), access token bị lấy. Web giảm rủi ro này bằng Content-Security-Policy ([learn-devsecops.md](./learn-devsecops.md) mục 11) và thời hạn 15 phút.

### 5.2 Gửi token

Chép phần `access_token` vào một biến cho tiện:

```bash
TOKEN="eyJhbGciOiJIUzI1NiIs…dán-cả-chuỗi-vào-đây…"
curl http://localhost:8080/api/auth/me -H "Authorization: Bearer $TOKEN"
```

```json
{"success":true,"data":{"id":1,"email":"admin@nihongo.local","role":"ADMIN","name":"Administrator",…},…}
```

Header `Authorization: Bearer <token>` là cách chuẩn để gửi token. Giờ `401` đã thành `200`.

### 5.3 Bên trong token có gì

JWT gồm 3 phần nối bằng dấu chấm: `header.payload.chữ_ký`. Phần giữa chỉ là JSON được mã hóa base64, **ai cũng đọc được**. Dán token vào <https://jwt.io>, hoặc giải mã trên máy:

```json
{ "sub": 1, "email": "admin@nihongo.local", "role": "ADMIN", "iat": 1794297447, "exp": 1794298347 }
```

- `sub`: id người dùng. `iat`: lúc tạo. `exp`: lúc hết hạn. Hai số này là giây tính từ 1/1/1970; `exp - iat = 900` giây = 15 phút.
- Token **không được mã hóa** mà được **ký**. Ai cũng đọc được nội dung, nhưng sửa một ký tự thì chữ ký sai và server từ chối. Vì vậy đừng bao giờ đặt mật khẩu hay dữ liệu bí mật trong token.
- Chữ ký tạo bằng `JWT_SECRET`, chỉ server biết. Lộ `JWT_SECRET` thì ai cũng tự ký được token ADMIN ([learn-nestjs.md](./learn-nestjs.md) mục 16).

Token là **mật khẩu tạm thời**. Đừng dán token thật của production vào trang web lạ, chat, hay issue GitHub.

---

## 6. Xem request trong trình duyệt

1. Mở <http://localhost:8080> bằng Chrome/Edge/Firefox.
2. Bấm `F12` (macOS: `⌘ + ⌥ + I`), chọn tab **Network**.
3. Chọn bộ lọc **Fetch/XHR** để chỉ thấy các lời gọi API.
4. Tải lại trang hoặc bấm vào một bài học.

Mỗi dòng là một request. Bấm vào một dòng để xem:

| Tab | Thấy gì |
|---|---|
| Headers | URL, method, status, header request và response |
| Payload | Body gửi lên (với POST) |
| Preview / Response | Body trả về |
| Timing | Mất bao lâu, chờ server bao nhiêu |

Khi web "không hiện dữ liệu", **mở tab Network trước tiên**:

- Request có được gửi không?
- Status là gì?
- Body lỗi nói gì?

Thường chỉ cần đọc mục `error.message` là biết nguyên nhân.

Chuột phải vào một request → **Copy → Copy as cURL**. Bạn được đúng lệnh `curl` tương ứng để chạy lại trong terminal.

---

## 7. Những thứ sẽ gặp lại ở các bài sau

| Khái niệm | Một câu | Học kỹ ở |
|---|---|---|
| CORS | Trình duyệt chặn trang ở domain A gọi API ở domain B, trừ khi server B cho phép | [learn-nestjs.md](./learn-nestjs.md) mục 2 |
| HTTPS | HTTP được mã hóa: người ở giữa (wifi quán cà phê) không đọc trộm được | [learn-nginx.md](./learn-nginx.md) |
| Reverse proxy | Server đứng trước (nginx), nhận request rồi chuyển cho server phía sau | [learn-nginx.md](./learn-nginx.md) |
| WebSocket | Kết nối giữ mở hai chiều, cho chat, gọi video, thông báo tức thì | [microservices-communication.md](./microservices-communication.md) |
| Rate limit | Giới hạn số request mỗi phút để chặn spam → `429` | [learn-nestjs.md](./learn-nestjs.md) mục 5.5 |
| Swagger | Trang liệt kê mọi API kèm nút gọi thử: <http://localhost:3000/api/docs> (dev) | [run-local.md](./run-local.md) |

---

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `curl: (7) Failed to connect to localhost port 8080` | Không có gì nghe cổng 8080: stack chưa chạy | Bật stack ([docker.md](./docker.md)); `docker ps` xem nginx có chạy không |
| `502 Bad Gateway` | nginx chạy nhưng gateway phía sau chết/chưa lên | `docker ps`, `docker logs edu-gateway` |
| `401 Unauthorized` dù đã đăng nhập | Quên header, thiếu chữ `Bearer `, hoặc token hết hạn (15 phút) | Đăng nhập lại; kiểm header |
| `403 Forbidden` | Đăng nhập rồi nhưng không đủ quyền (gọi API admin bằng tài khoản thường) | Dùng tài khoản đúng vai trò |
| `400` với `property x should not exist` | Gửi field mà API không nhận | Bỏ field đó; xem Swagger |
| PowerShell: `curl -X POST …` báo lỗi lạ | `curl` là tên tắt của `Invoke-WebRequest` | Dùng `curl.exe` hoặc `Invoke-RestMethod` |
| Lỗi CORS đỏ trong Console trình duyệt | Web gọi API ở origin không được phép | Gọi qua cùng origin (8080) hoặc thêm origin vào `ALLOWED_ORIGINS` |

---

## Tự kiểm tra

1. Trong `http://localhost:8080/api/lessons?jlptLevel=N5`, đâu là port, path và query string?
2. Lỗi 4xx và 5xx khác nhau thế nào? Mỗi loại bạn đi tìm nguyên nhân ở đâu?
3. Vì sao cần gửi token ở **mọi** request, thay vì chỉ lúc đăng nhập?
4. JWT có mã hóa nội dung không? Đặt số điện thoại người dùng vào token có ổn không?
5. Vì sao refresh token để trong cookie `HttpOnly`, không để JavaScript đọc?
6. Trang danh sách bài học trống trơn. Bạn kiểm gì đầu tiên trong DevTools?

<details>
<summary>Đáp án</summary>

1. Port `8080`, path `/api/lessons`, query string `jlptLevel=N5`.
2. 4xx: request sai (dữ liệu, quyền, URL), xem lại cái mình gửi. 5xx: server lỗi, xem log server (`docker logs`).
3. HTTP không nhớ trạng thái giữa các request. Mỗi request phải tự chứng minh danh tính.
4. Không mã hóa, chỉ ký. Ai cầm token cũng đọc được nội dung, nên không đặt dữ liệu riêng tư vào.
5. Nếu trang bị chèn mã độc (XSS), mã đó không đọc được cookie `HttpOnly`, nên không lấy cắp được refresh token sống 7 ngày.
6. Tab Network, bộ lọc Fetch/XHR: request `/api/lessons` có không, status gì, body trả về gì.

</details>

## Bài tập

1. Gọi `GET /api/lessons?jlptLevel=N5` bằng `curl`. Có bao nhiêu bài? Gợi ý: chép output vào file rồi dùng `node` với `JSON.parse` để đếm `data.length`, hoặc làm bài tập 2 của [learn-js-ts.md](./learn-js-ts.md).
2. Làm trọn mục 5: đăng nhập, lấy token, gọi `/api/auth/me`. Đợi hơn 15 phút rồi gọi lại bằng token cũ. Status là gì?
3. Mở web, tab Network, đăng nhập bằng giao diện. Tìm request `login`, xem tab **Headers** phần response có `Set-Cookie` không. Sau đó tìm một request gọi API khác và xem header `Authorization` của nó.
4. Mở Swagger <http://localhost:3000/api/docs> (gateway phải chạy với `ENABLE_SWAGGER=true`, mặc định bật trên máy dev). Tìm API lấy danh sách bài học và bấm **Try it out**.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **0. Nền tảng** — bài 5/5.

- Bài trước: [learn-js-ts.md](./learn-js-ts.md) — JavaScript/TypeScript đủ để đọc code project: hàm, mảng, object, async/await, kiểu
- Xong nhóm này. **Nhóm tiếp: 1. Bắt đầu: chạy được project** — bắt đầu bằng [run-local.md](./run-local.md) (Chạy EDU APP Nihongo trên máy từng bước)

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
