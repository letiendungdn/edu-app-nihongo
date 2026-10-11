# Phỏng Vấn Backend NodeJS/NestJS — Theo JD, Trả Lời Bằng Code Trong Project

Chia theo từng dòng của JD. Mỗi câu có:

- **Trả lời**: nói trong khoảng 1 phút, bám vào code thật của repo.
- **Hỏi vặn**: câu người phỏng vấn hay hỏi tiếp, kèm ý trả lời.

Phần lý thuyết và lab đầy đủ: [learn-mqtt-flyway-ddd.md](./learn-mqtt-flyway-ddd.md). Câu hỏi chung về Postgres/system design: [interview-questions.md](./interview-questions.md).

Nguyên tắc khi trả lời: nói **đã làm gì, vì sao, đánh đổi gì, đo bằng gì**. Không biết thì nói không biết rồi nói cách sẽ tìm hiểu. Đừng nhận đã chạy production ở quy mô mà project chưa có. Nói "trong project của tôi, chạy trên Docker/k8s local" là đủ thuyết phục.

---

## 0. Giới thiệu project trong 60 giây

> Tôi làm một app học tiếng Nhật, backend là NestJS monorepo: api-gateway gọi content-service và exam-service qua gRPC, Kafka cho event giữa service (có outbox và consumer idempotent), Postgres qua Prisma, Redis cho presence, deploy bằng Docker và Kubernetes với HPA.
>
> Phần gần đây nhất: chat realtime chạy trên nhiều pod. Ban đầu chat dùng một RxJS Subject trong RAM nên user ở hai pod khác nhau không thấy tin của nhau. Tôi thêm Mosquitto làm bus giữa các pod, ghép luồng bằng RxJS, có dedupe vì QoS 1 giao trùng. Thêm một read model tiến độ học bằng view và materialized view, quản lý bằng Flyway chạy cạnh Prisma, tổ chức theo clean architecture.
>
> Lúc review tôi tìm được 8 lỗi chỉ lộ ra khi chạy thật: broker không có auth, rò bộ nhớ trong RxJS, cron chạy trùng trên mọi pod, một LEFT JOIN làm mất dữ liệu...

Câu cuối là móc câu: người phỏng vấn gần như chắc chắn hỏi "kể một lỗi đi". Chuẩn bị sẵn mục 10.

---

## 1. NestJS và RxJS trong production

**Q1.1: Observable khác Promise thế nào? Khi nào trong NestJS bạn dùng Observable?**

> Promise là một giá trị, chạy ngay khi tạo (eager), không hủy được. Observable là một luồng nhiều giá trị, chỉ chạy khi có subscribe (lazy), hủy được bằng `unsubscribe`.
>
> Trong project, SSE `@Sse("rooms/:id/stream")` trả Observable: mỗi tin mới là một giá trị, client đóng tab thì Nest unsubscribe và teardown chạy (`MqttBus.release` gỡ subscription khỏi broker). Promise không làm được việc đó. Còn API thường (CRUD) tôi dùng async/await.

Hỏi vặn: *Interceptor của Nest dùng RxJS thế nào?* → `intercept()` trả `next.handle()` là Observable, nên thêm được `timeout()`, `catchError()`, `map()` để bọc response. Project có `HttpMetricsInterceptor` đo thời gian request theo cách đó.

---

**Q1.2: Subject, BehaviorSubject, ReplaySubject khác nhau? Bạn dùng cái nào, vì sao?**

> `Subject` không nhớ gì, subscriber tới sau chỉ nhận giá trị mới. `BehaviorSubject` nhớ giá trị hiện tại và phát ngay cho subscriber mới. `ReplaySubject(n)` nhớ n giá trị gần nhất.
>
> `MqttBus.connection$` là `BehaviorSubject<boolean>`: SSE mở sau khi broker đã nối vẫn nhận ngay `true` và subscribe topic. Nếu dùng `Subject`, SSE mở muộn không bao giờ biết broker đang sống nên không nhận tin từ pod khác. Tin chat thì dùng `Subject`, vì không muốn replay tin cũ (tin cũ tải từ DB).

