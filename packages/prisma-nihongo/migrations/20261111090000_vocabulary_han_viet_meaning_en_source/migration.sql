-- Âm Hán Việt của cả từ (ghép từ KanjiEntry.hanViet theo từng chữ, ví dụ 感動 → CẢM ĐỘNG)
-- và nguồn của nghĩa tiếng Anh, để app ghi "dịch máy" cho nghĩa do AI dịch.
-- Dữ liệu điền bằng packages/prisma-nihongo/scripts/vocab-enrich/ (xem README trong thư mục đó).
ALTER TABLE "Vocabulary" ADD COLUMN "hanViet" TEXT;
ALTER TABLE "Vocabulary" ADD COLUMN "meaningEnSource" TEXT;

-- Nghĩa tiếng Anh đã có trước đây do người soạn nhập tay
UPDATE "Vocabulary" SET "meaningEnSource" = 'manual' WHERE "meaningEn" IS NOT NULL AND "meaningEn" <> '';
