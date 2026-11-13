# Làm một tính năng backend từ đầu đến cuối: bảng, migration, API, đăng nhập, test

> **Mục tiêu:** Học xong bài này bạn tự làm được một tính năng backend hoàn chỉnh — cho project này hay bất kỳ project NestJS + Prisma nào:
> - Thiết kế bảng bằng Prisma, sinh và đọc migration, áp dụng an toàn lên DB đang có dữ liệu.
> - Viết module NestJS: DTO kiểm dữ liệu, service, controller, đăng ký vào app.
> - Lấy người đang đăng nhập từ token; mỗi người chỉ đọc/sửa/xóa dữ liệu của mình.
> - Trả lỗi 400/401/404/409 đúng nghĩa; phân trang có tổng số.
> - Viết test unit (giả DB) và test trên Postgres thật, cố tình làm hỏng để thấy test bắt lỗi.
> - Build lại container và gọi thử API qua nginx.
>
> **Cần biết trước:** [learn-js-ts.md](./learn-js-ts.md), [learn-web-http.md](./learn-web-http.md), [learn-sql.md](./learn-sql.md) mục đầu, [run-local.md](./run-local.md) (stack đang chạy). Đọc lướt [learn-nestjs.md](./learn-nestjs.md) mục 1–5 để biết gateway khởi động và chặn request thế nào.
>
> **Thời gian:** khoảng 10–14 giờ, chia 5 buổi.

Tính năng làm mẫu: **"Sổ từ của tôi"** — người học tự thêm từ vựng riêng (ngoài giáo trình), lọc theo bài, xóa, ôn tập. Code thật trong repo:

| Phần | File |
|---|---|
| Bảng | `model PersonalWord` trong [packages/prisma-nihongo/schema.prisma](../packages/prisma-nihongo/schema.prisma) |
| Migration | [migrations/20261113100000_personal_word](../packages/prisma-nihongo/migrations/20261113100000_personal_word/migration.sql) |
| Module gateway | [services/api-gateway/src/personal-words](../services/api-gateway/src/personal-words) |
| Web, app Expo, app Android dùng API này | [learn-react-build-app.md](./learn-react-build-app.md), [learn-react-native-build-app.md](./learn-react-native-build-app.md), [learn-android-build-app.md](./learn-android-build-app.md) |

Đã chạy thật 13/11/2026: 6 test unit + 5 test Postgres thật qua, toàn bộ 344 test của `services` vẫn xanh, gọi API qua nginx cổng 8080 ra đúng mọi mã lỗi ở mục 8.

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| Module | Khối của app Nest gom controller + service của một mảng (`PersonalWordsModule`). |
| Controller | Nhận request, đọc tham số, gọi service. Không chứa logic nghiệp vụ. |
| Service | Logic nghiệp vụ và truy vấn DB. Không biết HTTP. |
| DTO | Lớp mô tả dữ liệu vào, kèm luật kiểm (class-validator). |
| ORM / Prisma | Đọc/ghi DB bằng hàm TypeScript; Prisma sinh client có kiểu từ `schema.prisma`. |
| Migration | File SQL mô tả một lần đổi cấu trúc DB, chạy theo thứ tự, commit vào git. |
| Guard | Lớp quyết định request có được đi tiếp không (đã đăng nhập chưa). |
| IDOR | Lỗ hổng: đổi id trên URL là đọc/sửa được dữ liệu người khác. |
| Phong bì (envelope) | Gateway bọc mọi response: `{ success: true, data, timestamp }` hoặc `{ success: false, error: { code, message } }`. |
| Bảng thuộc service nào | Mỗi bảng chỉ một service được ghi ([ADR-0010](./adr/0010-shared-database-ownership.md)). |

## 1. Trước khi viết code: quyết định ba điều

**Dữ liệu là gì, ai sở hữu?** Mỗi từ thuộc đúng một người dùng; người khác không được thấy. → bảng có `userId`, mọi truy vấn lọc theo `userId`.

