# Học RxJS: từ Observable đến luồng chat của project

> **Mục tiêu:** Sau bài này, bạn đọc được một pipeline RxJS, biết cách hủy subscription để dọn tài nguyên, và hiểu luồng chat SSE trong project.
> **Cần biết trước:** [JavaScript/TypeScript](./learn-js-ts.md), biết hàm, callback, Promise và `async`/`await`.
> **Thời gian:** khoảng 2–3 giờ.

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| Observable | Nguồn có thể phát nhiều giá trị theo thời gian |
| Observer | Bộ nhận `next`, `error` và `complete` |
| Subscription | Quyền theo dõi một Observable; `unsubscribe()` dừng việc theo dõi |
| Operator | Hàm biến đổi hoặc kết hợp một Observable |
| Subject | Vừa là Observable vừa cho phép chủ động phát giá trị |
| Teardown | Hàm dọn timer, listener hoặc subscription khi stream kết thúc |

## 1. Vì sao cần RxJS?

Promise thường trả về một kết quả trong tương lai. Nhưng chat, thông báo, sự kiện MQTT và SSE là những luồng có thể phát nhiều kết quả:

```text
thời gian ───────────────────────────────────────────>
chat      tin A       tin B          tin C
```

RxJS cung cấp cách biểu diễn, ghép và hủy những luồng đó. Trong project, RxJS được dùng để đưa tin chat từ nhiều nguồn vào một luồng SSE. Ta sẽ học các khái niệm trước rồi lần theo code thật.

## 2. Observable: một công thức chưa chạy

Observable mô tả cách phát các giá trị. Thông thường nó chưa bắt đầu cho tới khi có người subscribe.

```typescript
import { from, of } from "rxjs";

of("kana", "kanji").subscribe((value) => console.log(value));
// kana
// kanji

from([10, 20, 30]).subscribe((value) => console.log(value));
// 10
// 20
// 30
```

`of` phát các đối số lần lượt rồi hoàn tất. `from` biến một iterable hoặc Promise thành Observable.

Observer có ba loại thông báo:

```typescript
const observer = {
  next: (value: string) => console.log("giá trị:", value),
  error: (error: unknown) => console.error("lỗi:", error),
  complete: () => console.log("đã xong"),
};
```

- `next(value)`: có giá trị mới.
- `error(error)`: stream lỗi và kết thúc.
- `complete()`: stream hoàn tất bình thường.

Nếu chỉ truyền một hàm vào `subscribe`, hàm đó nhận `next`; lỗi có thể không được xử lý rõ ràng. Với stream quan trọng, truyền observer đầy đủ hoặc đặt xử lý lỗi bằng operator.

### Observable hữu hạn và vô hạn

`of(1, 2, 3)` hoàn tất sau ba giá trị. Ngược lại, `interval` cứ phát mãi cho đến khi bị hủy:

```typescript
import { interval, take } from "rxjs";

interval(1_000)
  .pipe(take(3))
  .subscribe({
    next: (value) => console.log(value),
    complete: () => console.log("đã xong"),
  });
// Sau mỗi giây: 0, 1, 2
// Sau đó: đã xong
```

`interval` bắt đầu đếm từ `0`. `take(3)` phát tối đa ba giá trị rồi tự hoàn tất.

## 3. Subscription và dọn tài nguyên

Subscribe vào Observable vô hạn thì phải biết lúc nào dừng. `unsubscribe()` hủy subscription:

```typescript
import { interval } from "rxjs";

const subscription = interval(1_000).subscribe((value) => {
  console.log(value);
});

// Khi không cần nghe nữa:
subscription.unsubscribe();
```

Khi tự tạo Observable, trả về một hàm teardown để dọn tài nguyên:

```typescript
import { Observable } from "rxjs";

const ticks$ = new Observable<number>((subscriber) => {
  let value = 0;
  const timer = setInterval(() => subscriber.next(++value), 1_000);

  return () => clearInterval(timer);
});

const subscription = ticks$.subscribe((value) => console.log(value));
// Khi subscription.unsubscribe() được gọi, timer sẽ bị xóa.
```

Teardown cũng chạy khi Observable hoàn tất hoặc lỗi. Nếu không dọn timer, event listener hoặc subscription bên trong, tài nguyên có thể tồn tại lâu hơn mong muốn.

## 4. `pipe` và các operator cơ bản

