# Terminal: gõ lệnh thay cho bấm chuột

> **Mục tiêu:** Học xong bài này bạn:
> - mở được terminal và biết mình đang đứng ở thư mục nào;
> - di chuyển giữa các thư mục, xem và tạo file bằng lệnh;
> - đọc được một lệnh dài trong tài liệu (lệnh, tham số, đường dẫn) và biết chạy nó ở đâu;
> - xử lý được ba lỗi người mới hay gặp: sai thư mục, không tìm thấy lệnh, lệnh treo.
>
> **Cần biết trước:** Không cần gì.
> **Thời gian:** khoảng 1–2 giờ, gõ theo từng bước.

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| Terminal | Cửa sổ để gõ lệnh cho máy tính, thay cho bấm chuột |
| Shell | Chương trình đọc lệnh bạn gõ và chạy nó. macOS dùng `zsh`, Windows dùng PowerShell |
| Lệnh (command) | Một dòng chữ bảo máy làm gì, ví dụ `ls` |
| Tham số (argument) | Phần đi sau lệnh, nói lệnh làm việc với cái gì: `cd docs` |
| Cờ (flag / option) | Tham số bắt đầu bằng `-` hoặc `--`, bật một chế độ: `ls -l` |
| Thư mục hiện tại | Thư mục terminal đang "đứng". Lệnh chạy ở đây nếu bạn không nói khác |
| Đường dẫn (path) | Địa chỉ của file/thư mục: `docs/README.md` |
| Biến môi trường | Giá trị có tên mà chương trình đọc được, ví dụ `PATH`, `NODE_ENV` |

---

## 1. Vì sao phải học terminal

Hầu hết việc trong project này làm bằng lệnh:

- cài thư viện: `npm install`
- bật database: `docker compose up -d postgres-nihongo`
- chạy server: `npm run dev:gateway`
- lưu thay đổi: `git commit`

Không có nút bấm nào thay được các lệnh này. Tài liệu trong `docs/` cũng toàn ghi lệnh. Đọc và chạy được lệnh là kỹ năng đầu tiên cần có.

---

## 2. Mở terminal