---

**Q1.3: switchMap, mergeMap, concatMap, exhaustMap? Cho ví dụ trong code.**

| Operator | Khi có giá trị mới mà việc cũ chưa xong | Ví dụ |
| --- | --- | --- |
| `switchMap` | hủy việc cũ | đổi kết nối broker; ô tìm kiếm gõ tới đâu tìm tới đó |
| `mergeMap` | chạy song song | xử lý nhiều message độc lập |
| `concatMap` | xếp hàng, làm lần lượt | ghi theo đúng thứ tự |
| `exhaustMap` | bỏ giá trị mới | chặn bấm "Thanh toán" hai lần |

> Tôi dùng `switchMap` trên `connection$`: broker reconnect thì pipeline cũ bị hủy, mở pipeline mới. Nếu dùng `mergeMap` thì sau mỗi lần reconnect sẽ có thêm một subscription cùng topic, tin bị nhân bản. Unit test `chat-events.service.spec.ts` kiểm tra đúng chuyện này: tin bắn vào stream cũ sau reconnect không lọt ra.

---

**Q1.4: Rò rỉ bộ nhớ trong RxJS hay xảy ra ở đâu? Bạn gặp chưa?**

> Gặp rồi. Bản đầu dùng `distinct(chatEventKey)` để bỏ tin trùng. `distinct` giữ mọi key trong một `Set` tới khi subscription kết thúc, mà SSE có thể mở hàng giờ, nên Set phình mãi. Sửa bằng tham số thứ hai `distinct(key, interval(60_000))` để xóa Set định kỳ. Echo về chỉ sau vài mili giây nên cửa sổ 60 giây là an toàn.
>
> Hệ quả phụ thú vị: `interval` tạo timer, nên Jest bị treo vì một test quên `unsubscribe`. Đó cũng là dấu hiệu của rò rỉ thật. Nguyên tắc chung: subscription dài hạn phải có đường hủy; operator có state (`distinct`, `scan`, `buffer`, `shareReplay` không có `refCount`) phải có giới hạn.

---

**Q1.5: Cold và hot observable? `share()` dùng khi nào?**

> Cold: mỗi subscriber chạy lại nguồn từ đầu (như HTTP request). Hot: nguồn chạy sẵn, subscriber chỉ nghe từ lúc vào (như Subject, sự kiện broker).
>
> `MqttBus.stream()` biến luồng hot của broker thành Observable có đếm tham chiếu: subscriber đầu tiên thì gửi `SUBSCRIBE` lên broker, subscriber cuối rời đi thì `UNSUBSCRIBE`. Đó là ý tưởng của `share()`/`refCount`, nhưng tôi làm bằng tay vì cần gọi broker ở hai thời điểm đó.

---

## 2. Microservices và DDD

**Q2.1: Project chia service thế nào? Vì sao không làm monolith?**

> api-gateway (HTTP, auth, chat), content-service và exam-service (gRPC), payment-service, signaling-service (WebSocket cho video call). Ranh giới theo bounded context: nội dung học, thi, thanh toán có dữ liệu và nhịp thay đổi khác nhau. Gọi đồng bộ dùng gRPC; việc không cần trả lời ngay (nộp bài xong thì cập nhật tiến độ) dùng Kafka.
>
> Thành thật: với một đội nhỏ, monolith chia module tốt thường là lựa chọn đúng hơn. Microservices đổi lấy deploy độc lập và scale riêng, nhưng phải trả bằng gọi mạng, nhất quán dữ liệu khó hơn, và vận hành phức tạp. Project chia service một phần để học những cái giá đó.

---

**Q2.2: Aggregate, repository, bounded context là gì? Chỉ vào code.**

