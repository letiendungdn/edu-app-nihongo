# JavaScript và TypeScript đủ dùng để đọc code project

> **Mục tiêu:** Học xong bài này bạn:
> - đọc hiểu được một hàm TypeScript trong repo (biến, hàm, mảng, object, class);
> - viết và chạy được file `.ts` nhỏ bằng Node;
> - hiểu `async`/`await`: vì sao code gọi API "không chạy theo thứ tự đọc";
> - đọc được kiểu dữ liệu: `string | null`, `interface`, `T[]`, `?`;
> - biết TypeScript bắt lỗi ở đâu, và ở đâu thì nó **không** bắt.
>
> **Cần biết trước:** [learn-terminal.md](./learn-terminal.md), [setup-tools.md](./setup-tools.md) (đã có Node 22)
> **Thời gian:** 6–10 giờ, chia làm nhiều buổi. Gõ lại từng ví dụ, đừng chỉ đọc.

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| JavaScript (JS) | Ngôn ngữ chạy trong trình duyệt và trong Node.js |
| TypeScript (TS) | JavaScript cộng thêm **kiểu dữ liệu**. Trước khi chạy, kiểu bị bỏ đi và còn lại JS |
| Biến | Cái tên gắn với một giá trị: `const tenBai = "Bài 1"` |
| Hàm | Đoạn code có tên, nhận đầu vào và trả kết quả |
| Object | Nhóm các cặp tên → giá trị: `{ id: 1, title: "Bài 1" }` |
| Mảng (array) | Danh sách có thứ tự: `["N5", "N4"]` |
| Promise | Một giá trị **sẽ có sau** (kết quả gọi API, đọc file…) |
| `async` / `await` | Cách viết code chờ Promise trông như code chạy tuần tự |
| Kiểu (type) | Mô tả một giá trị trông thế nào: `string`, `number`, `Lesson` |
| `undefined` / `null` | "Không có giá trị". `undefined`: chưa gán; `null`: cố ý để trống |

---

## 0. Chuẩn bị chỗ thực hành

Tạo một thư mục riêng, **bên ngoài** repo, để thử code:

```bash
mkdir ~/hoc-ts       # Windows: mkdir $HOME\hoc-ts
cd ~/hoc-ts
code .
```

Tạo file `bai1.ts`, gõ một dòng:

```ts
console.log("Xin chào");
```

Chạy:

```bash
node bai1.ts
```

Kết quả: `Xin chào`. Từ Node 22.18, Node tự **bỏ phần kiểu** trong file `.ts` rồi chạy như JavaScript. Mọi ví dụ trong bài đều chạy được bằng `node <file>.ts`, và output in dưới mỗi ví dụ là output thật.

`console.log(...)` in ra màn hình. Đây là công cụ gỡ lỗi đầu tiên và dùng nhiều nhất.

---

## 1. Giá trị, biến, phép tính

```ts
const tenBai = "Bài 1";      // const: không gán lại được
let soTu = 50;               // let: gán lại được
soTu = soTu + 5;
console.log(tenBai, soTu, typeof tenBai, typeof soTu);
console.log(`${tenBai} có ${soTu} từ vựng`);
```

```
Bài 1 55 string number
Bài 1 có 55 từ vựng
```

