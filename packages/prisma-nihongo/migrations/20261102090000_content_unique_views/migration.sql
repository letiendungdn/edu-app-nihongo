-- Thống kê nội dung đã gộp trùng. Cùng một từ / kanji / mẫu ngữ pháp có thể xuất hiện ở nhiều sách
-- (Minna, Sou Matome, Shinkanzen, TRY!, KLL…) → mỗi view giữ một dòng cho mỗi mục, cấp = cấp dễ nhất.
-- Trang chủ và script jlpt:gap-report đều đọc từ đây để con số khớp nhau.

ALTER TABLE "HomeStat" ADD COLUMN "metric" TEXT;

-- Từ: khóa = chữ viết (hoặc kana nếu không có kanji) + cách đọc; bỏ khoảng trắng, ～, ngoặc.
CREATE VIEW "VocabularyUnique" AS
SELECT
  regexp_replace(coalesce(nullif(btrim("kanji"), ''), "kana"), '[[:space:]～〜~（）()]', '', 'g') AS "word",
  regexp_replace("kana", '[[:space:]～〜~（）()]', '', 'g') AS "reading",
  min("jlptLevel") AS "jlptLevel",
  count(*)::int AS "rowCount"
FROM "Vocabulary"
GROUP BY 1, 2;

CREATE VIEW "KanjiUnique" AS
SELECT "character", min("jlptLevel") AS "jlptLevel", count(*)::int AS "rowCount"
FROM "KanjiEntry"
GROUP BY "character";

-- Mẫu ngữ pháp: bỏ phần đọc kana trong ngoặc, ～, khoảng trắng, dấu nối (＋ ・ /).
CREATE VIEW "GrammarUnique" AS
SELECT
  regexp_replace(
    regexp_replace("pattern", '[（(][ぁ-んァ-ンー・、 ]+[）)]', '', 'g'),
    '[[:space:]～〜~＋+・/／]', '', 'g'
  ) AS "pattern",
  min("jlptLevel") AS "jlptLevel",
  count(*)::int AS "rowCount"
FROM "Grammar"
GROUP BY 1;