> Module `learning-progress`: `domain/` có aggregate `LearnerProgress` (constructor private, tạo qua `empty()`/`rehydrate()`, ép invariant "streak dài nhất ≥ streak hiện tại") và interface repository. `infrastructure/` có class Prisma implement interface đó. `application/` là các use case. Domain không import Nest hay Prisma.
>
> DI dùng `Symbol` làm token, vì interface TypeScript biến mất lúc runtime. Nhờ vậy test use case chỉ cần truyền repository giả.

Hỏi vặn: *Vậy đó có phải DDD thật không?* → Nói thật: đây là phía đọc (read model) của CQRS, aggregate gần như chỉ giữ dữ liệu. DDD đầy đủ cần aggregate có hành vi ở phía ghi, ví dụ `recordStudy(date)` tự cập nhật streak và phát event `StudyRecorded`; materialized view là projection dựng từ đó. Biết được giới hạn này ghi điểm hơn là khẳng định "tôi làm DDD".

---

**Q2.3: Nhất quán dữ liệu giữa service xử lý thế nào?**

> Không dùng transaction phân tán. Dùng outbox: ghi bản ghi nghiệp vụ và `OutboxEvent` trong cùng một transaction Postgres, rồi một worker đẩy outbox lên Kafka. Consumer idempotent: bảng `ProcessedEvent` có khóa `(eventId, consumer)`, gặp event đã xử lý thì bỏ qua. Kết quả là nhất quán sau cùng (eventual consistency) với at-least-once delivery.

---

## 3. Kafka và MQTT

**Q3.1: Kafka và MQTT khác nhau thế nào? Vì sao project dùng cả hai?**

| | Kafka | MQTT |
| --- | --- | --- |
| Mô hình | log bền, đọc lại theo offset | broker chuyển tiếp, không có log |
| Client | service backend | thiết bị, app mobile, nhiều kết nối nhỏ |
| Thứ tự | theo partition (cùng key → cùng partition) | theo kết nối, không đảm bảo toàn cục |
| Đọc lại | được (reset offset) | không (trừ retained message, tin cuối của topic) |
| Dùng ở đây | nộp bài, thanh toán, outbox | chat giữa các pod, thông báo tới thiết bị |

> Kafka cho việc **không được mất và cần xử lý lại**. MQTT cho việc **đẩy nhanh tới ai đang online**. Tin chat đã lưu Postgres rồi mới đẩy, nên mất một tin MQTT thì client tải lại vẫn có.

Hỏi vặn: *Sao không dùng Redis Pub/Sub cho chat giữa pod?* → Làm được và đơn giản hơn, vì repo đã có Redis. Lý do chọn MQTT: sau này app mobile subscribe thẳng `user/{id}/notify` qua WebSocket, có QoS và ACL theo topic. Nếu chỉ cần nối các pod với nhau thì Redis Pub/Sub là đủ.

---

**Q3.2: QoS 0/1/2? Project dùng mức nào? Chống trùng ra sao?**

> 0 là gửi một lần, 1 là ít nhất một lần, 2 là đúng một lần (bắt tay 4 bước, chậm). Chat dùng QoS 1 nên phải chịu trùng. Có một nguồn trùng chắc chắn xảy ra: pod gửi tin cũng đang subscribe topic đó, nên broker trả lại chính tin ấy (echo). `distinct` theo `type:roomId:message.id` bỏ bản trùng. Đã thử với hai pod thật: người gửi nhận đúng một lần, người ở pod kia nhận qua broker.

---

**Q3.3: Bảo mật MQTT?**

> Bản đầu `allow_anonymous true` và mở cổng 1883 ra ngoài: ai cũng subscribe được `user/+/notify` để đọc preview tin nhắn của mọi người. Sửa: tắt anonymous, password file tạo từ env lúc start (không commit mật khẩu), ACL `pattern read user/%u/notify` để client chỉ đọc hộp thư của mình, gateway chỉ có quyền write lên topic notify. Đã kiểm chứng: anonymous bị từ chối, user 4 không nhận được tin gửi cho user 5. Production cần thêm TLS và xác thực bằng JWT qua plugin auth.

