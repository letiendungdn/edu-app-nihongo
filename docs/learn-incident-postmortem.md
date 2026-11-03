# Học Xử lý Sự cố & Postmortem — Từ Project Này

> Sự cố chắc chắn xảy ra. Điểm khác của senior: **giữ bình tĩnh theo quy trình**, khôi phục dịch vụ trước rồi mới tìm nguyên
> nhân, và viết **postmortem không đổ lỗi** để lỗi không lặp lại. Tài liệu có một postmortem thật của project (mục 5)
> và các runbook cho những lỗi đã biết.

> **Cập nhật 2026-09-29:** hai runbook "Prometheus target down" và "Event Kafka không tới consumer" mô tả lỗi **đã sửa**
> (`/metrics` public + text thô; event đi qua outbox — [ADR-0006](./adr/0006-transactional-outbox-exam-events.md)). Giữ lại làm
> ví dụ; với outbox, kiểm tra event kẹt bằng `SELECT * FROM "OutboxEvent" WHERE "publishedAt" IS NULL`.

## 1. Vòng đời một sự cố

```
Phát hiện ──▶ Phân loại ──▶ Giảm thiểu ──▶ Khôi phục ──▶ Postmortem ──▶ Việc cần làm (action items)
(alert,        (mức độ,      (rollback,     (xác nhận      (≤ 5 ngày    (có người phụ trách,
 user báo)      ai xử lý)     tắt flag,      metric bình    sau sự cố)   có hạn chót)
                              scale)         thường)
```

**Quy tắc vàng: khôi phục trước, tìm nguyên nhân sau.** Vừa deploy xong thì lỗi → rollback ngay (learn-release-cicd mục 5),
đừng ngồi debug trên production trong khi người dùng đang lỗi.

---

## 2. Mức độ nghiêm trọng

| Mức | Ví dụ trong project | Phản ứng |
|-----|---------------------|----------|
| **SEV1** | không đăng nhập được; mất/sai dữ liệu người học; thu tiền sai | xử lý ngay, mọi người liên quan, cập nhật mỗi 30 phút |
| **SEV2** | thi thử lỗi; tra từ chậm > 5s; email xác thực không gửi | trong giờ làm, một người phụ trách |
| **SEV3** | một trang phụ lỗi (sơ đồ tư duy trống); dashboard giám sát hỏng | đưa vào backlog |

Lỗi **dữ liệu** (sai/mất) luôn nặng hơn lỗi **sẵn sàng** (tạm không vào được): hệ thống sập thì bật lại được, dữ liệu sai
lan ra thì rất khó thu hồi.

---

## 3. Vai trò khi có SEV1

```
Incident commander : điều phối, quyết định (rollback?), KHÔNG tự sửa code
Người xử lý        : điều tra, thực hiện thay đổi
Người liên lạc     : cập nhật trạng thái cho người dùng / các bên
Người ghi chép     : ghi dòng thời gian (giờ nào, ai, làm gì, thấy gì) — nguồn chính cho postmortem
```

Team nhỏ thì một người kiêm nhiều vai, nhưng **vẫn ghi dòng thời gian**.

---

## 4. Runbook — "alert kêu thì làm gì"

Mỗi runbook: triệu chứng → kiểm tra → giảm thiểu → khi nào báo lên. Lệnh cụ thể, copy chạy được.

### Runbook API 5xx

```
1. Có deploy trong 30 phút qua?     kubectl rollout history deploy/api-gateway -n edu-app
   → có: rollout undo NGAY, rồi mới điều tra
2. Phụ thuộc nào chết?               curl https://<domain>/health   (sau khi tách: /health/ready)
                                     kubectl get pods -n edu-app
3. Log lỗi nhiều nhất                kubectl logs deploy/api-gateway -n edu-app --since=15m | grep '"level":50' | head
4. Trace request lỗi                 Jaeger → service api-gateway → Tags: error=true
5. Quá 15 phút chưa rõ → báo SEV1, gọi thêm người
```

### Runbook: Prometheus target `api-gateway` down

```
1. curl http://<api-gateway>:3000/metrics
   → 401: /metrics đang bị JwtAuthGuard chặn (lỗi đã biết — learn-observability mục 2.1)
   → không kết nối được: pod chết / sai port → kubectl get pods
2. Trong lúc chưa sửa: coi như MÙ metric → theo dõi log + Jaeger thủ công
```

### Runbook: Event Kafka không tới consumer