| Hệ điều hành | Cách mở | Shell mặc định |
|---|---|---|
| macOS | Bấm `⌘ + Space`, gõ **Terminal**, Enter | `zsh` |
| Windows | Bấm phím Windows, gõ **PowerShell** hoặc **Terminal**, Enter | PowerShell |
| Trong VS Code (mọi hệ điều hành) | Menu **Terminal → New Terminal**, hoặc `` Ctrl + ` `` | Như trên |

Nên dùng terminal **trong VS Code**: nó tự mở đúng thư mục project, và bạn vừa xem code vừa gõ lệnh được.

Bạn sẽ thấy một dòng chờ, gọi là **dấu nhắc** (prompt), đại loại:

```
ten-may:~ ban$                    ← macOS
PS C:\Users\ban>                  ← Windows PowerShell
```

Gõ lệnh sau dấu nhắc rồi bấm **Enter**. Trong tài liệu, dấu nhắc **không** được ghi ra. Thấy

```bash
ls
```

thì bạn chỉ gõ `ls` và Enter.

---

## 3. Bạn đang ở đâu: `pwd`, `ls`, `cd`

### 3.1 Xem thư mục hiện tại

```bash
pwd
```

`pwd` là *print working directory*. Kết quả dạng `/Users/ban` (macOS) hoặc `C:\Users\ban` (Windows). PowerShell cũng hiểu `pwd`.

### 3.2 Xem có gì trong thư mục

```bash
ls
```

`ls` là *list*: liệt kê file và thư mục. PowerShell cũng hiểu `ls`.

Thêm cờ để xem chi tiết hơn:

```bash
ls -la        # macOS/Linux: -l = dạng danh sách dài, -a = cả file ẩn (tên bắt đầu bằng dấu chấm)
```

```powershell
ls -Force     # PowerShell: hiện cả file ẩn
```

File có tên bắt đầu bằng `.` (như `.env`, `.gitignore`) là **file ẩn**. `ls` thường không hiện chúng, nên khi tài liệu nói "sửa file `.env`" mà bạn không thấy, hãy dùng `ls -la`.

### 3.3 Đi vào thư mục khác

Giả sử project nằm ở `~/Projects/edu-app-nihongo` (`~` là thư mục nhà của bạn):

```bash
cd ~/Projects/edu-app-nihongo
pwd                     # → .../Projects/edu-app-nihongo
ls                      # → apps  docs  infra  packages  services  docker-compose.yml  package.json …
cd docs                 # vào thư mục con
cd ..                   # lên thư mục cha (".." = cha, "." = chính nó)
cd -                    # quay lại thư mục vừa ở (macOS/Linux)
```

Mẹo: gõ vài chữ đầu rồi bấm **Tab**, terminal tự điền nốt tên. Ví dụ `cd do` + Tab thành `cd docs/`. Vừa nhanh vừa tránh gõ sai.

---

## 4. Đường dẫn tuyệt đối và tương đối

| Loại | Ví dụ | Bắt đầu từ |
|---|---|---|
| Tuyệt đối | `/Users/ban/Projects/edu-app-nihongo/docs` | Gốc ổ đĩa (`/` hoặc `C:\`) |
| Tương đối | `docs/README.md`, `../infra` | Thư mục **hiện tại** |

Tài liệu của project luôn ghi đường dẫn **tương đối từ thư mục gốc của repo**. Thấy `services/api-gateway/src/main.ts` nghĩa là: từ thư mục `edu-app-nihongo`, vào `services`, rồi `api-gateway`, rồi `src`, rồi file `main.ts`.

Chạy một lệnh ở **sai thư mục** là lỗi phổ biến nhất của người mới. Ví dụ đứng ở `docs/` mà gõ `npm run dev:gateway` sẽ báo `Missing script` hoặc `ENOENT … package.json`. Trước khi chạy lệnh trong tài liệu, kiểm `pwd`.

**macOS và Windows dùng dấu gạch khác nhau.** macOS/Linux dùng `/`. Windows dùng `\`, nhưng PowerShell và Node hiểu cả `/`. Tài liệu trong repo ghi bằng `/`.

---

## 5. Xem, tạo, sửa, xóa file

| Việc | macOS / Linux | PowerShell |
|---|---|---|
| Xem nội dung file | `cat docs/README.md` | `cat docs/README.md` (hoặc `Get-Content`) |
| Xem đầu file | `head -20 package.json` | `Get-Content package.json -TotalCount 20` |
| Tạo thư mục | `mkdir thu-nghiem` | `mkdir thu-nghiem` |
| Tạo file rỗng | `touch a.txt` | `New-Item a.txt` |
| Chép file | `cp a.txt b.txt` | `cp a.txt b.txt` |
| Đổi tên / di chuyển | `mv b.txt c.txt` | `mv b.txt c.txt` |
| Xóa file | `rm c.txt` | `rm c.txt` |
| Mở thư mục bằng VS Code | `code .` | `code .` |

**`rm` không đưa file vào Thùng rác.** File bị xóa là mất. Đặc biệt cẩn thận với `rm -rf` (xóa cả thư mục, không hỏi lại). Đừng chạy `rm` trên đường dẫn bạn chưa đọc kỹ.

Thực hành ngay, trong thư mục project:

```bash
mkdir thu-nghiem
cd thu-nghiem
echo "xin chao" > loi-chao.txt     # ">" ghi kết quả của lệnh vào file (ghi đè)
echo "lan nua" >> loi-chao.txt     # ">>" ghi nối thêm vào cuối file
cat loi-chao.txt
cd ..
rm -r thu-nghiem                   # PowerShell: rm -r thu-nghiem
```

Kết quả của `cat`:

```
xin chao
lan nua
```

---

## 6. Đọc một lệnh dài

Lấy một lệnh thật trong [run-local.md](./run-local.md):

```bash
docker exec edu-postgres-nihongo psql -U nihongo -d nihongo -c "select count(*) from \"Lesson\";"
```

Tách ra từng phần:

| Phần | Là gì |
|---|---|
| `docker` | Chương trình được chạy |
| `exec` | Lệnh con của docker: "chạy một lệnh bên trong container" |
| `edu-postgres-nihongo` | Tham số: tên container |
| `psql` | Chương trình chạy bên trong container (công cụ dòng lệnh của PostgreSQL) |
| `-U nihongo` | Cờ có giá trị: đăng nhập bằng user `nihongo` |
| `-d nihongo` | Cờ có giá trị: dùng database `nihongo` |
| `-c "…"` | Câu SQL cần chạy. Bọc trong ngoặc kép vì có dấu cách |
| `\"Lesson\"` | Dấu `"` bên trong ngoặc kép phải viết `\"` |

