# Cài công cụ để chạy project

> **Mục tiêu:** Học xong bài này máy bạn có đủ công cụ để chạy project, và bạn kiểm được từng công cụ đã cài đúng chưa:
> - VS Code: soạn code
> - Git: tải code về và lưu lịch sử thay đổi
> - Node.js 22: chạy backend NestJS và web Next.js
> - Docker Desktop: chạy database, Redis, Kafka… mà không phải cài từng thứ
>
> **Cần biết trước:** [learn-terminal.md](./learn-terminal.md)
> **Thời gian:** 1–2 giờ, phần lớn là chờ tải.

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| Node.js | Chương trình chạy JavaScript bên ngoài trình duyệt |
| npm | Công cụ cài thư viện JavaScript, đi kèm Node |
| Trình quản lý phiên bản (nvm, fnm) | Cho phép cài nhiều bản Node và đổi qua lại |
| Docker | Chạy phần mềm trong "hộp" (container) đã đóng gói sẵn |
| Docker Desktop | Ứng dụng chạy Docker trên macOS/Windows |
| Homebrew | Trình cài phần mềm bằng lệnh trên macOS |
| winget | Trình cài phần mềm bằng lệnh có sẵn trên Windows 10/11 |

---

## 1. Cần máy thế nào

| | Tối thiểu | Nên có |
|---|---|---|
| RAM | 8 GB | 16 GB |
| Ổ trống | 25 GB | 40 GB |
| Hệ điều hành | macOS 13+, Windows 10/11 (64-bit), Ubuntu 22.04+ | |

Vì sao cần nhiều RAM: khi chạy đủ bộ (`docker compose up -d`), hơn 20 container cùng chạy. Đo thật trên máy dev, chúng dùng khoảng **5–6 GB**. Chỉ chạy phần tối thiểu (database, Redis, Kafka) thì khoảng 2 GB. Cách chạy từng phần có ở [run-local.md](./run-local.md).

---

## 2. VS Code

Tải tại <https://code.visualstudio.com>, cài như phần mềm bình thường.

Sau khi cài:

1. **macOS:** mở VS Code, bấm `⌘ + Shift + P`, gõ `shell command`, chọn **Shell Command: Install 'code' command in PATH**. Windows đã tự làm bước này.
2. Kiểm trong terminal mới:

   ```bash
   code --version
   ```

   Ra 3 dòng (số phiên bản, mã commit, kiến trúc máy) là được.

Nên cài thêm các extension sau (bấm biểu tượng ô vuông ở thanh bên trái, tìm theo tên):

| Extension | Để làm gì |
|---|---|
| ESLint | Báo lỗi code JavaScript/TypeScript ngay khi gõ |
| Prettier | Tự định dạng code cho gọn |
| Prisma | Tô màu file `schema.prisma` (sơ đồ database) |
| Docker | Xem container đang chạy ngay trong VS Code |
| GitLens (tùy chọn) | Xem ai sửa dòng nào, khi nào |

---

## 3. Git

### macOS

```bash
git --version
```

Lần đầu chạy, macOS có thể hiện hộp thoại hỏi cài **Command Line Tools**. Bấm **Install** và chờ xong. Chạy lại lệnh trên, ra `git version 2.x` là được.

### Windows

```powershell
winget install --id Git.Git -e
```

Hoặc tải ở <https://git-scm.com/download/win>. Khi cài, các lựa chọn để mặc định là được. Cài xong **đóng PowerShell, mở lại**, rồi chạy `git --version`.

**Riêng Windows, chạy lệnh này TRƯỚC khi tải code về:**

```powershell
git config --global core.autocrlf input
```

Windows kết thúc mỗi dòng bằng 2 ký tự (CRLF), macOS/Linux dùng 1 (LF). Theo mặc định, Git trên Windows đổi file sang CRLF khi tải về. Các file `.sh` trong repo chạy bên trong container Linux. Nếu bị đổi sang CRLF, chúng lỗi kiểu `/bin/sh^M: bad interpreter`. Lệnh trên giữ nguyên LF.

### Khai báo tên (mọi hệ điều hành, một lần)

```bash
git config --global user.name "Ten Cua Ban"
git config --global user.email "email-cua-ban@example.com"
```

Tên và email này gắn vào mỗi lần bạn lưu thay đổi (commit). Cách dùng Git ở bài [learn-git.md](./learn-git.md).