```
1. Log exam-service lúc khởi động có "Kafka producer connection failed — events will be skipped"?
   → có: producer đã null; RESTART exam-service SAU KHI Kafka chạy ổn
2. Kết quả thi trong khoảng thời gian đó KHÔNG có event → cần gửi bù:
   SELECT … FROM "ExamResult" WHERE "submittedAt" BETWEEN <bắt đầu> AND <kết thúc>
   → script publish lại (consumer phải idempotent)
3. Lâu dài: transactional outbox (learn-reliability-patterns mục 2)
```

### Runbook: Sau khi seed/import dữ liệu, trang hiện dữ liệu cũ

```
1. content-service cache danh sách bài trong Redis → docker restart edu-content (hoặc xoá key cache liên quan)
2. Kiểm tra lại qua API, không chỉ qua giao diện (giao diện còn cache của react-query)
```

---

## 5. Postmortem thật: seed thử nghiệm ghi vào DB chính

> Viết theo mẫu **không đổ lỗi** (blameless): tập trung vào *hệ thống cho phép lỗi xảy ra*, không vào *ai gõ sai lệnh*.

**Tóm tắt.** Khi chạy seed nội dung với `DATABASE_URL` trỏ vào một **DB thử nghiệm**, script vẫn ghi vào **DB chính**
`nihongo`. File dump nội dung có câu tắt trigger; import dừng giữa chừng để lại **trigger của bảng `CounterCategory` bị tắt**
trên DB chính. Không mất dữ liệu người học; phát hiện và khôi phục trong cùng phiên làm việc.

**Mức độ:** SEV2 (sai lệch cấu hình DB chính; có thể dẫn tới dữ liệu không nhất quán nếu không phát hiện).

**Dòng thời gian** (rút gọn)

```
T+0      Chạy seed-content với DATABASE_URL = DB thử nghiệm
T+?      Import lỗi giữa chừng
T+?      Kiểm tra DB chính thấy thay đổi không mong muốn; trigger CounterCategory đang DISABLED
T+?      Bật lại trigger trên DB chính; xác nhận dữ liệu
T+?      Sửa seed-content, chạy lại trên đúng DB thử nghiệm → thành công
```

**Nguyên nhân gốc (5 lần "vì sao")**

```
Vì sao DB chính bị đổi?              → seed-content gọi psql với -d nihongo viết cứng, bỏ qua DATABASE_URL
Vì sao viết cứng?                    → script ban đầu chỉ dùng cho một DB, giả định "chỉ có một DB"
Vì sao trigger bị tắt lại?           → dump dùng --disable-triggers: ALTER TABLE … DISABLE TRIGGER ALL, chèn dữ liệu,
                                       rồi ENABLE lại; import dừng giữa chừng → không tới được câu ENABLE
Vì sao dừng giữa chừng để lại dở?    → psql chạy từng câu, không bọc trong một transaction
Vì sao không ai phát hiện sớm?       → không có kiểm tra "đang ghi vào DB nào" trước khi chạy
```

**Điều đã làm tốt:** phát hiện nhanh nhờ kiểm tra DB sau thao tác; có backup để khôi phục nếu cần.

**Việc cần làm (đã hoàn thành)**

| Việc | Loại | Trạng thái |
|------|------|------------|
| `seed-content.ts` đọc database + user từ `DATABASE_URL` thay vì viết cứng | phòng ngừa | ✅ |
| psql chạy với `-v ON_ERROR_STOP=1 --single-transaction` → lỗi thì rollback **toàn bộ**, kể cả câu tắt trigger | phòng ngừa | ✅ |
| `resyncIdSequences` sau import (dump chèn id tường minh → sequence tụt → INSERT sau đó trùng khoá) | phòng ngừa | ✅ |
| In rõ tên DB đích trước khi seed ghi dữ liệu | phát hiện | nên làm |

Mã nguồn sau khi sửa: [`packages/prisma-nihongo/seed-content.ts`](../packages/prisma-nihongo/seed-content.ts).

**Bài học chung:** script chạm dữ liệu phải (1) lấy đích từ cấu hình, không viết cứng; (2) nguyên tử — xong hết hoặc không
gì cả; (3) nói rõ nó sắp ghi vào đâu.

---

## 6. Mẫu postmortem

```markdown
# Postmortem: <tiêu đề ngắn>

Ngày · Mức độ · Thời gian ảnh hưởng · Người viết · Trạng thái

## Tóm tắt           (3–4 câu: chuyện gì, ảnh hưởng ai, bao lâu, đã khôi phục thế nào)
## Ảnh hưởng         (số người dùng, số request lỗi, dữ liệu bị ảnh hưởng — con số)
## Dòng thời gian    (giờ – sự kiện, gồm cả lúc phát hiện và lúc khôi phục)
## Nguyên nhân gốc   (5 whys; nguyên nhân kích hoạt ≠ nguyên nhân gốc)
## Điều làm tốt / chưa tốt / may mắn
## Việc cần làm      (bảng: việc · loại phòng ngừa|phát hiện|giảm thiểu · người phụ trách · hạn)
```