---

**Q3.4: Kafka: partition, consumer group, thứ tự, retry?**

> Topic chia partition; mỗi partition chỉ một consumer trong group đọc, nên số partition là giới hạn song song. Thứ tự chỉ đảm bảo trong một partition, nên `OutboxEvent.key` là userId: cùng user thì cùng partition, giữ thứ tự.
>
> Consumer `exam-events.consumer.ts` thử lại 3 lần; vẫn lỗi thì đẩy sang topic DLQ rồi đi tiếp, để một message hỏng không chặn cả partition. `fromBeginning: true` chỉ có tác dụng khi group chưa commit offset, nên không bỏ sót event cũ; event trùng thì đã idempotent.

Chi tiết hơn: [learn-kafka.md](./learn-kafka.md).

---

## 4. PostgreSQL và Redis

**Q4.1: Redis dùng làm gì trong project? Có vấn đề gì?**

> Presence video call: signaling-service ghi `vc:presence:{userId}` với `EX 120` và gia hạn bằng heartbeat, api-gateway đọc để biết ai online. Ngoài ra exam-service dùng Redis pub/sub. Có một điểm tôi sẽ sửa: `listOnlineUserIds()` gọi `redis.keys("vc:presence:*")`. `KEYS` quét toàn bộ keyspace và **chặn** Redis (đơn luồng) trong lúc quét. Vài trăm key thì không sao, vài triệu key thì mọi request khác đứng chờ. Cách sửa: dùng `SCAN` theo cursor, hoặc tốt hơn là giữ một sorted set `vc:online` với score là thời điểm heartbeat, rồi `ZRANGEBYSCORE` lấy ai còn sống và `ZREMRANGEBYSCORE` dọn người đã rời.

Hỏi vặn: *Cache invalidation?* → Với `GET /api/learning-progress` có thể cache Redis TTL 5 phút. Nhưng materialized view vốn đã là một bản cache trong Postgres, thêm Redis là hai tầng cache cùng độ trễ. Chỉ nên thêm khi đo thấy Postgres là nút thắt.

---

**Q4.2: Connection pool và Prisma interactive transaction có gì cần cẩn thận?**

> Interactive transaction giữ một connection suốt thời gian chạy; mặc định Prisma timeout 5 giây. Refresh materialized view có thể lâu hơn, nên tôi đặt `timeout: 120_000`. Đừng gọi HTTP hay việc chậm bên trong transaction vì nó giữ connection và lock. Lock theo session (`pg_advisory_lock`) cũng nguy hiểm với pool, vì lock dính vào connection chứ không dính vào request.

---

## 5. JOIN, View, Materialized View, tối ưu query

**Q5.1: Các loại JOIN? Kể một lỗi JOIN bạn gặp.**

> INNER giữ dòng khớp ở cả hai bên; LEFT giữ mọi dòng bên trái; RIGHT ngược lại; FULL giữ cả hai bên; CROSS là tích Descartes.
>
> Lỗi thật: view `learner_daily_study` viết `FROM StudySession LEFT JOIN DailyActivity`. Ngày nào user chỉ học từ vựng mà không có phiên học thì biến mất, vì LEFT JOIN chỉ giữ dòng của bảng bên trái. DB local có 0 dòng StudySession và 17 dòng DailyActivity, nên view trả rỗng. Sửa: CTE `UNION` tập ngày từ cả hai bảng rồi LEFT JOIN cả hai vào. Không chọn FULL OUTER JOIN vì với ba bảng, điều kiện `COALESCE` trên khóa join rất rối.

Hỏi vặn: *Bắt lỗi này bằng test thế nào?* → Unit test với fake không bắt được, vì lỗi nằm trong SQL. Cần integration test chạy Postgres thật (testcontainers), seed một ngày chỉ có DailyActivity rồi kiểm tra view có ngày đó.

---

