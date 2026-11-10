# ADR-0010: Các service dùng chung một database; mỗi bảng có một service chủ được ghi

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-10
- **Phạm vi:** `packages/prisma-nihongo/schema.prisma`, `packages/nest-prisma/src/table-ownership.ts`, mọi service backend

## Bối cảnh

- api-gateway (kèm code payment chạy bên trong), content-service và exam-service là ba tiến trình riêng, nhưng cùng trỏ vào **một** PostgreSQL `nihongo` với cùng một `schema.prisma` (cùng `DATABASE_URL` trong `docker-compose.yml` và secret K8s).
- Đo ngày 2026-11-10: 12/114 bảng được hơn một tiến trình truy cập trực tiếp bằng Prisma. Ví dụ: `Vocabulary` được 4 file ở gateway, 3 ở content và 2 ở exam đọc. Chỉ có **một** chỗ ghi chéo: gateway xóa thẳng `ExamResult` (`admin.service.ts`).
- Hệ quả của việc dùng chung không có quy tắc:
  - đổi cấu trúc một bảng có thể làm hỏng cả ba service, nên phải deploy cả ba cùng lúc;
  - không ai biết bảng nào thuộc ai, nên logic nghiệp vụ (kiểm tra, xóa cache, gửi sự kiện) có thể bị bỏ qua khi một service ghi thẳng vào bảng của service khác;
  - kiến trúc thành **distributed monolith**: chịu chi phí microservice (mạng, timeout, vận hành) mà mất lợi ích deploy độc lập.
- Tách hẳn mỗi service một database (*database per service*) là việc nhiều tuần: dữ liệu đang được JOIN chéo, phải tách migration, đồng bộ dữ liệu, xử lý giao dịch phân tán. Nhóm nhỏ, một môi trường, chưa có nhu cầu scale DB riêng.

## Quyết định

1. **Giữ một database** trong giai đoạn này.
2. **Mỗi bảng có đúng một service chủ được ghi.** Danh sách nằm trong code: [`table-ownership.ts`](../../packages/nest-prisma/src/table-ownership.ts).
   - content-service: bài học, từ vựng, ví dụ, ngữ pháp, bài tập, kanji, bài đọc, nhóm hậu tố từ vựng.
   - exam-service: đề thi thử, kết quả thi, thẻ SRS, hoạt động/mục tiêu/ghi chú/chuỗi ngày học, nhật ký nghe, `ProcessedEvent`.
   - api-gateway: mọi bảng còn lại (người dùng, đăng nhập, thanh toán, chat, thông báo, cộng đồng…).
   - Bảng hạ tầng dùng chung có chủ ý: `OutboxEvent`, `CronRun`. Mỗi service chỉ ghi dòng của chính mình.
3. **Service khác muốn thay đổi dữ liệu thì gọi service chủ qua gRPC.** Đọc chéo vẫn tạm chấp nhận (để không chặn tính năng), nhưng code mới nên đọc qua service chủ.
4. **Test tự động chặn vi phạm:** [`table-ownership.spec.ts`](../../packages/nest-prisma/src/table-ownership.spec.ts) quét `services/*/src`. Thấy một service gọi `create/update/upsert/delete…` trên bảng không thuộc mình thì CI đỏ, kèm file, dòng và service chủ.
5. **Đổi cấu trúc bảng theo kiểu expand/contract:** thêm cột hoặc bảng mới trước, deploy mọi service đọc nó, rồi mới xóa cái cũ. Không đổi tên hay xóa cột trong một lần deploy, vì ba service không deploy cùng một khoảnh khắc.
6. Sửa vi phạm duy nhất hiện có: gateway xóa `ExamResult` qua pattern `exam.results.delete` của exam-service.

## Lộ trình nếu cần tách thật (chưa làm)

Làm theo thứ tự. Mỗi bước tự có giá trị, có thể dừng ở bất kỳ bước nào.

1. **Bỏ đọc chéo:** gateway đọc từ vựng, ngữ pháp, kết quả thi qua gRPC thay vì Prisma. Thêm "không đọc chéo" vào test ở mục 4.
2. **Mỗi service một PostgreSQL schema và một DB user riêng**, trên cùng server: `content`, `exam`, `app`. User của service chỉ có quyền trên schema của mình. Lúc này database tự chặn vi phạm, không cần test nữa.
3. **Tách migration theo schema:** mỗi service sở hữu migration của mình.
4. **Tách server database** khi có lý do đo được: tải, backup riêng, nhóm riêng.

Điều kiện để bắt đầu bước 1: có từ 2 nhóm người phát triển riêng, hoặc content/exam cần deploy độc lập thường xuyên mà bị vướng thay đổi schema của nhau.

## Hệ quả

- ✅ Giữ được sự đơn giản của một database: một bản backup, JOIN khi báo cáo, transaction trong một service.
- ✅ Ranh giới dữ liệu được ghi rõ và kiểm tự động. Không còn ghi chéo; service chủ luôn chạy logic nghiệp vụ của nó.
- ✅ Đường tách về sau rõ ràng và làm từng bước được.
- ⚠️ Đọc chéo vẫn còn, nên đổi schema một bảng vẫn có thể ảnh hưởng service khác. Bắt buộc expand/contract.
- ⚠️ Database vẫn là điểm chết chung: Postgres chậm thì mọi service chậm.
- ⚠️ Test dựa trên quét chuỗi `prisma.<bảng>.<thao tác>(` nên có thể bị né (raw SQL, biến trung gian). Đây là lưới an toàn, không thay được review code; bước 2 của lộ trình mới chặn được tuyệt đối.