**Luật nghiệp vụ nào phải đúng tuyệt đối?** "Một người không có hai từ trùng cách đọc." Luật kiểu này đặt **trong DB** (ràng buộc UNIQUE), vì hai request tới cùng lúc đều kiểm "chưa có" rồi cùng ghi — code không chặn được.

**Service nào được ghi bảng này?** Project dùng chung một DB cho nhiều service, nhưng mỗi bảng chỉ một service được ghi ([ADR-0010](./adr/0010-shared-database-ownership.md)). Danh sách nằm trong [table-ownership.ts](../packages/nest-prisma/src/table-ownership.ts): bảng không có trong danh sách của content-service/exam-service thì thuộc **api-gateway**. Tính năng này gắn với người dùng đăng nhập, không phải nội dung giáo trình hay bài thi → để ở gateway, không phải sửa danh sách. Test `table-ownership.spec.ts` sẽ báo đỏ nếu service khác lỡ ghi vào bảng này.

## 2. Bảng: `schema.prisma`

```prisma
model User {
  // … các trường có sẵn …
  personalWords           PersonalWord[]
}

/// Sổ từ vựng cá nhân: từ người học tự thêm (ngoài từ vựng của giáo trình).
model PersonalWord {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  kana      String
  meaning   String
  lesson    Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, kana])
  @@index([userId, lesson])
}
```

- `onDelete: Cascade`: xóa người dùng thì xóa luôn sổ của họ — không để lại dữ liệu mồ côi.
- `@@unique([userId, kana])`: luật "không trùng" nằm trong DB. Người khác thì được trùng với bạn.
- `@@index([userId, lesson])`: truy vấn chính là "từ của tôi, lọc theo bài" → index theo đúng thứ tự cột đó ([learn-postgres.md](./learn-postgres.md)).
- Thêm dòng `personalWords PersonalWord[]` vào `User`: Prisma bắt khai báo cả hai đầu quan hệ.

> **Bẫy gặp thật:** chạy `npx prisma format` sau khi thêm model thì Prisma căn lề lại **cả file** — diff thành 75 dòng thay vì 19, người review không thấy bạn đổi gì. Trong project có sẵn, chỉ thêm đúng phần của mình; `prisma validate` để kiểm cú pháp mà không sửa file.

## 3. Migration: sinh SQL, đọc, rồi mới áp dụng

**Sao lưu trước** — quy tắc của project trước mọi thay đổi DB:

```bash
npm run -s db:backup
```

```
Dump nihongo -> infra/backups/nihongo_20261113_143408.sql
```

**Sinh SQL** bằng cách so schema cũ với schema mới (giữ một bản schema trước khi sửa):

```bash
cd packages/prisma-nihongo
cp schema.prisma /tmp/schema.before.prisma        # làm TRƯỚC khi sửa schema
# … sửa schema.prisma …
npx prisma migrate diff --from-schema-datamodel /tmp/schema.before.prisma \
  --to-schema-datamodel schema.prisma --script
```

Kết quả (đã lưu thành [migration.sql](../packages/prisma-nihongo/migrations/20261113100000_personal_word/migration.sql)):