**Q5.2: View và materialized view khác nhau? Khi nào dùng cái nào?**

> View chỉ lưu câu query, mỗi lần đọc chạy lại, nên luôn mới. Materialized view lưu kết quả, đọc nhanh như bảng, tạo được index, nhưng cũ tới lần refresh kế.
>
> `learner_progress_summary` là materialized view: tổng thời gian, thẻ, vocab, kanji theo user, refresh mỗi 5 phút. Trang tiến độ chấp nhận trễ 5 phút để khỏi SUM cả lịch sử mỗi lần mở. Dữ liệu cần đúng từng giây (số dư ví, tồn kho) thì không dùng materialized view.

---

**Q5.3: REFRESH CONCURRENTLY cần gì? Chạy nhiều pod thì sao?**

> Cần một unique index trên materialized view, để Postgres so dòng cũ và dòng mới rồi chỉ ghi phần khác. Nhờ vậy vẫn đọc được trong lúc refresh. Đổi lại, nó chậm hơn refresh thường.
>
> Nhiều pod: cron chạy trên mọi pod (api-gateway có HPA). Tôi bọc refresh trong transaction có `pg_try_advisory_xact_lock(hashtext('learner_progress_summary'))`: pod lấy được lock thì refresh, pod khác nhận `false` và bỏ qua ngay chứ không chờ. Lock theo transaction tự nhả khi commit/rollback, kể cả khi pod chết. Cách khác là k8s CronJob, hoặc job queue (BullMQ) để chỉ một nơi chạy.

---

**Q5.4: EXPLAIN và EXPLAIN ANALYZE? Đọc plan thế nào?**

> `EXPLAIN` chỉ cho plan và cost ước tính. Cost là đơn vị tương đối, **không phải mili giây**. `EXPLAIN ANALYZE` chạy thật nên có thời gian thật và số dòng thật; thêm `BUFFERS` để biết đọc bao nhiêu page từ cache hay từ đĩa. Cẩn thận: ANALYZE trên UPDATE/DELETE là sửa dữ liệu thật, phải bọc trong `BEGIN ... ROLLBACK`.
>
> Đọc plan: nhìn node tốn thời gian nhất, so `rows` ước tính với `rows` thật. Lệch nhiều thì thống kê cũ, chạy `ANALYZE table`. Gặp `Seq Scan` trên bảng lớn có filter chọn lọc thì xem có thiếu index không.
>
> Trong project, endpoint `explain?analyze=true` so materialized view với câu tính trực tiếp. Bản đầu so với một câu không tương đương (chỉ SUM một cột), kết luận vô nghĩa. Giờ hai câu cho kết quả giống hệt (kiểm bằng `EXCEPT` ra 0 dòng).

Hỏi vặn: *Có index mà Postgres vẫn Seq Scan?* → Bình thường khi bảng nhỏ (một page đọc rẻ hơn mở index) hoặc khi điều kiện lấy phần lớn bảng. Materialized view một dòng trong project của tôi ra đúng `Seq Scan`. Không kết luận hiệu năng từ DB vài dòng; phải seed dữ liệu cỡ thật rồi đo.

---

**Q5.5: Điều kiện WHERE ngoài view có được đẩy vào trong không?**

> Thường là có. View được inline vào query, và từ Postgres 12 CTE không đệ quy dùng một lần cũng được inline. Đã kiểm trên view của tôi: `WHERE "userId" = 1` được đẩy xuống cả hai nhánh `UNION`, và `StudySession` dùng `Index Cond: ("userId" = 1)`. Những thứ chặn việc đẩy điều kiện xuống: CTE có `MATERIALIZED`, window function, `DISTINCT ON`, `LIMIT` bên trong.

---

## 6. Index, chuẩn hóa, thiết kế bảng

**Q6.1: Composite index `(userId, date, kind)` dùng được cho query nào?**

