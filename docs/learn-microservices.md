# Microservice là gì, và vì sao project này tách service

> **Mục tiêu:** Học xong bài này bạn:
> - giải thích được monolith và microservice bằng chính các tiến trình đang chạy trong project;
> - kể được project tách những service nào, vì sao, và vì sao **không** tách payment;
> - liệt kê được cái giá phải trả khi tách: mạng chập chờn, timeout, lỗi lan truyền, khó debug, nhiều thứ phải vận hành;
> - nhìn ra chỗ kiến trúc hiện tại **chưa** đúng nghĩa microservice, và biết vì sao;
> - tự trả lời được câu "tính năng mới này có nên thành service riêng không?".
>
> **Cần biết trước:** [learn-web-http.md](./learn-web-http.md), [system-design.md](./system-design.md)
> **Thời gian:** khoảng 2–3 giờ.

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| Tiến trình (process) | Một chương trình đang chạy, có bộ nhớ riêng. Mỗi container thường chạy một tiến trình |
| Monolith | Cả ứng dụng là **một** tiến trình, deploy một lần |
| Microservice | Ứng dụng chia thành **nhiều** tiến trình nhỏ, mỗi cái lo một việc, gọi nhau qua mạng |
| Gọi trong tiến trình (in-process) | Gọi hàm bình thường: nhanh, không bao giờ "mất mạng" |
| Gọi qua mạng (RPC) | Gửi request sang tiến trình khác: chậm hơn, có thể lỗi, có thể treo |
| Scale | Tăng sức chịu tải, thường bằng cách chạy thêm bản sao (instance, pod) |
| Bounded context | Một vùng nghiệp vụ có ngôn ngữ và dữ liệu riêng: "nội dung học", "thi", "thanh toán" |
| Gateway / BFF | Cửa vào duy nhất cho client, đứng trước các service khác |

---

## 1. Hai cách xây cùng một ứng dụng

Hãy tưởng tượng một quán ăn.

- **Monolith:** một đầu bếp nấu mọi món. Dễ phối hợp, không cần nói to qua bếp. Nhưng đầu bếp ốm thì quán đóng cửa, và quán đông thì không thuê thêm "nửa đầu bếp chỉ nướng thịt" được.
- **Microservice:** mỗi trạm một người: trạm nướng, trạm salad, trạm tráng miệng, có người chạy bàn chuyển đơn. Quán đông món nướng thì thêm người ở trạm nướng. Nhưng đơn có thể **thất lạc** giữa các trạm, phải có quy trình khi một trạm chậm, và phải trả lương nhiều người hơn.

Trong phần mềm:

| | Monolith | Microservice |
|---|---|---|
| Số tiến trình | 1 | Nhiều |
| Một phần gọi phần khác | Gọi hàm: nhanh, chắc chắn | Gọi qua mạng: chậm hơn, có thể lỗi |
| Deploy | Cả khối một lần | Từng service riêng |
| Scale | Nhân bản cả khối | Chỉ nhân bản service đang quá tải |
| Một phần bị lỗi nặng (tràn bộ nhớ) | Sập cả ứng dụng | Sập service đó, phần khác có thể vẫn chạy |
| Debug một request | Một log, một stack trace | Lần theo request qua nhiều service (cần tracing) |
| Chi phí vận hành | Thấp | Cao: nhiều container, nhiều cấu hình, nhiều thứ phải giám sát |

**Không có cách nào "tốt hơn" tuyệt đối.** Microservice giải quyết vấn đề của **tổ chức lớn và tải lớn**, với cái giá là độ phức tạp. Với nhóm nhỏ, monolith viết gọn gàng thường là lựa chọn đúng.

---

## 2. Project này chạy những tiến trình nào

Xem tận mắt:

```bash
docker ps --format '{{.Names}}' | grep -E 'gateway|content|exam|signaling|web'
```

```
edu-gateway
edu-signaling
edu-exam
edu-content
edu-nihongo-web
```

Sơ đồ (chỉ phần backend của project, bỏ qua database và công cụ giám sát):