```sql
CREATE TABLE "PersonalWord" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "kana" TEXT NOT NULL,
    …
    CONSTRAINT "PersonalWord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PersonalWord_userId_lesson_idx" ON "PersonalWord"("userId", "lesson");
CREATE UNIQUE INDEX "PersonalWord_userId_kana_key" ON "PersonalWord"("userId", "kana");
ALTER TABLE "PersonalWord" ADD CONSTRAINT "PersonalWord_userId_fkey" FOREIGN KEY ("userId")
  REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Đọc SQL trước khi áp dụng.** Ở đây chỉ có `CREATE` — an toàn. Thấy `DROP COLUMN`, `DROP TABLE`, hay "đổi tên" thành xóa-rồi-thêm là phải dừng lại: đó là mất dữ liệu.

Vì sao không dùng `prisma migrate dev`? Trên DB đã có dữ liệu, `migrate dev` thấy lịch sử lệch (ai đó sửa tay, migration cũ được gộp…) sẽ **đề nghị xóa sạch DB**. Lệnh đó chỉ dùng cho DB của riêng bạn, trống. Với DB chung: sinh SQL bằng `migrate diff`, đặt vào thư mục `migrations/<thời gian>_<tên>/migration.sql`, áp dụng bằng `migrate deploy` — lệnh này chỉ chạy migration chưa chạy, không bao giờ xóa dữ liệu.

**Áp dụng:**

```bash
# DATABASE_URL nằm trong services/.env — nạp vào môi trường của lệnh, không in ra màn hình
(set -a; . services/.env; set +a; npm run migrate:deploy -w @edu/prisma-nihongo)
npm run prisma:generate
```

```
The following migration(s) have been applied:
  └─ 20261113100000_personal_word/
All migrations have been successfully applied.
✔ Generated Prisma Client (v6.19.3)
```

Kiểm bảng thật: `docker exec edu-postgres-nihongo psql -U nihongo -d nihongo -c '\d "PersonalWord"'` — thấy đủ cột, hai index và khóa ngoại.

## 4. DTO: kiểm dữ liệu vào

Gateway bật `ValidationPipe` toàn cục với `whitelist` + `forbidNonWhitelisted` ([learn-nestjs.md](./learn-nestjs.md) mục 7): trường không khai báo trong DTO bị **từ chối** (400), không lọt vào service.

[dto/personal-word.dto.ts](../services/api-gateway/src/personal-words/dto/personal-word.dto.ts):

```ts
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CreatePersonalWordDto {
  @ApiProperty({ example: "たべます" })
  @Transform(trim)
  @IsString({ message: "Nhập cách đọc" })
  @IsNotEmpty({ message: "Nhập cách đọc" })
  @Matches(/^[぀-ヿ]+$/, { message: "Chỉ dùng hiragana hoặc katakana" })
  kana: string;

  @ApiProperty({ example: "ăn" })
  @Transform(trim)
  @IsString({ message: "Nhập nghĩa" })
  @IsNotEmpty({ message: "Nhập nghĩa" })
  @MaxLength(100, { message: "Nghĩa tối đa 100 ký tự" })
  meaning: string;

  @ApiProperty({ example: 6, minimum: 1, maximum: 50 })
  @Type(() => Number) // "6" từ form → 6
  @IsInt({ message: "Bài phải là số nguyên" })
  @Min(1, { message: "Bài từ 1 tới 50" })
  @Max(50, { message: "Bài từ 1 tới 50" })
  lesson: number;
}

export class UpdatePersonalWordDto extends PartialType(CreatePersonalWordDto) {}

export class ListPersonalWordsDto extends PaginationDto {   // page, limit (tối đa 200) dùng chung
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  lesson?: number;
}
```

- `@Type(() => Number)`: query string và form luôn là chuỗi; đổi sang số trước khi kiểm.
- `@Transform(trim)`: `"  ăn "` thành `"ăn"` trước khi kiểm rỗng.
- Mọi luật đều có `message` tiếng Việt. Thiếu `message` thì người dùng thấy `meaning must be a string` — đã gặp khi gọi thử lần đầu.
- `PartialType` (của `@nestjs/swagger`) tạo DTO sửa: mọi trường không bắt buộc nhưng giữ nguyên luật.
- `PaginationDto` có sẵn trong `@app/contracts` — dùng lại thay vì tự viết `page`/`limit`.

## 5. Service: logic và chống đọc trộm

[personal-words.service.ts](../services/api-gateway/src/personal-words/personal-words.service.ts):

```ts
const publicFields = { id: true, kana: true, meaning: true, lesson: true } as const;