Operator nhận một Observable và trả về một Observable khác. `pipe` nối các operator theo thứ tự từ trái sang phải:

```typescript
import { filter, map, of } from "rxjs";

of(1, 2, 3, 4)
  .pipe(
    filter((value) => value % 2 === 0),
    map((value) => value * 10),
  )
  .subscribe(console.log);
// 20
// 40
```

Đọc pipeline như sau: lấy các số chẵn, rồi nhân mỗi số với `10`.

| Operator | Tác dụng | Ví dụ dùng |
|---|---|---|
| `map` | Biến đổi từng giá trị | Object sự kiện → payload SSE |
| `filter` | Chỉ giữ giá trị thỏa điều kiện | Chỉ lấy tin đúng phòng chat |
| `tap` | Thực hiện side effect, không đổi giá trị | Log để debug |
| `take` | Lấy tối đa N giá trị rồi hoàn tất | Chỉ cần một vài kết quả |
| `distinctUntilChanged` | Bỏ giá trị liên tiếp không đổi | Không tìm lại cùng một từ |
| `debounceTime` | Chờ một khoảng yên lặng rồi mới phát | Tránh gọi API mỗi phím gõ |

Ưu tiên `map` cho biến đổi dữ liệu. Dùng `tap` cho log/metric, không sửa giá trị bên trong `tap`.

## 5. Ghép các Observable bất đồng bộ

Một operator nhận giá trị, tạo ra Observable khác thì cần “trải phẳng” luồng bên trong ra. Các operator `*Map` phổ biến khác nhau ở cách xử lý công việc đang chạy:

| Operator | Khi có giá trị mới | Thường dùng cho |
|---|---|---|
| `switchMap` | Hủy luồng trước, chuyển sang luồng mới nhất | Tìm kiếm khi người dùng đang gõ |
| `mergeMap` | Chạy các luồng cùng lúc | Xử lý nhiều việc độc lập |
| `concatMap` | Xếp hàng, chạy lần lượt | Ghi các thay đổi cần đúng thứ tự |
| `exhaustMap` | Bỏ qua giá trị mới khi luồng hiện tại chưa xong | Chặn bấm nút submit nhiều lần |

Ví dụ tìm kiếm: kết quả của từ khóa cũ không còn cần khi người dùng gõ từ khóa mới.

```typescript
import { debounceTime, distinctUntilChanged, switchMap } from "rxjs";

const results$ = searchText$.pipe(
  debounceTime(250),
  distinctUntilChanged(),
  switchMap((text) => searchWords(text)),
);
```

`switchMap` unsubscribe Observable tìm kiếm cũ. Việc hủy tác vụ bên ngoài (ví dụ request HTTP) còn tùy Observable đó có hỗ trợ teardown/cancel hay không.

### `merge` và `combineLatest`

- `merge(a$, b$)` phát mọi giá trị đến từ hai nguồn, nguồn nào phát thì chuyển tiếp nguồn đó.
- `combineLatest([a$, b$])` đợi mỗi nguồn phát ít nhất một lần, rồi phát cặp giá trị mới nhất mỗi khi một nguồn thay đổi.

Chọn theo ý nghĩa dữ liệu: “nhận mọi sự kiện” thường là `merge`; “tính theo trạng thái mới nhất của nhiều nguồn” thường là `combineLatest`.

## 6. Lỗi, retry và hoàn tất

Lỗi chưa được bắt sẽ đi tới `error` của subscriber và kết thúc stream. `catchError` xử lý lỗi; nơi đặt nó ảnh hưởng tới phần còn lại của pipeline.

```typescript
import { catchError, of, switchMap } from "rxjs";

const results$ = searchText$.pipe(
  switchMap((text) =>
    searchWords(text).pipe(
      catchError((error: unknown) => {
        console.error("Không tìm được từ:", error);
        return of([]);
      }),
    ),
  ),
);
```

Đặt `catchError` bên trong `switchMap` giúp lần tìm kiếm đó trả danh sách rỗng có ghi log; luồng `searchText$` bên ngoài vẫn nhận từ khóa tiếp theo. Nếu thay bằng `catchError` bên ngoài, toàn bộ luồng có thể kết thúc sau một lỗi, tùy Observable thay thế được trả về.

`retry` subscribe lại khi lỗi. Chỉ dùng khi thao tác có thể thử lại an toàn; request ghi dữ liệu có thể bị thực hiện nhiều lần nếu server đã xử lý request nhưng phản hồi bị mất.

