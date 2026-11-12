# Bổ sung nghĩa tiếng Anh, Hán Việt, furigana cho từ vựng

Các script trong thư mục này điền 5 cột của bảng `Vocabulary`:

| Cột | Ví dụ | Lấy từ đâu |
|---|---|---|
| `hanViet` | 学生 → `HỌC SINH` | Ghép âm Hán Việt từng chữ trong bảng `KanjiEntry` ([han-viet.sql](./han-viet.sql)) |
| `meaningEn` | `to eat` | Từ điển JMdict ([jmdict_match.py](./jmdict_match.py)); từ không có trong JMdict thì dùng bản AI dịch sẵn ([ai-translations.tsv](./ai-translations.tsv)) |
| `meaningEnSource` | `manual` / `jmdict` / `ai` | Ghi nguồn để app hiện nhãn "dịch máy" khi là `ai` |
| `furigana` | `[["食","た"],["べます",""]]` | Tách từ `kanji` + `kana` ([furigana.ts](./furigana.ts), dùng `toFurigana` trong `packages/nest-common`) |

Và 1 cột của bảng `KanjiEntry`:

| Cột | Ví dụ | Lấy từ đâu |
|---|---|---|
| `meaningEn` | 食 → `eat; food` | Từ điển kanji KANJIDIC2 ([kanjidic_meanings.py](./kanjidic_meanings.py)) |

Dữ liệu đã chạy xong nằm trong DB và trong seed nội dung (`npm run db:export-content`), nên **máy mới không cần chạy lại**.
Chỉ chạy lại khi thêm hàng loạt từ mới, hoặc muốn làm lại từ đầu.

Từ thêm/sửa qua admin thì content-service tự tính `furigana`. Nhập nghĩa tiếng Anh tay thì nguồn là `manual`.

## Giấy phép JMdict và KANJIDIC2 (bắt buộc đọc)