@Injectable()
export class PersonalWordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number, q: ListPersonalWordsDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const where = { userId, ...(q.lesson ? { lesson: q.lesson } : {}) };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.personalWord.findMany({ where, select: publicFields, orderBy: { id: "asc" },
        skip: (page - 1) * limit, take: limit }),
      this.prisma.personalWord.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async get(userId: number, id: number) {
    const word = await this.prisma.personalWord.findFirst({ where: { id, userId }, select: publicFields });
    if (!word) throw new NotFoundException("Không tìm thấy từ");
    return word;
  }

  async remove(userId: number, id: number) {
    const { count } = await this.prisma.personalWord.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException("Không tìm thấy từ");
    return { ok: true as const };
  }

  private mapUniqueError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return new ConflictException("Từ này đã có trong sổ");
    }
    return e;
  }
}
```

Bốn quy tắc dùng cho **mọi** API có dữ liệu riêng của từng người:

1. **Lọc theo chủ sở hữu ở mọi truy vấn** — `where: { id, userId }`, với `userId` lấy từ **token**. Thiếu là lỗi IDOR, lỗi API phổ biến nhất ([learn-security-backend.md](./learn-security-backend.md) mục 2).
2. **Không phải của mình → 404**, không phải 403 (403 tiết lộ "bản ghi số 5 có tồn tại").
3. **Chỉ trả cột cần** (`select`) — không lộ `userId`, thời gian, hay cột nhạy cảm thêm sau này.
4. **Để DB giữ luật, dịch lỗi DB thành lỗi HTTP**: vi phạm UNIQUE là mã Prisma `P2002` → 409. Lỗi khác ném nguyên để thành 500 và vào log/Sentry — không giấu mọi lỗi thành 409.

Thêm: `deleteMany({ where: { id, userId } })` là **một câu SQL** — không có khe giữa "kiểm của ai" và "xóa". `update` kiểm `Object.keys(dto).length === 0` → 400 "Cần ít nhất một trường để sửa". Danh sách trả `{ data, total, page, limit }` — đúng dạng các API danh sách khác của gateway (`/api/vocabularies`), client dùng chung cách đọc.

## 6. Controller và đăng ký module

[personal-words.controller.ts](../services/api-gateway/src/personal-words/personal-words.controller.ts):

```ts
@ApiTags("personal-words")
@ApiBearerAuth()
@Controller("api/personal-words")
export class PersonalWordsController {
  constructor(private readonly words: PersonalWordsService) {}