`finalize` chạy khi stream hoàn tất, lỗi hoặc bị unsubscribe. Dùng nó để dọn trạng thái như spinner; nó không thay cho teardown của Observable tùy chỉnh.

## 7. Cold, hot và Subject

**Cold Observable** thường tạo công việc riêng cho mỗi subscriber. Hai người subscribe có thể tạo hai timer hoặc hai request riêng.

**Hot Observable** phát giá trị độc lập với subscriber. Subscriber đến muộn không tự nhận lại các giá trị đã phát.

`Subject` vừa có thể được subscribe, vừa có thể gọi `next`:

```typescript
import { Subject } from "rxjs";

const events$ = new Subject<string>();
events$.subscribe((event) => console.log("A:", event));
events$.next("message"); // A: message
```

| Loại | Giá trị được subscriber mới nhận |
|---|---|
| `Subject` | Chỉ giá trị phát sau khi subscribe |
| `BehaviorSubject` | Giá trị hiện tại ngay lập tức; cần giá trị khởi tạo |
| `ReplaySubject(n)` | Tối đa `n` giá trị gần nhất |

Không chọn `ReplaySubject` không giới hạn cho stream lâu dài nếu không có lý do; nó có thể giữ nhiều dữ liệu trong bộ nhớ.

Đôi khi muốn chia sẻ một nguồn cold giữa nhiều subscriber. `share()` chia sẻ subscription đang hoạt động. `shareReplay()` còn lưu và phát lại giá trị; hãy xác định rõ thời gian sống và số giá trị được giữ để tránh cache ngoài ý muốn.

## 8. Đọc RxJS trong luồng chat thật

Code chính nằm trong [`ChatEventsService`](../services/api-gateway/src/realtime/chat-events.service.ts). Phương thức `observe` gộp sự kiện trong process hiện tại với sự kiện từ MQTT:

```typescript
return this.mqtt.connection$.pipe(
  switchMap(() =>
    merge(
      this.subject.asObservable(),
      this.mqtt.stream<ChatEvent>(topic),
    ).pipe(
      filter((event) => event.type === type && event.roomId === roomId),
    ),
  ),
  distinct(chatEventKey, interval(DEDUPE_WINDOW_MS)),
  map((event) => ({ data: event.message }) as MessageEvent),
);
```

Đọc từ trên xuống:

1. `connection$` là `BehaviorSubject<boolean>`. Subscriber mới nhận ngay trạng thái hiện tại của MQTT.
2. `switchMap` thay pipeline trong khi trạng thái kết nối đổi; subscription cũ bị hủy.
3. `merge` gộp tin local và tin từ broker. Pod vừa publish cũng có thể nhận lại bản echo từ MQTT.
4. `filter` chỉ giữ đúng loại tin và phòng đang nghe.
5. `distinct` bỏ bản trùng theo khóa do `chatEventKey` tạo: thường là `type:roomId:message.id`, hoặc JSON của message nếu thiếu ID. `interval` định kỳ xóa tập khóa để không giữ mãi trong một SSE lâu dài. Echo đến trễ hơn cửa sổ dedupe có thể được xem là tin mới.
6. `map` chuyển event sang `{ data }`, dạng NestJS SSE cần.

`MqttBus.stream` trong [`mqtt.bus.ts`](../services/api-gateway/src/realtime/mqtt.bus.ts) tạo Observable tùy chỉnh. Khi subscriber đầu tiên nghe một topic, bus gọi `retain`; khi subscription bị hủy, teardown unsubscribe khỏi `inbound` và gọi `release`. Chỉ khi bộ đếm về `0` bus mới unsubscribe topic khỏi broker.

Khi thêm tài nguyên vào Observable, hãy đảm bảo teardown được gọi khi client SSE ngắt. Test hiện có unsubscribe rõ ràng vì `interval` trong pipeline giữ timer hoạt động: [`chat-events.service.spec.ts`](../services/api-gateway/src/realtime/chat-events.service.spec.ts).

## 9. Kiểm tra bằng test có sẵn

Từ thư mục gốc repo, chạy test của chat events:

```bash
npm test --workspace @edu/nihongo-services -- --runInBand api-gateway/src/realtime/chat-events.service.spec.ts
```