- **Luôn dùng `const`**, chỉ dùng `let` khi thật sự cần gán lại. Code trong repo theo đúng quy tắc này. Thấy `let` là biết giá trị sẽ đổi.
- Chuỗi trong dấu **backtick** `` ` `` ghép được giá trị vào bằng `${...}` (template string).
- `typeof` cho biết loại của giá trị.

JavaScript có vài chỗ "kỳ lạ" cần biết:

```ts
console.log(0.1 + 0.2, "5" + 1, "5" * 2, 10 / 3);
```

```
0.30000000000000004 51 10 3.3333333333333335
```

- Số thực không chính xác tuyệt đối: `0.1 + 0.2` không bằng đúng `0.3`. Vì vậy **tiền không bao giờ được tính bằng số thực**. Stripe và DB của project lưu tiền bằng số nguyên theo đơn vị nhỏ nhất. Ví dụ cột `priceUsdCents`, `amountCents` trong [schema.prisma](../packages/prisma-nihongo/schema.prisma) lưu số cent kiểu `Int`.
- `"5" + 1` ra `"51"`: dấu `+` với chuỗi là **nối chuỗi**. `"5" * 2` ra `10` vì `*` ép chuỗi thành số. TypeScript chặn được kiểu lỗi này (mục 7).

---

## 2. Điều kiện và "không có giá trị"

```ts
const diem = 72;
if (diem >= 80) {
  console.log("Giỏi");
} else if (diem >= 60) {
  console.log("Đạt");
} else {
  console.log("Chưa đạt");
}
// → Đạt
```

So sánh bằng **`===`** (ba dấu bằng), không dùng `==`. `==` tự ép kiểu nên `"0" == 0` là `true`. Code trong repo luôn dùng `===` và `!==`.

Hai toán tử bạn sẽ gặp ở khắp repo:

```ts
console.log(null ?? "mặc định", 0 ?? 5, 0 || 5, "" || "rỗng");
```

```
mặc định 0 5 rỗng
```

- `a ?? b`: dùng `b` **chỉ khi `a` là `null` hoặc `undefined`**.
- `a || b`: dùng `b` khi `a` là bất cứ giá trị "rỗng" nào (`0`, `""`, `false`, `null`…).

Khác biệt quan trọng: cấu hình `PORT=0` hay `limit: 0` là giá trị hợp lệ. Dùng `||` thì chúng bị thay mất. Code trong repo dùng `??` cho giá trị mặc định, ví dụ trong [configuration.ts](../packages/nest-common/src/config/configuration.ts):

```ts
port: parseInt(process.env.PORT ?? '3000', 10),
```

---

## 3. Hàm

Ba cách viết, cùng một ý:

```ts
function normalizeAnswer(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '');
}

const normalizeAnswer2 = function (text: string): string { … };

const normalizeAnswer3 = (text: string): string => text.trim().toLowerCase().replace(/\s+/g, '');
```

Hàm đầu tiên có thật trong repo: [packages/nest-common/src/utils/string.ts](../packages/nest-common/src/utils/string.ts). Nó chuẩn hóa câu trả lời của học viên trước khi so với đáp án:

```ts
console.log(normalizeAnswer("  Konnichi Wa  "));   // → konnichiwa
```

Đọc từng phần:

- `text: string`: tham số tên `text`, kiểu chuỗi.
- `): string`: hàm trả về chuỗi.
- `.trim()`: bỏ khoảng trắng hai đầu. `.toLowerCase()`: chữ thường. `.replace(/\s+/g, '')`: xóa mọi khoảng trắng bên trong. `/\s+/g` là **biểu thức chính quy** (regex): "một hoặc nhiều khoảng trắng, mọi chỗ".
- Gọi nối các phương thức (`.a().b().c()`) vì mỗi bước trả về một chuỗi mới.

Hàm mũi tên `(x) => ...` dùng nhiều nhất khi truyền hàm vào hàm khác (mục 4).

---

## 4. Mảng

```ts
const levels = ["N5", "N4", "N3", "N2", "N1"];
console.log(levels.length, levels[0], levels.at(-1));   // → 5 N5 N1

const scores = [80, 45, 92, 60];
console.log(scores.filter((s) => s >= 60));               // → [ 80, 92, 60 ]
console.log(scores.map((s) => s / 100));                  // → [ 0.8, 0.45, 0.92, 0.6 ]
console.log(scores.reduce((tong, s) => tong + s, 0));     // → 277
console.log(scores.find((s) => s > 90), scores.some((s) => s < 50), scores.includes(60));
// → 92 true true

for (const lv of levels) {
  if (lv === "N3") break;
  console.log("Cấp", lv);
}
// → Cấp N5
// → Cấp N4
```

| Phương thức | Làm gì | Trả về |
|---|---|---|
| `filter(fn)` | Giữ phần tử mà `fn` trả `true` | Mảng mới |
| `map(fn)` | Biến đổi từng phần tử | Mảng mới, cùng độ dài |
| `reduce(fn, đầu)` | Gộp cả mảng thành một giá trị | Một giá trị |
| `find(fn)` | Phần tử **đầu tiên** thỏa | Phần tử, hoặc `undefined` |
| `some(fn)` / `every(fn)` | Có ít nhất một / tất cả thỏa? | `true`/`false` |
| `includes(x)` | Có chứa `x` không | `true`/`false` |

Index bắt đầu từ **0**: `levels[0]` là phần tử đầu tiên. Lấy index ngoài mảng (`levels[10]`) không báo lỗi mà ra `undefined`.

`filter` và `map` **không sửa mảng gốc**, chúng tạo mảng mới. Đây là thói quen tốt: dữ liệu không bị đổi bất ngờ ở chỗ khác.

---

## 5. Object

API trả về object. Đây là dữ liệu thật của `GET /api/lessons/1` (rút gọn):

```ts
const lesson = { id: 1, title: "Bài 1", jlptLevel: "N5", _count: { vocabularies: 50 } };