Quy tắc chung:

- **Dấu cách tách các tham số.** Giá trị có dấu cách phải bọc trong ngoặc: `"Bài 1"`.
- **Dòng kết thúc bằng `\`** (macOS) hoặc `` ` `` (PowerShell) nghĩa là lệnh còn tiếp ở dòng sau. Chép cả khối.
- **Phần sau `#`** là ghi chú, máy bỏ qua.
- **`<ten_file>` trong tài liệu là chỗ bạn thay bằng giá trị thật**, không gõ nguyên dấu `<` `>`.

---

## 7. Nhiều lệnh, chuỗi lệnh và lệnh chạy mãi

```bash
cd services && npm test        # "&&": chạy lệnh sau CHỈ KHI lệnh trước thành công
npm run dev:gateway            # lệnh chạy mãi (server): chiếm terminal cho đến khi bạn dừng
```

Server không tự thoát. Muốn dừng thì bấm **`Ctrl + C`** trong terminal đó. Phím này cũng dùng để thoát khi một lệnh treo.

Project cần chạy nhiều server cùng lúc (gateway, content, exam, web…). Mỗi server **một tab terminal**: trong VS Code bấm dấu **+** ở khung terminal.

Lệnh vừa xong để lại **mã thoát** (exit code): `0` là thành công, khác `0` là lỗi. CI dựa vào mã này để biết build có hỏng không.

```bash
echo $?            # macOS/Linux: mã thoát của lệnh vừa chạy
```

```powershell
$LASTEXITCODE      # PowerShell
```

---

## 8. Biến môi trường và `PATH`

**Biến môi trường** là cặp tên=giá trị mà mọi chương trình chạy từ terminal đọc được. Project dùng chúng cho cấu hình: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`…

```bash
echo $HOME                         # macOS/Linux: xem một biến
NODE_ENV=production node -e "console.log(process.env.NODE_ENV)"   # đặt biến cho đúng 1 lệnh → production
```

```powershell
echo $env:USERPROFILE              # PowerShell: xem
$env:NODE_ENV = "production"       # đặt cho cả phiên terminal này
```

`PATH` là biến đặc biệt: danh sách các thư mục mà shell tìm chương trình khi bạn gõ tên lệnh. Gõ `node` mà báo

```
zsh: command not found: node                     ← macOS
node : The term 'node' is not recognized …        ← Windows
```

thì nghĩa là chưa cài Node, hoặc đã cài nhưng thư mục chứa nó chưa có trong `PATH`. Thường chỉ cần **đóng terminal và mở lại** sau khi cài, để nó đọc lại `PATH`. Cách cài từng công cụ ở bài [setup-tools.md](./setup-tools.md).

```bash
which node       # macOS/Linux: node nằm ở đâu
```

```powershell
Get-Command node # PowerShell
```

Trong project, biến môi trường thường được ghi vào file `.env` thay vì gõ tay. Ví dụ `services/.env`. File này chứa mật khẩu nên **không được commit** (đã có trong `.gitignore`).

---

## 9. Lịch sử và phím tắt

| Phím | Tác dụng |
|---|---|
| `↑` / `↓` | Lệnh trước / sau trong lịch sử |
| `Tab` | Tự điền tên file, lệnh |
| `Ctrl + C` | Dừng lệnh đang chạy |
| `Ctrl + L` hoặc lệnh `clear` | Xóa màn hình |
| `Ctrl + R` (macOS/Linux) | Tìm trong lịch sử lệnh |

---

## 10. Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `command not found` / `is not recognized` | Chưa cài, hoặc terminal chưa nạp lại `PATH` | Cài theo [setup-tools.md](./setup-tools.md), đóng rồi mở lại terminal |
| `ENOENT: no such file or directory` | Sai thư mục hoặc sai tên file | `pwd`, `ls` để kiểm; đường dẫn tính từ thư mục hiện tại |
| `npm error Missing script: "dev:gateway"` | Đang đứng ở thư mục con, không phải gốc repo | `cd` về thư mục `edu-app-nihongo` |
| `Permission denied` | Không có quyền chạy/ghi file | Đọc kỹ thông báo; **đừng** thêm `sudo` theo phản xạ |
| Terminal "đứng hình" sau khi chạy lệnh | Lệnh là server chạy mãi, hoặc đang chờ bạn nhập | Đọc dòng cuối; `Ctrl + C` để thoát |
| PowerShell báo `running scripts is disabled` | Chính sách chặn script của Windows | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (một lần) |
| Dán lệnh nhiều dòng bị chạy lỗi giữa chừng | Dấu nối dòng `\` (bash) dán vào PowerShell | PowerShell dùng `` ` `` để nối dòng, hoặc gộp thành một dòng |