```
                        nginx :8080
                 ┌──────────┴───────────┐
                 ▼                      ▼
          nihongo-web              api-gateway :3000  ◀── payment-service (KHÔNG chạy riêng:
          (Next.js)                 HTTP, đăng nhập,       gateway import thẳng code của nó)
                                     chat, thanh toán…
                                  gRPC │        │ gRPC
                                       ▼        ▼
                          content-service    exam-service ──▶ Kafka ──▶ (chính exam-service đọc lại)
                             :50051            :50052
                                 └──────┬───────┘
                                        ▼
                                PostgreSQL "nihongo"  ◀── cả gateway, content, exam dùng CHUNG

  signaling-service :3002 (WebSocket, gọi video 1-1) — chỉ dùng Redis, không đụng Postgres
```

| Tiến trình | Lo việc gì | Nói chuyện qua |
|---|---|---|
| `api-gateway` | Cửa vào HTTP của mọi client: kiểm token, kiểm dữ liệu, chat, thanh toán, thông báo… | HTTP với client; gRPC với content/exam |
| `content-service` | Nội dung học: bài, từ vựng, ngữ pháp, kanji, bài đọc, bài nghe | gRPC (chỉ gateway gọi) |
| `exam-service` | Đề thi thử, chấm điểm, tiến độ học | gRPC; Kafka |
| `signaling-service` | Bắt tay WebRTC cho cuộc gọi video 1-1, trạng thái online | WebSocket với trình duyệt; Redis |
| `payment-service` | Stripe, gói học, đặt lịch coach, payout | **Không phải tiến trình riêng.** Là một thư mục code mà gateway import |

Chi tiết từng giao thức (gRPC, Kafka, WebSocket, Redis Pub/Sub): [microservices-communication.md](./microservices-communication.md).

---

## 3. Vì sao tách: lý do có thật trong project

### 3.1 Gateway: một cửa vào cho mọi client

Web, app Android, iOS, Flutter, React Native đều gọi **một** API. Kiểm token, giới hạn request (rate limit), định dạng lỗi chung, CORS… chỉ viết **một lần** ở gateway ([learn-nestjs.md](./learn-nestjs.md) mục 4–9).

Các service phía sau không phải lặp lại việc kiểm đăng nhập. Chúng tin gateway, vì chúng không mở ra internet. Đổi lại: **gateway là điểm chết chung**. Gateway sập thì mọi client mất kết nối. Vì vậy nó luôn chạy ít nhất 2 bản sao và tự tăng theo tải, tối đa 5 ([infra/k8s/api-gateway-hpa.yaml](../infra/k8s/api-gateway-hpa.yaml)).

### 3.2 content-service và exam-service: tách theo vùng nghiệp vụ

| | content-service | exam-service |
|---|---|---|
| Dữ liệu chính | Bài học, từ vựng, ngữ pháp, kanji | Đề thi, câu hỏi, bài làm, tiến độ |
| Kiểu truy cập | **Đọc** rất nhiều, ghi ít (admin soạn bài) | Ghi nhiều theo từng người (nộp bài, chấm điểm) |
| Nhịp thay đổi code | Ổn định | Thay đổi theo đề thi, cách chấm, tính năng mới |

Hai vùng này dùng từ ngữ khác nhau và thay đổi vì lý do khác nhau. Tách ra thì:

- sửa cách chấm điểm và deploy exam-service không đụng tới content-service;
- exam-service treo (ví dụ chấm điểm một đề rất nặng) thì học viên vẫn đọc bài học được;
- mỗi bên có một "hợp đồng" rõ ràng: file [.proto](../packages/nest-contracts/proto/) cộng danh sách pattern trong [message-patterns.ts](../packages/nest-contracts/src/message-patterns.ts).

### 3.3 signaling-service: kiểu kết nối khác hẳn

Gọi API là "hỏi một câu, nhận một câu trả lời, ngắt". Gọi video cần **kết nối WebSocket giữ mở** suốt cuộc gọi để hai trình duyệt trao đổi thông tin kết nối.

Kết nối giữ mở tốn tài nguyên theo cách khác. Deploy lại gateway (việc làm hằng ngày) mà signaling nằm chung thì **mọi cuộc gọi đang diễn ra bị cắt**. Tách riêng thì deploy gateway thoải mái.

signaling-service cũng là service "sạch" nhất: không dùng Postgres, chỉ cần `JWT_SECRET` để kiểm token và Redis để lưu ai đang online ([docker-compose.yml](../docker-compose.yml), mục `signaling-service`).

### 3.4 Vì sao payment **không** tách

`payment-service` có thư mục riêng nhưng **không chạy riêng**. Gateway import thẳng code của nó:

