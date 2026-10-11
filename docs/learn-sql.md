# Học SQL (PostgreSQL) — Từ Project Này

> Học SQL trên **chính DB `nihongo`** của project (bài Minna, từ vựng JLPT, kanji, giáo trình…).
> Mọi câu lệnh trong tài liệu đã chạy thật; kết quả in kèm là dữ liệu thật tại thời điểm viết.
> Phần nâng cao (EXPLAIN, index, isolation, keyset pagination) ở [learn-postgres.md](./learn-postgres.md);
> thiết kế bảng ở [learn-db-design.md](./learn-db-design.md); sơ đồ bảng ở [db-erd.md](./db-erd.md).
> Xem bảng bằng app desktop: [learn-pgadmin.md](./learn-pgadmin.md).

## 0. Mở psql

```powershell
docker exec -it edu-postgres-nihongo psql -U nihongo -d nihongo
```

| Lệnh psql | Làm gì |
|-----------|--------|
| `\dt` | liệt kê bảng |
| `\d "Vocabulary"` | xem cột, index, khoá ngoại của bảng |
| `\dT+ "JlptLevel"` | xem giá trị của enum |
| `\x` | bật/tắt hiển thị dọc (dễ đọc bảng nhiều cột) |
| `\timing` | in thời gian chạy mỗi câu |
| `\q` | thoát |

> ⚠️ **Tên bảng/cột có chữ hoa phải đặt trong ngoặc kép.** Prisma tạo bảng `"Vocabulary"`, cột `"lessonId"`.
> Viết `SELECT * FROM Vocabulary` → Postgres hạ thành `vocabulary` → lỗi `relation "vocabulary" does not exist`.

Muốn thực hành câu **ghi** (INSERT/UPDATE/DELETE) mà không làm hỏng dữ liệu: bọc trong
`BEGIN; … ROLLBACK;` (mục 8).

---

## 1. SELECT — lấy dữ liệu

```sql
-- 5 từ đầu tiên của Minna bài 1
SELECT "kanji", "kana", "meaning"
FROM "Vocabulary"
WHERE "lessonId" = (SELECT id FROM "Lesson" WHERE "lessonNumber" = 1)
ORDER BY "sortOrder"
LIMIT 5;
```

```
  kanji  |    kana    |       meaning
---------+------------+----------------------
 私      | わたし     | tôi
 私たち  | わたしたち | chúng tôi
         | あなた     | anh/chị, bạn        ← kanji NULL: từ chỉ viết bằng kana
 あの 人 | あの ひと  | người kia
 あの 方 | あの かた  | người kia (kính ngữ)
```

Thứ tự **viết** vs thứ tự Postgres **chạy**:

```
Viết :  SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT
Chạy :  FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
```

Vì `WHERE` chạy trước `SELECT`, **không** dùng được bí danh cột của `SELECT` trong `WHERE`
(nhưng dùng được trong `ORDER BY`).

---

## 2. Lọc: WHERE, LIKE / ILIKE, NULL

```sql
-- Tìm từ có nghĩa chứa "sách", từ ngắn trước
SELECT "kanji", "kana", "meaning"
FROM "Vocabulary"
WHERE "meaning" ILIKE '%sách%'       -- ILIKE: không phân biệt hoa thường
ORDER BY length("kana")
LIMIT 5;
```

```
 kanji | kana |     meaning
-------+------+------------------
 本    | ほん | sách
 棚    | たな | giá sách
 本    | ほん | sách                ← 本 xuất hiện ở nhiều bài (Minna, Sou Matome, TRY!)
 本    | ほん | sách
 巻    | まき | tập, cuộn (sách)
```

Đây chính là câu mà ô **"Tra từ trên mọi bài"** ở trang Từ vựng chạy (thêm điều kiện cho `kana`, `romaji`).

**NULL không bằng gì cả, kể cả NULL:**

```sql
SELECT COUNT(*) FROM "Vocabulary" WHERE "kanji" = NULL;   -- luôn 0 ❌
SELECT COUNT(*) FROM "Vocabulary" WHERE "kanji" IS NULL;  -- đúng ✅
SELECT COALESCE("kanji", "kana") FROM "Vocabulary";       -- thay NULL bằng giá trị khác
```