> Theo quy tắc tiền tố trái: dùng được cho `userId`, `userId + date`, `userId + date + kind`. Không dùng tốt cho query chỉ lọc `date` hoặc chỉ lọc `kind`. Thứ tự cột nên là: cột lọc bằng (`=`) trước, cột lọc khoảng hoặc sắp xếp sau. Unique constraint của Prisma `@@unique([userId, date, kind])` vừa chống trùng, vừa chính là index đó.

---

**Q6.2: Chuẩn hóa: bảng `DailyActivity` có chuẩn không?**

> Về cấu trúc thì chuẩn: một dòng cho mỗi `(user, ngày, loại)` thay vì cột `vocabCount`, `kanjiCount` trong `StudySession`. Thêm loại mới không phải đổi schema. Điểm chưa chuẩn là kiểu dữ liệu: `date` là `String 'YYYY-MM-DD'` trong khi bảng kia là kiểu `date`. JOIN phải `to_char` hoặc `::date`, DB không chặn được chuỗi sai định dạng, và so sánh khoảng ngày bằng chuỗi dễ sai. Sửa: migration đổi kiểu `USING date::date`.

Hỏi vặn: *Khi nào phi chuẩn hóa?* → Khi đọc nhiều hơn ghi rất nhiều và đo thấy JOIN là nút thắt. Project có `StudyStreak` tách riêng để khỏi tính lại streak từ toàn bộ `StudySession` mỗi lần hiển thị; materialized view cũng là một dạng phi chuẩn hóa có kiểm soát.

---

**Q6.3: Hàm trên cột trong WHERE/JOIN ảnh hưởng index thế nào?**

> `WHERE to_char(date, 'YYYY-MM-DD') = '2026-10-05'` không dùng được index trên `date`, vì index lưu giá trị gốc chứ không lưu kết quả hàm. Cách sửa: viết lại thành so sánh khoảng (`date >= ... AND date < ...`), hoặc tạo expression index. Trong view của tôi, `to_char` nằm ở phía bảng ngoài của JOIN, nên phía `DailyActivity.date` vẫn có thể dùng index. Nhưng tốt nhất vẫn là đổi về cùng kiểu để khỏi phải ép.

---

## 7. Xử lý sự cố hiệu năng DB

**Q7.1: API chậm, nghi do DB. Bạn làm gì, theo thứ tự?**

1. **Xác nhận**: trace (project có OpenTelemetry → Jaeger) xem thời gian nằm ở span DB hay ở chỗ khác.
2. **Tìm query**: `pg_stat_statements` sắp theo `total_exec_time` và `mean_exec_time`.
3. **Đọc plan**: `EXPLAIN (ANALYZE, BUFFERS)` câu đó; so rows ước tính với rows thật.
4. **Kiểm tra chờ lock**: `pg_stat_activity` (cột `wait_event`), `pg_locks`. Ví dụ năm pod cùng refresh materialized view là chờ lock, không phải query chậm.
5. **Sửa** theo nguyên nhân: thêm/đổi index, viết lại query, `ANALYZE` cập nhật thống kê, phân trang keyset, cache, materialized view.
6. **Đo lại** cùng điều kiện; ghi trước/sau.

Hỏi vặn: *N+1 query?* → ORM gọi một query lấy danh sách rồi một query cho mỗi phần tử. Sửa bằng `include` hoặc batch `WHERE id IN (...)`. Nhận ra bằng cách bật log query của Prisma hoặc thấy trong trace hàng chục span DB giống nhau.

---

## 8. Flyway và migration

**Q8.1: Vì sao dùng Flyway khi đã có Prisma Migrate?**

> Prisma quản lý bảng sinh từ `schema.prisma`, nhưng không hỗ trợ materialized view. Tôi chia rõ: Prisma sở hữu bảng, Flyway sở hữu view. Hai bên có bảng lịch sử riêng. Bảng lịch sử Flyway đặt ở schema `flyway` riêng để Prisma không coi nó là drift. Thứ tự bắt buộc: Prisma trước, Flyway sau. Callback `beforeMigrate` của Flyway kiểm tra bảng đã có chưa và dừng với thông báo rõ ràng. CI chạy cả hai trên DB trắng ở mỗi PR.