const { title, jlptLevel } = lesson;            // destructuring: lấy nhiều thuộc tính một lúc
console.log(title, jlptLevel, lesson._count.vocabularies);
// → Bài 1 N5 50

const capNhat = { ...lesson, title: "Bài 1 (mới)" };   // spread: chép object, đè thuộc tính
console.log(lesson.title, "|", capNhat.title);
// → Bài 1 | Bài 1 (mới)
```

Truy cập an toàn khi có thể thiếu dữ liệu:

```ts
const user: { name?: string | null } = {};
console.log(user.name?.toUpperCase(), user.name ?? "Khách");
// → undefined Khách
```

- `user.name.toUpperCase()` sẽ **nổ** lỗi `Cannot read properties of undefined` vì `name` không có.
- `user.name?.toUpperCase()`: nếu `name` là `null`/`undefined` thì dừng và trả `undefined`, không nổ.

Lỗi `Cannot read properties of undefined (reading 'xxx')` là lỗi JavaScript gặp nhiều nhất. Nó luôn có nghĩa: thứ đứng **trước** `.xxx` đang là `undefined`.

Ví dụ thật trong [live.service.ts](../services/api-gateway/src/http/live.service.ts) dùng cả `?.` và `??`:

```ts
return (
  process.env.LIVEKIT_PUBLIC_URL ??
  process.env.LIVEKIT_URL?.replace("http://", "ws://").replace("https://", "wss://") ??
  "ws://localhost:7880"
);
```

Đọc là: dùng `LIVEKIT_PUBLIC_URL`. Không có thì lấy `LIVEKIT_URL` và đổi `http` thành `ws`. Cũng không có nốt thì dùng `ws://localhost:7880`.

### JSON

JSON là dạng **chữ** của object, dùng để gửi qua mạng và lưu file:

```ts
console.log(JSON.stringify({ email: "a@b.c", age: 3 }));        // object → chuỗi
// → {"email":"a@b.c","age":3}
console.log(JSON.parse('{"success":true,"data":[1,2]}').data);  // chuỗi → object
// → [ 1, 2 ]
```

---

## 6. Bất đồng bộ: Promise, `async`, `await`

Gọi API, đọc database, đọc file đều **mất thời gian**. JavaScript không đứng chờ: nó chạy tiếp các dòng sau, và quay lại khi có kết quả. Đây là điều khó nhất cho người mới, và cũng quan trọng nhất.

Ví dụ thật, gọi API của project. Stack phải đang chạy: [docker.md](./docker.md), hoặc chạy được thì làm, chưa thì đọc output.

```ts
async function layBai(so: number) {
  const res = await fetch(`http://localhost:8080/api/lessons/${so}`);
  const body = await res.json();
  if (!body.success) throw new Error(`${res.status} ${body.error.message}`);
  return body.data;
}

async function main() {
  console.log("Bắt đầu gọi API…");
  const bai = await layBai(1);
  console.log("Bài:", bai.title, bai.jlptLevel);
  try {
    await layBai(999999);
  } catch (e) {
    console.log("Lỗi:", (e as Error).message);
  }
  console.log("Xong");
}