---

## 3. Gom nhóm: GROUP BY, COUNT, HAVING

```sql
-- Mỗi giáo trình có bao nhiêu bài?
SELECT COALESCE("textbook"::text, '(JLPT chung)') AS giao_trinh, COUNT(*) AS so_bai
FROM "Lesson"
GROUP BY "textbook"
ORDER BY so_bai DESC;
```

```
  giao_trinh  | so_bai
--------------+--------
 (JLPT chung) |    402
 SOUMATOME    |    180
 SHINKANZEN   |     99
 TRY          |     56
 MINNA        |     50
```

```sql
-- Kanji nào xuất hiện ở ≥ 3 bài? (HAVING lọc SAU khi gom nhóm, WHERE lọc TRƯỚC)
SELECT "character", COUNT(*) AS so_bai
FROM "KanjiEntry"
GROUP BY "character"
HAVING COUNT(*) >= 3
ORDER BY so_bai DESC, "character"
LIMIT 5;
```

```sql
-- COUNT(*) đếm dòng, COUNT(DISTINCT cột) đếm giá trị khác nhau
SELECT COUNT(*) AS so_dong, COUNT(DISTINCT "character") AS so_chu_khac_nhau FROM "KanjiEntry";
```

```
 so_dong | so_chu_khac_nhau
---------+------------------
    3675 |             2222     ← cùng một chữ được lưu ở nhiều bài (KLL, Sou Matome, Shinkanzen…)
```

Vì sao lại lưu trùng như vậy? Xem phân tích ở [learn-db-design.md](./learn-db-design.md) mục 6.

---

## 4. JOIN — nối bảng

```
INNER JOIN : chỉ dòng khớp ở CẢ HAI bảng
LEFT JOIN  : mọi dòng bảng trái + dòng khớp bên phải (không khớp → NULL)
```

```sql
-- Chữ 本 nằm ở những bài nào?
SELECT l."lessonNumber", l."title", v."kana", v."meaning"
FROM "Vocabulary" v
JOIN "Lesson" l ON l.id = v."lessonId"
WHERE v."kanji" = '本'
ORDER BY l."lessonNumber";
```

```
 lessonNumber | title                                         | kana | meaning
--------------+-----------------------------------------------+------+---------
            2 | Bài 2                                         | ほん | sách
        25203 | Sou Matome N5 · Tuần 2 · Ngày 3 — …           | ほん | sách
        45102 | TRY! N5 · Các chương · Phần 2 — Chương 2: …   | ほん | sách
```

**LEFT JOIN + IS NULL = tìm cái "không có":**

```sql
-- Bài nào không có từ vựng nào?
SELECT COUNT(*) AS bai_khong_co_tu
FROM "Lesson" l
LEFT JOIN "Vocabulary" v ON v."lessonId" = l.id
WHERE v.id IS NULL;
```

```
 bai_khong_co_tu
-----------------
              80        ← bài chỉ có ngữ pháp (bài ngữ pháp JLPT, bài 文法 của sách)
```

**Bảng nối nhiều–nhiều** — từ vựng ↔ kanji qua `"VocabularyKanjiLink"`:

```sql
SELECT v."kanji", v."meaning", k."character", k."hanViet"
FROM "Vocabulary" v
JOIN "VocabularyKanjiLink" vk ON vk."vocabularyId" = v.id
JOIN "KanjiEntry" k           ON k.id = vk."kanjiEntryId"
WHERE v."kanji" = '日本';
```

---

## 5. Subquery & EXISTS

```sql
-- Kanji chưa có từ ví dụ nào (NOT EXISTS: dừng ngay khi thấy 1 dòng → nhanh)
SELECT COUNT(*) AS kanji_chua_co_tu_vi_du
FROM "KanjiEntry" k
WHERE NOT EXISTS (
  SELECT 1 FROM "KanjiVocab" kv WHERE kv."kanjiEntryId" = k.id
);
```

```
 kanji_chua_co_tu_vi_du
------------------------
                   3171       ← câu SQL này vừa chỉ ra một "lỗ hổng" nội dung cần bổ sung
```