  @Get()
  list(@CurrentUser() user: AuthUserPayload, @Query() query: ListPersonalWordsDto) {
    return this.words.list(user.id, query);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUserPayload, @Param("id", ParseIntPipe) id: number) {
    return this.words.get(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreatePersonalWordDto) {
    return this.words.create(user.id, dto);
  }
  // Patch(":id"), Delete(":id") tương tự
}
```

- **Không có `@UseGuards` nào**: gateway đăng ký `JwtAuthGuard` toàn cục, mọi route đều cần đăng nhập trừ khi ghi `@Public()`. Mặc định đóng — quên gắn guard thì route bị khóa, không bị mở.
- `@CurrentUser()` (từ `@app/common`) lấy người đăng nhập mà guard đã gắn vào request.
- `ParseIntPipe`: `/api/personal-words/abc` → 400 trước khi tới service.
- Không tự bọc `{ success, data }`: `ResponseInterceptor` toàn cục làm việc đó; lỗi do `AllExceptionsFilter` định dạng.

[personal-words.module.ts](../services/api-gateway/src/personal-words/personal-words.module.ts) khai báo controller + service, import `PrismaModule`. Rồi thêm `PersonalWordsModule` vào `imports` của [app.module.ts](../services/api-gateway/src/app.module.ts) — quên bước này thì mọi route của module trả 404 `Cannot GET /api/personal-words`.

## 7. Test

### 7.1. Unit test: giả Prisma, kiểm logic

[personal-words.service.spec.ts](../services/api-gateway/src/personal-words/personal-words.service.spec.ts):

```ts
const prisma = {
  personalWord: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
};

beforeEach(async () => {
  jest.resetAllMocks();
  const moduleRef = await Test.createTestingModule({
    providers: [PersonalWordsService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  service = moduleRef.get(PersonalWordsService);
});

it("get: luôn lọc theo cả id và userId (chống đọc trộm)", async () => {
  prisma.personalWord.findFirst.mockResolvedValue({ id: 5, kana: "わたし", meaning: "tôi", lesson: 1 });
  await service.get(7, 5);
  expect(prisma.personalWord.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: 5, userId: 7 } }),
  );
});
```

Sáu test: lọc theo chủ, 404, P2002 → 409, lỗi khác ném nguyên, body sửa rỗng → 400 không gọi DB, xóa không trúng → 404.

```bash
cd services && npx jest api-gateway/src/personal-words
```

```
Tests:       6 passed, 6 total
```

### 7.2. Test trên Postgres thật

Có những điều chỉ DB thật kiểm được: ràng buộc UNIQUE, cascade, hai request đồng thời. Project có sẵn bộ test DB (`*.db-spec.ts`, cấu hình [test/jest-db.json](../services/test/jest-db.json)) chạy trên một **DB riêng** (`nihongo_fix_test`) để `TRUNCATE` không chạm dữ liệu thật.

[personal-words.db-spec.ts](../services/api-gateway/src/personal-words/personal-words.db-spec.ts):

```ts
it("hai request thêm CÙNG LÚC cùng một từ → đúng một cái thành công (DB chặn, không phải code)", async () => {
  const an = await createUser(prisma);
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () => service.create(an.id, { kana: "ねこ", meaning: "mèo", lesson: 2 })),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await prisma.personalWord.count({ where: { userId: an.id } })).toBe(1);
});
```

Các test khác: lọc + phân trang + không lộ `userId`; trùng trong sổ mình → 409 nhưng người khác được; IDOR (B không đọc/sửa/xóa được từ của A, từ của A còn nguyên); xóa người dùng → sổ bị xóa theo.

```bash
docker exec edu-postgres-nihongo psql -U nihongo -d postgres -c "CREATE DATABASE nihongo_fix_test"   # lần đầu
# TEST_DATABASE_URL = DATABASE_URL của bạn, đổi tên DB thành nihongo_fix_test
DATABASE_URL="$TEST_DATABASE_URL" npm run migrate:deploy -w @edu/prisma-nihongo
cd services && TEST_DATABASE_URL="…/nihongo_fix_test" npm run test:db -- api-gateway/src/personal-words
```

```
Tests:       5 passed, 5 total
```

### 7.3. Làm hỏng có chủ đích

Trong `get()`, đổi `where: { id, userId }` thành `where: { id }`. Chạy lại cả hai bộ:

```
● PersonalWordsService › get: luôn lọc theo cả id và userId (chống đọc trộm)
    Expected: ObjectContaining {"where": {"id": 5, "userId": 7}}
    Received: {"select": {…}, "where": {"id": 5}}
Tests:       1 failed, 5 passed, 6 total

● Sổ từ vựng cá nhân (Postgres thật) › người khác không đọc, không sửa, không xóa được (IDOR)
    Received promise resolved instead of rejected
