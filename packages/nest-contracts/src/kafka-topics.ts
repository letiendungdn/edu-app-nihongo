/**
 * Topic Kafka đang dùng thật. Chỉ thêm topic khi đã có code gửi VÀ biết ai đọc nó.
 * (Đã xóa edu.exam.scored, edu.vocab.reviewed, edu.session.completed: khai báo nhưng chưa từng được gửi.)
 */
export const KafkaTopics = {
  /** exam-service gửi qua outbox; consumer "progress-updater" của exam-service đọc để cập nhật chuỗi ngày học. */
  EXAM_SUBMITTED: 'edu.exam.submitted',
  /**
   * payment (chạy trong gateway) ghi vào OutboxEvent CÙNG transaction với Payment; relay của exam-service
   * đẩy lên Kafka. Hiện chưa có consumer: dòng outbox là nhật ký tiền không mất, topic là điểm nối
   * cho hệ thống ngoài (phân tích doanh thu, CRM). Thông báo "thanh toán thành công" gửi trực tiếp sau
   * commit, không phụ thuộc Kafka (máy dev/CI tắt Kafka vẫn nhận thông báo).
   */
  PAYMENT_SUCCEEDED: 'edu.payment.succeeded',
} as const;

export interface ExamSubmittedEvent {
  examId: string;
  userId: number;
  level: string;
  answers: Record<string, string>;
  submittedAt: string;
}

export interface PaymentSucceededEvent {
  paymentId: number;
  userId: number;
  amountCents: number;
  type: 'subscription' | 'session';
  referenceId: string;
  paidAt: string;
}