---

**Q8.2: Versioned và repeatable migration? Checksum? Baseline?**

> `V1__x.sql` chạy đúng một lần theo thứ tự; Flyway lưu checksum, sửa file đã chạy thì `validate` báo lỗi. `R__x.sql` chạy lại mỗi khi checksum đổi, rất hợp cho view: sửa định nghĩa ngay tại file. Baseline dùng khi đưa Flyway vào một schema đã có sẵn đối tượng: đánh dấu "coi như đã ở version N".
>
> Quy tắc: migration đã chạy ở môi trường dùng chung thì không bao giờ sửa, viết file mới. Tôi chỉ sửa thẳng V1 vì nó chưa commit và mới chạy trên máy local.

---

**Q8.3: Migration khi deploy chạy ở đâu? Rollback thế nào?**

> Chạy trong k8s Job **trước** khi rollout code mới (`deploy.yml` đang làm vậy cho Prisma). Không cho pod tự migrate lúc khởi động: 5 pod sẽ migrate cùng lúc. Job lỗi thì dừng deploy, pod cũ vẫn chạy.
>
> Rollback: ưu tiên migration **tương thích ngược** (expand → migrate → contract). Ví dụ đổi tên cột: thêm cột mới, ghi cả hai, chuyển dần sang đọc cột mới, cuối cùng mới xóa cột cũ. Nhờ vậy code cũ vẫn chạy được với schema mới, rollback code không cần rollback DB.

Lưu ý thành thật: `deploy.yml` hiện mới chạy Job cho Prisma, chưa chạy Flyway. Đây là việc còn thiếu.

---

## 9. Clean architecture, design pattern, Docker/K8s, CI/CD

**Q9.1: Những design pattern nào có trong code bạn vừa kể?**

| Pattern | Ở đâu |
| --- | --- |
| Repository + Dependency Inversion | `LearnerProgressRepository` (port) ← `PrismaLearnerProgressRepository` (adapter) |
| Factory method | `LearnerProgress.empty()`, `rehydrate()` |
| Observer / Pub-Sub | RxJS Subject, MQTT topic |
| Adapter | `MqttBus` bọc mqtt.js thành Observable |
| Outbox, Idempotent consumer | `OutboxEvent`, `ProcessedEvent` |
| Null object / graceful degradation | thiếu `MQTT_URL` thì `stream()` trả `EMPTY`, chat chạy một process |

---

**Q9.2: Chạy nhiều replica thì code phải lưu ý gì?**

> Không giữ state chỉ trong RAM nếu nhiều pod cần chung (chat Subject → cần bus). Cron chạy trên mọi pod (cần lock hoặc CronJob). Migration không chạy lúc pod start. Session/cache dùng chung đặt ở Redis. Mọi thao tác nhận event phải chịu được trùng.

---

**Q9.3: Probes, ConfigMap/Secret, PVC?**

> Readiness quyết định pod có nhận traffic không; liveness quyết định có restart không. Đừng để liveness phụ thuộc DB, nếu không DB chậm sẽ làm restart dây chuyền mọi pod. Config thường để ConfigMap, mật khẩu để Secret (deploy tạo từ GitHub Secrets).
>
> Mosquitto dùng `emptyDir` thay vì PVC là cố ý: clean session, dữ liệu thật nằm ở Postgres. Cái giá là `replicas: 1`, một điểm hỏng duy nhất; muốn HA thì cần broker có cluster (EMQX, HiveMQ).

---

## 10. Kể một lỗi bạn đã tìm và sửa (STAR)

Chọn một hoặc hai câu chuyện, kể theo **Situation, Task, Action, Result**. Nhớ có con số và cách kiểm chứng.

### Chuyện 1: cron chạy trùng trên nhiều pod