Tests:       1 failed, 4 passed, 5 total
```

Test DB nói đúng hậu quả: lời gọi của người B **thành công** thay vì bị từ chối — B đọc được từ của A. Sửa lại như cũ (file đã commit thì `git checkout -- services/api-gateway/src/personal-words/personal-words.service.ts`; chưa commit thì `git checkout` không cứu được — sao chép file ra chỗ khác trước khi thử làm hỏng).

### 7.4. Không làm hỏng chỗ khác

```bash
cd services && npx jest
```

```
Test Suites: 58 passed, 58 total
Tests:       344 passed, 344 total
```

Bộ này gồm cả `table-ownership.spec.ts` (ADR-0010) — xác nhận không service nào ghi trái phép vào bảng mới.

## 8. Chạy thật và gọi qua nginx

```bash
docker compose build api-gateway && docker compose up -d api-gateway
curl -s localhost:8080/health      # gateway: /health, KHÔNG phải /api/health
```

Lấy token để gọi thử: `POST /api/auth/login` trả `{ success, data: { access_token, user } }` — trường là `access_token` (gạch dưới). Kết quả thật:

| Gọi | Kết quả |
|---|---|
| `GET /api/personal-words` không token | `401 {"success":false,"error":{"code":"UNAUTHORIZED",…}}` |
| `POST` `{"kana":"たべます","meaning":"ăn","lesson":"6"}` | `{"success":true,"data":{"id":1,"kana":"たべます","meaning":"ăn","lesson":6}}` |
| `POST` cùng `kana` lần 2 | `409 CONFLICT "Từ này đã có trong sổ"` |
| `POST` `{"kana":"abc","lesson":99}` | `400 BAD_REQUEST "Chỉ dùng hiragana hoặc katakana, …, Nhập nghĩa, …, Bài từ 1 tới 50"` |
| `POST` có thêm `"userId":5` | `400 "property userId should not exist"` (whitelist chặn mass assignment) |
| `GET ?lesson=6` | `{"data":{"data":[…],"total":1,"page":1,"limit":50}}` |
| `GET ?limit=500` | `400 "limit must not be greater than 200"` |
| `PATCH /1` body `{}` | `400 "Cần ít nhất một trường để sửa"` |
| `GET /abc` | `400 "Validation failed (numeric string is expected)"` |
| Người B `GET /1` hoặc `DELETE /1` | `404 NOT_FOUND "Không tìm thấy từ"` |

> **Ba bẫy gặp thật khi gọi thử:**
> - `POST /api/auth/register` kèm trường `name` → `400 "property name should not exist"`: whitelist áp dụng cho mọi route, kể cả đăng ký.
> - Đăng ký vài lần liền → `"Too many requests"`, đợi một phút **vẫn** bị chặn: route đăng ký có `@RateLimit(3, 3600)` — **3 lần mỗi giờ** mỗi IP (lưu trong Redis), ngoài giới hạn 5 lần/phút. Muốn có tài khoản thử, tạo thẳng trong DB với mật khẩu băm bcrypt rồi đăng nhập (route đăng nhập cho 10 lần/phút). Xóa tài khoản thử khi xong — sổ từ của nó tự xóa theo nhờ cascade.
> - Script dùng `sed` lấy token: khi đăng ký lỗi, `sed` không khớp và "token" thành nguyên câu báo lỗi — mọi lệnh sau đều 401. Đọc JSON bằng `python3 -c 'import json…'` hoặc `jq` và kiểm `success`.

Trang Swagger `http://localhost:3000/api/docs` có nhóm `personal-words` để bấm thử.

## 9. Danh sách kiểm cho tính năng backend tiếp theo

1. Trả lời ba câu ở mục 1: dữ liệu của ai, luật nào để DB giữ, bảng thuộc service nào.
2. Thêm model + quan hệ hai đầu; **không** `prisma format` cả file của project có sẵn.
3. `db:backup` → `migrate diff` → đọc SQL → `migrate deploy` → `prisma:generate`.
4. DTO: mọi luật có `message`; `@Type` cho số từ query/form; dùng lại `PaginationDto`.
5. Service: `where` có `userId` ở **mọi** câu; `select` cột công khai; `P2002` → 409; không phải của mình → 404.
6. Controller mỏng, lấy người dùng bằng `@CurrentUser()`; thêm module vào `app.module.ts`.
7. Test unit cho từng nhánh lỗi; `db-spec` cho UNIQUE, cascade, IDOR, đồng thời; làm hỏng thử.
8. `npx jest` toàn bộ `services` (gồm test ADR-0010).
9. Build container, gọi thử qua nginx từng dòng bảng ở mục 8.
10. Client (web, mobile) đọc đúng phong bì `{ success, data }` và `error.message`.

