type CronRunClient = {
  cronRun: { create(args: { data: { name: string; slot: string } }): Promise<unknown> };
};

/**
 * Giành quyền chạy một lượt cron. Trả `true` cho đúng MỘT pod; các pod khác nhận `false` và bỏ qua.
 *
 * Gateway chạy nhiều pod (HPA minReplicas 2) và `@Cron` nổ ở tất cả các pod. Khóa loại "đang chạy"
 * (advisory lock) không đủ: pod A chạy xong trong vài giây rồi nhả khóa, pod B nổ trễ vài trăm ms
 * vẫn lấy được khóa và chạy lại → người dùng nhận 2 thông báo. Cần ghi nhớ "lượt này ĐÃ chạy":
 * khóa chính (name, slot) của bảng CronRun làm việc đó.
 *
 * `slot` xác định lượt, ví dụ ngày `2026-10-21` cho cron hằng ngày.
 */
export async function claimCronRun(prisma: CronRunClient, name: string, slot: string): Promise<boolean> {
  try {
    await prisma.cronRun.create({ data: { name, slot } });
    return true;
  } catch (e) {
    if (isUniqueConflict(e)) return false;
    throw e;
  }
}

/** P2002: pod khác đã ghi (name, slot). Không phụ thuộc class lỗi trên namespace Prisma. */
function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2002';
}

/** Ngày theo giờ Việt Nam (YYYY-MM-DD): lượt của cron hằng ngày chạy theo `Asia/Ho_Chi_Minh`. */
export function vietnamDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(at);
}