---

## 4. Node.js 22

Project yêu cầu Node **22 trở lên** (`"engines": { "node": ">=22" }` trong [package.json](../package.json)).

Nên cài qua **trình quản lý phiên bản** thay vì tải bản cài trực tiếp. Lý do: project khác có thể cần Node 18 hay 20, và có công cụ này thì đổi qua lại bằng một lệnh.

### macOS (dùng nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Đóng terminal, mở lại, rồi:

```bash
nvm install 22
nvm alias default 22
```

### Windows (dùng fnm)

```powershell
winget install Schniz.fnm
```

Mở file cấu hình của PowerShell:

```powershell
notepad $PROFILE
```

Nếu Notepad báo file chưa có, chọn tạo mới. Thêm dòng sau vào cuối file, lưu lại:

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
```

Đóng PowerShell, mở lại, rồi:

```powershell
fnm install 22
fnm default 22
```

### Kiểm

```bash
node --version     # → v22.x.x  (số đầu phải là 22 trở lên)
npm --version      # → 10.x trở lên
```

Thử chạy một dòng JavaScript:

```bash
node -e "console.log(1 + 2)"     # → 3
```

---

## 5. Docker Desktop

Tải tại <https://www.docker.com/products/docker-desktop/>.

- **macOS:** chọn đúng bản **Apple Silicon** (M1/M2/M3/M4) hoặc **Intel**. Xem bằng menu  → **About This Mac**, mục *Chip*.
- **Windows:** trình cài sẽ yêu cầu bật **WSL 2**. Làm theo hướng dẫn và khởi động lại máy nếu được hỏi.

Mở Docker Desktop và chờ biểu tượng cá voi báo **Engine running**. Docker phải **đang chạy** mỗi khi làm việc với project.

Tăng bộ nhớ cho Docker: **Settings → Resources → Memory**, đặt ít nhất **6 GB** nếu máy có 16 GB RAM. Để mức mặc định quá thấp thì Kafka và Keycloak hay bị tắt giữa chừng mà không báo lỗi rõ ràng.

Kiểm:

```bash
docker --version             # → Docker version 2x.x
docker compose version       # → Docker Compose version v2 trở lên
docker run --rm hello-world
```

Lệnh cuối tải một image nhỏ rồi chạy. Thấy dòng **Hello from Docker!** là Docker đã hoạt động. `--rm` xóa container ngay sau khi chạy xong.

Docker là gì và vì sao project dùng nó: bài [learn-docker.md](./learn-docker.md) ở nhóm 6. Lúc này chỉ cần nó chạy được.

---

## 6. Tải code về (clone)

Chọn một thư mục để chứa code, ví dụ `~/Projects` (macOS) hoặc `C:\Projects` (Windows). Tránh thư mục có dấu tiếng Việt hoặc dấu cách trong đường dẫn, và tránh thư mục đồng bộ OneDrive/iCloud.

```bash
mkdir -p ~/Projects        # PowerShell: mkdir C:\Projects
cd ~/Projects              # PowerShell: cd C:\Projects
git clone <địa-chỉ-repo> edu-app-nihongo
cd edu-app-nihongo
code .
```

`<địa-chỉ-repo>` là đường dẫn người quản lý repo đưa cho bạn: trang GitHub của repo → nút **Code** → copy. Repo này là **private**, nên tài khoản GitHub của bạn phải được mời vào trước.

GitHub không nhận mật khẩu tài khoản khi clone bằng HTTPS. Dễ nhất là cài **GitHub CLI** rồi đăng nhập một lần:

```bash
brew install gh            # macOS (cần Homebrew: https://brew.sh)
```

```powershell
winget install GitHub.cli  # Windows
```

```bash
gh auth login              # chọn GitHub.com → HTTPS → Login with a web browser
```

Đăng nhập xong thì `git clone` dùng được luôn.

---

## 7. Cài thư viện của project

Đứng ở thư mục gốc `edu-app-nihongo`:

```bash
npm install
```

Lệnh này đọc [package.json](../package.json), tải mọi thư viện mà web, backend và các package dùng chung cần, rồi đặt vào thư mục `node_modules/`. Lần đầu mất 3–10 phút.

Kết quả đúng kết thúc bằng một dòng dạng `added 2xxx packages in 4m`. Vài dòng `npm warn deprecated …` là bình thường. Dòng bắt đầu bằng `npm error` mới là lỗi.

`node_modules/` rất nặng (hàng GB) và **không** được đưa vào Git. Máy nào cũng tự tạo bằng `npm install`.

---

## 8. Bảng kiểm cuối

Chạy lần lượt. Tất cả đều ra kết quả như cột bên phải thì bạn sẵn sàng sang nhóm 1.

| Lệnh | Kết quả đúng |
|---|---|
| `code --version` | Số phiên bản |
| `git --version` | `git version 2.x` |
| `git config user.name` | Tên bạn đã khai |
| `node --version` | `v22.x` trở lên |
| `npm --version` | `10.x` trở lên |
| `docker compose version` | `v2` trở lên |
| `docker run --rm hello-world` | Có dòng `Hello from Docker!` |
| `ls node_modules \| head -3` (trong repo) | Ra vài tên thư mục |

---

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `nvm: command not found` ngay sau khi cài | Terminal chưa nạp lại cấu hình | Đóng, mở lại terminal |
| `node --version` ra v18/v20 | Máy có bản Node cũ cài trước đó | `nvm alias default 22` (hoặc `fnm default 22`), mở terminal mới |
| `Cannot connect to the Docker daemon` | Docker Desktop chưa mở | Mở Docker Desktop, chờ **Engine running** |
| Windows: Docker báo cần WSL | Chưa bật WSL 2 | PowerShell (Run as Administrator): `wsl --install`, khởi động lại máy |
| `npm install` báo `EACCES` (macOS) | Node cài bằng bản cài hệ thống, npm cần quyền root | Cài lại Node qua nvm như mục 4; đừng dùng `sudo npm` |
| `npm install` rất lâu rồi báo `ETIMEDOUT` | Mạng chặn hoặc chập chờn | Chạy lại; thử mạng khác |
| `git clone` báo `Repository not found` | Chưa được mời vào repo private, hoặc chưa đăng nhập | Nhờ người quản lý mời; chạy `gh auth login` |
| Script `.sh` lỗi `bad interpreter: /bin/sh^M` (Windows) | File bị đổi sang CRLF lúc clone | `git config --global core.autocrlf input`, xóa thư mục repo, clone lại |

---

## Tự kiểm tra

1. Vì sao nên cài Node qua nvm/fnm thay vì tải bản cài trực tiếp?
2. Docker Desktop đã cài nhưng `docker ps` báo `Cannot connect to the Docker daemon`. Vì sao?
3. Vì sao `node_modules/` không được commit vào Git?
4. Người dùng Windows phải chạy lệnh Git nào trước khi clone, và vì sao?

<details>
<summary>Đáp án</summary>

1. Để đổi phiên bản Node theo từng project bằng một lệnh, và để không cần quyền admin khi cài thư viện toàn cục.
2. Ứng dụng Docker Desktop chưa được mở. Lệnh `docker` chỉ là phần gửi yêu cầu; phần chạy container (daemon) nằm trong Docker Desktop.
3. Nó rất nặng, và tạo lại được hoàn toàn từ `package.json` + `package-lock.json` bằng `npm install`.
4. `git config --global core.autocrlf input`. Không có lệnh này, Git đổi file sang kiểu xuống dòng của Windows (CRLF), và các script `.sh` chạy trong container Linux sẽ lỗi.

</details>

## Bài tập

1. Hoàn thành bảng kiểm ở mục 8 và chụp lại kết quả.
2. Mở Docker Desktop, tab **Containers**, sau khi chạy `docker run --rm hello-world`. Vì sao không thấy container `hello-world` nào trong danh sách?
3. Mở [apps/nihongo-web/package.json](../apps/nihongo-web/package.json), mục `dependencies`. Tìm xem web dùng Next.js và React phiên bản nào. Dấu `^` trước số phiên bản nghĩa là gì? (Gợi ý: tìm "semver caret").

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **0. Nền tảng** — bài 2/5.

- Bài trước: [learn-terminal.md](./learn-terminal.md) — Terminal: thư mục, đường dẫn, đọc một lệnh dài, biến môi trường
- **Bài tiếp: [learn-git.md](./learn-git.md)** — Git: branch, commit, Pull Request, xử lý conflict, những gì không được commit

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