## 10. Khi bạn tự tạo project NestJS mới

Bài này làm trong project có sẵn (NestJS 11, Prisma 6). Khi bắt đầu project của riêng bạn bằng phiên bản mới nhất, mình đã thử dựng một project trống ngày 13/11/2026 và gặp những khác biệt sau — biết trước đỡ mất buổi:

| Bạn sẽ gặp | Vì sao / làm gì |
|---|---|
| `npm error Cannot read properties of null (reading 'edgesOut')` khi cài | Lỗi của npm 10 (đi kèm Node 22) khi dò peer dependency quanh Vitest. Dùng `npx npm@11 install` hoặc nâng npm. |
| NestJS 12: `Cannot find module './app.module'` | Nest 12 chỉ còn ESM: import tương đối phải có đuôi `.js`. |
| NestJS 12: `jest is not defined` | Template mới dùng Vitest (`vi.fn()`). |
| NestJS 12 kiểm dữ liệu bằng zod có sẵn | `app.useGlobalPipes(new StandardSchemaValidationPipe())` + `@Body({ schema })`. class-validator vẫn dùng được. |
| `npx prisma` chạy bản `8.0.0-rc` | Tag `latest` trên npm đang trỏ bản thử nghiệm; cài `prisma@7` vào project rồi mới gọi. |
| Prisma 7 không tự `generate` sau `migrate dev` | Chạy `npx prisma generate` sau mỗi lần đổi schema. |
| Prisma 7 cần driver adapter | `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`; URL DB đặt trong `prisma.config.ts`. |
| `prisma init` / template Nest tạo `AGENTS.md`, `.claude/`, `.agents/`… | Gợi ý cho trợ lý AI và quảng cáo dịch vụ đo đạc; xóa nếu không dùng. |
| Image Docker production vẫn chứa Prisma CLI + TypeScript (hơn 700 MB) | `@prisma/client` khai báo chúng là peer **tùy chọn** (lockfile ghi `devOptional`); `npm prune --omit=dev` không gỡ. Cài riêng cho runtime bằng `npm ci --omit=dev --omit=optional` → image còn khoảng 420 MB. |
| Semgrep CI: `dockerfile.security.missing-user` | Stage nào có `CMD` cũng cần `USER node`, kể cả stage chạy migration. |
| `docker compose logs` báo thiếu biến | `${VAR:?}` được kiểm ở **mọi** lệnh compose; đặt biến trong `.env` cạnh `compose.yaml`. |

Dockerfile nhiều stage và compose có service migrate: [learn-docker.md](./learn-docker.md) mục 4–7 (Dockerfile thật của gateway).

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `migrate deploy`: `Environment variable not found: DATABASE_URL` | Chạy ở workspace không có `.env` | `(set -a; . services/.env; set +a; npm run migrate:deploy -w @edu/prisma-nihongo)` |
| `services/.env: command not found: …` khi nạp `.env` | Có giá trị chứa khoảng trắng không bọc ngoặc kép | Vô hại cho `DATABASE_URL`; bọc ngoặc kép giá trị đó nếu muốn hết cảnh báo |
| `migrate dev` đề nghị reset DB | Lịch sử migration lệch với DB | Không đồng ý. Dùng `migrate diff` + `migrate deploy` |
| `Cannot GET /api/personal-words` (404) | Quên thêm module vào `app.module.ts`, hoặc container chưa build lại | Thêm vào `imports`; `docker compose build api-gateway` |
| `property X should not exist` | Gửi trường không có trong DTO | Bỏ trường đó (đúng như thiết kế) |
| Thông báo lỗi tiếng Anh `meaning must be a string` | Decorator thiếu `message` | Thêm `{ message: "…" }` cho mọi decorator |
| Trùng trả 500 thay vì 409 | Không bắt `P2002` | `mapUniqueError` |
| `Too many requests` khi đăng ký tài khoản thử | `@RateLimit(3, 3600)` | Tạo user trong DB, dùng `login` |
| Test DB: `Đặt TEST_DATABASE_URL…` | Chưa có DB test | Tạo `nihongo_fix_test`, `migrate deploy` vào đó |
| CI đỏ ở `table-ownership.spec.ts` | Service khác ghi vào bảng không thuộc mình | Gọi service chủ qua gRPC, hoặc chuyển chủ bảng (sửa ADR) |