```ts
// services/api-gateway/src/http/subscription.controller.ts
import { SubscriptionService } from "../../../payment-service/src/subscription/subscription.service";
```

Lý do:

- **Thanh toán cần giao dịch DB chắc chắn.** Ví dụ: "trừ tiền xong thì kích hoạt gói". Cùng một tiến trình, cùng một database thì gói vào một transaction được. Tách ra thì phải lo trường hợp "trừ tiền thành công nhưng gọi service kích hoạt bị timeout" ([learn-stripe-idempotency.md](./learn-stripe-idempotency.md)).
- Lượng request thanh toán nhỏ, không cần scale riêng.
- Thêm một service là thêm một container, một cấu hình, một chỗ có thể chết.

Thư mục riêng vẫn có ích: ranh giới code rõ ràng. Nếu sau này thật sự cần tách, việc chuyển thành tiến trình riêng dễ hơn nhiều so với gỡ code thanh toán nằm rải rác trong gateway.

Đây là bài học quan trọng nhất của mục này: **tách code thành module trước, tách tiến trình sau, và chỉ tách khi có lý do cụ thể.**

---

## 4. Cái giá của việc tách: có thật trong code

Mỗi lời gọi gateway → content-service giờ đi qua **mạng**. Mạng thì có thể chậm, đứt, hoặc service bên kia đang khởi động lại. Project phải viết thêm cả một lớp code chỉ để đối phó.

| Vấn đề | Monolith có gặp không? | Project xử lý thế nào | Code |
|---|---|---|---|
| Service con treo, gateway treo theo | Không | Mọi lời gọi gRPC có hạn chót 10 giây, quá hạn trả 504 | [grpc-dispatch.client.ts](../packages/nest-common/src/grpc/grpc-dispatch.client.ts) |
| Service con chết, request dồn vào và làm mọi thứ chậm theo | Không | Circuit breaker: lỗi ≥ 50% thì ngắt 30 giây, trả 503 ngay | [circuit-breaker.ts](../packages/nest-common/src/grpc/circuit-breaker.ts) |
| Lỗi ở service con phải đổi thành mã HTTP đúng | Không, exception bay thẳng lên | Đóng gói lỗi thành JSON, gateway giải mã lại | [rpc-error.ts](../packages/nest-common/src/utils/rpc-error.ts) |
| Ghi DB xong, gửi sự kiện thì tiến trình chết | Ít hơn | Transactional outbox | [ADR-0006](./adr/0006-transactional-outbox-exam-events.md) |
| Một request đi qua 3 tiến trình: lỗi ở đâu? | Một stack trace là đủ | OpenTelemetry + Jaeger để lần theo | [learn-observability.md](./learn-observability.md) |
| Khởi động theo đúng thứ tự | Không | Healthcheck, `depends_on`, watchdog khởi động | [learn-infra.md](./learn-infra.md) |

Toàn bộ cột "Project xử lý thế nào" là code **chỉ tồn tại vì đã tách service**. Cách tính chi phí đúng là: lợi ích của việc tách phải lớn hơn cả bảng này.

---

## 5. Đánh giá thẳng: kiến trúc hiện tại còn thiếu gì

Các bài khác hay nói microservice giúp "scale riêng" và "nhanh nhờ Protobuf". Đối chiếu với code và cấu hình thật:

### 5.1 Tất cả dùng chung một database

```bash
grep -n "DATABASE_URL" docker-compose.yml
```

```
182:      DATABASE_URL: postgresql://nihongo:…@postgres-nihongo:5432/nihongo
202:      DATABASE_URL: postgresql://nihongo:…@postgres-nihongo:5432/nihongo
228:      DATABASE_URL: postgresql://nihongo:…@postgres-nihongo:5432/nihongo
```

content-service, exam-service và gateway cùng trỏ vào **một** database `nihongo`, dùng chung một file [schema.prisma](../packages/prisma-nihongo/schema.prisma). Số file code truy cập trực tiếp từng bảng:

| Bảng | api-gateway | content-service | exam-service |
|---|---|---|---|
| `vocabulary` | 4 | 3 | 2 |
| `lesson` | 2 | 6 | 1 |
| `srsCard` | 3 | 0 | 1 |

Đo trên toàn bộ code: 12/114 bảng được hơn một tiến trình truy cập trực tiếp. Phần lớn là **đọc** chéo; chỉ có một chỗ **ghi** chéo (gateway xóa thẳng `ExamResult` của exam-service), và chỗ đó đã được sửa.

