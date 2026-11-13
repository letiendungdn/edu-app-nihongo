-- Sổ từ vựng cá nhân (bảng của api-gateway, ADR-0010). Chỉ tạo bảng mới, không đụng dữ liệu cũ.

-- CreateTable
CREATE TABLE "PersonalWord" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "kana" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "lesson" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonalWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalWord_userId_lesson_idx" ON "PersonalWord"("userId", "lesson");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalWord_userId_kana_key" ON "PersonalWord"("userId", "kana");

-- AddForeignKey
ALTER TABLE "PersonalWord" ADD CONSTRAINT "PersonalWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
