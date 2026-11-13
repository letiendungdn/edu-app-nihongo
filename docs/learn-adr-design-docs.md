# Học viết ADR & Design Doc — Từ Project Này

> Senior được đánh giá bằng **quyết định**, không chỉ bằng code. Quyết định không được ghi lại thì 6 tháng sau không ai
> (kể cả chính mình) nhớ vì sao hệ thống lại như vậy — và người đến sau sẽ "sửa" nó thành sai.
> Project đã có 6 ADR thật trong [`docs/adr/`](./adr) — đọc chúng như ví dụ mẫu.

## 1. Ba loại tài liệu, ba mục đích

| Tài liệu | Viết khi | Độ dài | Ai đọc | Vòng đời |
|----------|----------|--------|--------|----------|
| **ADR** (Architecture Decision Record) | vừa **chốt** một quyết định khó đảo ngược | ½–1 trang | người sau này thắc mắc "vì sao?" | bất biến; đổi ý → ADR mới *thay thế* ADR cũ |
| **Design doc / RFC** | **trước khi** làm một tính năng/thay đổi lớn (> vài ngày) | 2–6 trang | team review, góp ý | thảo luận → chốt → lưu trữ |
| **Runbook** | có alert hoặc thao tác vận hành lặp lại | checklist | người trực lúc 2 giờ sáng | cập nhật sau mỗi sự cố |

Runbook và postmortem: [learn-incident-postmortem.md](./learn-incident-postmortem.md).

---

## 2. ADR

### 2.1. Khi nào cần ADR

Hỏi: *"Nếu làm sai, sửa lại có tốn kém không?"* và *"Người mới nhìn code có hiểu vì sao không?"* — cả hai "có" → viết ADR.

```
✅ Chọn Kafka thay vì gọi đồng bộ           ✅ Squash migration (ADR-0001)
✅ Nội dung nằm ở DB thay vì code (0002)   ✅ Cách đánh số bài giáo trình (0003)
✅ Không dùng dữ liệu dịch máy (0004)       ✅ Backup nằm trong repo (0005)
❌ Đặt tên biến, chọn thư viện format ngày, sửa bug nhỏ
```

### 2.2. Mẫu (dùng cho mọi ADR trong `docs/adr/`)

```markdown
# ADR-NNNN: <quyết định, viết như một câu khẳng định>

- **Trạng thái:** Đề xuất | Đã chấp nhận | Bị thay thế bởi ADR-XXXX
- **Ngày:** YYYY-MM-DD
- **Phạm vi:** module / package bị ảnh hưởng

## Bối cảnh
Vấn đề gì, ràng buộc gì (thời gian, người, chi phí, dữ liệu hiện có). Sự thật, không phải ý kiến.

## Các phương án
Bảng 2–4 phương án thật sự khả thi, mỗi cái có ưu / nhược.

## Quyết định
Chọn gì, cụ thể đến mức người khác làm theo được.

## Hệ quả
Được gì (✅), mất gì / rủi ro gì (⚠️), việc phải làm tiếp, KHI NÀO cần xem lại quyết định này.
```

### 2.3. Đọc 5 ADR của project

| ADR | Đáng học ở chỗ |
|-----|----------------|
| [0001 squash migration](./adr/0001-squash-prisma-migrations.md) | nêu rõ **điều kiện** khiến quyết định đúng ("chưa có production") và khi nào nó **không** còn đúng |
| [0002 nội dung vào DB](./adr/0002-mind-map-content-in-db.md) | chấp nhận một nhược điểm (mất fallback) có lý do |
| [0003 đánh số bài giáo trình](./adr/0003-textbook-lessons-numbering-and-level-pool.md) | ghi lại cả **lỗi đã gặp** (`NOT IN` loại NULL, migration chạy trước seed) để người sau không lặp lại |
| [0004 bỏ dữ liệu dịch máy](./adr/0004-disable-machine-translated-gap-fill.md) | quyết định về **chất lượng dữ liệu**, không chỉ kỹ thuật; kèm backlog cụ thể |
| [0005 backup trong repo](./adr/0005-commit-db-backups-to-repo.md) | trạng thái "cần xem lại" + tiêu chí rõ ràng để xem lại |
| [0006 transactional outbox](./adr/0006-transactional-outbox-exam-events.md) | có mục **Kiểm chứng** — quyết định được chứng minh bằng thí nghiệm tắt Kafka, không chỉ lập luận |