> Tránh `NOT IN (SELECT …)` khi cột con có thể NULL: chỉ cần một NULL là cả điều kiện thành "không biết"
> → không trả dòng nào. `NOT EXISTS` không bị lỗi này.

---

## 6. CTE (`WITH`) — chia câu dài thành bước

```sql
-- Top 5 bài Minna nhiều từ nhất, kèm % trên tổng số từ Minna
WITH dem AS (
  SELECT l."lessonNumber", COUNT(v.id) AS so_tu
  FROM "Lesson" l
  JOIN "Vocabulary" v ON v."lessonId" = l.id
  WHERE l."textbook" = 'MINNA'
  GROUP BY l.id
)
SELECT "lessonNumber", so_tu,
       ROUND(so_tu * 100.0 / SUM(so_tu) OVER (), 1) AS phan_tram
FROM dem
ORDER BY so_tu DESC
LIMIT 5;
```

```
 lessonNumber | so_tu | phan_tram
--------------+-------+-----------
           40 |    77 |       2.9
           37 |    76 |       2.9
           42 |    75 |       2.8
           33 |    73 |       2.8
           35 |    70 |       2.7
```

Chú ý `100.0` chứ không phải `100`: `int / int` trong Postgres là **chia nguyên** (`7 / 2 = 3`).

---

## 7. Window function — tính trên "cửa sổ" mà không gộp dòng

```sql
-- Kanji nhiều nét nhất của từng cấp JLPT
SELECT * FROM (
  SELECT "jlptLevel", "character", "strokeCount",
         ROW_NUMBER() OVER (PARTITION BY "jlptLevel"
                            ORDER BY "strokeCount" DESC NULLS LAST, "character") AS hang
  FROM "KanjiEntry"
  WHERE "jlptLevel" IS NOT NULL
) t
WHERE hang = 1
ORDER BY "jlptLevel";
```

```
 jlptLevel | character | strokeCount | hang
-----------+-----------+-------------+------
 N5        | 一        |             |    1    ← N5/N4 chưa có số nét → dữ liệu thiếu, không phải lỗi SQL
 N4        | 不        |             |    1
 N3        | 臓        |          19 |    1
 N2        | 襲        |          22 |    1
 N1        | 鬱        |          29 |    1
```

`GROUP BY` gộp nhiều dòng thành một; **window** giữ nguyên từng dòng và thêm cột tính trên nhóm.
Hay dùng: `ROW_NUMBER`, `RANK`, `LAG/LEAD` (so với dòng trước/sau), `SUM(...) OVER (ORDER BY ...)` (cộng dồn).
Chi tiết hơn: [learn-postgres.md](./learn-postgres.md) mục 4.

---

## 8. Ghi dữ liệu: INSERT / UPDATE / DELETE, UPSERT, transaction

Luôn thử trong transaction rồi `ROLLBACK`:

```sql
BEGIN;
UPDATE "Vocabulary"
SET "meaning" = "meaning" || ' (sửa thử)'
WHERE "kanji" = '本' AND "lessonId" = (SELECT id FROM "Lesson" WHERE "lessonNumber" = 2)
RETURNING id, "kanji", "meaning";      -- RETURNING: trả luôn dòng vừa sửa
ROLLBACK;                              -- huỷ, DB không đổi
```

```
  id   | kanji |    meaning
-------+-------+----------------
 27021 | 本    | sách (sửa thử)
```

> Quên `WHERE` trong `UPDATE`/`DELETE` = sửa/xoá **cả bảng**. Tập thói quen: viết `SELECT … WHERE …` trước,
> thấy đúng dòng rồi mới đổi thành `UPDATE`/`DELETE`, và luôn chạy trong `BEGIN`.

**UPSERT** — "chưa có thì thêm, có rồi thì cập nhật". Project dùng cho bộ đếm hoạt động mỗi ngày
(`"DailyActivity"` có UNIQUE `("userId", "date", "kind")`):

```sql
BEGIN;
INSERT INTO "DailyActivity" ("userId", "date", "kind", "count", "updatedAt")
VALUES (1, '2026-09-29', 'vocab', 1, NOW())
ON CONFLICT ("userId", "date", "kind")
DO UPDATE SET "count" = "DailyActivity"."count" + 1, "updatedAt" = NOW()
RETURNING "userId", "date", "kind", "count";
ROLLBACK;
```