- **S**: api-gateway có HPA, chạy nhiều pod. Cron refresh materialized view mỗi 5 phút.
- **T**: đảm bảo mỗi chu kỳ chỉ một pod refresh.
- **A**: bọc refresh trong transaction có `pg_try_advisory_xact_lock`. Chọn `try_` để pod khác bỏ qua chứ không chờ; chọn `xact_` để lock tự nhả, không dính vào connection của pool. Kiểm chứng trên Postgres rằng `REFRESH ... CONCURRENTLY` chạy được trong transaction trước khi viết code.
- **R**: mỗi chu kỳ một lần refresh, API trả `refreshed: false` ở pod không lấy được lock. Biết thêm phương án thay thế (CronJob, BullMQ) và khi nào chọn chúng.

### Chuyện 2: LEFT JOIN làm mất dữ liệu

- **S**: view tiến độ theo ngày trả rỗng trên DB local dù user có học.
- **T**: tìm vì sao.
- **A**: đếm dòng từng bảng: `StudySession` 0, `DailyActivity` 17. View bắt đầu từ `StudySession` nên LEFT JOIN không giữ được ngày nào. Viết lại bằng CTE `UNION` tập ngày từ hai bảng; kiểm tra plan rằng điều kiện `userId` vẫn đẩy xuống và dùng index.
- **R**: view từ 0 lên 14 dòng. Bài học: unit test với fake không bắt được lỗi SQL, cần integration test với Postgres thật.

### Chuyện 3: broker không có auth

- **S**: MQTT dùng để đẩy thông báo có preview tin nhắn tới `user/{id}/notify`.
- **T**: rà soát bảo mật trước khi đưa lên k8s.
- **A**: thấy `allow_anonymous true` và cổng mở ra ngoài. Thêm password file sinh từ env, ACL `%u`, bind localhost. Viết lab chứng minh: anonymous bị từ chối, user 4 không đọc được tin của user 5.
- **R**: không còn lộ dữ liệu giữa các user; ghi rõ việc tiếp theo (TLS, JWT auth).

### Câu hỏi "Bạn dùng AI viết code à?"

> Có. Tôi dùng Cursor viết bản đầu, rồi tự review và chạy thật trên nhiều pod và dữ liệu thật. Tôi tìm được 8 lỗi mà test của bản đầu không bắt được, vì test dùng fake còn lỗi nằm ở chỗ nhiều pod, chạy lâu, SQL với dữ liệu thật, và bảo mật. Với tôi, AI viết nhanh, còn trách nhiệm hiểu, đo và chịu trách nhiệm cho code vẫn là của người viết.

Câu này nói thật lại ghi điểm. Đừng giấu, vì người phỏng vấn hỏi sâu vài câu là lộ.

---

## 11. Tự kiểm tra trước buổi phỏng vấn

Trả lời to, không nhìn tài liệu, mỗi câu dưới 1 phút:

- [ ] Vì sao chat cần MQTT khi chạy nhiều pod? Không có thì hỏng thế nào?
- [ ] `switchMap` khác `mergeMap`, ví dụ trong code.
- [ ] Vì sao `distinct` cần `interval`? Hệ quả với Jest?
- [ ] QoS 1 và chuyện echo.
- [ ] Kafka khác MQTT; vì sao dùng cả hai.
- [ ] View khác materialized view; điều kiện của `REFRESH CONCURRENTLY`.
- [ ] Advisory lock: vì sao `try_` và `xact_`.
- [ ] Bẫy LEFT JOIN và cách sửa.
- [ ] EXPLAIN và EXPLAIN ANALYZE; cost không phải ms.
- [ ] Composite index và quy tắc tiền tố trái.
- [ ] `KEYS` trong Redis và cách thay.
- [ ] Prisma và Flyway chia việc; vì sao bảng lịch sử để schema riêng.
- [ ] Migration chạy ở đâu khi deploy; expand/contract.
- [ ] Một câu chuyện STAR có số liệu.