main();
console.log("Dòng này in ra TRƯỚC khi API trả lời");
```

Output thật:

```
Bắt đầu gọi API…
Dòng này in ra TRƯỚC khi API trả lời
Bài: Bài 1 N5
Lỗi: 404 Bài 999999 không tồn tại
Xong
```

Giải thích theo thứ tự:

1. `main()` chạy, in "Bắt đầu…", gặp `await fetch(...)`. Yêu cầu được gửi đi, và `main` **tạm dừng**.
2. Trong lúc chờ, JavaScript chạy tiếp dòng cuối và in "Dòng này…".
3. API trả lời, `main` chạy tiếp từ chỗ dừng.

Quy tắc:

- `fetch`, `res.json()`, mọi hàm gọi DB đều trả **Promise**. Thêm `await` phía trước để lấy giá trị thật.
- Chỉ dùng được `await` bên trong hàm `async`. Hàm `async` luôn trả về Promise.
- **Quên `await`** là lỗi rất hay gặp. `const bai = layBai(1)` cho bạn một Promise chứ không phải bài học, nên `bai.title` là `undefined`.
- Lỗi trong hàm `async` được bắt bằng `try { await … } catch (e) { … }`.

Hỏi bài số 999999 (không tồn tại), API trả **404** với `success: false`, nên `layBai` ném lỗi và `catch` bắt được. `fetch` **không** tự ném lỗi khi status là 404 hay 500: nó chỉ ném khi không kết nối được. Vì vậy code phải tự kiểm `body.success` (hoặc `res.ok`).

---

## 7. TypeScript: kiểu dữ liệu

### 7.1 Kiểu cơ bản và `interface`

```ts
interface Lesson {
  id: number;
  title: string;
  jlptLevel: "N5" | "N4" | "N3" | "N2" | "N1";   // union: chỉ một trong các giá trị này
  description?: string | null;                     // ?: có thể không có; | null: có thể là null
}

function moTa(l: Lesson): string {
  return `${l.title} (${l.jlptLevel})${l.description ? ": " + l.description : ""}`;
}

console.log(moTa({ id: 1, title: "Bài 1", jlptLevel: "N5" }));
console.log(moTa({ id: 2, title: "Bài 2", jlptLevel: "N5", description: "Giới thiệu" }));
```

```
Bài 1 (N5)
Bài 2 (N5): Giới thiệu
```

`interface` mô tả **hình dạng** object. Nó biến mất khi chạy, chỉ dùng để kiểm lỗi lúc viết code.

| Cách viết | Nghĩa |
|---|---|
| `x: string` | Bắt buộc, là chuỗi |
| `x?: string` | Có thể không có (thì là `undefined`) |
| `x: string \| null` | Bắt buộc có, nhưng có thể là `null` |
| `x: "N5" \| "N4"` | Chỉ được là một trong các chuỗi này |
| `x: string[]` | Mảng chuỗi |
| `x: Record<string, number>` | Object có key là chuỗi, value là số |
| `x: unknown` | Chưa biết kiểu: phải kiểm trước khi dùng |
| `x: any` | Tắt kiểm kiểu. **Tránh dùng** |

`? :` trong `l.description ? … : …` là **toán tử ba ngôi**: `điều_kiện ? giá_trị_nếu_đúng : giá_trị_nếu_sai`.

### 7.2 Generic: kiểu làm tham số

Hàm thật trong [array.ts](../packages/nest-common/src/utils/array.ts), dùng để xáo đáp án trắc nghiệm:

```ts
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

`<T>` nghĩa là "một kiểu bất kỳ, gọi tạm là T". Gọi `shuffle(["あ", "い"])` thì T là `string` và kết quả là `string[]`. Gọi với mảng `Lesson` thì kết quả là `Lesson[]`. Một hàm dùng cho mọi kiểu mà không mất thông tin kiểu.

Chi tiết khác: `[...items]` **chép** mảng trước khi xáo, nên mảng gốc của người gọi không bị đổi. `[arr[i], arr[j]] = [arr[j], arr[i]]` đổi chỗ hai phần tử.

### 7.3 TypeScript bắt lỗi ở đâu, và ở đâu thì không

Tạo `sai.ts`:

```ts
const moTa = (l: { title: string; jlptLevel: string }) => `${l.title} (${l.jlptLevel})`;
console.log(moTa({ title: "Bài 1", jlptLevel: "N6" }));
moTa({ title: "Bài 1" });
```

Chạy bằng Node:

```bash
node sai.ts
```

```
Bài 1 (N6)
```

**Node không báo lỗi gì.** Node chỉ xóa phần kiểu rồi chạy, nó **không kiểm** kiểu. Dòng 3 thiếu `jlptLevel` vẫn chạy.

Kiểm kiểu bằng trình biên dịch TypeScript `tsc`:

```bash
npx -p typescript tsc --noEmit --strict sai.ts
```

```
sai.ts(3,6): error TS2345: Argument of type '{ title: string; }' is not assignable to parameter of type '{ title: string; jlptLevel: string; }'.
  Property 'jlptLevel' is missing in type '{ title: string; }' but required in type '{ title: string; jlptLevel: string; }'.
```

