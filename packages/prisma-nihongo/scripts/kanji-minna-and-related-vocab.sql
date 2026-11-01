-- Kanji theo bài Minna (tự tổng hợp) + từ vựng liên quan cho chữ chưa có.
-- Chỉ dùng dữ liệu đã có trong DB: không tạo nghĩa/âm đọc mới.
-- Chạy lại an toàn: bài Minna đã có thì bỏ qua, chữ đã có từ liên quan thì bỏ qua.
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/prisma-nihongo/scripts/kanji-minna-and-related-vocab.sql
BEGIN;

-- 1) 50 bài kanji Minna: số bài 60001–60050 (không đụng dải KLL / Sou Matome / Shinkanzen / JLPT)
INSERT INTO "KanjiLesson" ("lessonNumber", title, "jlptLevel", textbook, "sortOrder", "updatedAt")
SELECT 60000 + n, 'Minna Bài ' || n,
       (CASE WHEN n <= 25 THEN 'N5' ELSE 'N4' END)::"JlptLevel", 'MINNA'::"Textbook", n, CURRENT_TIMESTAMP
FROM generate_series(1, 50) n
ON CONFLICT ("lessonNumber") DO NOTHING;

-- 2) Mỗi kanji thuộc bài Minna đầu tiên có từ vựng chứa nó; thông tin chữ lấy từ bản đã có (ưu tiên KLL)
WITH chars AS (
  SELECT l."lessonNumber" AS ln, v."sortOrder" AS so, v.id AS vid, c.ch, c.ord
  FROM "Vocabulary" v
  JOIN "Lesson" l ON l.id = v."lessonId"
  CROSS JOIN LATERAL regexp_split_to_table(coalesce(v.kanji, ''), '') WITH ORDINALITY AS c(ch, ord)
  WHERE l.textbook = 'MINNA' AND l."lessonNumber" BETWEEN 1 AND 50 AND c.ch ~ '[一-龯]'
), firsts AS (
  SELECT DISTINCT ON (ch) ch, ln, so, vid, ord FROM chars ORDER BY ch, ln, so, vid, ord
), ranked AS (
  SELECT f.*, row_number() OVER (PARTITION BY f.ln ORDER BY f.so, f.vid, f.ord) AS pos FROM firsts f
), source AS (
  SELECT DISTINCT ON (e.character) e.*
  FROM "KanjiEntry" e JOIN "KanjiLesson" kl ON kl.id = e."lessonId"
  WHERE kl.textbook IS DISTINCT FROM 'MINNA'
  ORDER BY e.character, (kl.textbook = 'KLL') DESC NULLS LAST, e.id
)
INSERT INTO "KanjiEntry" (character, "hanViet", onyomi, kunyomi, "meaningVi", "meaningEn", "mnemonicJp", "mnemonicVi",
                          "imageUrl", "jlptLevel", "strokeCount", frequency, grade, "sortOrder", "lessonId", "updatedAt")
SELECT r.ch, s."hanViet", s.onyomi, s.kunyomi, s."meaningVi", s."meaningEn", s."mnemonicJp", s."mnemonicVi",
       s."imageUrl", s."jlptLevel", s."strokeCount", s.frequency, s.grade, r.pos, kl.id, CURRENT_TIMESTAMP
FROM ranked r
JOIN source s ON s.character = r.ch
JOIN "KanjiLesson" kl ON kl."lessonNumber" = 60000 + r.ln
WHERE NOT EXISTS (SELECT 1 FROM "KanjiEntry" x WHERE x."lessonId" = kl.id AND x.character = r.ch);

-- 3) Từ vựng liên quan cho mọi chữ chưa có: tối đa 3 từ trong Vocabulary chứa chữ đó.
--    Ưu tiên: bài Minna (với chữ Minna: chính bài đó) → cấp JLPT dễ hơn hoặc bằng cấp của bài → có câu ví dụ → từ ngắn.
WITH lvl AS (
  SELECT * FROM (VALUES ('N5', 5), ('N4', 4), ('N3', 3), ('N2', 2), ('N1', 1)) AS t(code, rank)
), targets AS (
  SELECT e.id AS entry_id, e.character, kl.textbook, kl."lessonNumber" AS kln, coalesce(el.rank, 1) AS entry_rank
  FROM "KanjiEntry" e
  JOIN "KanjiLesson" kl ON kl.id = e."lessonId"
  LEFT JOIN lvl el ON el.code = kl."jlptLevel"::text
  WHERE NOT EXISTS (SELECT 1 FROM "KanjiVocab" kv WHERE kv."kanjiEntryId" = e.id)
), candidates AS (
  SELECT t.entry_id, v.id AS vid, v.kanji, v.kana, v.meaning, ex.ja, ex.kana AS ex_kana, ex.vi,
         row_number() OVER (
           PARTITION BY t.entry_id, v.kanji
           ORDER BY (ex.ja IS NULL), v.id
         ) AS dup,
         (CASE WHEN t.textbook = 'MINNA' AND l.textbook = 'MINNA' AND l."lessonNumber" = t.kln - 60000 THEN 0 ELSE 1 END) AS same_lesson,
         (CASE WHEN l.textbook = 'MINNA' THEN 0 ELSE 1 END) AS not_minna,
         (CASE WHEN coalesce(vl.rank, 3) >= t.entry_rank THEN 0 ELSE 1 END) AS harder,
         (ex.ja IS NULL) AS no_example,
         char_length(v.kanji) AS len
  FROM targets t
  JOIN "Vocabulary" v ON v.kanji LIKE '%' || t.character || '%'
  JOIN "Lesson" l ON l.id = v."lessonId"
  LEFT JOIN lvl vl ON vl.code = v."jlptLevel"::text
  LEFT JOIN "VocabularyExample" ex ON ex."vocabularyId" = v.id AND ex."sortOrder" = 0
  WHERE char_length(v.kanji) <= 8 AND v.meaning <> ''
), picked AS (
  SELECT c.*, row_number() OVER (
           PARTITION BY c.entry_id
           ORDER BY c.same_lesson, c.harder, c.not_minna, c.no_example, c.len, c.vid
         ) AS pos
  FROM candidates c WHERE c.dup = 1
)
INSERT INTO "KanjiVocab" (word, reading, "meaningVi", "exampleJa", "exampleKana", "exampleVi", "sortOrder", "kanjiEntryId", "vocabularyId")
SELECT p.kanji, p.kana, p.meaning, p.ja, p.ex_kana, p.vi, p.pos - 1, p.entry_id, p.vid
FROM picked p WHERE p.pos <= 3;

COMMIT;