`ON CONFLICT` chỉ hoạt động khi có **UNIQUE constraint / index** trên đúng các cột đó — thiết kế ràng buộc
quyết định câu lệnh viết được hay không.

---

## 9. Kiểu dữ liệu đặc biệt của Postgres trong project

### 9.1. ENUM

```sql
\dT+ "JlptLevel"                    -- N5, N4, N3, N2, N1
SELECT "textbook"::text FROM "Lesson" LIMIT 1;   -- ép enum sang text khi cần so sánh/ghép chuỗi
```

### 9.2. Mảng (ARRAY)

```sql
-- Bộ sách nào có lộ trình cho N5? ("planLevels" là JlptLevel[])
SELECT "code", "name", "planLevels"
FROM "TextbookSeries"
WHERE 'N5' = ANY("planLevels")
ORDER BY "sortOrder";
```

```
   code    |         name         |    planLevels
-----------+----------------------+------------------
 MINNA     | Minna no Nihongo     | {N5,N4}
 SOUMATOME | Sou Matome           | {N5,N4,N3,N2,N1}
 TRY       | TRY!                 | {N5,N4,N3,N2,N1}
 KLL       | Kanji Look and Learn | {N5,N4,N3,N2,N1}
```

(Shinkanzen không có trong kết quả vì bộ đó không có sách N5.)

### 9.3. JSONB

`"MindMapLevel"."branches"` lưu cả cây sơ đồ tư duy dạng JSON:

```sql
-- ->  lấy JSON con,  ->> lấy ra dạng text
SELECT "kind", "level",
       jsonb_array_length("branches")  AS so_nhanh,
       "branches"->0->>'label'         AS nhanh_dau
FROM "MindMapLevel"
WHERE "level" = 'N5'
ORDER BY "kind";
```

```
  kind   | level | so_nhanh |     nhanh_dau
---------+-------+----------+--------------------
 GRAMMAR | N5    |        6 | Trợ từ cơ bản
 VOCAB   | N5    |        6 | Chào hỏi · lịch sự
 KANJI   | N5    |        6 | Số · đếm
```

```sql
-- "Bung" mảng JSON thành từng dòng để truy vấn như bảng thường
SELECT b->>'label' AS nhanh, jsonb_array_length(b->'patterns') AS so_muc
FROM "MindMapLevel" m, jsonb_array_elements(m."branches") AS b
WHERE m."kind" = 'VOCAB' AND m."level" = 'N5'
LIMIT 4;
```

Khi nào nên/không nên dùng JSONB: [learn-db-design.md](./learn-db-design.md) mục 7.

### 9.4. Hàm chuỗi

```sql
-- Từ có 2 cách viết/đọc ngăn bởi "／"
SELECT "kanji", "kana",
       split_part("kana", '／', 1) AS doc_1,
       split_part("kana", '／', 2) AS doc_2
FROM "Vocabulary"
WHERE "kana" LIKE '%／%' AND "kanji" ~ '[一-龯]'     -- ~ : so khớp regex
ORDER BY length("kana")
LIMIT 2;
```

```
  kanji   |       kana       | doc_1  |  doc_2
----------+------------------+--------+----------
 妻／家内 | つま／かない     | つま   | かない
 夫／主人 | おっと／しゅじん | おっと | しゅじん
```

Hay dùng: `length`, `lower/upper`, `trim`, `replace`, `substring`, `position`, `||` (nối chuỗi),
`string_agg(col, ', ')` (gộp nhiều dòng thành một chuỗi).

---

## 10. Thứ tự học đề xuất

```
1. SELECT / WHERE / ORDER / LIMIT      (mục 1–2)
2. GROUP BY / HAVING, hàm gộp          (mục 3)
3. JOIN (inner, left, bảng nối N–N)    (mục 4)
4. Subquery, EXISTS, CTE               (mục 5–6)
5. Ghi dữ liệu an toàn + transaction   (mục 8)
6. Window function                     (mục 7, rồi learn-postgres mục 4)
7. Kiểu riêng: enum, array, JSONB      (mục 9)
8. Hiệu năng: EXPLAIN, index           (learn-postgres mục 1–2)
9. Thiết kế bảng                       (learn-db-design)
```