- `(3,6)`: dòng 3, cột 6.
- Lỗi nói: object truyền vào thiếu thuộc tính `jlptLevel`.

Có hai giới hạn quan trọng:

1. **TS chỉ kiểm lúc viết code, không kiểm lúc chạy.** Dữ liệu từ API, từ người dùng gửi lên, từ file JSON thì TS không biết thật ra nó là gì. Gõ `jlptLevel: "N6"` vẫn qua vì kiểu là `string`. Vì vậy backend phải **kiểm dữ liệu lúc chạy** bằng DTO và `class-validator` ([learn-nestjs.md](./learn-nestjs.md), mục 7).
2. **`as` là lời hứa, không phải phép kiểm.** `x as Lesson` bảo TS "tin tôi đi". Hứa sai thì lỗi lúc chạy.

VS Code chạy `tsc` ngầm và gạch đỏ ngay khi bạn gõ. Trong repo, `npm run build` và CI chạy `tsc` đầy đủ.

---

## 8. Class

Code NestJS trong repo viết bằng class:

```ts
class BoDem {
  private dem = 0;
  private readonly ten: string;

  constructor(ten: string) {
    this.ten = ten;
  }

  tang(): string {
    this.dem += 1;
    return `${this.ten}: ${this.dem}`;
  }
}

const b = new BoDem("Lượt học");
b.tang();
console.log(b.tang());   // → Lượt học: 2
```

- `new BoDem(...)` tạo một **đối tượng** (instance) từ class và gọi `constructor`.
- `this` là chính đối tượng đó.
- `private`: chỉ dùng được bên trong class. `readonly`: gán một lần trong constructor rồi không đổi nữa.

NestJS viết gọn constructor bằng **parameter property**:

```ts
@Injectable()
export class PushScheduler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}
}
```

Viết `private readonly prisma: PrismaService` trong ngoặc của constructor nghĩa là **khai báo thuộc tính và gán luôn**. Nó tương đương ba dòng `private readonly prisma…; constructor(prisma) { this.prisma = prisma; }`.

Cú pháp này cần trình biên dịch TypeScript thật. `node file.ts` báo `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. Code trong repo được biên dịch bằng `tsc`/`nest build`, nên không gặp vấn đề này.

`@Injectable()` là **decorator**: một hàm "dán nhãn" lên class để NestJS biết cách tạo nó. Phần này giải thích kỹ ở [learn-nestjs.md](./learn-nestjs.md).

---

## 9. Module: `import` và `export`

Mỗi file là một **module**. Thứ gì muốn dùng ở file khác thì phải `export`:

```ts
// packages/nest-common/src/utils/array.ts
export function shuffle<T>(items: T[]): T[] { … }
```

```ts
// file khác
import { shuffle } from "@app/common";
```

| Đường dẫn import | Lấy từ đâu |
|---|---|
| `"./jwt-secret"` | File cùng thư mục (`./` = thư mục hiện tại) |
| `"../dto/login.dto"` | Lên một cấp rồi vào `dto/` |
| `"@nestjs/common"` | Thư viện trong `node_modules/` |
| `"@app/common"` | Alias của repo, trỏ tới `packages/nest-common/src` (khai báo trong `tsconfig.json`) |

`import type { X }` chỉ lấy **kiểu**, và nó bị xóa khi chạy. NestJS cần kiểu tồn tại lúc chạy để tự tạo dependency, nên chỗ đó phải `import` thường ([learn-nestjs.md](./learn-nestjs.md), mục 3.1).

---

## 10. Lỗi và cách đọc lỗi

```ts
function chia(a: number, b: number): number {
  if (b === 0) throw new Error("Không chia được cho 0");
  return a / b;
}

try {
  chia(1, 0);
} catch (e) {
  console.log((e as Error).message);   // → Không chia được cho 0
}
```

Lỗi không được bắt sẽ in ra **stack trace**:

```
TypeError: Cannot read properties of undefined (reading 'title')
    at main (/Users/ban/hoc-ts/bai.ts:7:20)
    at …
