# ADR-0007: Nội dung học chỉ seed từ SQL, câu ví dụ từ vựng sang bảng riêng

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-10-27
- **Phạm vi:** `packages/prisma-nihongo`, `infra/postgres`, `content-service`, `apps/nihongo-web`
- **Thay cho:** phần "dữ liệu seed ở `.data.ts`" của [ADR-0002](0002-mind-map-content-in-db.md)

## Bối cảnh

- `packages/prisma-nihongo` có 127 file `*.data.ts` (~5 MB: từ vựng/kanji/ngữ pháp JLPT boost, câu ví dụ, hội thoại,
  sơ đồ tư duy, danh mục giáo trình…) cùng các seeder đọc chúng — trong khi [infra/postgres/README.md](../../infra/postgres/README.md)
  đã coi PostgreSQL là nguồn sự thật. Hai nguồn lệch nhau ngay khi admin sửa trên giao diện.
- Câu ví dụ là 3 cột `exampleJa/Kana/Vi` trên `Vocabulary` → mỗi từ chỉ được một câu.

## Quyết định

- Xoá toàn bộ `*.data.ts` và các seeder chỉ dùng để nạp chúng; nội dung nằm trong DB, export bằng
  `npm run db:export-content` ra `infra/postgres/nihongo-content-seed.sql` (danh sách bảng ở `dump-content-tables.sh`).
  `seed.ts` nạp file SQL này khi DB trống (`FORCE_CONTENT_SEED=1` để ghi đè).
- Bảng `VocabularyExample (vocabularyId, ja, kana, vi, sortOrder)`, `UNIQUE(vocabularyId, sortOrder)`, xoá theo từ (cascade).
  Migration `20261027100000_vocabulary_example` chuyển câu cũ thành câu 0 rồi bỏ 3 cột.
- API `/vocabularies` trả `examples[]` và vẫn giữ `exampleJa/Kana/Vi` (= câu 0) để client cũ chạy được;
  create/update qua 3 trường đó ghi vào câu 0.

## Hệ quả

- ✅ Một nguồn nội dung; sửa xong chỉ cần export SQL, không phải sửa code.
- ✅ Một từ có thể có nhiều câu ví dụ.
- ⚠️ Mất type-check/diff dễ đọc của file TS; review nội dung qua diff SQL (`--column-inserts`, mỗi dòng một bản ghi).
- ⚠️ Quên `db:export-content` sau khi sửa DB thì máy khác seed ra nội dung cũ — backup đầy đủ vẫn ở `infra/backups/` ([ADR-0005](0005-commit-db-backups-to-repo.md)).