Đúng nghĩa microservice thì mỗi service **sở hữu** dữ liệu của mình (*database per service*): muốn đọc từ vựng thì phải hỏi content-service. Ở đây cả ba service cùng đọc bảng `vocabulary`. Hệ quả:

- **Đổi cấu trúc bảng `vocabulary` có thể làm hỏng cả ba service**, nên phải deploy cả ba cùng lúc. Mất đi lợi ích "deploy riêng".
- Database là điểm chết chung: Postgres chậm thì cả ba chậm.
- Tách tiến trình mà vẫn dính nhau ở dữ liệu, người ta gọi là **distributed monolith** (monolith phân tán): chịu cái giá của microservice mà chỉ nhận được một phần lợi ích.

Vẫn có lý do để chấp nhận điều này: nhóm nhỏ, một database dễ backup, dễ JOIN, dễ giữ nhất quán. Điều quan trọng là **biết** mình đang ở đâu, và có quy tắc để không tệ thêm. Project chọn cách đó trong [ADR-0010](./adr/0010-shared-database-ownership.md):

- **Mỗi bảng có đúng một service chủ được ghi.** Danh sách nằm trong code: [table-ownership.ts](../packages/nest-prisma/src/table-ownership.ts).
- Service khác muốn thay đổi dữ liệu thì gọi service chủ qua gRPC. Ví dụ: admin xóa kết quả thi giờ đi qua pattern `exam.results.delete` của exam-service, không xóa thẳng trong DB.
- **Test tự động chặn vi phạm:** [table-ownership.spec.ts](../packages/nest-prisma/src/table-ownership.spec.ts) quét mọi service; ai ghi vào bảng của service khác thì CI đỏ, kèm file, dòng và tên service chủ.
- Đổi cấu trúc bảng theo kiểu **expand/contract**: thêm cái mới, deploy mọi service, rồi mới xóa cái cũ.
- ADR có lộ trình tách từng bước nếu sau này thật sự cần: bỏ đọc chéo → mỗi service một PostgreSQL schema và một DB user → tách migration → tách server.

### 5.2 "Scale riêng": trước đây chỉ có trên giấy (đã sửa)

Trước đây content-service và exam-service đặt cố định `replicas: 1` trên K8s. Chỉ gateway tự tăng số pod theo tải. Một pod chết (hết bộ nhớ, node bảo trì) là tính năng đó ngưng cho tới khi Kubernetes dựng lại pod.

Giờ [grpc-services-autoscaling.yaml](../infra/k8s/grpc-services-autoscaling.yaml) thêm:

- **HPA** cho content-service và exam-service: tối thiểu 2 pod, tối đa 4, tăng khi CPU trung bình vượt 70%;
- **PodDisruptionBudget** cho cả gateway, content, exam: khi bảo trì node, Kubernetes luôn giữ ít nhất 1 pod mỗi service.

Trước khi cho chạy 2 pod phải kiểm service đó có chịu được không:

- content-service không giữ trạng thái (cache nằm ở Redis);
- exam-service có hai việc chạy nền: outbox relay khóa dòng bằng `FOR UPDATE SKIP LOCKED` nên 2 pod không gửi trùng; consumer Kafka cùng group được Kafka chia partition, và chống xử lý trùng bằng bảng `ProcessedEvent`.

Service nào giữ trạng thái trong bộ nhớ, hay có `@Cron` không khóa ([learn-nestjs.md](./learn-nestjs.md) mục 14.1), thì nhân bản sẽ hỏng.

### 5.3 gRPC nhưng chưa được lợi của Protobuf

Lợi thế lớn của gRPC là Protobuf: dữ liệu nhị phân gọn, **kiểu chặt chẽ** được kiểm ở cả hai đầu. Nhưng project chỉ có một RPC chung ([content.proto](../packages/nest-contracts/proto/content.proto)):

```proto
message DispatchRequest { string pattern = 1; string payload = 2; }   // payload là chuỗi JSON
```

Dữ liệu thật vẫn là **JSON nằm trong một chuỗi**. Không nhanh hơn JSON thường, và payload sai kiểu chỉ lộ ra lúc chạy. Đây là đánh đổi có chủ ý để chuyển đổi dễ ([learn-nestjs.md](./learn-nestjs.md) mục 12.1), không phải lý do để chọn gRPC.

### 5.4 Sự kiện Kafka: ai gửi, ai nghe