## Tự kiểm tra

1. Vì sao `userId` phải lấy từ token chứ không từ body?
<details><summary>Đáp án</summary>Body do client gửi, ai cũng sửa được. Token do server ký. Lấy từ body là ai cũng ghi dữ liệu dưới tên người khác — và whitelist cũng chặn luôn trường `userId` lạ.</details>

2. Đã có `findFirst` kiểm "đã có chưa" trong code, sao vẫn cần `@@unique`?
<details><summary>Đáp án</summary>Hai request đồng thời đều kiểm thấy "chưa có" rồi cùng ghi. Test db-spec chứng minh: 5 request cùng lúc chỉ 1 thành công nhờ UNIQUE.</details>

3. `migrate dev` và `migrate deploy` khác nhau thế nào?
<details><summary>Đáp án</summary>`migrate dev` sinh migration và có thể đề nghị xóa DB khi lịch sử lệch — chỉ cho DB riêng, trống. `migrate deploy` chỉ chạy migration chưa chạy, không xóa dữ liệu — cho DB chung, CI, production.</details>

4. Người B gọi `GET /api/personal-words/1` của A. 403 hay 404?
<details><summary>Đáp án</summary>404 — không tiết lộ bản ghi tồn tại.</details>

5. Vì sao controller không có `@UseGuards(JwtAuthGuard)` mà vẫn cần đăng nhập?
<details><summary>Đáp án</summary>Guard được đăng ký toàn cục (`APP_GUARD`); route công khai phải ghi `@Public()`. Mặc định đóng.</details>

6. Vì sao test DB chạy trên `nihongo_fix_test` chứ không phải `nihongo`?
<details><summary>Đáp án</summary>Test xóa sạch bảng trước mỗi test. Chạy trên DB thật là mất dữ liệu. Project từng có sự cố script ghi nhầm DB chính ([learn-incident-postmortem.md](./learn-incident-postmortem.md) mục 5).</details>

## Bài tập

1. **Tìm kiếm:** thêm `?q=` lọc theo `kana` hoặc `meaning` chứa chuỗi (`contains`, `mode: "insensitive"`). Tự kiểm: db-spec tìm `ăn` ra `たべます`.
2. **Gắn với từ giáo trình:** thêm cột tùy chọn `vocabularyId` (khóa ngoại tới `Vocabulary`, `onDelete: SetNull`) để lưu một từ có sẵn vào sổ. Đọc SQL migration sinh ra, giải thích vì sao an toàn với dữ liệu cũ.
3. **Nhập hàng loạt:** `POST /api/personal-words/import` nhận 1–100 từ, ghi bằng `prisma.$transaction` — một từ trùng thì không ghi từ nào. Tự kiểm: db-spec gửi 3 từ có 1 trùng → 409, `count()` không đổi.
4. **Giới hạn số từ:** mỗi người tối đa 2.000 từ; vượt → 403 với thông báo rõ. Viết test cho biên 1.999/2.000/2.001.
5. **Tính năng của bạn:** "Ghi chú cho mỗi bài học" (một ghi chú/người/bài). Đi đủ 10 bước ở mục 9.

## Luyện phỏng vấn

Câu hỏi NestJS, Postgres, Prisma: [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md). Bảo mật API (IDOR, mass assignment, rate limit): [interview-backend-security.md](./interview-backend-security.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **3. Backend (NestJS)** — bài 1/9.

- **Bài tiếp: [learn-nestjs.md](./learn-nestjs.md)** — NestJS: thứ tự pipeline, guard, interceptor, DI, rate limit, pipe

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
