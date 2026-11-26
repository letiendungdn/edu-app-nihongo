# Backup và khôi phục PostgreSQL

Các lệnh bên dưới làm việc với database `nihongo` trong container
`edu-postgres-nihongo`.

## Tạo backup

Đảm bảo Docker Compose đang chạy PostgreSQL, sau đó chạy từ thư mục gốc repo:

```bash
npm run db:backup
```

Hoặc chạy trực tiếp:

```bash
bash infra/backups/backup.sh
```

Lệnh tạo hai file cùng timestamp trong thư mục này:

| Tên file | Nội dung |
|---|---|
| `nihongo_YYYYMMDD_HHMMSS.sql` | Dữ liệu và cấu trúc database |
| `nihongo_schema_YYYYMMDD_HHMMSS.sql` | Chỉ cấu trúc database |

Sau khi chạy, xác nhận cả hai file tồn tại và có dung lượng lớn hơn 0. Script đặt
quyền file chỉ cho chủ máy đọc (`600`).

## Bảo vệ backup

Backup đầy đủ có thể chứa email, mật khẩu đã băm, tin nhắn và dữ liệu thanh toán.
Không commit, gửi qua chat/email hoặc lưu ở nơi không mã hóa. Các file SQL trong
thư mục này đã được `.gitignore` loại khỏi Git. Nếu cần chuyển backup, dùng thiết
bị lưu trữ an toàn hoặc kho lưu trữ có mã hóa.

Giữ lại cặp backup mới nhất đã xác nhận hợp lệ; chỉ xóa bản cũ sau khi đã kiểm
tra cặp mới. Backup schema không thay thế được backup dữ liệu.

## Khôi phục

Khôi phục có thể ghi đè hoặc làm hỏng dữ liệu hiện có. Trước khi làm, tạo backup
mới và xác nhận đang dùng đúng database đích. Nên khôi phục vào database trống.

Với Docker Desktop:

```bash
docker cp infra/backups/nihongo_<timestamp>.sql edu-postgres-nihongo:/tmp/restore.sql
docker exec edu-postgres-nihongo psql -v ON_ERROR_STOP=1 -U nihongo -d nihongo -f /tmp/restore.sql
```

Không pipe nội dung SQL qua Windows PowerShell 5.1; quá trình pipe có thể làm
hỏng bảng mã tiếng Nhật và tiếng Việt.

## Máy mới chỉ cần nội dung học

Không cần khôi phục backup đầy đủ nếu chỉ cần dữ liệu học. Dùng migration và seed
từ [`infra/postgres/nihongo-content-seed.sql`](../postgres/nihongo-content-seed.sql);
file này không chứa bảng người dùng.