### 2.4. Lỗi hay gặp khi viết ADR

- Chỉ có "Quyết định", không có "Các phương án" → người đọc không biết đã cân nhắc gì.
- "Hệ quả" chỉ toàn ✅ → không trung thực; mọi quyết định đều có giá.
- Viết như nhật ký ("hôm nay tôi thử X…") → ADR là **kết luận**, quá trình để trong PR/design doc.
- Sửa ADR cũ khi đổi ý → phải viết ADR mới, đổi trạng thái ADR cũ thành "Bị thay thế bởi…".

---

## 3. Design doc / RFC

### 3.1. Mẫu

```markdown
# <Tên thay đổi> — Design Doc

Tác giả · Ngày · Trạng thái (Nháp / Đang review / Đã duyệt) · Người review

## 1. Tóm tắt (3–5 câu)          — người bận chỉ đọc phần này
## 2. Vấn đề & mục tiêu            — số liệu hiện tại; "thành công" đo bằng gì
## 3. Ngoài phạm vi (non-goals)    — cái KHÔNG làm, tránh bàn lan man
## 4. Thiết kế đề xuất             — sơ đồ, schema, API, luồng dữ liệu
## 5. Phương án khác đã loại       — và vì sao
## 6. Rủi ro & cách giảm           — bảo mật, hiệu năng, dữ liệu cũ, rollback
## 7. Kế hoạch triển khai          — các bước release (expand/contract, feature flag), đo lường sau release
## 8. Câu hỏi mở                   — điều cần người review quyết
```

### 3.2. Ví dụ tóm tắt: "Transactional outbox cho event nộp bài thi"

> **Tóm tắt.** Hiện exam-service ghi `ExamResult` vào Postgres rồi gửi `edu.exam.submitted` lên Kafka trong hai bước
> độc lập; Kafka lỗi hoặc service chết giữa chừng thì event mất vĩnh viễn (khi Kafka chưa sẵn sàng lúc khởi động, *mọi*
> event bị bỏ im lặng). Đề xuất ghi event vào bảng `OutboxEvent` trong cùng transaction với kết quả thi, một relay đẩy lên
> Kafka mỗi giây. Đổi lại event chậm ~1s và có thể trùng — consumer phải idempotent theo `eventId`.
>
> **Mục tiêu đo được:** 0 event mất khi tắt Kafka 5 phút; độ trễ p95 từ nộp bài tới event < 3s.
>
> **Ngoài phạm vi:** viết consumer streak/SRS (design doc riêng); chuyển các topic khác sang outbox.

Nội dung kỹ thuật đầy đủ để viết phần 4–7: [learn-reliability-patterns.md](./learn-reliability-patterns.md) mục 1–2, 5.

### 3.3. Review design doc như senior

```
□ Vấn đề có số liệu không, hay chỉ "cảm thấy chậm"?
□ Có phương án đơn giản hơn không? ("Có cần Kafka không, hay một bảng + cron là đủ?")
□ Điều gì xảy ra khi từng thành phần lỗi? Dữ liệu cũ thì sao? Rollback thế nào?
□ Ai vận hành nó lúc 2 giờ sáng — có metric, alert, runbook chưa?
□ Chi phí (tiền, độ phức tạp, thời gian team) có tương xứng lợi ích?
```

Góp ý bằng **câu hỏi** và **rủi ro cụ thể**, không bằng sở thích: *"Nếu relay chạy 2 pod thì sao?"* tốt hơn
*"Tôi không thích cách này"*.