---

## Bài tập thực hành

Tự viết rồi chạy trong psql; câu ghi thì bọc `BEGIN … ROLLBACK`. Làm xong mới mở **Đáp án** —
đáp án đã chạy trên DB thật, kết quả in kèm là dữ liệu thật tại thời điểm viết (số liệu có thể đổi khi thêm nội dung).

**1.** Liệt kê 10 từ vựng N3 có `kanji` dài nhất (theo `length`), kèm số bài.

<details>
<summary>Đáp án</summary>

```sql
SELECT v."kanji", v."kana", v."meaning", l."lessonNumber"
FROM "Vocabulary" v
JOIN "Lesson" l ON l.id = v."lessonId"
WHERE v."jlptLevel" = 'N3' AND v."kanji" IS NOT NULL
ORDER BY length(v."kanji") DESC, v.id
LIMIT 10;
```

```
     kanji      |      kana      |           meaning            | lessonNumber
----------------+----------------+------------------------------+--------------
 立ち上がります | たちあがります | đứng dậy                     |          353
 セキュリティ   | セキュリティ   | bảo mật                      |          311
 引っ張ります   | ひっぱります   | kéo, lôi kéo                 |          308
 …
```

- `length` đếm **ký tự**, không phải byte → chữ Nhật đếm đúng.
- `セキュリティ` lọt vào vì cột `kanji` của nó lưu chữ katakana — dữ liệu chứ không phải lỗi truy vấn.
  Muốn chỉ lấy từ có chữ Hán: thêm `AND v."kanji" ~ '[一-龯]'`.
- Thêm `v.id` vào `ORDER BY` để kết quả ổn định khi nhiều từ cùng độ dài.

</details>

**2.** Mỗi cấp JLPT có bao nhiêu **ngữ pháp** (`"Grammar"`)? Cấp nào nhiều nhất?

<details>
<summary>Đáp án</summary>

```sql
SELECT "jlptLevel", COUNT(*) AS so_ngu_phap
FROM "Grammar"
GROUP BY "jlptLevel"
ORDER BY so_ngu_phap DESC;
```

```
 jlptLevel | so_ngu_phap
-----------+-------------
 N1        |         390      ← nhiều nhất
 N2        |         375
 N3        |         363
 N4        |         332
 N5        |         304
```

</details>

**3.** Liệt kê các bài Minna (1–50) mà số ngữ pháp **ít hơn 3**.

<details>
<summary>Đáp án</summary>

```sql
SELECT l."lessonNumber", COUNT(g.id) AS so_ngu_phap
FROM "Lesson" l
LEFT JOIN "Grammar" g ON g."lessonId" = l.id
WHERE l."textbook" = 'MINNA'
GROUP BY l.id, l."lessonNumber"
HAVING COUNT(g.id) < 3
ORDER BY l."lessonNumber";
```

```
 lessonNumber | so_ngu_phap
--------------+-------------
           11 |           2
           20 |           1
           22 |           2
 …  (15 bài)
```

- Phải dùng **LEFT JOIN** và `COUNT(g.id)` (không phải `COUNT(*)`): bài **không có** ngữ pháp nào vẫn
  xuất hiện với số 0. Với `JOIN` thường, bài 0 ngữ pháp biến mất khỏi kết quả.
- Điều kiện trên số lượng sau khi gom nhóm → `HAVING`, không phải `WHERE`.

</details>

**4.** Tìm các từ vựng có cùng `kana` nhưng khác `kanji` (từ đồng âm) — gợi ý `GROUP BY "kana" HAVING COUNT(DISTINCT "kanji") > 1`.

<details>
<summary>Đáp án</summary>

```sql
SELECT "kana",
       string_agg(DISTINCT "kanji", ' · ') AS cac_cach_viet,
       COUNT(DISTINCT "kanji")             AS so_cach
FROM "Vocabulary"
WHERE "kanji" IS NOT NULL
GROUP BY "kana"
HAVING COUNT(DISTINCT "kanji") > 1
ORDER BY so_cach DESC, "kana"
LIMIT 5;
```