Test kiểm tra việc bỏ echo trùng, bỏ dữ liệu từ subscription cũ sau reconnect, dọn khóa dedupe theo thời gian và publish thông báo. Sau khi đọc test, thử đổi thứ tự operator trên giấy và dự đoán kết quả trước khi chạy.

## 10. Lỗi hay gặp

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Không có giá trị nào | Chưa subscribe, filter loại hết dữ liệu, hoặc nguồn chưa phát | Kiểm tra từng bước bằng `tap`; kiểm tra điều kiện filter |
| Subscriber nhận dữ liệu hai lần | Hai nguồn cùng phát một sự kiện hoặc có nhiều subscription | Kiểm tra nơi subscribe và khóa dedupe |
| Timer/process không dừng | Quên unsubscribe hoặc thiếu teardown | Hủy subscription; trả hàm cleanup từ Observable tùy chỉnh |
| Lỗi làm stream dừng hẳn | Lỗi đi tới subscriber hoặc `catchError` đặt quá ngoài | Đặt xử lý ở đúng nhánh và quyết định rõ thay thế hay phát lại lỗi |
| Request cũ vẫn chạy | Observable bên trong không hỗ trợ hủy tác vụ | Dùng API có cancellation; không giả định `switchMap` tự dừng mọi side effect |
| Bộ nhớ tăng theo thời gian | Giữ subscription/Subject/ReplaySubject hoặc tập dedupe không giới hạn | Dọn subscription, giới hạn buffer và TTL/cache |

## Tự kiểm tra

1. Gọi `subscribe` làm gì? `unsubscribe` khác `complete` ở điểm nào?
2. Khác nhau thế nào giữa `switchMap` và `concatMap`?
3. Vì sao `BehaviorSubject` hợp với trạng thái kết nối hiện tại hơn `Subject` thường?
4. Trong `ChatEventsService.observe`, vì sao phải gộp local subject và MQTT stream?
5. Nếu chuyển `distinct` vào bên trong callback của `switchMap`, điều gì xảy ra với bộ nhớ dedupe khi reconnect?
6. Teardown của Observable trong `MqttBus.stream` phải dọn những gì?

<details>
<summary>Đáp án gợi ý</summary>

1. `subscribe` bắt đầu nhận giá trị và trả về `Subscription`; `unsubscribe` ngừng subscriber đó. `complete` là thông báo kết thúc bình thường do nguồn phát.
2. `switchMap` giữ luồng mới nhất và hủy luồng cũ; `concatMap` xếp các luồng vào hàng đợi để chạy lần lượt.
3. Subscriber mới cần biết trạng thái hiện tại ngay, không chỉ các thay đổi trong tương lai.
4. Tin trong pod hiện tại có thể được gửi ngay qua Subject; MQTT chuyển tiếp tin giữa các pod. Cả hai nguồn cần tới cùng SSE.
5. Mỗi lần reconnect, pipeline bên trong được tạo lại và tập khóa của `distinct` cũng mất; một bản echo có thể lọt qua.
6. Hủy subscription tới `inbound` và giảm bộ đếm topic bằng `release`.

</details>

## Bài tập

1. Đọc test `chat-events.service.spec.ts`, ghi ra thứ tự các event đi qua từng operator.
2. Tạo một Observable dùng `setInterval`; xác nhận timer dừng sau `unsubscribe`.
3. Tạo stream tìm kiếm giả bằng `Subject<string>`. Dùng `debounceTime`, `distinctUntilChanged` và `switchMap` để chỉ giữ kết quả từ khóa mới nhất.
4. Thêm test cho trường hợp event sai `roomId` bị `filter` bỏ qua. Không sửa logic dedupe trước khi test thất bại.

## Đi tiếp

- [MQTT, RxJS, Flyway và DDD trong project](./learn-mqtt-flyway-ddd.md) — đi sâu vào kiến trúc chat, MQTT và read model.
- [NestJS qua project](./learn-nestjs.md) — xem Observable được dùng trong pipeline của NestJS.
- [Test Jest qua code thật](./learn-jest.md) — hiểu cách chạy và viết test backend.

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **3. Backend (NestJS)** — bài 3/10.

- Bài trước: [learn-nestjs.md](./learn-nestjs.md) — NestJS: thứ tự pipeline, guard, interceptor, DI, rate limit, pipe
- **Bài tiếp: [redis.md](./redis.md)** — Redis dùng vào việc gì trong project

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
