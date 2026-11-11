-- Điền Vocabulary."hanViet": ghép âm Hán Việt của từng chữ kanji trong từ, theo thứ tự.
--   感動します → CẢM ĐỘNG     学生 → HỌC SINH     食べます → THỰC
-- Kana trong từ bị bỏ qua. Từ có chữ kanji chưa có âm Hán Việt trong KanjiEntry thì để NULL (không ghép thiếu).
-- Chạy lại bao nhiêu lần cũng được (idempotent):
--   docker exec -i edu-postgres-nihongo psql -U nihongo -d nihongo < packages/prisma-nihongo/scripts/vocab-enrich/han-viet.sql
BEGIN;

-- Một chữ có thể nằm ở nhiều dòng KanjiEntry (nhiều bài): lấy âm xuất hiện nhiều nhất cho chữ đó.
-- Chữ có nhiều âm ("HÀNH, HÀNG", "YÊU, YẾU") chỉ lấy âm đầu: ghép nguyên văn sẽ ra "LƯU HÀNH, HÀNG".
CREATE TEMP TABLE kanji_han_viet ON COMMIT DROP AS
WITH first_reading AS (
  SELECT character, upper(trim(regexp_replace("hanViet", '\s*[,/;、].*$', ''))) AS han_viet
  FROM "KanjiEntry"
  WHERE coalesce(trim("hanViet"), '') <> ''
)
SELECT DISTINCT ON (character) character, han_viet
FROM first_reading
WHERE han_viet <> ''
GROUP BY character, han_viet
ORDER BY character, count(*) DESC, han_viet;

-- Âm đầu không phải lúc nào cũng là âm hay dùng nhất trong từ ghép: chọn tay cho các chữ này.
UPDATE kanji_han_viet k SET han_viet = d.han_viet
FROM (VALUES ('要','YẾU'), ('少','THIỂU'), ('計','KẾ'), ('過','QUÁ'), ('好','HẢO')) AS d(character, han_viet)
WHERE k.character = d.character;

-- Từ dùng âm khác âm mặc định của chữ (銀行 NGÂN HÀNG chứ không phải NGÂN HÀNH). Đối chiếu theo cả cột kanji.
CREATE TEMP TABLE han_viet_override ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('大使', 'ĐẠI SỨ'),
  ('大使館', 'ĐẠI SỨ QUÁN'),
  ('好き', 'HIẾU'),
  ('好き［な］', 'HIẾU'),
  ('好み', 'HIẾU'),
  ('好みます', 'HIẾU'),
  ('大好き', 'ĐẠI HIẾU'),
  ('大好き［な］', 'ĐẠI HIẾU'),
  ('好き好き', 'HIẾU HIẾU'),
  ('好き嫌い', 'HIẾU HIỀM'),
  ('物好き', 'VẬT HIẾU'),
  ('少女', 'THIẾU NỮ'),
  ('少年', 'THIẾU NIÊN'),
  ('青少年', 'THANH THIẾU NIÊN'),
  ('勉強', 'MIỄN CƯỠNG'),
  ('勉強します', 'MIỄN CƯỠNG'),
  ('強いる', 'CƯỠNG'),
  ('強います', 'CƯỠNG'),
  ('強いて', 'CƯỠNG'),
  ('強引', 'CƯỠNG DẪN'),
  ('強制', 'CƯỠNG CHẾ'),
  ('強請ります', 'CƯỠNG THỈNH'),
  ('適当', 'THÍCH ĐÁNG'),
  ('適当［な］', 'THÍCH ĐÁNG'),
  ('適当な 大きさに', 'THÍCH ĐÁNG ĐẠI'),
  ('妥当', 'THỎA ĐÁNG'),
  ('妥当性', 'THỎA ĐÁNG TÍNH'),
  ('不当', 'BẤT ĐÁNG'),
  ('正当化', 'CHÍNH ĐÁNG HÓA'),
  ('音楽', 'ÂM NHẠC'),
  ('音楽家', 'ÂM NHẠC GIA'),
  ('楽譜', 'NHẠC PHỔ'),
  ('計画', 'KẾ HOẠCH'),
  ('計画します', 'KẾ HOẠCH'),
  ('企画', 'XÍ HOẠCH'),
  ('区画', 'KHU HOẠCH'),
  ('画一', 'HOẠCH NHẤT'),
  ('画一化', 'HOẠCH NHẤT HÓA'),
  ('画一的', 'HOẠCH NHẤT ĐÍCH'),
  ('画期的', 'HOẠCH KỲ ĐÍCH'),
  ('画策', 'HOẠCH SÁCH'),
  ('首相', 'THỦ TƯỚNG'),
  ('外相', 'NGOẠI TƯỚNG'),
  ('蔵相', 'TÀNG TƯỚNG'),
  ('様相', 'DẠNG TƯỚNG'),
  ('形相', 'HÌNH TƯỚNG'),
  ('真相', 'CHÂN TƯỚNG'),
  ('銀行', 'NGÂN HÀNG'),
  ('アップル銀行', 'NGÂN HÀNG'),
  ('銀行員', 'NGÂN HÀNG VIÊN'),
  ('寄ります［銀行に～］', 'KÍ NGÂN HÀNG'),
  ('要求', 'YÊU CẦU'),
  ('要望', 'YÊU VỌNG'),
  ('要請', 'YÊU THỈNH'),
  ('統計', 'THỐNG KÊ'),
  ('単調', 'ĐƠN ĐIỆU'),
  ('同調', 'ĐỒNG ĐIỆU'),
  ('基調', 'CƠ ĐIỆU'),
  ('経過', 'KINH QUA'),
  ('通過', 'THÔNG QUA'),
  ('通り過ぎます', 'THÔNG QUA'),
  ('通り過ぎる', 'THÔNG QUA'),
  ('重複', 'TRÙNG PHỨC'),
  ('重なります', 'TRÙNG'),
  ('重ねます', 'TRÙNG'),
  ('社長', 'XÃ TRƯỞNG'),
  ('校長', 'HIỆU TRƯỞNG'),
  ('部長', 'BỘ TRƯỞNG'),
  ('課長', 'KHÓA TRƯỞNG'),
  ('議長', 'NGHỊ TRƯỞNG'),
  ('長官', 'TRƯỞNG QUAN'),
  ('長女', 'TRƯỞNG NỮ'),
  ('長男', 'TRƯỞNG NAM'),
  ('成長', 'THÀNH TRƯỞNG'),
  ('年長', 'NIÊN TRƯỞNG'),
  ('助長', 'TRỢ TRƯỞNG')
) AS o(kanji, han_viet);

