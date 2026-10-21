-- R5: thời điểm thu hồi refresh token (phát hiện token bị đánh cắp rồi dùng lại)
ALTER TABLE "RefreshToken" ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- R1: buổi học nào đã nằm trong lượt trả tiền nào (không trả hai lần)
ALTER TABLE "CoachingSession" ADD COLUMN     "payoutId" INTEGER;

-- R1: số lần thử chuyển tiền của một lượt trả
ALTER TABLE "Payout" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;

-- R11: mỗi lượt cron chỉ một pod chạy
CREATE TABLE "CronRun" (
    "name" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("name","slot")
);

CREATE INDEX "CoachingSession_coachId_status_payoutId_idx" ON "CoachingSession"("coachId", "status", "payoutId");

ALTER TABLE "CoachingSession" ADD CONSTRAINT "CoachingSession_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
