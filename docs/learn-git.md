# Git: lưu lịch sử code và làm việc nhóm

> **Mục tiêu:** Học xong bài này bạn:
> - hiểu Git lưu gì: commit, branch, remote;
> - tạo branch, sửa file, commit, push và mở Pull Request đúng cách nhóm đang làm;
> - xem được ai sửa gì (`status`, `diff`, `log`) và quay lại khi lỡ tay;
> - xử lý một xung đột (conflict) đơn giản;
> - biết những gì **không bao giờ** được commit.
>
> **Cần biết trước:** [learn-terminal.md](./learn-terminal.md), [setup-tools.md](./setup-tools.md) (đã cài Git và clone repo)
> **Thời gian:** khoảng 3 giờ.

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| Repository (repo) | Thư mục code cùng toàn bộ lịch sử thay đổi của nó |
| Commit | Một "ảnh chụp" các thay đổi, có lời mô tả, tác giả, thời điểm |
| Branch (nhánh) | Một dòng commit riêng để làm việc mà không ảnh hưởng nhánh khác |
| `main` | Nhánh chính, là code đang chạy thật |
| Remote / `origin` | Bản repo trên GitHub. `origin` là tên mặc định của nó |
| Push / Pull | Đẩy commit lên GitHub / kéo commit mới về máy |
| Pull Request (PR) | Đề nghị gộp branch của bạn vào `main`, để người khác xem trước |
| Merge | Gộp các commit của một branch vào branch khác |
| Conflict | Hai branch sửa cùng một chỗ, Git không tự gộp được |
| Staging area | "Khay chờ": những thay đổi sẽ vào commit kế tiếp |

---

## 1. Git giải quyết vấn đề gì

Không có Git thì người ta làm thế này: `main.ts`, `main-ban-cu.ts`, `main-sua-lan-2-FINAL.ts`. Không ai biết bản nào đúng, ai sửa dòng nào, hay vì sao.

Git ghi lại **mọi thay đổi** kèm lời giải thích. Bạn xem lịch sử của repo này được:

```bash
git log --oneline -5
```

```
… Stabilize CI gRPC startup by sequencing services and skipping Kafka/OTEL when disabled.
… Keep gRPC packages hoisted for Nest and drop the unsupported GoogleLogin locale prop.
… Bump React to 19.3.1 across workspaces and the lockfile so npm ci stays in sync.
…
```

Mỗi dòng là một commit. Chuỗi ký tự ở đầu (bị thay bằng `…` ở trên) là **mã commit**, ví dụ `9d4a94f`. Mã này là tên duy nhất của một commit.

---

## 2. Ba chỗ chứa thay đổi

```
  Thư mục làm việc      git add       Staging area       git commit      Lịch sử (commit)
 (file bạn đang sửa) ─────────────▶  (sẽ vào commit) ─────────────▶   (đã lưu vĩnh viễn)
```

- Sửa file thì thay đổi nằm ở **thư mục làm việc**.
- `git add <file>` đưa thay đổi lên **staging area**. Bạn chọn được đúng những gì muốn lưu.
- `git commit` chụp mọi thứ trong staging area thành một commit.

Xem trạng thái lúc nào cũng được:

```bash
git status
```

---

## 3. Làm một thay đổi từ đầu đến cuối

Đây đúng là quy trình nhóm dùng hằng ngày. Làm theo trên repo thật. Bạn sửa một file tài liệu nên không hỏng gì.

### 3.1 Cập nhật `main` mới nhất

```bash
git switch main
git pull
```

`git pull` kéo commit mới của người khác về. Làm việc này **trước** khi bắt đầu việc mới, để không xây trên code cũ.

### 3.2 Tạo branch cho việc của bạn

```bash
git switch -c docs/thu-git
```

`-c` nghĩa là tạo branch mới (*create*) rồi chuyển sang luôn. Đặt tên branch nói rõ việc: `docs/…`, `fix/…`, `feat/…`.

**Không commit thẳng lên `main`.** `main` là code đang chạy thật. Mọi thay đổi đi qua branch và PR để người khác xem và CI kiểm trước.

### 3.3 Sửa file

Mở `docs/learn-git.md` (chính bài này), thêm một dòng bất kỳ ở cuối mục Bài tập, rồi lưu.

### 3.4 Xem mình đã sửa gì

```bash
git status
```

```
On branch docs/thu-git
Changes not staged for commit:
        modified:   docs/learn-git.md
```

```bash
git diff
```

Dòng bắt đầu bằng `+` (màu xanh) là dòng thêm, `-` (màu đỏ) là dòng xóa. **Luôn đọc `git diff` trước khi commit.** Đây là lúc bắt được việc lỡ tay sửa nhầm file, hoặc để quên mật khẩu trong code.

