# ADR-0009: Không commit backup DB đầy đủ vào git

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-09
- **Thay cho:** [ADR-0005](0005-commit-db-backups-to-repo.md)
- **Phạm vi:** `infra/backups/`, `.gitignore`, `npm run db:backup`

## Bối cảnh

- ADR-0005 commit dump đầy đủ (`nihongo_*.sql`) để máy mới khôi phục nhanh, và tự ghi điều kiện xem lại:
  "khi có người dùng thật hoặc repo có thể công khai".
- Dump chứa bảng `User` (email, hash mật khẩu), tin nhắn, thanh toán (có `client_secret` Stripe bản test).
  Ai clone được repo là có hết. gitleaks phải cho qua cả thư mục này.
- 30 bản đã commit, thư mục ~290 MB, lịch sử git giữ mọi bản.
- Từ [ADR-0007](0007-content-seed-sql-only.md) đã có `infra/postgres/nihongo-content-seed.sql`: chỉ bảng nội dung học,
  không có bảng người dùng. Máy mới migrate + seed là có đủ nội dung.

## Quyết định

- `.gitignore` chặn `infra/backups/*.sql`; các file đã theo dõi được gỡ khỏi index (`git rm --cached`), **file trên máy giữ nguyên**.
- `backup.sh` tạo file quyền 600 (`umask 077`).
- Máy mới: migrate + seed nội dung. Cần bản đầy đủ thì chép tay, hoặc dùng kho lưu trữ có mã hóa và vòng đời
  (S3 SSE, GCS) khi có production.

## Hệ quả

- ✅ Commit mới không còn mang dữ liệu cá nhân; repo ngừng phình ~11 MB mỗi lần backup.
- ⚠️ **Lịch sử git vẫn chứa các bản cũ.** Muốn xóa hẳn phải viết lại lịch sử (`git filter-repo --path infra/backups --invert-paths`)
  và force-push; mọi bản clone phải clone lại. Chưa làm: đây là thao tác phá hủy, cần chủ repo quyết định.
  Cho tới lúc đó repo **bắt buộc private**.
- ⚠️ Máy mới chỉ có nội dung học, không có tài khoản/tiến độ học của máy cũ; tạo lại admin bằng seed.