```
   kana   |          cac_cach_viet          | so_cach
----------+---------------------------------+---------
 あつい   | 厚い · 暑い · 暑い、熱い · 熱い |       4
 おく     | 億 · 奥 · 置く                  |       3
 きげん   | 期限 · 機嫌 · 起源              |       3
 きのう   | 帰納 · 昨日 · 機能              |       3
 こうえん | 公園 · 公演 · 後援              |       3
```

`あつい` có "4 cách viết" vì một dòng lưu `暑い、熱い` (2 chữ trong một ô) — đúng kiểu vi phạm 1NF phân tích ở
[learn-db-design.md](./learn-db-design.md) mục 4.1. Dữ liệu "bẩn" làm kết quả thống kê sai lệch.

</details>

**5.** Với mỗi ngữ pháp của Minna bài 5, in `pattern` và **số câu ví dụ** (`"Example"`), kể cả ngữ pháp chưa có ví dụ (LEFT JOIN).

<details>
<summary>Đáp án</summary>

```sql
SELECT g."pattern", COUNT(e.id) AS so_vi_du
FROM "Grammar" g
JOIN "Lesson" l       ON l.id = g."lessonId"
LEFT JOIN "Example" e ON e."grammarId" = g.id
WHERE l."lessonNumber" = 5
GROUP BY g.id, g."pattern", g."sortOrder"
ORDER BY g."sortOrder";
```

```
 pattern                                                   | so_vi_du
-----------------------------------------------------------+----------
 N は ～月(がつ) ～日(にち)です。…                          |        1
 N (Danh từ chỉ địa điểm) へ いきます/ きます/ かえります  |        0   ← chưa có ví dụ
 〔～へ〕 なんで ～ (động từ) か。…                         |        3
 だれと ～ V ますか。                                      |        3
```

`JOIN "Lesson"` là JOIN thường (ngữ pháp nào cũng thuộc một bài), còn `"Example"` phải là **LEFT JOIN**
để giữ ngữ pháp có 0 ví dụ. `g."sortOrder"` phải nằm trong `GROUP BY` vì được dùng ở `ORDER BY`.

</details>

**6.** Đếm số kanji mỗi bài KLL (bài 1–32) và in thêm cột **cộng dồn** bằng `SUM(...) OVER (ORDER BY ...)`.

<details>
<summary>Đáp án</summary>

```sql
SELECT l."lessonNumber",
       COUNT(e.id)                                        AS so_kanji,
       SUM(COUNT(e.id)) OVER (ORDER BY l."lessonNumber")  AS cong_don
FROM "KanjiLesson" l
LEFT JOIN "KanjiEntry" e ON e."lessonId" = l.id
WHERE l."textbook" = 'KLL'
GROUP BY l.id, l."lessonNumber"
ORDER BY l."lessonNumber";
```

```
 lessonNumber | so_kanji | cong_don
--------------+----------+----------
            1 |       16 |       16
            2 |       16 |       32
            3 |       16 |       48
 …
           32 |       16 |      512    ← đúng 512 chữ của "Kanji Look and Learn"
```

`SUM(COUNT(e.id)) OVER (...)`: `COUNT` là hàm gộp chạy ở bước `GROUP BY`, còn window `SUM … OVER` chạy
**sau** đó trên các dòng đã gộp — nên lồng được hàm gộp bên trong window.

</details>

**7.** Viết UPSERT cho `"StudyStreak"` (UNIQUE `"userId"`): chưa có thì tạo `currentStreak = 1`, có rồi thì `+1`
và cập nhật `longestStreak = GREATEST(...)`. Chạy trong transaction rồi ROLLBACK.

<details>
<summary>Đáp án</summary>

```sql
BEGIN;
INSERT INTO "StudyStreak" ("userId", "currentStreak", "longestStreak", "lastStudyDate", "updatedAt")
VALUES (1, 1, 1, '2026-09-29', NOW())
ON CONFLICT ("userId") DO UPDATE SET
  "currentStreak" = "StudyStreak"."currentStreak" + 1,
  "longestStreak" = GREATEST("StudyStreak"."longestStreak", "StudyStreak"."currentStreak" + 1),
  "lastStudyDate" = EXCLUDED."lastStudyDate",
  "updatedAt"     = NOW()
RETURNING "userId", "currentStreak", "longestStreak", "lastStudyDate";
ROLLBACK;
```

