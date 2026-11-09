# ADR-0005: Commit bản backup DB `nihongo` vào repo

- **Trạng thái:** **Bị thay** bởi [ADR-0009](0009-db-backups-out-of-git.md) (09/11/2026)
- **Phạm vi:** `infra/backups/`, `npm run db:backup`

## Bối cảnh

- Nội dung học (bài, từ vựng, kanji, sơ đồ tư duy do admin sửa) nằm trong DB; seed trong code **không** tái tạo được
  mọi chỉnh sửa trên giao diện admin.
- Máy dev mới / sau khi xoá volume Docker cần khôi phục đầy đủ nhanh.
- Chưa có production, chưa có hạ tầng lưu backup riêng (S3, …).

## Quyết định

- `npm run db:backup` (`infra/backups/backup.ps1`) dump `nihongo_YYYYMMDD_HHMMSS.sql` (dữ liệu + schema) và
  `nihongo_schema_…sql` vào `infra/backups/`, **commit vào repo**; chỉ giữ **bản mới nhất** (xoá bản cũ bằng `git rm`).
- Mỗi bản mới được kiểm tra bằng cách restore vào DB tạm và so số dòng mọi bảng với DB gốc.
- README / docs trỏ tới tên file mới nhất.

## Hệ quả

- ✅ Khôi phục bằng một lệnh `psql`; lịch sử backup đi theo git.
- ⚠️ Mỗi bản ~11 MB; git giữ **mọi** phiên bản đã commit → repo phình dần (xoá file không giảm kích thước lịch sử).
- ⚠️ **Dữ liệu cá nhân**: bảng `User` (email, hash mật khẩu), tin nhắn, thanh toán nằm trong file backup → repo **bắt buộc private**.
  Có người dùng thật thì quyết định này **không còn phù hợp**.

## Khi nào xem lại

Khi có người dùng thật hoặc repo có thể công khai → thay bằng:
- backup định kỳ lên object storage có mã hoá + vòng đời (S3 / GCS), hoặc snapshot của DB được quản lý;
- repo chỉ giữ **bản nội dung** (`db:export-content` → `nihongo-content-seed.sql`, không có bảng người dùng).
