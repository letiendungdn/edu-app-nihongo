# Database backups

Script dump PostgreSQL DB `nihongo` từ container `edu-postgres-nihongo`.

## Chạy backup

```powershell
npm run db:backup
# hoặc
powershell -NoProfile -ExecutionPolicy Bypass -File infra/backups/backup.ps1
```

```bash
bash infra/backups/backup.sh
```

Yêu cầu: `edu-postgres-nihongo` đang chạy.

## Output (cùng thư mục này)

| File | Nội dung |
|------|----------|
| `nihongo_YYYYMMDD_HHMMSS.sql` | Full dump DB nihongo |
| `nihongo_schema_YYYYMMDD_HHMMSS.sql` | Schema only |

**Không commit** các file `*.sql` này ([ADR-0009](../../docs/adr/0009-db-backups-out-of-git.md)): chúng chứa email, hash mật khẩu, tin nhắn, thanh toán. `.gitignore` đã chặn. File chỉ ghi được bởi chủ máy (quyền 600).

- Máy mới cần **nội dung học**: migrate + seed từ `infra/postgres/nihongo-content-seed.sql` (có trong git, không có bảng người dùng).
- Cần **bản đầy đủ** sang máy khác: chép tay (USB, `scp`), hoặc đẩy lên kho lưu trữ có mã hóa (S3 bật SSE + vòng đời). Không gửi qua chat/email.

## Restore

Không pipe file qua PowerShell (`Get-Content … | docker exec -i …`): PowerShell 5.1 đổi bảng mã khi pipe sang chương trình ngoài nên chữ Việt/Nhật bị hỏng. Copy file vào container rồi chạy `psql -f`:

```powershell
docker cp infra\backups\nihongo_<ngày_giờ>.sql edu-postgres-nihongo:/tmp/restore.sql
docker exec edu-postgres-nihongo psql -U nihongo -d nihongo -f /tmp/restore.sql
```

Schema chat tham khảo: [`docs/sql/chat-schema.sql`](../../docs/sql/chat-schema.sql)