Kafka phù hợp khi **service khác** cần phản ứng với một sự kiện. Thực tế trong code ([kafka-topics.ts](../packages/nest-contracts/src/kafka-topics.ts)):

| Topic | Ai gửi | Ai đọc |
|---|---|---|
| `edu.exam.submitted` | exam-service | exam-service (consumer `progress-updater`) |
| `edu.payment.succeeded` | payment (trong gateway), qua outbox | Chưa có consumer |

Trước đây còn 3 topic (`edu.exam.scored`, `edu.vocab.reviewed`, `edu.session.completed`) được khai báo nhưng chưa từng được gửi. Chúng đã bị xóa: khai báo "để dành" làm người đọc tưởng hệ thống đang dùng chúng.

`edu.payment.succeeded` được **giữ lại có chủ ý**:

- Nó được ghi vào `OutboxEvent` **cùng transaction** với khoản thanh toán, nên bảng outbox là nhật ký tiền không thể mất, dù chưa ai đọc topic.
- Topic là điểm nối cho hệ thống bên ngoài sau này (phân tích doanh thu, CRM) mà không phải sửa code thanh toán.
- Thông báo "thanh toán thành công" **không** được chuyển sang consumer Kafka. Lý do: máy dev và CI thường tắt Kafka, và khi đó người dùng sẽ mất thông báo. Gửi trực tiếp sau khi commit đơn giản và chắc hơn.

Kafka hiện chủ yếu dùng **bên trong** exam-service, để việc cập nhật tiến độ không làm chậm việc nộp bài. Đây vẫn là cách dùng hợp lý, nhưng chưa phải giao tiếp giữa các service như thường được kể.

---

## 6. Khi nào nên tách một service mới

Trước khi tách, hỏi lần lượt. Trả lời "không" cho hầu hết thì **đừng tách**: tạo module riêng trong gateway là đủ.

1. **Nó có cần scale khác hẳn phần còn lại không?** (tải gấp nhiều lần, hoặc cần GPU, RAM lớn)
2. **Nó có kiểu chạy khác không?** (kết nối giữ mở như signaling, job chạy hàng giờ, ngôn ngữ khác như Python cho AI)
3. **Nó có cần cô lập lỗi không?** (thư viện hay rò bộ nhớ, xử lý file người dùng tải lên)
4. **Có nhóm người riêng chịu trách nhiệm và deploy nó không?**
5. **Nó có sở hữu được dữ liệu riêng không, hay sẽ lại đọc chung bảng của người khác?**
6. **Có sẵn sàng viết timeout, retry, xử lý lỗi mạng, tracing cho nó không?**

Ví dụ: tính năng "dịch câu bằng AI" gọi một mô hình chạy trên GPU, mất vài giây mỗi lần. Câu 1 và 2 là "có", nên đây là ứng cử viên tốt để tách. Tính năng "đánh dấu bài học yêu thích" thì cả sáu câu đều "không": thêm một module trong gateway.

---

## Lỗi hay gặp (khi làm việc với hệ nhiều service)

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| API bài học trả **503** "tạm thời không khả dụng" | Circuit breaker đã mở vì content-service lỗi liên tục | `docker logs edu-content`; sửa lỗi, đợi 30 giây |
| API trả **504** sau đúng 10 giây | content/exam-service không trả lời kịp | Xem service đó còn sống không: `docker ps`, log |
| Gateway chạy, mọi API nội dung lỗi khi chạy dev | Quên chạy `npm run dev:content` / `dev:exam` | Mỗi service một terminal ([run-local.md](./run-local.md)) |
| Sửa `schema.prisma` xong chỉ một service lỗi | Service đó chưa sinh lại Prisma client hoặc chưa build lại | `npm run prisma:generate`, build lại **mọi** service dùng bảng đó |
| Không biết request lỗi ở service nào | Log nằm rải ở nhiều container | Mở Jaeger <http://localhost:16686>, tìm theo route |

---

## Tự kiểm tra

1. Gọi hàm trong cùng tiến trình và gọi qua gRPC khác nhau ở những điểm nào?
2. Vì sao `payment-service` không chạy thành tiến trình riêng?
3. Vì sao signaling-service đáng được tách nhất trong project?
4. Cả ba service dùng chung database thì mất lợi ích nào của microservice?
5. Kể ba đoạn code trong project **chỉ tồn tại vì đã tách service**.
6. Bạn cần thêm tính năng "xuất báo cáo PDF tiến độ học". Nên tách service mới không? Trả lời theo 6 câu hỏi ở mục 6.