JMdict và KANJIDIC2 © [Electronic Dictionary Research and Development Group](https://www.edrdg.org/) (EDRDG),
cùng giấy phép [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Điều kiện:

- **Ghi nguồn** ở nơi hiển thị dữ liệu. Web và 4 app mobile đã có dòng "Nghĩa tiếng Anh: JMdict © EDRDG, CC BY-SA 4.0"
  dưới danh sách từ khi có từ lấy từ JMdict. Trang Bảng Kanji JLPT có dòng "Nghĩa tiếng Anh của kanji lấy từ KANJIDIC2 © EDRDG".
  Đừng xóa các dòng này.
- **Chia sẻ tương tự (share-alike):** nếu phát hành lại *bộ dữ liệu* nghĩa tiếng Anh này, phải dùng cùng giấy phép.

## Chạy lại từ đầu

Cần: Docker đang chạy stack (container `edu-postgres-nihongo`), Python 3, Node.
Nên sao lưu DB trước: `npm run -s db:backup` (thư mục gốc repo).

Các lệnh dưới chạy ở thư mục gốc repo. Thư mục tạm `WORK` đặt ngoài repo (file JMdict nặng khoảng 60 MB):

```bash
WORK=/tmp/vocab-enrich && mkdir -p "$WORK"
DB="docker exec -i edu-postgres-nihongo psql -U nihongo -d nihongo -v ON_ERROR_STOP=1"
```

### 1. Hán Việt

```bash
$DB < packages/prisma-nihongo/scripts/vocab-enrich/han-viet.sql
```

Quy tắc, để không ghép ra kết quả nửa vời:

- Chỉ điền khi **mọi** chữ kanji trong từ đều có âm trong `KanjiEntry`. Từ có chữ số (`１４日`) hoặc `々` thì bỏ trống.
- Chữ có nhiều âm (`行: HÀNH, HÀNG`) dùng một âm mặc định. Âm mặc định là âm đầu, riêng vài chữ được chọn tay
  (`要 → YẾU`, `少 → THIỂU`…).
- Từ dùng âm khác âm mặc định thì ghi riêng trong bảng `han_viet_override` của script
  (`銀行 → NGÂN HÀNG`, `社長 → XÃ TRƯỞNG`, `音楽 → ÂM NHẠC`). Thấy từ nào sai âm thì thêm một dòng vào bảng đó rồi chạy lại.
- Từ có nhiều cách viết (`暖かい、温かい`) chỉ lấy cách viết đầu.

### 2. Nghĩa tiếng Anh từ JMdict

```bash
curl -L -o "$WORK/JMdict_e.gz" http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz
gunzip -f "$WORK/JMdict_e.gz"

# Xuất các từ chưa có nghĩa tiếng Anh
$DB -c "\copy (select id, coalesce(kanji,'') kanji, kana from \"Vocabulary\" where coalesce(\"meaningEn\",'')='' order by id) to stdout with csv header" > "$WORK/vocab.csv"

python3 -I packages/prisma-nihongo/scripts/vocab-enrich/jmdict_match.py "$WORK/JMdict_e" "$WORK/vocab.csv" "$WORK/matched.csv"
```

Script in số từ khớp theo từng cách (`pair` = khớp cả kanji lẫn kana, `masu-…` = đổi thể ます về thể từ điển rồi mới khớp…).
Chỉ nhận kết quả **duy nhất**: từ đồng âm nhiều nghĩa thì bỏ trống cho bước 3, không đoán.

Nạp vào DB. Dùng `COPY` phía server, vì `\copy … from stdin` qua `docker exec` sẽ đọc nhầm dữ liệu CSV thành lệnh SQL:

```bash
docker cp "$WORK/matched.csv" edu-postgres-nihongo:/tmp/jm.csv
$DB <<'SQL'
BEGIN;
CREATE TEMP TABLE jm (id int, meaning_en text, match text);
COPY jm FROM '/tmp/jm.csv' WITH (FORMAT csv, HEADER true);
UPDATE "Vocabulary" v SET "meaningEn" = jm.meaning_en, "meaningEnSource" = 'jmdict'
FROM jm WHERE v.id = jm.id AND coalesce(v."meaningEn",'') = '';
COMMIT;
SQL
docker exec edu-postgres-nihongo rm -f /tmp/jm.csv
```

### 3. Bản dịch AI có sẵn (từ JMdict không có, và câu JMdict dịch lệch ngữ cảnh)

[ai-translations.tsv](./ai-translations.tsv) (`id<TAB>nghĩa tiếng Anh`) do AI (Claude) dịch từ nghĩa tiếng Việt:

- 1.598 từ không khớp JMdict: câu giao tiếp, tên riêng trong sách, từ đồng âm…
- 8 câu và 16 từ katakana mà JMdict khớp đúng chữ nhưng nghĩa đầu tiên lệch với nghĩa trong sách:
  - `いいえ。` trong sách là "không có gì" (đáp lại lời cảm ơn), JMdict lại cho "no".
  - Từ katakana đồng âm dễ bị khớp nhầm nhất: `タイ` (Thái Lan) ra "tie", `コップ` (cốc) ra "cop",
    `ダース` (một tá) ra "Darth (Star Wars)", `マッチ` (diêm) ra "match (contest)".
  - Đã soát hết 501 cặp từ/nghĩa katakana lấy từ JMdict. Thêm từ katakana mới thì nên soát lại kiểu lỗi này.

Nguồn ghi là `ai` để app hiện nhãn "dịch máy". Bước này **ghi đè** nghĩa JMdict của các id có trong file,
nhưng không đụng nghĩa người soạn nhập (`manual`). Nên chạy sau bước 2.

```bash
F=packages/prisma-nihongo/scripts/vocab-enrich/ai-translations.tsv
docker cp "$F" edu-postgres-nihongo:/tmp/ai.tsv
docker exec -u root edu-postgres-nihongo chmod 644 /tmp/ai.tsv   # COPY chạy bằng user postgres, cần quyền đọc
$DB <<'SQL'
BEGIN;
CREATE TEMP TABLE ai_en (id int, meaning_en text);
COPY ai_en FROM '/tmp/ai.tsv' WITH (FORMAT text);
UPDATE "Vocabulary" v SET "meaningEn" = a.meaning_en, "meaningEnSource" = 'ai'
FROM ai_en a WHERE v.id = a.id AND coalesce(v."meaningEnSource",'') <> 'manual'
  AND (v."meaningEn" IS DISTINCT FROM a.meaning_en OR v."meaningEnSource" IS DISTINCT FROM 'ai');
COMMIT;
SQL
docker exec -u root edu-postgres-nihongo rm -f /tmp/ai.tsv
```

Thấy nghĩa JMdict nào lệch thì thêm một dòng vào file rồi chạy lại. Từ mới thêm sau này: nhập nghĩa tiếng Anh trong admin.

### 4. Furigana

```bash
cd packages/prisma-nihongo
DATABASE_URL="postgresql://…" npx tsx scripts/vocab-enrich/furigana.ts
```

`DATABASE_URL` lấy trong `services/.env`. Kết quả mẫu: `có furigana: 12665; có kanji mà không tách được: 1`.
Chữ số đọc chung với kanji bên cạnh (`２４日 / にじゅうよっか`). Từ có nhiều cách viết (`暑い、熱い`) thì mỗi cách viết đều có furigana.
Từ không tách được (`月・水・金 / げっすいきん`) thì app hiện kana ở dòng riêng như trước.

Có kanji mà không tách được thường là do **gõ sai** kanji hoặc kana (từng gặp `行ます`, `閉まりる`, `スパイン`), nên nên xem lại các từ này.

### 5. Nghĩa tiếng Anh của kanji (KANJIDIC2)

```bash
curl -L -o "$WORK/kanjidic2.xml.gz" http://www.edrdg.org/kanjidic/kanjidic2.xml.gz
gunzip -f "$WORK/kanjidic2.xml.gz"

$DB -tAc "select distinct character from \"KanjiEntry\" where coalesce(\"meaningEn\",'')=''" > "$WORK/chars.txt"
python3 -I packages/prisma-nihongo/scripts/vocab-enrich/kanjidic_meanings.py "$WORK/kanjidic2.xml" "$WORK/chars.txt" "$WORK/kanji_en.csv"
```

Script lấy tối đa 4 nghĩa tiếng Anh đầu tiên và bỏ ghi chú bộ thủ (`one radical (no.1)`). Kết quả mẫu:
`cần 2221; có nghĩa: 2220; không có: 1 々`. `々` là dấu lặp chữ, không có trong KANJIDIC; thêm tay một dòng
`々,repetition mark (repeats the previous kanji)` vào cuối `kanji_en.csv`.

Nạp giống bước 2 (`docker cp`, `chmod 644`, `COPY`), với bảng tạm `kd (character text, meaning_en text)` và:

```sql
UPDATE "KanjiEntry" k SET "meaningEn" = kd.meaning_en FROM kd
WHERE k.character = kd.character AND coalesce(k."meaningEn",'') = '';
```

### 6. Lưu vào seed

```bash
npm run db:export-content
```

## Kiểm tra nhanh

```bash
$DB -c "select coalesce(\"meaningEnSource\",'(trống)') nguon, count(*) from \"Vocabulary\" group by 1 order by 2 desc"
$DB -c "select kanji, kana, \"hanViet\", \"meaningEn\", furigana from \"Vocabulary\" where kanji = '食べます'"
```