### 3.5 Commit

```bash
git add docs/learn-git.md
git commit -m "Add a practice line to the Git lesson."
```

Thêm từng file theo tên thay vì `git add .`. `git add .` thêm **mọi thứ** trong thư mục, kể cả file bạn không định commit.

Lời commit trong repo này viết bằng tiếng Anh, một câu nói rõ **làm gì và vì sao**, kết thúc bằng dấu chấm. Xem các ví dụ ở mục 1.

### 3.6 Đẩy lên GitHub và mở Pull Request

```bash
git push -u origin docs/thu-git
```

`-u` nhớ liên kết giữa branch trên máy và branch trên GitHub. Lần sau chỉ cần `git push`.

Git in ra một đường link. Mở nó (hoặc vào trang repo trên GitHub, bấm **Compare & pull request**), viết mô tả rồi bấm **Create pull request**.

Sau khi tạo PR:

1. **CI tự chạy.** File [.github/workflows/ci.yml](../.github/workflows/ci.yml) chạy test, quét bảo mật, build. Kết quả hiện ở cuối trang PR.
2. **`main` được bảo vệ:** PR chỉ gộp được khi các check bắt buộc đều xanh. Check đỏ thì bấm **Details** để đọc log, sửa, commit và push thêm. PR tự cập nhật.
3. Người review đọc và góp ý. Xong thì **Merge**.

Bài thực hành này thì đừng merge. Đóng PR (**Close pull request**) rồi xóa branch:

```bash
git switch main
git branch -D docs/thu-git                  # xóa branch trên máy
git push origin --delete docs/thu-git       # xóa branch trên GitHub
```

---

## 4. Xem lịch sử

```bash
git log --oneline --graph -15                     # lịch sử dạng cây
git log --oneline -- docs/learn-nestjs.md         # các commit đã sửa một file
git show 9d4a94f                                  # nội dung một commit
git blame docs/README.md                          # từng dòng do commit nào, ai viết
```

Trong VS Code, extension GitLens hiện thông tin `blame` ngay cạnh dòng code.

---

## 5. Lỡ tay thì quay lại thế nào

| Tình huống | Lệnh | Mất gì? |
|---|---|---|
| Sửa file rồi muốn bỏ thay đổi đó | `git restore <file>` | Mất thay đổi chưa commit của file đó |
| Đã `git add` nhưng muốn bỏ ra khỏi staging | `git restore --staged <file>` | Không mất gì, thay đổi vẫn còn trong file |
| Commit rồi nhưng sai lời mô tả (chưa push) | `git commit --amend -m "…"` | Không |
| Commit rồi muốn hủy (chưa push) | `git reset --soft HEAD~1` | Không: commit biến mất, thay đổi quay về staging |
| Đã push một commit sai | `git revert <mã-commit>` | Không: tạo commit mới làm ngược lại |
| Muốn cất tạm việc đang dở để làm việc khác | `git stash`, xong thì `git stash pop` | Không |

Hai lệnh **cực kỳ nguy hiểm**. Chỉ dùng khi hiểu rõ và đã hỏi người trong nhóm:

- `git reset --hard`: xóa sạch mọi thay đổi chưa commit, không lấy lại được.
- `git push --force`: ghi đè lịch sử trên GitHub, có thể xóa commit của người khác. `main` của repo này đã chặn force-push.

---

## 6. Xung đột (conflict)

Conflict xảy ra khi hai branch sửa **cùng một dòng**. Thử trong một repo tạm để không ảnh hưởng project:

```bash
mkdir ~/git-thu && cd ~/git-thu
git init -b main
echo "Bai 1" > ghi-chu.txt
git add ghi-chu.txt && git commit -m "Them ghi chu"

git switch -c sua-a
echo "Bai 1: chao hoi" > ghi-chu.txt
git commit -am "Sua o nhanh A"

git switch main
echo "Bai 1: tu vung" > ghi-chu.txt
git commit -am "Sua o main"

git merge sua-a
```

Kết quả thật:

```
Auto-merging ghi-chu.txt
CONFLICT (content): Merge conflict in ghi-chu.txt
Automatic merge failed; fix conflicts and then commit the result.
```

Mở `ghi-chu.txt`:

```
<<<<<<< HEAD
Bai 1: tu vung
=======
Bai 1: chao hoi
>>>>>>> sua-a
```

- Giữa `<<<<<<< HEAD` và `=======` là bản của branch bạn đang đứng (`main`).
- Giữa `=======` và `>>>>>>> sua-a` là bản của branch đang gộp vào.

Git không biết bản nào đúng. **Bạn** phải quyết định: sửa file thành nội dung cuối cùng (ví dụ `Bai 1: chao hoi, tu vung`), xóa cả ba dòng đánh dấu, rồi:

```bash
git add ghi-chu.txt
git commit -m "Gop hai ghi chu"
```

VS Code tô màu conflict và có nút **Accept Current / Accept Incoming / Accept Both** ngay trên file.

Cách giảm conflict: `git pull` thường xuyên, mỗi PR nhỏ và xong sớm, đừng giữ branch nhiều ngày.

---

## 7. Những gì không bao giờ được commit

| Loại | Ví dụ trong repo | Đã chặn bằng |
|---|---|---|
| Mật khẩu, API key, token | `services/.env`, `apps/nihongo-web/.env` | [.gitignore](../.gitignore) |
| Thư viện tải về | `node_modules/` | `.gitignore` |
| File build | `dist/`, `.next/` | `.gitignore` |
| Bản sao database có dữ liệu người dùng | `infra/backups/*.sql` | `.gitignore` ([ADR-0009](./adr/0009-db-backups-out-of-git.md)) |

Mẫu cấu hình thì **được** commit, với giá trị giả: `services/.env.example`. Người mới chép sang `.env` rồi điền giá trị thật.

Commit một mật khẩu là **lộ vĩnh viễn**. Xóa ở commit sau thì nó vẫn nằm trong lịch sử, ai clone repo cũng đọc được. Việc duy nhất có tác dụng là **đổi mật khẩu đó ngay**. CI của repo chạy **gitleaks** để quét mọi commit mới và báo đỏ nếu thấy thứ trông giống secret ([learn-devsecops.md](./learn-devsecops.md)).

---

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `Your branch is behind 'origin/main'` | Người khác đã push commit mới | `git pull` |
| `rejected … (fetch first)` khi push | Branch trên GitHub có commit bạn chưa có | `git pull`, xử lý conflict nếu có, rồi push lại |
| `Please tell me who you are` | Chưa khai tên/email | `git config --global user.name …` ([setup-tools.md](./setup-tools.md)) |
| `error: Your local changes … would be overwritten` khi `switch` | Có thay đổi chưa commit | Commit, hoặc `git stash` rồi switch |
| Lỡ commit `.env` | Chưa có trong `.gitignore`, hoặc dùng `git add .` | Chưa push: `git reset --soft HEAD~1`, bỏ file ra. **Đã push: báo nhóm và đổi mọi secret trong file** |
| PR không merge được, báo *"Required statuses must pass"* | Check CI bắt buộc đang đỏ hoặc chưa chạy | Mở **Details** của check đỏ, sửa theo log |

---

## Tự kiểm tra

1. `git add` và `git commit` khác nhau thế nào?
2. Vì sao không commit thẳng lên `main`?
3. Bạn lỡ sửa hỏng một file và chưa commit. Lệnh nào đưa nó về như cũ?
4. Đã push một commit sai lên branch dùng chung. Dùng `git reset --hard` rồi `push --force` hay `git revert`? Vì sao?
5. Bạn đã push file `.env` có `STRIPE_SECRET_KEY`, rồi xóa ở commit sau. Đã an toàn chưa?

<details>
<summary>Đáp án</summary>

1. `git add` chọn thay đổi đưa vào staging. `git commit` lưu những gì trong staging thành một commit trong lịch sử.
2. `main` là code chạy thật. Đi qua branch + PR thì có người review và CI kiểm trước khi code vào `main`.
3. `git restore <file>`.
4. `git revert`. Nó tạo commit mới đảo ngược, không xóa lịch sử. Force-push ghi đè lịch sử mà người khác đã kéo về, gây rối và có thể mất commit của họ.
5. Chưa. Key vẫn nằm trong lịch sử Git. Phải vào Stripe tạo key mới và vô hiệu key cũ.

</details>

## Bài tập

1. Làm trọn mục 3: branch → sửa → `diff` → commit → push → mở PR → xem CI chạy → đóng PR → xóa branch.
2. Dùng `git log --oneline -- docs/learn-nestjs.md` tìm commit gần nhất sửa bài NestJS, rồi `git show <mã>` để xem nó sửa gì.
3. Làm lại bài conflict ở mục 6, lần này xử lý bằng các nút của VS Code.
4. Chạy `git check-ignore -v services/.env node_modules`. Kết quả cho biết dòng nào trong `.gitignore` đang chặn mỗi đường dẫn.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **0. Nền tảng** — bài 3/5.

- Bài trước: [setup-tools.md](./setup-tools.md) — Cài VS Code, Git, Node 22, Docker Desktop và tải code về
- **Bài tiếp: [learn-js-ts.md](./learn-js-ts.md)** — JavaScript/TypeScript đủ để đọc code project: hàm, mảng, object, async/await, kiểu

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