WITH chars AS (
  -- 暖かい、温かい / 夫／主人: nhiều cách viết thì chỉ lấy cách đầu, không ghép âm của cả hai từ
  SELECT v.id, c.ch, c.pos
  FROM "Vocabulary" v,
       regexp_split_to_table(regexp_replace(v.kanji, '[、／/].*$', ''), '') WITH ORDINALITY AS c(ch, pos)
  WHERE v.kanji ~ '[一-龯々]'
    AND c.ch ~ '[一-龯]'          -- chỉ chữ Hán (々 lặp lại chữ trước: xử lý riêng bên dưới)
),
joined AS (
  SELECT ch.id, ch.pos, k.han_viet
  FROM chars ch LEFT JOIN kanji_han_viet k ON k.character = ch.ch
),
complete AS (
  -- Chỉ lấy từ mà MỌI chữ Hán đều có âm
  SELECT id, string_agg(han_viet, ' ' ORDER BY pos) AS han_viet
  FROM joined
  GROUP BY id
  HAVING bool_and(han_viet IS NOT NULL)
)
UPDATE "Vocabulary" v
SET "hanViet" = c.han_viet
FROM complete c
WHERE v.id = c.id
  AND v.kanji !~ '々'               -- 時々, 人々: bỏ qua thay vì ghép sai
  AND v.kanji !~ '[0-9０-９]'       -- １４日: chữ số không có âm Hán Việt, ghép ra "NHẬT" là sai
  AND NOT EXISTS (SELECT 1 FROM han_viet_override o WHERE o.kanji = v.kanji)
  AND v."hanViet" IS DISTINCT FROM c.han_viet;

-- Lần chạy cũ có thể đã điền cho từ có chữ số: xóa đi
UPDATE "Vocabulary" SET "hanViet" = NULL WHERE kanji ~ '[0-9０-９]' AND "hanViet" IS NOT NULL;

UPDATE "Vocabulary" v SET "hanViet" = o.han_viet
FROM han_viet_override o
WHERE v.kanji = o.kanji AND v."hanViet" IS DISTINCT FROM o.han_viet;

COMMIT;