```

- Dòng đầu: **loại lỗi** và **mô tả**. Đọc kỹ dòng này trước.
- `at main (…/bai.ts:7:20)`: lỗi xảy ra trong hàm `main`, file `bai.ts`, dòng 7, cột 20. Dòng `at` đầu tiên trỏ vào **file của bạn** thường là chỗ cần sửa. Các dòng trong `node_modules` là thư viện.

---

## Lỗi hay gặp

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `Cannot read properties of undefined (reading 'x')` | Thứ đứng trước `.x` là `undefined` | `console.log` nó ra; dùng `?.`; kiểm có quên `await` không |
| Được `Promise { <pending> }` thay vì dữ liệu | Quên `await` | Thêm `await`, và đặt trong hàm `async` |
| `await is only valid in async functions` | Dùng `await` trong hàm thường | Thêm `async` vào hàm |
| `"5" + 1` ra `"51"` | Dữ liệu là chuỗi (từ form, URL, biến môi trường) | `Number(x)` hoặc `parseInt(x, 10)` trước khi tính |
| `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` khi `node x.ts` | Dùng `enum`, parameter property, decorator | Viết cách khác, hoặc chạy trong project có `tsc` |
| TS báo `is possibly 'null'` | Giá trị có thể `null` mà bạn dùng như chắc chắn có | Kiểm `if (x)` trước, hoặc dùng `?.` / `??` |
| `x is not a function` | Gọi `x()` mà `x` không phải hàm (sai tên, quên import) | Kiểm tên và `import` |

---

## Tự kiểm tra

1. `const` khác `let` thế nào? Mặc định nên dùng cái nào?
2. `0 ?? 10` ra gì? `0 || 10` ra gì? Cấu hình số lượng nên dùng cái nào?
3. `scores.map(...)` có làm thay đổi `scores` không?
4. Trong ví dụ mục 6, vì sao "Dòng này in ra TRƯỚC…" xuất hiện trước tên bài học?
5. `node sai.ts` chạy êm mà `tsc` báo lỗi. Vậy TypeScript có bảo vệ được dữ liệu người dùng gửi lên API không?
6. `description?: string | null`: giá trị nào hợp lệ cho `description`?
7. `const bai = layBai(1); console.log(bai.title)` in ra gì? Vì sao?

<details>
<summary>Đáp án</summary>

1. `const` không gán lại được, `let` thì được. Mặc định dùng `const`.
2. `0 ?? 10` → `0`; `0 || 10` → `10`. Dùng `??`, vì `0` là giá trị hợp lệ.
3. Không. `map` tạo mảng mới.
4. `await fetch` làm `main` tạm dừng chờ mạng. Trong lúc đó JavaScript chạy tiếp dòng `console.log` cuối file.
5. Không. TS chỉ kiểm lúc biên dịch. Dữ liệu lúc chạy phải được kiểm bằng code (DTO + `class-validator` trong NestJS).
6. Một chuỗi, `null`, hoặc không có thuộc tính đó (`undefined`).
7. `undefined`. Thiếu `await` nên `bai` là một Promise, mà Promise không có thuộc tính `title`.

</details>

## Bài tập

Làm trong `~/hoc-ts`, chạy bằng `node`, kiểm bằng `npx -p typescript tsc --noEmit --strict <file>.ts`.

1. Viết `demTheoCap(lessons: { jlptLevel: string }[]): Record<string, number>`: trả về số bài theo từng cấp, dạng `{ N5: <số bài>, N4: <số bài> }`. Gợi ý: `reduce`.
2. Gọi `http://localhost:8080/api/lessons?jlptLevel=N5` bằng `fetch`, in ra số bài và tên 3 bài đầu. So kết quả với [learn-web-http.md](./learn-web-http.md).
3. Mở [packages/nest-common/src/utils/string.ts](../packages/nest-common/src/utils/string.ts). Giải thích `parseJsonArray` từng dòng: vì sao có `try/catch`, vì sao kiểm `Array.isArray`, và nó trả gì khi `raw` là `null`?
4. Mở [services/api-gateway/src/auth/jwt-secret.ts](../services/api-gateway/src/auth/jwt-secret.ts). Đọc hàm `resolveJwtSecret` và trả lời: trong production, chuyện gì xảy ra nếu `JWT_SECRET` là `"secret"`?

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **0. Nền tảng** — bài 4/5.

- Bài trước: [learn-git.md](./learn-git.md) — Git: branch, commit, Pull Request, xử lý conflict, những gì không được commit
- **Bài tiếp: [learn-web-http.md](./learn-web-http.md)** — Web và HTTP: URL, request/response, status code, gọi API bằng curl, token đăng nhập

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
