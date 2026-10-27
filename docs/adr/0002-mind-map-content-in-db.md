# ADR-0002: Đưa nội dung sơ đồ tư duy và danh mục giáo trình từ code web xuống DB

- **Trạng thái:** Đã chấp nhận — phần "dữ liệu seed ở `.data.ts`" được thay bằng [ADR-0007](0007-content-seed-sql-only.md)
- **Ngày:** 2026-09-26
- **Phạm vi:** `apps/nihongo-web`, `packages/prisma-nihongo`, `content-service`

## Bối cảnh

- Sơ đồ tư duy ngữ pháp / từ vựng / kanji (N5–N1) và danh mục giáo trình (Minna, Sou Matome, Shinkanzen, TRY!, KLL)
  nằm cứng trong các file `apps/nihongo-web/src/data/*.ts`.
- Muốn sửa một nhánh sơ đồ hay thêm một cuốn sách → sửa code web → build → deploy lại.
- Admin cần thêm / sửa / xoá / gắn ảnh cho sơ đồ ngay trên giao diện.
- Web từng giữ **cả hai** nguồn (DB và bản sao trong code làm "fallback") → không rõ nguồn nào đúng.

## Các phương án

| Phương án | Ưu | Nhược |
|-----------|----|-------|
| A. Giữ trong code | đơn giản, có type-check | mọi thay đổi nội dung phải deploy; admin không sửa được |
| B. **DB là nguồn duy nhất**, file `.data.ts` chuyển sang package prisma làm **dữ liệu seed** | admin sửa được; web không phải deploy khi đổi nội dung | cần API, trạng thái loading/lỗi trên web; seed phải cẩn thận không đè chỉnh sửa của admin |
| C. CMS bên ngoài | giao diện soạn thảo có sẵn | thêm một hệ thống phải vận hành, quá nặng cho project |

## Quyết định

Chọn **B**:

- Bảng `MindMapLevel` (`UNIQUE(kind, level)`, nhánh lưu `branches jsonb`), `TextbookSeries` / `TextbookBook`.
- Dữ liệu mặc định ở `packages/prisma-nihongo/mind-maps/*.data.ts`, `textbooks/series.data.ts`; seed chỉ **thêm cái còn thiếu**,
  ghi đè khi đặt `FORCE_MIND_MAP_SEED=1` / `FORCE_TEXTBOOK_CATALOG_SEED=1`.
- Web **bỏ hẳn** bản sao fallback; khi DB chưa có dữ liệu thì hiện trạng thái "Chưa có sơ đồ — chạy seed".

## Hệ quả

- ✅ Admin sửa nội dung không cần deploy; một nguồn sự thật.
- ✅ `branches` dạng JSONB hợp với cách dùng "đọc/ghi cả cây" (phân tích ở [learn-db-design.md](../learn-db-design.md) mục 7).
- ⚠️ Web phụ thuộc API: API lỗi → không có sơ đồ (trước đây còn fallback). Chấp nhận vì đây là nội dung phụ.
- ⚠️ Dữ liệu trong JSONB không có ràng buộc DB → phải validate cấu trúc ở API khi admin lưu.
- ⚠️ Dữ liệu seed trong code và dữ liệu thật trong DB có thể khác nhau sau khi admin sửa — seed không phải bản sao lưu;
  backup DB (`npm run db:backup`) mới là nguồn khôi phục.