<details>
<summary>Đáp án</summary>

1. Gọi qua gRPC chậm hơn (qua mạng, phải đóng gói dữ liệu), có thể lỗi hoặc treo, phải có timeout và xử lý lỗi. Gọi hàm thì không bao giờ "mất mạng" và dùng chung transaction DB được.
2. Thanh toán cần transaction DB chắc chắn cùng với dữ liệu khác, tải thấp, và tách ra chỉ thêm rủi ro (timeout giữa lúc trừ tiền và kích hoạt gói).
3. Nó giữ kết nối WebSocket lâu dài. Nằm chung gateway thì mỗi lần deploy gateway cắt mọi cuộc gọi đang diễn ra. Nó cũng không dùng chung database với ai.
4. Deploy độc lập (đổi bảng có thể hỏng cả ba) và cô lập lỗi ở tầng dữ liệu (database chậm thì tất cả chậm).
5. Timeout gRPC + trả 504, circuit breaker trả 503, chuyển lỗi microservice thành HTTP (`resolveMicroserviceError`). Ngoài ra: outbox, tracing.
6. Gợi ý: tạo PDF có thể nặng CPU và chậm (câu 1–3 có thể "có"), nhưng tải thấp và không có nhóm riêng. Hợp lý nhất: làm thành **job nền** (BullMQ) trong gateway trước ([learn-nestjs.md](./learn-nestjs.md) mục 14). Chỉ tách khi đo được nó làm chậm gateway.

</details>

## Bài tập

1. Bật stack, tắt content-service: `docker stop edu-content`. Gọi `curl -i http://localhost:8080/api/lessons/1` khoảng 15 lần liên tiếp và ghi lại status code cùng thời gian phản hồi. Bật lại (`docker start edu-content`) rồi gọi tiếp mỗi 5 giây cho tới khi được 200.

   Kết quả đo trên máy dev:
   - Khi tắt: mọi lần đều **503** "ContentService tạm thời không khả dụng", trả trong vài mili-giây. Nếu kết nối cũ đang treo thì lần đầu có thể là **504** sau đúng 10 giây.
   - Khi bật lại: vẫn **503** thêm khoảng 25–30 giây, rồi mới **200**.

   Giải thích vì sao vẫn 503 dù service đã sống lại. Gợi ý: mục 12.3 của [learn-nestjs.md](./learn-nestjs.md), trạng thái OPEN và HALF_OPEN.
2. Trong lúc content-service tắt, gọi `curl -i http://localhost:8080/api/mock-exams` và mở trang thi thử trên web. Trên máy dev, API thi thử vẫn trả **200**. Trang nào khác còn chạy, trang nào lỗi? Điều đó nói gì về cô lập lỗi?
3. Tìm một file trong `services/api-gateway/src` đọc thẳng bảng `vocabulary` bằng Prisma (gợi ý: `grep -rln "prisma.vocabulary" services/api-gateway/src`). Viết ra cách đổi nó thành gọi content-service qua gRPC, theo bước 1 trong lộ trình của [ADR-0010](./adr/0010-shared-database-ownership.md). Được gì, mất gì?
4. Mở Jaeger <http://localhost:16686>, chọn service `api-gateway`, tìm một request `GET /api/lessons`. Đếm xem nó đi qua bao nhiêu service và mỗi bước mất bao lâu.
5. Thử phá quy tắc sở hữu bảng: thêm vào một file của gateway dòng `prisma.vocabulary.update(...)`, rồi chạy `cd services && npx jest table-ownership`. Đọc thông báo lỗi, rồi xóa dòng vừa thêm.

## Luyện phỏng vấn

Câu hỏi phỏng vấn kèm đáp án: NestJS, Kafka, PostgreSQL, thiết kế bảng trong [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md); câu hỏi Senior chung (race condition, thanh toán, system design) trong [interview-questions.md](./interview-questions.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **2. Kiến trúc hệ thống** — bài 2/7.

- Bài trước: [system-design.md](./system-design.md) — Kiến trúc tổng thể, các service, route map
- **Bài tiếp: [core-flows.md](./core-flows.md)** — Luồng từng tính năng: đăng nhập, thanh toán, video call, livestream, chat, SRS, thi thử, dự đoán đề, phát âm…

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
