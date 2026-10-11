# Học pgAdmin — áp vào EDU APP

Tài liệu học **pgAdmin 4** trên chính database `nihongo` đang chạy trong Docker.  
Viết SQL: [learn-sql.md](./learn-sql.md) · đọc query plan: [learn-postgres.md](./learn-postgres.md) · thiết kế bảng: [learn-db-design.md](./learn-db-design.md).  
Bảng port các service khác: [dev-tools-connect.md](./dev-tools-connect.md).

pgAdmin là app desktop để **xem bảng, gõ SQL, đọc cấu trúc**. Postgres vẫn nằm trong container `edu-postgres-nihongo`. App chỉ là cửa sổ nhìn vào đó.

---

## 1. Mở app và thấy server

Trên máy này pgAdmin 4 đã được cài, server **edu-app nihongo** đã đăng ký sẵn.

1. Mở **pgAdmin 4**.
2. Lần đầu app hỏi **master password**. Đó là ổ khoá của riêng pgAdmin (để lưu mật khẩu kết nối). Đặt một mật khẩu và nhớ nó. Mật khẩu này không nằm trong `docker-compose.yml`.
3. Cây bên trái: **Servers → edu-app nihongo**. Bấm vào server. Nếu hỏi mật khẩu database, nhập `nihongo`.

Cây đúng khi đã nối:

```text
Servers
└── edu-app nihongo          localhost:5433
    └── Databases
        └── nihongo
            └── Schemas
                └── public
                    ├── Tables        Vocabulary, Lesson, User, …
                    ├── Views
                    └── Functions
```

Chưa thấy server thì đăng ký lại: menu trong cửa sổ pgAdmin **Object → Register → Server…**

| Tab | Ô | Giá trị |
|-----|---|---------|
| General | Name | `edu-app nihongo` |
| Connection | Host name/address | `localhost` |
| Connection | Port | `5433` |
| Connection | Maintenance database | `nihongo` |
| Connection | Username | `nihongo` |
| Connection | Password | `nihongo` |
| Connection | Save password | bật |

Mật khẩu `nihongo` là giá trị mặc định của `POSTGRES_PASSWORD` trong `docker-compose.yml`. Nếu thư mục repo có file `.env` khai báo `POSTGRES_PASSWORD` khác, dùng giá trị đó.

pgAdmin chạy trên macOS, nên địa chỉ là `localhost` và cổng là cổng đã map ra máy. Trong compose, `5433:5432` nghĩa là máy bạn vào cổng **5433**, container bên trong vẫn nghe **5432**. Tên `postgres-nihongo` chỉ phân giải được giữa các container, gõ tên đó vào ô Host thì pgAdmin không tìm thấy máy.

Có thêm một Postgres nữa cho Keycloak, cổng **5435**, user/database `keycloak`. Học từ vựng, bài học, user thì chỉ dùng server **edu-app nihongo**.

---

## 2. Ba chỗ hay dùng

| Chỗ | Mở bằng | Dùng khi |
|-----|---------|----------|
| **Cây object** | cột trái | tìm bảng, cột, index, khoá ngoại |
| **View/Edit Data** | chuột phải bảng | xem từng dòng như một lưới |
| **Query Tool** | chuột phải database `nihongo` → Query Tool | gõ SQL, EXPLAIN, xuất kết quả |

Query Tool cũng mở từ menu **Tools → Query Tool**. Nhìn thanh trạng thái phía trên ô SQL: phải đang là database `nihongo` trên server `edu-app nihongo`. Đang đứng ở database `postgres` thì câu `SELECT * FROM "Vocabulary"` báo không có bảng.

---

## 3. Xem dữ liệu một bảng

Chuột phải **Tables → Vocabulary → View/Edit Data → All Rows**.

Lưới hiện các cột Prisma tạo ra: `id`, `kanji`, `kana`, `romaji`, `meaning`, `lessonId`, `sortOrder`, …

Vài thao tác trên lưới:

- **Sort:** bấm tiêu đề cột.
- **Lọc:** ô filter trên cùng (biểu tượng phễu). Ví dụ cột `kana` chứa `わたし`.
- **Giới hạn số dòng:** ô limit trên thanh công cụ. Bảng từ vựng có khoảng 14 nghìn dòng; đừng kéo “All” nếu máy đang chậm.
- **Một dòng chi tiết:** chọn dòng, xem panel dưới (nếu bật). Ô `kanji` trống là từ chỉ viết bằng kana, ví dụ `あなた`.

Cột `lessonId` là số id nội bộ, không phải số bài trên URL. Bài 1 của Minna có `Lesson.lessonNumber = 1`, còn `Lesson.id` là số tự tăng. Muốn biết từ thuộc bài nào, sang Query Tool và JOIN (mục 5).

Đổi sang bảng `Lesson`: cột đáng chú ý là `lessonNumber`, `title`, `jlptLevel`, `textbook`.

---

## 4. Đọc cấu trúc bảng

Chọn bảng `Vocabulary` (một lần bấm, không cần View Data). Panel bên phải có các tab:

| Tab | Thấy gì |
|-----|---------|
| **Columns** | tên cột, kiểu, NULL hay không |
| **Constraints** | khoá chính `id`, khoá ngoại `lessonId` → `Lesson.id` |
| **Indexes** | index `(lessonId, sortOrder)`, index `jlptLevel` |
| **Dependencies / Dependents** | bảng nào trỏ tới bảng này |
| **SQL** | câu `CREATE TABLE` pgAdmin sinh ra |

Đối chiếu với model trong `packages/prisma-nihongo/schema.prisma`:

```prisma
model Vocabulary {
  id        Int     @id @default(autoincrement())
  kanji     String?
  kana      String
  lessonId  Int
  lesson    Lesson  @relation(fields: [lessonId], references: [id])
  sortOrder Int     @default(0)

  @@index([lessonId, sortOrder])
}
```

`String?` trên `kanji` hiện thành cột cho phép NULL. `@@index([lessonId, sortOrder])` hiện ở tab Indexes. Sơ đồ toàn bộ hệ thống nằm ở [db-erd.md](./db-erd.md); tab Dependencies chỉ cho một bảng.

Tên bảng và cột có chữ hoa. Postgres hạ chữ thường nếu không có ngoặc kép, nên trong SQL phải viết `"Vocabulary"`, `"lessonId"`. Quên ngoặc kép thì lỗi `relation "vocabulary" does not exist`.

---

## 5. Query Tool

Chuột phải database **nihongo** → **Query Tool**. Dán câu, bấm nút chạy (hình tia sét) hoặc phím tắt chạy câu (thường là F5).

Năm từ đầu của bài 1:

```sql
SELECT v.kanji, v.kana, v.meaning
FROM "Vocabulary" v
JOIN "Lesson" l ON l.id = v."lessonId"
WHERE l."lessonNumber" = 1
ORDER BY v."sortOrder"
LIMIT 5;
```

Đếm từ:

```sql
SELECT COUNT(*) FROM "Vocabulary";
```

Chỉ chạy một đoạn: bôi đen câu đó rồi bấm Execute. Cả ô có nhiều câu thì pgAdmin chạy hết nếu không bôi đen.

Kết quả nằm tab **Data Output**. Tab **Messages** ghi số dòng và thời gian. Tab **Notifications** gần như không dùng với các câu SELECT của project.

Xuất kết quả: trên lưới kết quả, menu tải xuống (CSV / XLSX). Chỉ xuất những dòng query trả về, không phải cả bảng.

---

## 6. EXPLAIN trong Query Tool

Cùng một ô SQL, bấm mũi tên cạnh nút Execute và chọn **Explain** hoặc **Explain Analyze**.

Explain Analyze **chạy thật** câu lệnh rồi vẽ plan. Với SELECT thì an toàn. Với UPDATE/DELETE thì dữ liệu bị đổi — đừng Explain Analyze câu ghi trên DB này.

Thử:

```sql
EXPLAIN ANALYZE
SELECT *
FROM "Vocabulary"
WHERE "lessonId" = 1
ORDER BY "sortOrder";
```

Đọc hình hoặc tab **Data Output**:

- `Index Scan` / `Bitmap Index Scan` trên index `(lessonId, sortOrder)` là plan đang dùng index của Prisma.
- `Seq Scan` trên `Vocabulary` nghĩa là Postgres đọc cả bảng. Hợp lý khi không có điều kiện lọc, đáng ngờ khi đã lọc `lessonId`.

Cách đọc plan chi tiết: [learn-postgres.md](./learn-postgres.md) mục 1.

---

## 7. Câu ghi — bọc transaction

Query Tool mặc định **auto-commit**: mỗi câu xong là ghi luôn. Muốn thử UPDATE mà hoàn tác được:

```sql
BEGIN;

UPDATE "Vocabulary"
SET meaning = meaning
WHERE id = 1;

-- xem dòng vừa đụng
SELECT id, meaning FROM "Vocabulary" WHERE id = 1;

ROLLBACK;
```

`ROLLBACK` huỷ mọi thứ từ `BEGIN`. Đổi thành `COMMIT` thì mới giữ. Đóng tab Query Tool khi transaction còn mở: pgAdmin hỏi rollback hay commit — chọn rollback nếu chỉ đang tập.

Không DROP bảng, không TRUNCATE, không chạy file backup restore từ menu Restore trừ khi bạn cố ý thay cả database. Data nằm trong volume Docker `nihongo-app_postgres_data`; xoá nhầm trong pgAdmin là xoá data thật của app tại `http://localhost:8080`.

---

## 8. Đối chiếu với psql

Cùng một database. [learn-sql.md](./learn-sql.md) viết lệnh cho `psql`; trong pgAdmin làm tương đương như sau.

| Trong psql | Trong pgAdmin |
|------------|----------------|
| `\dt` | Schemas → public → Tables |
| `\d "Vocabulary"` | chọn bảng → tab Columns / Constraints / Indexes |
| gõ SQL | Query Tool |
| `\timing` | tab Messages sau khi chạy |
| `BEGIN` … `ROLLBACK` | cùng câu đó trong Query Tool |

`psql` trên máy (đã cài ở `~/development/postgresql`) nối cùng chỗ:

```bash
psql -h 127.0.0.1 -p 5433 -U nihongo -d nihongo
```

---

## 9. Khi cây không chịu nối

| Thấy gì | Làm gì |
|---------|--------|
| Server có dấu x đỏ, timeout | `docker ps` — container `edu-postgres-nihongo` phải đang chạy. `docker compose up -d postgres-nihongo` trong thư mục repo |
| `password authentication failed` | Mật khẩu đúng là `POSTGRES_PASSWORD` (mặc định `nihongo`). Sửa ở Properties của server → tab Connection |
| `database "nihongo" does not exist` | Ô Maintenance database đang sai, hoặc đang nối nhầm cổng 5435 (Keycloak) |
| `relation "vocabulary" does not exist` | Thiếu ngoặc kép: `"Vocabulary"` |
| Bảng trống trơn | Đang mở database `postgres` thay vì `nihongo`, hoặc seed chưa chạy |
| Đổi mật khẩu master rồi quên | Không xoá được data Postgres. Chỉ mất danh sách server đã lưu trong pgAdmin. Đăng ký lại server theo bảng ở mục 1 |

---

## 10. Bài tập

Làm trên server **edu-app nihongo**, database `nihongo`:

1. Mở lưới `Vocabulary`, lọc `kana` chứa `ここ`. Ghi lại `meaning` và `lessonId` của dòng đó.
2. Mở bảng `Lesson`, tìm dòng có `lessonNumber = 3`. So `id` của dòng này với `lessonId` ở bài 1.
3. Query Tool: chạy câu JOIN mục 5. Đối chiếu 5 dòng đầu với lưới View/Edit Data.
4. Tab Indexes của `Vocabulary`: chỉ ra index nào phục vụ `WHERE "lessonId" = … ORDER BY "sortOrder"`.
5. Explain Analyze câu ở mục 6. Chụp hoặc chép dòng plan có tên index.
6. `BEGIN` → `UPDATE` một dòng nghĩa (ví dụ thêm dấu cách) → `SELECT` thấy đổi → `ROLLBACK` → `SELECT` lại thấy nghĩa cũ.