Viết không đổ lỗi: *"script cho phép chạy mà không xác nhận DB đích"* thay cho *"X chạy nhầm DB"*. Người trong cuộc chỉ
kể đúng sự thật khi không sợ bị phạt — mà không có sự thật thì không sửa được hệ thống.

---

## 7. Diễn tập (game day)

Cố tình gây lỗi trong môi trường dev để kiểm tra runbook và giám sát:

| Kịch bản | Lệnh | Mong đợi |
|----------|------|----------|
| DB chết | `docker stop edu-postgres-nihongo` | readiness fail, API trả 503 có ý nghĩa, alert kêu |
| Kafka chết khi khởi động | stop Kafka → restart exam-service | **hiện tại**: event mất im lặng → chứng minh cần outbox |
| content-service treo | thêm `sleep` vào handler | gateway timeout 504, không treo theo |
| Redis chết | `docker stop edu-redis` | app chậm hơn nhưng vẫn chạy (hay 500?) |

---

## Bài tập thực hành

1. Viết postmortem hoàn chỉnh (mẫu mục 6) cho lỗi "Prometheus không lấy được metric vì 401" — tính từ khi thêm `JwtAuthGuard`
   toàn cục tới khi phát hiện.
2. Chạy kịch bản "Redis chết" (mục 7); ghi lại trang nào lỗi, trang nào chạy; viết runbook "Redis down".
3. Chạy kịch bản "Kafka chết khi khởi động"; viết script gửi bù event cho khoảng thời gian bị mất (runbook Kafka bước 2).
4. Thêm vào `seed-content.ts` bước in tên DB đích và dừng lại nếu đích là DB chính mà không có `CONFIRM_MAIN_DB=1`.
5. Đặt mức độ (SEV1–3) cho 5 lỗi bất kỳ trong các tài liệu learn-* và giải thích.

<details>
<summary>Gợi ý đáp án</summary>

1. Ảnh hưởng: không có metric HTTP từ khi guard toàn cục được thêm (dashboard trống, không alert nào kêu được) — không ảnh
   hưởng người dùng trực tiếp → **SEV3**, nhưng làm mọi sự cố khác khó phát hiện. Nguyên nhân gốc: guard mặc định đóng (đúng)
   nhưng không có danh sách route hạ tầng cần `@Public()`; không có alert `up == 0`. Việc cần làm: controller metrics public +
   chặn ở mạng; alert TargetDown; test e2e khẳng định `/metrics` trả 200 không cần token.
2. Kiểm tra `RedisModule`, cache của content-service và throttler: nếu lỗi Redis ném ra ngoài → 500 toàn bộ; cách đúng là bắt
   lỗi cache → đọc DB. Runbook: xác nhận `docker ps`/`kubectl get pods`, restart Redis, xoá cache hỏng nếu dữ liệu sai.
3. ```sql
   SELECT id, "examId", "userId", level, percent, passed, "correctCount", total, "submittedAt"
   FROM "ExamResult" WHERE "submittedAt" BETWEEN '<bắt đầu>' AND '<kết thúc>' ORDER BY id;
   ```
   Script đọc danh sách, `producer.send` từng dòng với `eventId = exam-result-<id>` để consumer bỏ qua bản trùng.
4. Parse `DATABASE_URL`, lấy tên DB; `console.log("Seed vào DB:", database)`; nếu `database === "nihongo"` và
   `process.env.CONFIRM_MAIN_DB !== "1"` → `throw`. Rẻ, và chặn đúng lỗi của mục 5.
5. Ví dụ: `credentials` rỗng làm upload S3 hỏng khi lên ECS → SEV2 (một tính năng hỏng); event nộp bài mất → SEV2
   (dữ liệu tiến độ sai nhưng kết quả thi vẫn lưu); CORS cho mọi localhost ở production → SEV3 (rủi ro, chưa khai thác);
   thiếu migration khi deploy → SEV1 (500 toàn hệ thống); 271 kanji thiếu → SEV3 (nội dung).

</details>

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **6. DevOps và hạ tầng** — bài 7/7.

- Bài trước: [learn-observability.md](./learn-observability.md) — Log, metric, trace với Prometheus, Grafana, Jaeger
- Xong nhóm này. **Nhóm tiếp: 7. Cloud** — bắt đầu bằng [learn-localstack.md](./learn-localstack.md) (Giả lập AWS trên máy bằng LocalStack)

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