---

## 4. Viết cho người đọc bận

- Kết luận trước, chi tiết sau (tóm tắt ở đầu, không để cuối).
- Một đoạn một ý; bảng cho so sánh; sơ đồ cho luồng.
- Số liệu thật thay cho tính từ: "p95 123ms, 68% request bị 429" thay cho "khá chậm, lỗi nhiều".
- Viết cho người **không có mặt** trong cuộc họp — đừng giả định họ biết bối cảnh.

---

## Bài tập thực hành

1. Đọc ADR-0003, liệt kê mọi ràng buộc dẫn tới quyết định. Nếu làm lại từ đầu, bạn chọn phương án nào? Viết lập luận ½ trang.
2. Viết **ADR-0006** cho quyết định "tách health check thành live/ready" (learn-observability mục 6).
3. Viết design doc đầy đủ (mục 3.1) cho transactional outbox, dựa trên phần tóm tắt 3.2.
4. Viết ADR-0007 "chuẩn hoá bảng Kanji" với trạng thái *Đề xuất* (dựa trên [learn-db-design.md](./learn-db-design.md) mục 5.3).
5. Review chéo: đổi vai, dùng checklist 3.3 để góp ý design doc ở bài 3, ghi ít nhất 3 câu hỏi.

<details>
<summary>Gợi ý đáp án</summary>

1. Ràng buộc: URL/API toàn dùng `lessonNumber`; phải không đụng số bài có sẵn; nội dung theo sách có nhóm riêng (tuần/ngày,
   chương); cần không hiện trùng ở trang theo cấp. Làm lại từ đầu, lựa chọn hợp lý hơn là cột `textbook`, `section`, `unit`
   riêng + `UNIQUE(textbook, jlptLevel, section, unit)` và URL dạng `/textbooks/soumatome/n3/2/3` — tránh smart key.
2. Bối cảnh: `/health` luôn 200, gọi 2 microservice mỗi lần; phương án: giữ nguyên / một endpoint trả 503 / **tách live–ready**;
   hệ quả: probe có ý nghĩa, bớt tải; rủi ro: cấu hình sai liveness gây restart hàng loạt → liveness không kiểm tra phụ thuộc.
3. Phần 6 nên có: relay chạy nhiều pod (`FOR UPDATE SKIP LOCKED` trong transaction), bảng outbox phình to (xoá sau 7 ngày),
   thứ tự theo user (`key`), rollback (tắt relay → event dồn trong bảng, không mất). Phần 7: expand (tạo bảng, ghi outbox
   song song với emit cũ) → chuyển sang chỉ outbox → xoá emit cũ.
4. Trạng thái "Đề xuất", phương án A (giữ) / B (Kanji + LessonKanji) / C (giữ + view tổng hợp); câu hỏi mở: 632 chữ khác nghĩa
   chọn nghĩa chuẩn theo nguồn nào; ảnh hưởng tới thẻ SRS kanji.
5. Câu hỏi mẫu: "Outbox relay chết thì ai biết?" (cần metric số dòng chưa publish), "Consumer cũ không có eventId thì sao?",
   "Có cần outbox cho mọi topic, hay chỉ topic ảnh hưởng dữ liệu người học?".

</details>

## Luyện phỏng vấn

Câu hỏi phỏng vấn kèm đáp án (system design, testing, câu hỏi hành vi): [interview-questions.md](./interview-questions.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **2. Kiến trúc hệ thống** — bài 7/7.

- Bài trước: [learn-system-design.md](./learn-system-design.md) — Tư duy system design qua các quyết định của project
- Xong nhóm này. **Nhóm tiếp: 3. Backend (NestJS)** — bắt đầu bằng [learn-nestjs-build-api.md](./learn-nestjs-build-api.md) (Làm một tính năng backend trọn vẹn (Sổ từ của tôi): bảng, migration an toàn, module NestJS, chống IDOR, test Postgres thật)

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