```
 userId | currentStreak | longestStreak | lastStudyDate
--------+---------------+---------------+---------------
      1 |             1 |             1 | 2026-09-29      ← user 1 chưa có streak → nhánh INSERT
```

- Trong `DO UPDATE`: `"StudyStreak".cột` = giá trị **đang có** trong DB; `EXCLUDED.cột` = giá trị **định chèn**.
- Ở vế phải của `SET`, mọi cột đều là giá trị **cũ** → `GREATEST(longest, current + 1)` dùng `current` cũ, đúng ý.
- `"updatedAt"` phải truyền tay: `@updatedAt` của Prisma do **Prisma** điền, DB không có DEFAULT.
- Thiếu: logic thật còn phải kiểm tra `lastStudyDate` là **hôm qua** (tăng) hay **cũ hơn** (reset về 1) —
  làm bằng `CASE WHEN "StudyStreak"."lastStudyDate" = '2026-09-28' THEN … ELSE 1 END`.

</details>

**8.** Từ `"MindMapLevel"` loại `KANJI` cấp N4, liệt kê tất cả `pattern` của mọi nhánh (2 lần `jsonb_array_elements`).

<details>
<summary>Đáp án</summary>

```sql
SELECT b->>'label'   AS nhanh,
       p->>'pattern' AS muc,
       p->>'meaning' AS nghia
FROM "MindMapLevel" m,
     jsonb_array_elements(m."branches") AS b,       -- mỗi nhánh thành 1 dòng
     jsonb_array_elements(b->'patterns') AS p       -- mỗi mục trong nhánh thành 1 dòng
WHERE m."kind" = 'KANJI' AND m."level" = 'N4';
```

```
        nhanh        |    muc     |       nghia
---------------------+------------+--------------------
 Cảm xúc · tính cách | 思／考／知 | nghĩ / suy / biết
 Cảm xúc · tính cách | 楽／苦／忙 | vui / khổ / bận
 Cơ thể · sức khỏe   | 体／頭／顔 | cơ thể / đầu / mặt
 …  (15 dòng)
```

Hàm trả về tập dòng (`jsonb_array_elements`) đặt trong `FROM` hoạt động như `LATERAL JOIN`: hàm thứ hai được
gọi **cho từng dòng** của hàm thứ nhất, nên dùng được `b` ngay trong đó.

</details>

**9.** Tìm kanji **có trong từ vựng** (`"Vocabulary"."kanji"`) nhưng **không có** trong `"KanjiEntry"` —
thử bằng `regexp_split_to_table("kanji", '')` để tách từng chữ.

<details>
<summary>Đáp án</summary>

```sql
WITH chu AS (
  SELECT DISTINCT c AS ch
  FROM "Vocabulary" v,
       regexp_split_to_table(v."kanji", '') AS c   -- tách "日本語" → 日 / 本 / 語
  WHERE v."kanji" IS NOT NULL
    AND c ~ '[一-龯]'                              -- chỉ giữ chữ Hán (bỏ kana, dấu câu)
)
SELECT COUNT(*)                                 AS so_chu_thieu,
       left(string_agg(ch, '' ORDER BY ch), 30) AS vai_chu
FROM chu
WHERE NOT EXISTS (SELECT 1 FROM "KanjiEntry" k WHERE k."character" = chu.ch);
```

```
 so_chu_thieu |                          vai_chu
--------------+------------------------------------------------------------
          271 | 丈云互伜似俄俺偉偶僅儚儲兎其凄凋几凭列到剃剥勃匂匙厭叩可叱吊
```

Kết quả là một **phát hiện thật**: 271 chữ Hán xuất hiện trong từ vựng mà bảng kanji chưa có — trong đó có chữ rất
thông dụng như 列 可 才 忙 晴 箱 誤 誰 陽. Đây là cách dùng SQL để **kiểm tra chất lượng dữ liệu**: danh sách này
chính là việc cần bổ sung tiếp cho nội dung kanji.

</details>