---

## Tự kiểm tra

1. Bạn gõ `npm run dev:gateway` và nhận `Missing script`. Hai lệnh nào giúp tìm ra nguyên nhân?
2. `cd ..` làm gì? `cd -` làm gì?
3. Trong `docker compose up -d redis`, đâu là lệnh, lệnh con, cờ, tham số?
4. Vì sao `ls` không hiện file `.env` dù nó có tồn tại?
5. Bạn vừa cài Node xong mà terminal vẫn báo `command not found: node`. Thử gì đầu tiên?
6. `a && b` khác gì với chạy `a` rồi chạy `b`?

<details>
<summary>Đáp án</summary>

1. `pwd` để xem đang đứng ở đâu, `ls` để xem có `package.json` không. Lệnh `npm run` phải chạy ở thư mục gốc repo.
2. `cd ..` lên thư mục cha. `cd -` quay lại thư mục vừa ở trước đó.
3. `docker` là chương trình, `compose` và `up` là lệnh con, `-d` là cờ (chạy nền), `redis` là tham số (tên service).
4. File tên bắt đầu bằng dấu chấm là file ẩn. Dùng `ls -la` (PowerShell: `ls -Force`).
5. Đóng terminal và mở lại để nó đọc lại `PATH`.
6. Với `&&`, `b` chỉ chạy khi `a` thành công (mã thoát 0). Chạy lần lượt thì `b` chạy dù `a` lỗi.

</details>

## Bài tập

1. Mở terminal trong VS Code, `cd` vào thư mục repo. Đếm xem `docs/` có bao nhiêu file `.md`.
   - macOS: `ls docs/*.md | wc -l`
   - PowerShell: `(ls docs/*.md).Count`

   Kiểm: con số phải khớp với số bài trong [README.md](./README.md) cộng thêm vài file phụ như `README.md`, `doc-template.md`.
2. Tìm mọi chỗ nhắc tới cổng `5433` trong `docs/`:
   - macOS: `grep -rn 5433 docs`
   - PowerShell: `Select-String -Path docs/*.md -Pattern 5433`

   Đọc kết quả và đoán cổng 5433 là của dịch vụ nào. Bài [run-local.md](./run-local.md) có đáp án.
3. Tách lệnh `docker compose up -d postgres-nihongo redis mongodb zookeeper kafka` thành bảng như mục 6.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **0. Nền tảng** — bài 1/5.

- **Bài tiếp: [setup-tools.md](./setup-tools.md)** — Cài VS Code, Git, Node 22, Docker Desktop và tải code về

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
